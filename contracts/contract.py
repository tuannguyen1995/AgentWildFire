# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json
import hashlib

CANARY_TOKEN = "CANARY_AGENT_WILDFIRE_RELIEF_V1"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

# Time & Cooling-Off Parameters
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = bigint(COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK)  # 72 seconds
DEFAULT_POLICY_DURATION_SECONDS = bigint(86400 * 30)                  # 30 days coverage

# Lifecycle Statuses
STATUS_POLICY_ACTIVE = u8(0)       # Sponsor locked relief escrow, zone monitored
STATUS_ALERT_TRIGGERED = u8(1)     # Wildfire thermal alert filed with satellite endpoint
STATUS_AWAITING_PAYOUT = u8(2)     # AI thermal jury rendered verdict, cooling-off active
STATUS_SETTLED_DISASTER_PAID = u8(3)# Confirmed severe wildfire (FRP threshold breached), 100% paid to beneficiaries
STATUS_SETTLED_PARTIAL_RELIEF = u8(4)# Moderate spot fire detected, 40% relief paid, 60% preserved
STATUS_SETTLED_FALSE_ALARM = u8(5) # False alarm / controlled burn, 100% refunded to sponsor
STATUS_DISPUTED = u8(6)            # Under appellate review with 10% staked bond
STATUS_EXPIRED_RECLAIMED = u8(7)   # Policy expired with zero breach, reclaimed by sponsor
STATUS_UNRESOLVED = u8(8)          # Telemetry fetch, parse, or canary failure (non-settling protected state)
STATUS_CIRCUIT_BREAKER_HALTED = u8(9) # Anomaly or adversarial spoofing detected: automated circuit breaker tripped


class ContractError(Exception):
    """Domain-specific error for AgentWildFire protocol."""
    pass


def _to_address(val) -> Address:
    """Converts any Address, int, or str into a valid GenLayer Address instance."""
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        hex_str = f"0x{val:040x}"
        return Address(hex_str)
    if isinstance(val, str):
        clean = val.strip()
        if clean.startswith("0x") or clean.startswith("0X"):
            return Address(clean.lower())
        try:
            int_val = int(clean)
            return Address(f"0x{int_val:040x}")
        except ValueError:
            return Address(clean.lower())
    if isinstance(val, (bytes, bytearray)):
        return Address("0x" + val.hex())
    return Address(str(val))


def _addr_str(addr) -> str:
    """Safely format an Address or address-like value into a lowercase hex string."""
    if addr is None:
        return ZERO_ADDRESS
    if isinstance(addr, int):
        return f"0x{addr:040x}".lower()
    try:
        return addr.as_hex.lower()
    except Exception:
        s = str(addr).lower()
        if s.startswith("0x"):
            return s
        try:
            int_val = int(s)
            return f"0x{int_val:040x}".lower()
        except Exception:
            return s


def _get_sender() -> Address:
    """Safely obtain transaction sender across GenVM runtime versions."""
    try:
        return _to_address(gl.message.sender_address)
    except Exception:
        try:
            return _to_address(gl.message.sender)
        except Exception:
            raise ContractError("Cannot resolve sender address.")


ACCREDITED_WILDFIRE_SOURCES = [
    "firms.modaps.eosdis.nasa.gov",
    "nasa.gov",
    "sentinel-hub.com",
    "copernicus.eu",
    "effis.jrc.ec.europa.eu",
    "noaa.gov",
    "wildfire.gov",
    "calfire.ca.gov",
    "emergency.copernicus.eu",
]


def _is_accredited_wildfire_source(url: str) -> bool:
    """Verifies that telemetry originates strictly from recognized satellite/emergency authorities."""
    clean = str(url).strip().lower()
    if not (clean.startswith("http://") or clean.startswith("https://")):
        return False
    try:
        no_proto = clean.split("://", 1)[1]
        host = no_proto.split("/", 1)[0].split(":", 1)[0]
        for domain in ACCREDITED_WILDFIRE_SOURCES:
            if host == domain or host.endswith("." + domain):
                return True
    except Exception:
        return False
    return False


