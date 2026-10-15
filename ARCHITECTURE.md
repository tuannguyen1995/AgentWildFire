# 🛰️ AgentWildFire Architecture & Protocol Specification

## 1. Executive Summary

**AgentWildFire** is an autonomous ClimateTech parametric disaster relief protocol powered by **GenLayer Intelligent Contracts**. It addresses the chronic failure of conventional humanitarian disaster response and insurance escrow: the multi-week bureaucratic verification delay that prevents emergency funding from reaching local fire departments and indigenous forest protectors when seconds count.

By combining GenLayer's non-deterministic web execution (`gl.nondet.web.render`) and LLM consensus (`gl.vm.run_nondet`), AgentWildFire autonomously cross-examines live NASA FIRMS / Copernicus infrared satellite radiometer telemetry against pre-funded escrow policies. If severe wildfire activity is confirmed, **100% of the relief funds are dispatched automatically** without intermediary human gatekeepers.

---

## 2. Core Protocol Workflow

```
       [Sponsor / DAO / Reinsurer]
                    │
                    ▼  (create_relief_policy + deposit GEN)
        ┌─────────────────────────┐
        │   WildfirePolicy Active │
        │  (Status 0: MONITORED)  │
        └───────────┬─────────────┘
                    │
   Wildfire Breakout Detected
                    │
                    ▼  (trigger_wildfire_alert + NASA FIRMS URL)
        ┌─────────────────────────┐
        │   Alert Triggered       │
        │  (Status 1: ALERT_FILED)│
        └───────────┬─────────────┘
                    │
                    ▼  (adjudicate_wildfire_severity)
        ┌────────────────────────────────────────────────────────┐
        │       AI Satellite Remote Sensing Jury                │
        │  1. gl.nondet.web.render(satellite_feed_url)          │
        │  2. Extract Peak FRP (MW) within Geofenced Polygon    │
        │  3. Calculate Burn Area & Crown Breach Severity       │
        │  4. Run Leader & Validator Equivalence Principle      │
        └───────────┬────────────────────────────────────────────┘
                    │
         ┌──────────┴────────────────────────┐
         │                                   │
         ▼ (FRP >= Threshold)                ▼ (FRP < Threshold / Prescribed)
┌─────────────────────────────────┐  ┌──────────────────────────────────┐
│ DISASTER_RELIEF_CONFIRMED (100%)│  │    FALSE_ALARM_DISMISSED (0%)    │
│ (Status 2: AWAITING_PAYOUT)     │  │    (Status 2: AWAITING_PAYOUT)   │
└────────┬────────────────────────┘  └──────────────┬───────────────────┘
         │                                          │
         ├───────────────────┬──────────────────────┤
         │ (24-Block Window) │                      │
         ▼                   ▼                      ▼
┌──────────────────┐ ┌──────────────────────────────────────────────┐
│  appeal_verdict  │ │     finalize_settlement (after 72 seconds)   │
│  (10% Staked     │ ├──────────────────────┬───────────────────────┤
│   Bond)          │ │ DISASTER CONFIRMED   │ FALSE ALARM DISMISSED │
│                  │ │ 100% to Beneficiary  │ 100% Refund to Sponsor│
└────────┬─────────┘ └──────────────────────┴───────────────────────┘
         │
         ▼ (adjudicate_appeal)
┌───────────────────────────────────────────┐
│ Supreme Satellite Appellate Tribunal      │
│ Evaluates Bound Supplemental Orbit Passes │
│ Upheld: Overturn verdict + refund bond    │
│ Dismissed: Forfeit bond to counterparty   │
└───────────────────────────────────────────┘
```

---

## 3. Intelligent Contract Mechanics (`contracts/contract.py`)

### 3.1 Consensus-Driven Telemetry Ingestion
- In traditional EVM chains, accessing external satellite endpoints requires trusted centralized oracles (Chainlink, Pyth) that do not support arbitrary satellite API scraping or JSON spatial queries.
- On GenLayer, validators ingest telemetry directly:
  ```python
  raw_feed = gl.nondet.web.render(feed_url, mode="text")
  ```
- Telemetry integrity is hashed (`SHA-256`) and sealed into `p.evidence_hash`.

### 3.2 Accredited Telemetry Verification
- Prevents malicious actors from submitting mock API URLs or hallucinated blog feeds:
  ```python
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
  ```

### 3.3 Anti-Stall Non-Settling Protection (`STATUS_UNRESOLVED`)
- If NASA or Copernicus servers experience network downtime (404/500) or if an AI validator fails JSON parsing:
  - Policy transitions to `STATUS_UNRESOLVED` (Code `8`).
  - Escrow remains 100% locked and protected.
  - Settle methods reject unresolved states, preventing wrongful fund leakage.

### 3.4 24-Block (~72s) Dispute Cooling-Off & Bond Staking
- In high-stakes disaster relief, sensor cloud cover or sensor calibration noise can cause false dismissals or misclassifications.
- Either the sponsor or beneficiary can appeal within 24 blocks (~72s) by staking a **10% dispute bond**.
- The Supreme Appellate Tribunal cross-examines supplemental satellite passes (e.g. Copernicus Emergency Management Rapid Mapping).
- Bond forfeiture economically punishes bad-faith delays.

### 3.5 Pull-Payment Safety Mechanism
- In accordance with smart contract security best practices, disbursement uses `_safe_transfer` which buffers into `claimable_balances` if immediate call fails.
- Users invoke `claim_payout()` to pull funds safely without re-entrancy risks.

---

## 4. State Transition Table

| Code | Status Enum | Description | Permitted Next Actions |
|---|---|---|---|
| `0` | `STATUS_POLICY_ACTIVE` | Escrow locked, zone monitored | `trigger_wildfire_alert`, `cancel_or_reclaim` (if expired) |
| `1` | `STATUS_ALERT_TRIGGERED` | Fire anomaly filed with satellite URL | `adjudicate_wildfire_severity` |
| `2` | `STATUS_AWAITING_PAYOUT` | AI verdict rendered, cooling active | `appeal_verdict` (<= 72s), `finalize_settlement` (> 72s) |
| `3` | `STATUS_SETTLED_DISASTER_PAID` | Confirmed wildfire breach (100% paid) | Final state (disbursed) |
| `4` | `STATUS_SETTLED_PARTIAL_RELIEF`| Spot fire breach (40% paid / 60% preserved)| Final state (disbursed) |
| `5` | `STATUS_SETTLED_FALSE_ALARM` | Controlled burn / flare (100% refunded) | Final state (refunded) |
| `6` | `STATUS_DISPUTED` | Appealed with 10% staked bond | `adjudicate_appeal` |
| `7` | `STATUS_EXPIRED_RECLAIMED` | Coverage concluded with zero breach | Final state (reclaimed) |
| `8` | `STATUS_UNRESOLVED` | Network 404 / parse failure (protected) | `trigger_wildfire_alert` (retry), `cancel_or_reclaim` |
