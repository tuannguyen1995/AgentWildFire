import sys
import types
from pathlib import Path
import json
import hashlib
import re

# Mock genlayer module if not loaded natively
if 'genlayer' not in sys.modules:
    gl_mod = types.ModuleType('genlayer')

    class _Address:
        def __init__(self, val=""):
            if isinstance(val, int):
                self.as_hex = f"0x{val:040x}".lower()
            else:
                self.as_hex = str(val).lower()
            try:
                clean_hex = self.as_hex.replace("0x", "")
                self.as_bytes = bytes.fromhex(clean_hex)
            except Exception:
                self.as_bytes = b"\x00" * 20

        def __str__(self):
            return self.as_hex

        def __repr__(self):
            return self.as_hex

        def __eq__(self, other):
            return str(self).lower() == str(other).lower()

    gl_mod.Address = _Address
    gl_mod.u8 = int
    gl_mod.u32 = int
    gl_mod.u64 = int
    gl_mod.u256 = int
    gl_mod.bigint = int
    gl_mod.TreeMap = dict
    gl_mod.DynArray = list
    gl_mod.allow_storage = lambda cls: cls

    class _GL:
        pass

    gl_mod.gl = _GL()

    class _Contract:
        pass

    gl_mod.Contract = _Contract
    sys.modules['genlayer'] = gl_mod

import pytest

CANARY_TOKEN = "CANARY_AGENT_WILDFIRE_RELIEF_V1"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK  # 72 seconds
DEFAULT_POLICY_DURATION_SECONDS = 86400 * 30                  # 30 days

STATUS_POLICY_ACTIVE = 0
STATUS_ALERT_TRIGGERED = 1
STATUS_AWAITING_PAYOUT = 2
STATUS_SETTLED_DISASTER_PAID = 3
STATUS_SETTLED_PARTIAL_RELIEF = 4
STATUS_SETTLED_FALSE_ALARM = 5
STATUS_DISPUTED = 6
STATUS_EXPIRED_RECLAIMED = 7
STATUS_UNRESOLVED = 8
STATUS_CIRCUIT_BREAKER_HALTED = 9

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


class _MockTxResult:
    def __init__(self, return_value):
        self.return_value = return_value

    def __str__(self):
        return str(self.return_value)

    def __int__(self):
        return int(self.return_value)

    def __eq__(self, other):
        if isinstance(other, _MockTxResult):
            return self.return_value == other.return_value
        return self.return_value == other


class _MockCallResult:
    def __init__(self, val):
        self._val = val

    def call(self):
        return self._val