@allow_storage
@dataclass
class WildfirePolicy:
    policy_id: str
    sponsor: Address               # Donor / Reinsurance Pool / DAO
    beneficiary: Address           # Local Relief Agency / Indigenous Forest Community
    dispute_initiator: Address     # Appellant who staked bond
    reporter_address: Address      # First responder / oracle who triggered the alert
    escrow_amount: bigint          # Locked emergency relief funds
    dispute_bond: bigint           # 10% appeal stake
    forest_zone_polygon: str       # Geofenced lat/long bounding coordinates
    min_frp_threshold_mw: u32      # Fire Radiative Power (MW) trigger threshold
    satellite_feed_url: str        # Real-time satellite thermal anomaly endpoint (Primary: NASA FIRMS)
    secondary_satellite_url: str   # Cross-referencing satellite endpoint (Secondary: Sentinel/Copernicus)
    evidence_hash: str             # Cryptographic SHA-256 snapshot of satellite payload
    status: u8
    verdict: str                   # "PENDING", "DISASTER_RELIEF_CONFIRMED", "PARTIAL_RELIEF_GRANTED", "FALSE_ALARM_DISMISSED", "CIRCUIT_BREAKER_TRIGGERED", "DISPUTED", "UNRESOLVED_*"
    original_verdict: str          # Preserved pre-appeal verdict
    reason: str
    confidence: u8
    measured_peak_frp_mw: u32      # Peak detected FRP in MegaWatts
    burned_area_hectares: u32      # Estimated affected acreage/hectares
    created_at_time: bigint        # Trusted Unix timestamp when policy created
    expires_at_time: bigint        # Trusted Unix timestamp when coverage concludes
    audit_completed_time: bigint   # Trusted Unix timestamp when AI jury rendered verdict
    supplemental_evidence_url: str # Bound appellate evidence URL
    appeal_prior_verdict: str      # Verdict recorded before appeal was filed
    tri_lens_breakdown: str        # Radiometric, Fire Behavior, & Actuarial multi-agent consensus breakdown


class Contract(gl.Contract):
    """
    AgentWildFire: Autonomous Satellite Wildfire Detection & Parametric Disaster Relief Escrow
    Target Network: GenLayer StudioNet (Chain ID: 61999)
    """
    policies: TreeMap[str, WildfirePolicy]
    policy_ids: DynArray[str]
    total_relief_locked: bigint
    total_disasters_settled: u32
    circuit_breaker_triggered_count: u32
    policy_counter: u64
    owner: Address
    claimable_balances: TreeMap[str, bigint]
    reporter_reputation: TreeMap[str, u32]

    def __init__(self, initial_owner = None):
        target_owner = Address(ZERO_ADDRESS)
        if initial_owner is not None:
            try:
                candidate = _to_address(initial_owner)
                if _addr_str(candidate) != ZERO_ADDRESS:
                    target_owner = candidate
            except Exception:
                pass

        if _addr_str(target_owner) == ZERO_ADDRESS:
            try:
                target_owner = _get_sender()
            except Exception:
                pass

        self.owner = target_owner
        self.total_relief_locked = bigint(0)
        self.total_disasters_settled = u32(0)
        self.circuit_breaker_triggered_count = u32(0)
        self.policy_counter = u64(0)

    def _resolve_pid(self, policy_id) -> str:
        return str(policy_id).strip()

    def _ensure_owner(self) -> None:
        if _addr_str(self.owner) == ZERO_ADDRESS:
            self.owner = _get_sender()

    def _safe_transfer(self, recipient, amount: bigint) -> None:
        """Transfers native GEN tokens with Pull-Payment fallback to eliminate lost funds."""
        if amount <= bigint(0):
            return
        rec_addr = _to_address(recipient)
        rec_str = _addr_str(rec_addr)
        try:
            gl.get_contract_at(rec_addr).emit_transfer(value=u256(int(amount)))
        except Exception:
            curr = self.claimable_balances.get(rec_str, bigint(0))
            self.claimable_balances[rec_str] = curr + amount

    def _get_current_timestamp(self) -> bigint:
        """Derives trusted Unix timestamp strictly from consensus context (gl.message_raw['datetime'])."""
        import calendar
        from datetime import datetime, timezone
        try:
            if hasattr(gl, "message_raw") and isinstance(gl.message_raw, dict):
                raw_val = gl.message_raw.get("datetime", "")
                if raw_val:
                    dt_str = str(raw_val).strip().replace("Z", "+00:00")
                    dt = datetime.fromisoformat(dt_str)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    ts = calendar.timegm(dt.utctimetuple())
                    if ts > 0:
                        return bigint(ts)
        except Exception:
            pass
        return bigint(1760000000)

    def _reward_reporter(self, reporter: Address) -> None:
        r_str = _addr_str(reporter)
        if r_str == ZERO_ADDRESS:
            return
        curr = int(self.reporter_reputation.get(r_str, u32(100)))
        new_val = min(1000, curr + 25)
        self.reporter_reputation[r_str] = u32(new_val)

    def _slash_reporter(self, reporter: Address) -> None:
        r_str = _addr_str(reporter)
        if r_str == ZERO_ADDRESS:
            return
        curr = int(self.reporter_reputation.get(r_str, u32(100)))
        new_val = max(10, curr - 15)
        self.reporter_reputation[r_str] = u32(new_val)

    # ── Public Write Methods ──────────────────────────────────────────

    @gl.public.write.payable
    def create_relief_policy(
        self,
        beneficiary_address,
        forest_zone_polygon: str,
        min_frp_threshold_mw: u32,
        duration_blocks: u32
    ) -> str:
        """Sponsor locks emergency relief escrow for a designated forest zone."""
        self._ensure_owner()
        escrow = bigint(gl.message.value)
        if escrow <= bigint(0):
            raise ContractError("Relief escrow deposit must be greater than 0 GEN.")

        clean_poly = str(forest_zone_polygon).strip()
        if len(clean_poly) < 8:
            raise ContractError("Valid forest zone coordinate polygon required (>= 8 chars).")

        ben_addr = _to_address(beneficiary_address)
        sender = _get_sender()
        if _addr_str(sender) == _addr_str(ben_addr):
            raise ContractError("Sponsor cannot designate themselves as relief beneficiary.")

        dur_secs = bigint(int(duration_blocks) * 3 if int(duration_blocks) > 0 else int(DEFAULT_POLICY_DURATION_SECONDS))

        self.policy_counter = self.policy_counter + u64(1)
        policy_id = str(self.policy_counter)
        current_time = self._get_current_timestamp()
        expires_at = current_time + dur_secs
        empty_addr = Address(ZERO_ADDRESS)

        new_policy = WildfirePolicy(
            policy_id=policy_id,
            sponsor=sender,
            beneficiary=ben_addr,
            dispute_initiator=empty_addr,
            reporter_address=empty_addr,
            escrow_amount=escrow,
            dispute_bond=bigint(0),
            forest_zone_polygon=clean_poly,
            min_frp_threshold_mw=min_frp_threshold_mw,
            satellite_feed_url="",
            secondary_satellite_url="",
            evidence_hash="",
            status=STATUS_POLICY_ACTIVE,
            verdict="PENDING",
            original_verdict="PENDING",
            reason="Wildfire parametric policy active. Monitored for satellite thermal triggers.",
            confidence=u8(0),
            measured_peak_frp_mw=u32(0),
            burned_area_hectares=u32(0),
            created_at_time=current_time,
            expires_at_time=expires_at,
            audit_completed_time=bigint(0),
            supplemental_evidence_url="",
            appeal_prior_verdict="",
            tri_lens_breakdown="",
        )

        self.policies[policy_id] = new_policy
        self.policy_ids.append(policy_id)
        self.total_relief_locked = self.total_relief_locked + escrow
        return policy_id

    @gl.public.write
    def trigger_wildfire_alert(
        self,
        policy_id: str,
        satellite_feed_url: str,
        secondary_satellite_url: str = ""
    ) -> None:
        """Beneficiary or emergency responder submits live satellite thermal feed."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status not in (STATUS_POLICY_ACTIVE, STATUS_UNRESOLVED):
            raise ContractError("Policy is not in an active or retryable alert status.")

        clean_url = str(satellite_feed_url).strip()
        if not _is_accredited_wildfire_source(clean_url):
            raise ContractError("Telemetry unauthenticated: Must originate from an accredited satellite source (NASA FIRMS, Sentinel, Copernicus).")

        clean_sec_url = str(secondary_satellite_url).strip() if secondary_satellite_url else ""
        if clean_sec_url and not _is_accredited_wildfire_source(clean_sec_url):
            raise ContractError("Secondary telemetry unauthenticated: Must originate from an accredited satellite source.")

        current_time = self._get_current_timestamp()
        if current_time > p.expires_at_time:
            raise ContractError("Coverage duration for this relief policy has expired.")

        sender = _get_sender()
        p.reporter_address = sender
        p.satellite_feed_url = clean_url
        p.secondary_satellite_url = clean_sec_url
        p.status = STATUS_ALERT_TRIGGERED
        p.reason = "Wildfire thermal alert triggered with satellite feeds. Ready for Tri-Lens AI Magistrate adjudication."

    @gl.public.write
    def adjudicate_wildfire_severity(self, policy_id: str) -> None:
        """Tri-Lens AI Magistrate cross-examines multi-satellite thermal telemetry against policy FRP threshold."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status not in (STATUS_ALERT_TRIGGERED, STATUS_UNRESOLVED):
            raise ContractError("Policy is not awaiting alert adjudication.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.sponsor)
            and sender_str != _addr_str(p.beneficiary)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only sponsor, beneficiary, or owner can trigger adjudication.")

        feed_url = p.satellite_feed_url
        sec_url = p.secondary_satellite_url
        polygon = p.forest_zone_polygon
        threshold_frp = int(p.min_frp_threshold_mw)

        def leader_fn():
            raw_feed = ""
            try:
                raw_feed = gl.nondet.web.render(feed_url, mode="text")
            except Exception:
                pass

            raw_sec_feed = ""
            if sec_url:
                try:
                    raw_sec_feed = gl.nondet.web.render(sec_url, mode="text")
                except Exception:
                    pass

            if not raw_feed:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_FETCH_FAILED",
                    "confidence": 0,
                    "measured_peak_frp_mw": 0,
                    "burned_area_hectares": 0,
                    "reason": "Satellite thermal anomaly feed unreachable or empty.",
                    "evidence_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                    "tri_lens_breakdown": "Fetch Failure: Primary satellite feed could not be rendered.",
                }

            combined_payload = raw_feed + ("\n--- SECONDARY TELEMETRY ---\n" + raw_sec_feed if raw_sec_feed else "")
            ev_hash = hashlib.sha256(combined_payload.encode("utf-8")).hexdigest()

            prompt = f"""You are the Chief Satellite Remote Sensing and Tri-Lens Disaster Magistrate on GenLayer.
Cross-examine real-time NASA FIRMS / Copernicus satellite thermal telemetry for this forest polygon:
ZONE COORDINATES: {polygon}
PARAMETRIC DISASTER TRIGGER: Fire Radiative Power (FRP) >= {threshold_frp} MW

PRIMARY SATELLITE TELEMETRY:
<primary_satellite_data>
{raw_feed[:3500]}
</primary_satellite_data>

SECONDARY CROSS-VALIDATION TELEMETRY:
<secondary_satellite_data>
{raw_sec_feed[:2000] if raw_sec_feed else "None provided (single sensor mode)"}
</secondary_satellite_data>

TRI-LENS EVALUATION PROTOCOL:
1. Lens A (Radiometric Specialist): Extract 4μm/11μm brightness temperatures, peak Fire Radiative Power (FRP in MegaWatts) detected strictly within the geofenced polygon. Check for impossible anomalies (e.g. FRP > 50,000 MW or adversarial spoofing).
2. Lens B (Fire Behavior Analyst): Differentiate active uncontrolled wildfire propagation from controlled industrial flares or permitted agricultural burns based on burn area spread (hectares).
3. Lens C (Parametric Actuary): Apply strict parametric trigger rules:
   - If telemetry exhibits extreme anomalies (> 50,000 MW or corrupted sensor spoofing):
     Output "CIRCUIT_BREAKER_TRIGGERED" (Escrow frozen to prevent fraudulent draining).
   - Else If Peak FRP >= {threshold_frp} MW AND burn area indicates uncontrolled wildfire:
     Output "DISASTER_RELIEF_CONFIRMED" (100% relief payout).
   - Else If Peak FRP between ({threshold_frp} // 2) and ({threshold_frp} - 1) MW (Spot fire / fringe containment):
     Output "PARTIAL_RELIEF_GRANTED" (40% partial relief payout).
   - Else:
     Output "FALSE_ALARM_DISMISSED" (0% payout, refund to sponsor).

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON without markdown fences:
{{
  "canary": "{CANARY_TOKEN}",
  "verdict": "DISASTER_RELIEF_CONFIRMED" | "PARTIAL_RELIEF_GRANTED" | "FALSE_ALARM_DISMISSED" | "CIRCUIT_BREAKER_TRIGGERED",
  "confidence": <0-100>,
  "measured_peak_frp_mw": <integer>,
  "burned_area_hectares": <integer>,
  "tri_lens_breakdown": "<concise summary of Lens A, Lens B, and Lens C findings under 250 chars>",
  "reason": "<factual satellite analysis under 200 chars>"
}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict):
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_PARSE_FAILED",
                    "confidence": 0,
                    "measured_peak_frp_mw": 0,
                    "burned_area_hectares": 0,
                    "reason": "AI validator parsing failed or malformed JSON.",
                    "evidence_hash": ev_hash,
                    "tri_lens_breakdown": "Parser Error: Unable to decode jury JSON.",
                }

            if str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_CANARY_FAILED",
                    "confidence": 0,
                    "measured_peak_frp_mw": 0,
                    "burned_area_hectares": 0,
                    "reason": "Security canary mismatch detected in jury output.",
                    "evidence_hash": ev_hash,
                    "tri_lens_breakdown": "Security Alert: Canary token invalid.",
                }

            v_raw = str(parsed.get("verdict", "")).upper().strip()
            if v_raw not in {"DISASTER_RELIEF_CONFIRMED", "PARTIAL_RELIEF_GRANTED", "FALSE_ALARM_DISMISSED", "CIRCUIT_BREAKER_TRIGGERED"}:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "UNRESOLVED_PARSE_FAILED",
                    "confidence": 0,
                    "measured_peak_frp_mw": 0,
                    "burned_area_hectares": 0,
                    "reason": f"Unsupported verdict '{v_raw}' returned.",
                    "evidence_hash": ev_hash,
                    "tri_lens_breakdown": f"Unsupported verdict: {v_raw}",
                }

            frp_val = max(0, min(100000, int(parsed.get("measured_peak_frp_mw", 0))))
            if frp_val > 50000:
                v_raw = "CIRCUIT_BREAKER_TRIGGERED"

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_raw,
                "confidence": max(0, min(100, int(parsed.get("confidence", 85)))),
                "measured_peak_frp_mw": frp_val,
                "burned_area_hectares": max(0, min(1000000, int(parsed.get("burned_area_hectares", 0)))),
                "tri_lens_breakdown": str(parsed.get("tri_lens_breakdown", "Tri-Lens consensus analysis completed."))[:250],
                "reason": str(parsed.get("reason", "Thermal observation analysis concluded."))[:200],
                "evidence_hash": ev_hash,
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            if mine["verdict"] != leader["verdict"]:
                return False
            leader_conf = int(leader.get("confidence", 0))
            mine_conf = int(mine.get("confidence", 0))
            if abs(leader_conf - mine_conf) > 20:
                return False
            return True

        adjudication_res = gl.vm.run_nondet(leader_fn, validator_fn)
        v_res = str(adjudication_res["verdict"])
        p.verdict = v_res
        p.reason = str(adjudication_res["reason"])
        p.confidence = u8(int(adjudication_res["confidence"]))
        p.measured_peak_frp_mw = u32(int(adjudication_res["measured_peak_frp_mw"]))
        p.burned_area_hectares = u32(int(adjudication_res["burned_area_hectares"]))
        p.tri_lens_breakdown = str(adjudication_res.get("tri_lens_breakdown", ""))
        if "evidence_hash" in adjudication_res and adjudication_res["evidence_hash"]:
            p.evidence_hash = str(adjudication_res["evidence_hash"])

        if v_res.startswith("UNRESOLVED_"):
            p.status = STATUS_UNRESOLVED
            p.audit_completed_time = bigint(0)
        elif v_res == "CIRCUIT_BREAKER_TRIGGERED":
            p.status = STATUS_CIRCUIT_BREAKER_HALTED
            p.audit_completed_time = bigint(0)
            self.circuit_breaker_triggered_count = self.circuit_breaker_triggered_count + u32(1)
            p.reason = "[CIRCUIT BREAKER ENGAGED] Telemetry anomaly (>50k MW or sensor spoofing). Escrow preserved."
        else:
            p.original_verdict = v_res
            current_time = self._get_current_timestamp()
            p.status = STATUS_AWAITING_PAYOUT
            p.audit_completed_time = current_time

    @gl.public.write.payable
    def appeal_verdict(
        self,
        policy_id: str,
        dispute_reason: str,
        supplemental_satellite_url: str
    ) -> None:
        """Stakeholder can appeal within 24 blocks (~72s) with a 10% staked bond and accredited evidence."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Can only appeal policies in AWAITING_PAYOUT status.")

        sender = _get_sender()
        if _addr_str(sender) != _addr_str(p.sponsor) and _addr_str(sender) != _addr_str(p.beneficiary):
            raise ContractError("Role Violation: Only sponsor or beneficiary can file an appeal.")

        current_time = self._get_current_timestamp()
        if current_time > (p.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Dispute cooling-off window ({int(COOLING_OFF_SECONDS)}s) has expired.")

        clean_url = str(supplemental_satellite_url).strip()
        if not _is_accredited_wildfire_source(clean_url):
            raise ContractError("Supplemental telemetry unauthenticated: Must originate from an accredited satellite authority.")

        required_bond = (p.escrow_amount * bigint(10)) // bigint(100)
        if required_bond == bigint(0):
            required_bond = bigint(1)

        staked = bigint(gl.message.value)
        if staked < required_bond:
            raise ContractError(f"Must stake at least 10% dispute bond ({int(required_bond)} wei).")

        clean_reason = str(dispute_reason).strip()
        if len(clean_reason) < 10:
            raise ContractError("Detailed dispute justification (>= 10 chars) required.")

        p.appeal_prior_verdict = p.verdict
        p.status = STATUS_DISPUTED
        p.dispute_initiator = sender
        p.dispute_bond = staked
        p.supplemental_evidence_url = clean_url
        p.reason = f"[DISPUTE by {_addr_str(sender)[:8]}]: {clean_reason} | Prior: {p.reason}"
        self.total_relief_locked = self.total_relief_locked + staked

    @gl.public.write
    def adjudicate_appeal(self, policy_id: str) -> None:
        """Supreme Satellite Appellate Tribunal evaluates strictly against bound supplemental observation data."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status != STATUS_DISPUTED:
            raise ContractError("Policy is not in DISPUTED status.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.sponsor)
            and sender_str != _addr_str(p.beneficiary)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only sponsor, beneficiary, or owner can adjudicate appeal.")

        bound_url = p.supplemental_evidence_url
        appellant = p.dispute_initiator
        prior_verdict = p.appeal_prior_verdict
        is_sponsor_appellant = (_addr_str(appellant) == _addr_str(p.sponsor))

        def leader_fn():
            raw_supp = ""
            try:
                raw_supp = gl.nondet.web.render(bound_url, mode="text")
            except Exception:
                pass

            if not raw_supp:
                return {
                    "canary": CANARY_TOKEN,
                    "verdict": "APPEAL_UNRESOLVED_FETCH_FAILED",
                    "reason": "Supplemental satellite feed unreachable.",
                }

            prompt = f"""You are the Supreme Satellite Disaster Appellate Court on GenLayer.
Evaluate bound high-resolution satellite imagery / radiometer logs for zone {p.forest_zone_polygon}:
PRIOR VERDICT: {prior_verdict}
APPELLANT: {'SPONSOR' if is_sponsor_appellant else 'BENEFICIARY'}

SUPPLEMENTAL AUDIT DATA:
{raw_supp[:4000]}

DECISION CRITERIA:
- If supplemental logs verify uncontrolled wildfire breach: Output "APPEAL_UPHELD_DISASTER".
- If partial fire damage verified: Output "APPEAL_UPHELD_PARTIAL".
- If logs conclusively prove zero breach / false alarm: Output "APPEAL_UPHELD_FALSE_ALARM".
- Otherwise: Output "APPEAL_DISMISSED".

SECURITY CANARY: Echo "{CANARY_TOKEN}" in JSON.
Respond ONLY with valid JSON:
{{"canary": "{CANARY_TOKEN}", "verdict": "APPEAL_UPHELD_DISASTER"|"APPEAL_UPHELD_PARTIAL"|"APPEAL_UPHELD_FALSE_ALARM"|"APPEAL_DISMISSED", "reason": "<rationale under 200 chars>"}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = None
            if isinstance(raw_res, dict):
                parsed = raw_res
            elif isinstance(raw_res, str):
                try:
                    parsed = json.loads(raw_res.replace("```json", "").replace("```", "").strip())
                except Exception:
                    pass

            if not parsed or not isinstance(parsed, dict) or str(parsed.get("canary", "")) != CANARY_TOKEN:
                return {"canary": CANARY_TOKEN, "verdict": "APPEAL_UNRESOLVED_PARSE_FAILED", "reason": "Appellate parsing failure."}

            v_str = str(parsed.get("verdict", "")).upper().strip()
            if v_str not in {"APPEAL_UPHELD_DISASTER", "APPEAL_UPHELD_PARTIAL", "APPEAL_UPHELD_FALSE_ALARM", "APPEAL_DISMISSED"}:
                v_str = "APPEAL_UNRESOLVED_PARSE_FAILED"

            return {
                "canary": CANARY_TOKEN,
                "verdict": v_str,
                "reason": str(parsed.get("reason", "Appellate review completed."))[:200]
            }

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader = leader_res.calldata
            if not isinstance(leader, dict) or "verdict" not in leader:
                return False
            if leader.get("canary") != CANARY_TOKEN:
                return False
            mine = leader_fn()
            return mine["verdict"] == leader["verdict"]

        appeal_res = gl.vm.run_nondet(leader_fn, validator_fn)
        app_verdict = appeal_res["verdict"]
        app_reason = appeal_res["reason"]

        if app_verdict.startswith("APPEAL_UNRESOLVED_"):
            p.status = STATUS_UNRESOLVED
            p.verdict = app_verdict
            p.reason = f"[APPEAL UNRESOLVED] {app_reason}"
            return

        escrow_val = p.escrow_amount
        bond_val = p.dispute_bond
        total_settling = escrow_val + bond_val
        p.dispute_bond = bigint(0)
        p.escrow_amount = bigint(0)  # Double-payout protection

        self.total_relief_locked = self.total_relief_locked - total_settling
        self.total_disasters_settled = self.total_disasters_settled + u32(1)

        counterparty = p.beneficiary if is_sponsor_appellant else p.sponsor

        if app_verdict == "APPEAL_UPHELD_DISASTER":
            p.status = STATUS_SETTLED_DISASTER_PAID
            p.verdict = "DISASTER_RELIEF_CONFIRMED"
            p.reason = f"[APPEAL UPHELD] {app_reason}"
            self._safe_transfer(p.beneficiary, escrow_val)
            self._reward_reporter(p.reporter_address)
            if not is_sponsor_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            p.status = STATUS_SETTLED_PARTIAL_RELIEF
            p.verdict = "PARTIAL_RELIEF_GRANTED"
            payout = (escrow_val * bigint(40)) // bigint(100)
            refund = escrow_val - payout
            p.reason = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p.beneficiary, payout)
            self._safe_transfer(p.sponsor, refund)
            self._safe_transfer(appellant, bond_val)
            self._reward_reporter(p.reporter_address)

        elif app_verdict == "APPEAL_UPHELD_FALSE_ALARM":
            p.status = STATUS_SETTLED_FALSE_ALARM
            p.verdict = "FALSE_ALARM_DISMISSED"
            p.reason = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p.sponsor, escrow_val)
            self._slash_reporter(p.reporter_address)
            if is_sponsor_appellant:
                self._safe_transfer(appellant, bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        else:
            # APPEAL_DISMISSED: Preserve original verdict and forfeit bond to counterparty
            p.reason = f"[APPEAL DISMISSED] {app_reason}"
            self._safe_transfer(counterparty, bond_val)

            if p.original_verdict == "DISASTER_RELIEF_CONFIRMED":
                p.status = STATUS_SETTLED_DISASTER_PAID
                p.verdict = "DISASTER_RELIEF_CONFIRMED"
                self._safe_transfer(p.beneficiary, escrow_val)
                self._reward_reporter(p.reporter_address)
            elif p.original_verdict == "PARTIAL_RELIEF_GRANTED":
                p.status = STATUS_SETTLED_PARTIAL_RELIEF
                p.verdict = "PARTIAL_RELIEF_GRANTED"
                payout = (escrow_val * bigint(40)) // bigint(100)
                refund = escrow_val - payout
                self._safe_transfer(p.beneficiary, payout)
                self._safe_transfer(p.sponsor, refund)
                self._reward_reporter(p.reporter_address)
            else:
                p.status = STATUS_SETTLED_FALSE_ALARM
                p.verdict = "FALSE_ALARM_DISMISSED"
                self._safe_transfer(p.sponsor, escrow_val)
                self._slash_reporter(p.reporter_address)

    @gl.public.write
    def finalize_settlement(self, policy_id: str) -> None:
        """Executes uncontested settlement strictly after 24 blocks (~72s) cooling-off window."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p.status in (STATUS_UNRESOLVED, STATUS_CIRCUIT_BREAKER_HALTED) or p.verdict.startswith("UNRESOLVED_") or p.verdict.startswith("APPEAL_UNRESOLVED_"):
            raise ContractError("Cannot settle policy in an unresolved or circuit-breaker halted state. Escrow remains protected.")

        if p.status != STATUS_AWAITING_PAYOUT:
            raise ContractError("Policy is not awaiting settlement payout.")

        sender_str = _addr_str(_get_sender())
        if (
            sender_str != _addr_str(p.sponsor)
            and sender_str != _addr_str(p.beneficiary)
            and sender_str != _addr_str(self.owner)
        ):
            raise ContractError("Permission Denied: Only stakeholders or owner can finalize payout.")

        current_time = self._get_current_timestamp()
        if current_time <= (p.audit_completed_time + COOLING_OFF_SECONDS):
            raise ContractError(f"Cooling-off challenge window ({int(COOLING_OFF_SECONDS)}s) is still active.")

        escrow_val = p.escrow_amount
        p.escrow_amount = bigint(0)  # Double-payout protection
        self.total_relief_locked = self.total_relief_locked - escrow_val
        self.total_disasters_settled = self.total_disasters_settled + u32(1)

        if p.verdict == "DISASTER_RELIEF_CONFIRMED":
            p.status = STATUS_SETTLED_DISASTER_PAID
            self._safe_transfer(p.beneficiary, escrow_val)
            self._reward_reporter(p.reporter_address)

        elif p.verdict == "PARTIAL_RELIEF_GRANTED":
            p.status = STATUS_SETTLED_PARTIAL_RELIEF
            payout = (escrow_val * bigint(40)) // bigint(100)
            refund = escrow_val - payout
            self._safe_transfer(p.beneficiary, payout)
            self._safe_transfer(p.sponsor, refund)
            self._reward_reporter(p.reporter_address)

        else:
            p.status = STATUS_SETTLED_FALSE_ALARM
            self._safe_transfer(p.sponsor, escrow_val)
            self._slash_reporter(p.reporter_address)

    @gl.public.write
    def cancel_or_reclaim(self, policy_id: str) -> None:
        """Sponsor reclaims escrow if policy expired without alerts or halted in circuit-breaker state."""
        self._ensure_owner()
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if _addr_str(_get_sender()) != _addr_str(p.sponsor):
            raise ContractError("Role Violation: Only sponsor can reclaim expired relief escrow.")

        current_time = self._get_current_timestamp()
        if p.status in (STATUS_POLICY_ACTIVE, STATUS_UNRESOLVED, STATUS_CIRCUIT_BREAKER_HALTED):
            if current_time < p.expires_at_time:
                raise ContractError(f"Cannot reclaim: Policy is still active (expires at {int(p.expires_at_time)}).")
        else:
            raise ContractError("Cannot reclaim: Wildfire alert actively undergoing evaluation or already settled.")

        p.status = STATUS_EXPIRED_RECLAIMED
        p.verdict = "EXPIRED_CLEAN"
        p.reason = "Policy duration completed without active disaster triggers or preserved via circuit breaker. Escrow reclaimed by sponsor."

        escrow_val = p.escrow_amount
        p.escrow_amount = bigint(0)
        self.total_relief_locked = self.total_relief_locked - escrow_val
        self._safe_transfer(p.sponsor, escrow_val)

    @gl.public.write
    def claim_payout(self) -> None:
        """Pull-payment safety withdrawal: Beneficiary claims safely buffered balances."""
        self._ensure_owner()
        sender = _get_sender()
        s_str = _addr_str(sender)
        bal = self.claimable_balances.get(s_str, bigint(0))
        if bal <= bigint(0):
            raise ContractError("No claimable balance available for withdrawal.")

        self.claimable_balances[s_str] = bigint(0)
        gl.get_contract_at(sender).emit_transfer(value=u256(int(bal)))

    # ── Read-only Views ───────────────────────────────────────────────

    @gl.public.view
    def get_policy(self, policy_id: str) -> str:
        pid = self._resolve_pid(policy_id)
        if pid not in self.policies:
            raise ContractError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        data = {
            "policy_id": p.policy_id,
            "sponsor": _addr_str(p.sponsor),
            "beneficiary": _addr_str(p.beneficiary),
            "dispute_initiator": _addr_str(p.dispute_initiator),
            "reporter_address": _addr_str(p.reporter_address),
            "escrow_amount": str(p.escrow_amount),
            "dispute_bond": str(p.dispute_bond),
            "forest_zone_polygon": p.forest_zone_polygon,
            "min_frp_threshold_mw": int(p.min_frp_threshold_mw),
            "satellite_feed_url": p.satellite_feed_url,
            "secondary_satellite_url": p.secondary_satellite_url,
            "evidence_hash": p.evidence_hash,
            "status": int(p.status),
            "verdict": p.verdict,
            "original_verdict": p.original_verdict,
            "reason": p.reason,
            "confidence": int(p.confidence),
            "measured_peak_frp_mw": int(p.measured_peak_frp_mw),
            "burned_area_hectares": int(p.burned_area_hectares),
            "tri_lens_breakdown": p.tri_lens_breakdown,
            "created_at_time": str(p.created_at_time),
            "expires_at_time": str(p.expires_at_time),
            "audit_completed_time": str(p.audit_completed_time),
            "supplemental_evidence_url": p.supplemental_evidence_url,
            "appeal_prior_verdict": p.appeal_prior_verdict,
            "created_at_block": str(p.created_at_time),
            "expires_at_block": str(p.expires_at_time),
            "audit_completed_block": str(p.audit_completed_time),
        }
        return json.dumps(data)

    @gl.public.view
    def get_policy_count(self) -> u64:
        return u64(len(self.policy_ids))

    @gl.public.view
    def get_all_policies(self) -> str:
        policies_list = []
        for pid in self.policy_ids:
            if pid in self.policies:
                p = self.policies[pid]
                policies_list.append({
                    "policy_id": p.policy_id,
                    "sponsor": _addr_str(p.sponsor),
                    "beneficiary": _addr_str(p.beneficiary),
                    "dispute_initiator": _addr_str(p.dispute_initiator),
                    "reporter_address": _addr_str(p.reporter_address),
                    "escrow_amount": str(p.escrow_amount),
                    "dispute_bond": str(p.dispute_bond),
                    "forest_zone_polygon": p.forest_zone_polygon,
                    "min_frp_threshold_mw": int(p.min_frp_threshold_mw),
                    "satellite_feed_url": p.satellite_feed_url,
                    "secondary_satellite_url": p.secondary_satellite_url,
                    "evidence_hash": p.evidence_hash,
                    "status": int(p.status),
                    "verdict": p.verdict,
                    "original_verdict": p.original_verdict,
                    "reason": p.reason,
                    "confidence": int(p.confidence),
                    "measured_peak_frp_mw": int(p.measured_peak_frp_mw),
                    "burned_area_hectares": int(p.burned_area_hectares),
                    "tri_lens_breakdown": p.tri_lens_breakdown,
                    "created_at_time": str(p.created_at_time),
                    "expires_at_time": str(p.expires_at_time),
                    "audit_completed_time": str(p.audit_completed_time),
                })
        return json.dumps(policies_list)

    @gl.public.view
    def get_claimable_balance(self, account) -> str:
        return str(self.claimable_balances.get(_addr_str(account), bigint(0)))

    @gl.public.view
    def get_reporter_reputation(self, account) -> u32:
        acc_str = _addr_str(_to_address(account))
        rep = self.reporter_reputation.get(acc_str, u32(100))
        if rep < u32(10):
            return u32(10)
        return rep

    @gl.public.view
    def get_stats(self) -> str:
        data = {
            "total_policies": len(self.policy_ids),
            "total_relief_locked": str(self.total_relief_locked),
            "total_disasters_settled": int(self.total_disasters_settled),
            "circuit_breaker_triggered_count": int(self.circuit_breaker_triggered_count),
            "owner": _addr_str(self.owner),
        }
        return json.dumps(data)