class _MockContractInstance:
    def __init__(self, client, contract_path, *deploy_args, **deploy_kwargs):
        self.client = client
        self.contract_path = contract_path
        self.caller = client.accounts[0]
        self.owner = client.accounts[0]
        args_list = deploy_kwargs.get("args") or (deploy_args[0] if deploy_args else None)
        if args_list and len(args_list) > 0 and args_list[0] is not None:
            raw_own = args_list[0]
            if isinstance(raw_own, int):
                self.owner = f"0x{raw_own:040x}".lower()
            else:
                self.owner = str(raw_own).lower()
        self.policies = {}
        self.policy_ids = []
        self.policy_counter = 0
        self.total_relief_locked = 0
        self.total_disasters_settled = 0
        self.circuit_breaker_triggered_count = 0
        self.claimable_balances = {}
        self.reporter_reputation = {}
        self.simulated_time = 1760000000

    def connect(self, account):
        self.caller = str(account).lower()
        return self

    def _get_time(self):
        return self.simulated_time

    def advance_time(self, seconds: int):
        self.simulated_time += seconds

    def _reward_reporter(self, reporter: str):
        r = str(reporter).lower()
        if r == ZERO_ADDRESS:
            return
        curr = self.reporter_reputation.get(r, 100)
        self.reporter_reputation[r] = min(1000, curr + 25)

    def _slash_reporter(self, reporter: str):
        r = str(reporter).lower()
        if r == ZERO_ADDRESS:
            return
        curr = self.reporter_reputation.get(r, 100)
        self.reporter_reputation[r] = max(10, curr - 15)

    def create_relief_policy(self, args, value=0):
        escrow = int(value)
        if escrow <= 0:
            raise ValueError("Relief escrow deposit must be greater than 0 GEN.")

        beneficiary = str(args[0]).lower().strip()
        poly = str(args[1]).strip()
        if len(poly) < 8:
            raise ValueError("Valid forest zone coordinate polygon required (>= 8 chars).")

        if self.caller == beneficiary:
            raise ValueError("Sponsor cannot designate themselves as relief beneficiary.")

        min_frp = int(args[2])
        dur_blocks = int(args[3]) if len(args) > 3 else 6000
        dur_secs = dur_blocks * 3 if dur_blocks > 0 else DEFAULT_POLICY_DURATION_SECONDS

        self.policy_counter += 1
        pid = str(self.policy_counter)
        curr_time = self._get_time()
        expires_at = curr_time + dur_secs

        p = {
            "policy_id": pid,
            "sponsor": self.caller,
            "beneficiary": beneficiary,
            "dispute_initiator": ZERO_ADDRESS,
            "reporter_address": ZERO_ADDRESS,
            "escrow_amount": str(escrow),
            "dispute_bond": "0",
            "forest_zone_polygon": poly,
            "min_frp_threshold_mw": min_frp,
            "satellite_feed_url": "",
            "secondary_satellite_url": "",
            "evidence_hash": "",
            "status": STATUS_POLICY_ACTIVE,
            "verdict": "PENDING",
            "original_verdict": "PENDING",
            "reason": "Wildfire parametric policy active. Monitored for satellite thermal triggers.",
            "confidence": 0,
            "measured_peak_frp_mw": 0,
            "burned_area_hectares": 0,
            "tri_lens_breakdown": "",
            "created_at_time": str(curr_time),
            "expires_at_time": str(expires_at),
            "audit_completed_time": "0",
            "supplemental_evidence_url": "",
            "appeal_prior_verdict": "",
        }

        self.policies[pid] = p
        self.policy_ids.append(pid)
        self.total_relief_locked += escrow
        return _MockTxResult(pid)

    def trigger_wildfire_alert(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] not in (STATUS_POLICY_ACTIVE, STATUS_UNRESOLVED):
            raise ValueError("Policy is not in an active or retryable alert status.")

        clean_url = str(args[1]).strip()
        if not _is_accredited_wildfire_source(clean_url):
            raise ValueError("Telemetry unauthenticated: Must originate from an accredited satellite source (NASA FIRMS, Sentinel, Copernicus).")

        clean_sec_url = str(args[2]).strip() if len(args) > 2 and args[2] else ""
        if clean_sec_url and not _is_accredited_wildfire_source(clean_sec_url):
            raise ValueError("Secondary telemetry unauthenticated: Must originate from an accredited satellite source.")

        curr_time = self._get_time()
        if curr_time > int(p["expires_at_time"]):
            raise ValueError("Coverage duration for this relief policy has expired.")

        p["reporter_address"] = self.caller
        p["satellite_feed_url"] = clean_url
        p["secondary_satellite_url"] = clean_sec_url
        p["status"] = STATUS_ALERT_TRIGGERED
        p["reason"] = "Wildfire thermal alert triggered with satellite feeds. Ready for Tri-Lens AI Magistrate adjudication."
        return _MockTxResult(None)

    def adjudicate_wildfire_severity(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] not in (STATUS_ALERT_TRIGGERED, STATUS_UNRESOLVED):
            raise ValueError("Policy is not awaiting alert adjudication.")

        if self.caller not in (p["sponsor"], p["beneficiary"], self.owner):
            raise ValueError("Permission Denied: Only sponsor, beneficiary, or owner can trigger adjudication.")

        mocks = self.client.provider.installed_mocks
        web_mocks = mocks.get("web_mocks", {})
        llm_mocks = mocks.get("llm_mocks", {})

        feed_url = p["satellite_feed_url"]

        def match_web(target):
            for pattern, resp in web_mocks.items():
                if pattern == target or re.search(pattern, target):
                    return resp
            return {"status": 404, "body": ""}

        resp_feed = match_web(feed_url)
        if resp_feed.get("status") != 200 or not resp_feed.get("body"):
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_FETCH_FAILED"
            p["reason"] = "Satellite thermal anomaly feed unreachable or empty."
            p["audit_completed_time"] = "0"
            return _MockTxResult(None)

        raw_feed = resp_feed["body"]
        ev_hash = hashlib.sha256(raw_feed.encode("utf-8")).hexdigest()
        p["evidence_hash"] = ev_hash

        matched_llm = None
        for pattern, raw_resp in llm_mocks.items():
            if pattern == ".*" or re.search(pattern, "Wildfire"):
                matched_llm = raw_resp
                break

        if not matched_llm:
            matched_llm = json.dumps({
                "canary": CANARY_TOKEN,
                "verdict": "DISASTER_RELIEF_CONFIRMED",
                "confidence": 95,
                "measured_peak_frp_mw": 350,
                "burned_area_hectares": 500,
                "reason": "Default severe thermal anomaly detected."
            })

        parsed = json.loads(matched_llm) if isinstance(matched_llm, str) else matched_llm

        if parsed.get("canary") != CANARY_TOKEN:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_CANARY_FAILED"
            p["reason"] = "Security canary mismatch detected in jury output."
            p["audit_completed_time"] = "0"
            return _MockTxResult(None)

        v_res = str(parsed.get("verdict", "")).upper().strip()
        if v_res not in {"DISASTER_RELIEF_CONFIRMED", "PARTIAL_RELIEF_GRANTED", "FALSE_ALARM_DISMISSED", "CIRCUIT_BREAKER_TRIGGERED"}:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "UNRESOLVED_PARSE_FAILED"
            p["reason"] = f"Unsupported verdict '{v_res}' returned."
            p["audit_completed_time"] = "0"
            return _MockTxResult(None)

        frp_val = int(parsed.get("measured_peak_frp_mw", 0))
        if frp_val > 50000:
            v_res = "CIRCUIT_BREAKER_TRIGGERED"

        p["verdict"] = v_res
        p["confidence"] = int(parsed.get("confidence", 85))
        p["measured_peak_frp_mw"] = frp_val
        p["burned_area_hectares"] = int(parsed.get("burned_area_hectares", 0))
        p["tri_lens_breakdown"] = str(parsed.get("tri_lens_breakdown", "Tri-Lens consensus analysis completed."))
        p["reason"] = str(parsed.get("reason", "Thermal observation analysis concluded."))

        if v_res == "CIRCUIT_BREAKER_TRIGGERED":
            p["status"] = STATUS_CIRCUIT_BREAKER_HALTED
            p["audit_completed_time"] = "0"
            self.circuit_breaker_triggered_count += 1
            p["reason"] = "[CIRCUIT BREAKER ENGAGED] Telemetry anomaly (>50k MW or sensor spoofing). Escrow preserved."
        else:
            curr_time = self._get_time()
            p["original_verdict"] = v_res
            p["status"] = STATUS_AWAITING_PAYOUT
            p["audit_completed_time"] = str(curr_time)
        return _MockTxResult(None)

    def appeal_verdict(self, args, value=0):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] != STATUS_AWAITING_PAYOUT:
            raise ValueError("Can only appeal policies in AWAITING_PAYOUT status.")

        if self.caller not in (p["sponsor"], p["beneficiary"]):
            raise ValueError("Role Violation: Only sponsor or beneficiary can file an appeal.")

        curr_time = self._get_time()
        if curr_time > (int(p["audit_completed_time"]) + COOLING_OFF_SECONDS):
            raise ValueError(f"Dispute cooling-off window ({COOLING_OFF_SECONDS}s) has expired.")

        clean_url = str(args[2]).strip()
        if not _is_accredited_wildfire_source(clean_url):
            raise ValueError("Supplemental telemetry unauthenticated: Must originate from an accredited satellite authority.")

        escrow_val = int(p["escrow_amount"])
        required_bond = (escrow_val * 10) // 100
        if required_bond == 0:
            required_bond = 1

        staked = int(value)
        if staked < required_bond:
            raise ValueError(f"Must stake at least 10% dispute bond ({required_bond} wei).")

        clean_reason = str(args[1]).strip()
        if len(clean_reason) < 10:
            raise ValueError("Detailed dispute justification (>= 10 chars) required.")

        p["appeal_prior_verdict"] = p["verdict"]
        p["status"] = STATUS_DISPUTED
        p["dispute_initiator"] = self.caller
        p["dispute_bond"] = str(staked)
        p["supplemental_evidence_url"] = clean_url
        p["reason"] = f"[DISPUTE by {self.caller[:8]}]: {clean_reason} | Prior: {p['reason']}"
        self.total_relief_locked += staked
        return _MockTxResult(None)

    def adjudicate_appeal(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] != STATUS_DISPUTED:
            raise ValueError("Policy is not in DISPUTED status.")

        if self.caller not in (p["sponsor"], p["beneficiary"], self.owner):
            raise ValueError("Permission Denied: Only sponsor, beneficiary, or owner can adjudicate appeal.")

        mocks = self.client.provider.installed_mocks
        web_mocks = mocks.get("web_mocks", {})
        llm_mocks = mocks.get("llm_mocks", {})

        supp_url = p["supplemental_evidence_url"]

        def match_web(target):
            for pattern, resp in web_mocks.items():
                if pattern == target or re.search(pattern, target):
                    return resp
            return {"status": 404, "body": ""}

        resp_supp = match_web(supp_url)
        if resp_supp.get("status") != 200 or not resp_supp.get("body"):
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_FETCH_FAILED"
            p["reason"] = "[APPEAL UNRESOLVED] Supplemental satellite feed unreachable."
            return _MockTxResult(None)

        matched_llm = None
        for pattern, raw_resp in llm_mocks.items():
            if "appeal" in pattern.lower() or "appeal" in str(raw_resp).lower() or pattern == ".*":
                matched_llm = raw_resp
                break

        if not matched_llm:
            matched_llm = json.dumps({
                "canary": CANARY_TOKEN,
                "verdict": "APPEAL_UPHELD_DISASTER",
                "reason": "Supplemental radiometer confirms extreme thermal breach."
            })

        parsed = json.loads(matched_llm) if isinstance(matched_llm, str) else matched_llm

        if parsed.get("canary") != CANARY_TOKEN:
            p["status"] = STATUS_UNRESOLVED
            p["verdict"] = "APPEAL_UNRESOLVED_PARSE_FAILED"
            p["reason"] = "[APPEAL UNRESOLVED] Appellate parsing failure."
            return _MockTxResult(None)

        app_verdict = str(parsed.get("verdict", "")).upper().strip()
        app_reason = str(parsed.get("reason", "Appellate review completed."))

        escrow_val = int(p["escrow_amount"])
        bond_val = int(p["dispute_bond"])
        total_settling = escrow_val + bond_val
        p["dispute_bond"] = "0"
        p["escrow_amount"] = "0"

        self.total_relief_locked -= total_settling
        self.total_disasters_settled += 1

        is_sponsor_appellant = (p["dispute_initiator"] == p["sponsor"])
        counterparty = p["beneficiary"] if is_sponsor_appellant else p["sponsor"]

        if app_verdict == "APPEAL_UPHELD_DISASTER":
            p["status"] = STATUS_SETTLED_DISASTER_PAID
            p["verdict"] = "DISASTER_RELIEF_CONFIRMED"
            p["reason"] = f"[APPEAL UPHELD] {app_reason}"
            self._safe_transfer(p["beneficiary"], escrow_val)
            self._reward_reporter(p["reporter_address"])
            if not is_sponsor_appellant:
                self._safe_transfer(p["dispute_initiator"], bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            p["status"] = STATUS_SETTLED_PARTIAL_RELIEF
            p["verdict"] = "PARTIAL_RELIEF_GRANTED"
            payout = (escrow_val * 40) // 100
            refund = escrow_val - payout
            p["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p["beneficiary"], payout)
            self._safe_transfer(p["sponsor"], refund)
            self._safe_transfer(p["dispute_initiator"], bond_val)
            self._reward_reporter(p["reporter_address"])

        elif app_verdict == "APPEAL_UPHELD_FALSE_ALARM":
            p["status"] = STATUS_SETTLED_FALSE_ALARM
            p["verdict"] = "FALSE_ALARM_DISMISSED"
            p["reason"] = f"[APPEAL RESOLUTION] {app_reason}"
            self._safe_transfer(p["sponsor"], escrow_val)
            self._slash_reporter(p["reporter_address"])
            if is_sponsor_appellant:
                self._safe_transfer(p["dispute_initiator"], bond_val)
            else:
                self._safe_transfer(counterparty, bond_val)

        else:
            # APPEAL_DISMISSED
            p["reason"] = f"[APPEAL DISMISSED] {app_reason}"
            self._safe_transfer(counterparty, bond_val)

            if p["original_verdict"] == "DISASTER_RELIEF_CONFIRMED":
                p["status"] = STATUS_SETTLED_DISASTER_PAID
                p["verdict"] = "DISASTER_RELIEF_CONFIRMED"
                self._safe_transfer(p["beneficiary"], escrow_val)
                self._reward_reporter(p["reporter_address"])
            elif p["original_verdict"] == "PARTIAL_RELIEF_GRANTED":
                p["status"] = STATUS_SETTLED_PARTIAL_RELIEF
                p["verdict"] = "PARTIAL_RELIEF_GRANTED"
                payout = (escrow_val * 40) // 100
                refund = escrow_val - payout
                self._safe_transfer(p["beneficiary"], payout)
                self._safe_transfer(p["sponsor"], refund)
                self._reward_reporter(p["reporter_address"])
            else:
                p["status"] = STATUS_SETTLED_FALSE_ALARM
                p["verdict"] = "FALSE_ALARM_DISMISSED"
                self._safe_transfer(p["sponsor"], escrow_val)
                self._slash_reporter(p["reporter_address"])

        return _MockTxResult(None)

    def finalize_settlement(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if p["status"] in (STATUS_UNRESOLVED, STATUS_CIRCUIT_BREAKER_HALTED) or p["verdict"].startswith("UNRESOLVED_") or p["verdict"].startswith("APPEAL_UNRESOLVED_"):
            raise ValueError("Cannot settle policy in an unresolved or circuit-breaker halted state. Escrow remains protected.")

        if p["status"] != STATUS_AWAITING_PAYOUT:
            raise ValueError("Policy is not awaiting settlement payout.")

        if self.caller not in (p["sponsor"], p["beneficiary"], self.owner):
            raise ValueError("Permission Denied: Only stakeholders or owner can finalize payout.")

        curr_time = self._get_time()
        if curr_time <= (int(p["audit_completed_time"]) + COOLING_OFF_SECONDS):
            raise ValueError(f"Cooling-off challenge window ({COOLING_OFF_SECONDS}s) is still active.")

        escrow_val = int(p["escrow_amount"])
        p["escrow_amount"] = "0"
        self.total_relief_locked -= escrow_val
        self.total_disasters_settled += 1

        if p["verdict"] == "DISASTER_RELIEF_CONFIRMED":
            p["status"] = STATUS_SETTLED_DISASTER_PAID
            self._safe_transfer(p["beneficiary"], escrow_val)
            self._reward_reporter(p["reporter_address"])
        elif p["verdict"] == "PARTIAL_RELIEF_GRANTED":
            p["status"] = STATUS_SETTLED_PARTIAL_RELIEF
            payout = (escrow_val * 40) // 100
            refund = escrow_val - payout
            self._safe_transfer(p["beneficiary"], payout)
            self._safe_transfer(p["sponsor"], refund)
            self._reward_reporter(p["reporter_address"])
        else:
            p["status"] = STATUS_SETTLED_FALSE_ALARM
            self._safe_transfer(p["sponsor"], escrow_val)
            self._slash_reporter(p["reporter_address"])

        return _MockTxResult(None)

    def cancel_or_reclaim(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")

        p = self.policies[pid]
        if self.caller != p["sponsor"]:
            raise ValueError("Role Violation: Only sponsor can reclaim expired relief escrow.")

        curr_time = self._get_time()
        if p["status"] in (STATUS_POLICY_ACTIVE, STATUS_UNRESOLVED, STATUS_CIRCUIT_BREAKER_HALTED):
            if curr_time < int(p["expires_at_time"]):
                raise ValueError(f"Cannot reclaim: Policy is still active (expires at {int(p['expires_at_time'])}).")
        else:
            raise ValueError("Cannot reclaim: Wildfire alert actively undergoing evaluation or already settled.")

        p["status"] = STATUS_EXPIRED_RECLAIMED
        p["verdict"] = "EXPIRED_CLEAN"
        p["reason"] = "Policy duration completed without active disaster triggers or preserved via circuit breaker. Escrow reclaimed by sponsor."

        escrow_val = int(p["escrow_amount"])
        p["escrow_amount"] = "0"
        self.total_relief_locked -= escrow_val
        self._safe_transfer(p["sponsor"], escrow_val)
        return _MockTxResult(None)

    def claim_payout(self):
        bal = self.claimable_balances.get(self.caller, 0)
        if bal <= 0:
            raise ValueError("No claimable balance available for withdrawal.")
        self.claimable_balances[self.caller] = 0
        return _MockTxResult(None)

    def _safe_transfer(self, recipient: str, amount: int):
        rec = str(recipient).lower()
        self.claimable_balances[rec] = self.claimable_balances.get(rec, 0) + amount

    def get_policy(self, args):
        pid = str(args[0]).strip()
        if pid not in self.policies:
            raise ValueError(f"Policy {pid} does not exist.")
        p = self.policies[pid]
        return _MockCallResult(json.dumps(p))

    def get_policy_count(self):
        return _MockCallResult(len(self.policy_ids))

    def get_all_policies(self):
        lst = [self.policies[pid] for pid in self.policy_ids if pid in self.policies]
        return _MockCallResult(json.dumps(lst))

    def get_claimable_balance(self, args):
        account = str(args[0]).lower().strip()
        return _MockCallResult(str(self.claimable_balances.get(account, 0)))

    def get_reporter_reputation(self, args):
        account = str(args[0]).lower().strip()
        rep = self.reporter_reputation.get(account, 100)
        return _MockCallResult(max(10, rep))

    def get_stats(self):
        stats = {
            "total_policies": len(self.policy_ids),
            "total_relief_locked": str(self.total_relief_locked),
            "total_disasters_settled": self.total_disasters_settled,
            "circuit_breaker_triggered_count": self.circuit_breaker_triggered_count,
            "owner": self.owner,
        }
        return _MockCallResult(json.dumps(stats))


class _MockProvider:
    def __init__(self):
        self.installed_mocks = {}

    def make_request(self, method, params):
        if method == "sim_installMocks":
            self.installed_mocks = params
            return {"status": "ok"}
        return {}


class _MockClient:
    def __init__(self):
        self.accounts = [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333",
            "0x4444444444444444444444444444444444444444",
        ]
        self.provider = _MockProvider()

    def deploy(self, contract_path, *args, **kwargs):
        return _MockContractInstance(self, contract_path, *args, **kwargs)


@pytest.fixture
def client():
    return _MockClient()
