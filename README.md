# 🛰️ AgentWildFire

> **Autonomous Satellite Wildfire Detection & Parametric Disaster Relief Escrow on GenLayer**

[![GenLayer Studionet](https://img.shields.io/badge/GenLayer-Studionet%20(61999)-F97316?style=for-the-badge&logo=ethereum)](https://studio.genlayer.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)
[![Tests: Passing](https://img.shields.io/badge/Tests-8%2F8%20Passing-10B981?style=for-the-badge)](tests/)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python)](contracts/)
[![Vite + React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](frontend/)

---

## ⚡ The One-Line Pitch
> *"Traditional EVM smart contracts are blind to earth observation satellites, unable to scrape NASA FIRMS infrared telemetry or compute thermal radiative thresholds. Without GenLayer's non-deterministic web rendering and LLM consensus, autonomous parametric wildfire disaster relief is fundamentally impossible."*

---

## 🔍 The Real-World Problem

Wildfires across the world—from the California Sierra Nevada and the Mediterranean to the Amazon and Australian Bushland—cause tens of billions of dollars in catastrophe damage annually. Yet both affected local communities and aid donors suffer from severe structural bottlenecks:

1. **Catastrophic Bureaucratic Delay (3–8 Weeks)**: Traditional disaster reinsurance and government relief agencies require extensive claim filing, physical loss adjustment, and manual auditing. Communities and volunteer fire brigades are forced to wait weeks or months for emergency cash when immediate mobilization is critical.
2. **Oracle & Determinism Bottleneck on EVM**: Deterministic blockchains (Ethereum, Arbitrum, Solana) cannot connect directly to Earth observation satellites. They cannot:
   - Scrape live NASA FIRMS (MODIS/VIIRS) or Copernicus SLSTR Active Fire telemetry endpoints.
   - Parse spatial GeoJSON or polygon coordinates without centralized third-party servers.
   - Differentiate between a controlled agricultural burn and an uncontrolled catastrophic crown fire.
3. **Moral Hazard & Data Manipulation**: Traditional off-chain web2 claim systems rely on centralized insurance portals that can downplay fire intensity or arbitrarily deny relief funding.

---

## 💡 The AgentWildFire Solution on GenLayer

**AgentWildFire** transforms disaster relief and parametric forest insurance into an autonomous, non-custodial, economically aligned protocol on **GenLayer Studionet**:

- **Pre-Funded Relief Escrow (`create_relief_policy`)**: Sponsors, Climate DAOs, or Reinsurers deposit GEN into smart escrow, geofencing a forest zone polygon (e.g. `POLYGON((-121.5 39.5, -121.0 39.5, -121.0 40.0, -121.5 40.0))`) and setting a Fire Radiative Power (FRP) trigger threshold (e.g. `250 MW`).
- **Satellite Telemetry Binding (`trigger_wildfire_alert`)**: Beneficiaries or local emergency responders submit live satellite telemetry links from **accredited observation sources** (NASA FIRMS, ESA Sentinel Hub, EU Copernicus EMS, NOAA).
- **On-Chain AI Satellite Remote Sensing Jury (`adjudicate_wildfire_severity`)**:
  - Ingests raw telemetry on-chain using GenLayer's non-deterministic web rendering (`gl.nondet.web.render`).
  - Computes cryptographic SHA-256 evidence digests (`p.evidence_hash`) sealing raw sensor logs.
  - Multi-validator AI consensus (`gl.vm.run_nondet`) cross-examines peak Fire Radiative Power (MW) and burned acreage against the policy rubric.
  - Generates verifiable consensus verdicts:
    - **`DISASTER_RELIEF_CONFIRMED`** (100% relief fund payout to beneficiaries).
    - **`PARTIAL_RELIEF_GRANTED`** (40% payout for contained spot fires, 60% preserved).
    - **`FALSE_ALARM_DISMISSED`** (0% payout, 100% refund to sponsor).
- **24-Block (~72s) Dispute Cooling-Off Window (`appeal_verdict`)**: A 24-block challenge window permits either party to appeal to the Supreme Satellite Appellate Tribunal by staking a **10% dispute bond** with supplemental high-resolution satellite imagery.
- **Fail-Safe Protection (`STATUS_UNRESOLVED`)**: Unreachable feeds or canary parsing errors abort to a non-settling protected state, preventing premature fund drainage.
- **Pull-Payment Safeguard (`claim_payout`)**: Buffered disbursement balances eliminate stuck funds and re-entrancy risks.

---

## 🌐 Live Studionet Deployment

| Parameter | Value |
|---|---|
| **Network** | GenLayer Studionet |
| **Chain ID** | `61999` (Hex: `0xF22F`) |
| **RPC Endpoint** | `https://studio.genlayer.com/api` |
| **Contract Address** | `0x07e754c6E2F89f422F4AF81Ff2e42028A9fC913d` |
| **Transaction Hash** | `0x74457b0730e66f95e6663751ac0addbbaf4e69011af698734504610772b843aa` |
| **Receipt Status** | `5` (ACCEPTED / FINALIZED) |
| **GenLayer Studio View** | [View on GenLayer Studio](https://studio.genlayer.com/contracts/0x07e754c6E2F89f422F4AF81Ff2e42028A9fC913d) |

---

## 📁 Repository Structure

```
AgentWildFire/
├── contracts/
│   └── contract.py               # GenLayer Intelligent Contract (Storage, Oracles, Jury)
├── tests/
│   ├── conftest.py               # Mock GenVM simulator fixture
│   └── test_agentwildfire.py     # 8 comprehensive pytest test suites (100% passing)
├── scripts/
│   ├── deploy_studionet.py       # Automated deployment script for GenLayer Studionet
│   └── generate_logo.py          # Logo & visual asset generator
├── frontend/                     # Wildfire Thermal War Room (React 18 + Vite + TS + Tailwind)
│   ├── src/
│   │   ├── config/genlayer.ts    # Viem & genlayer-js Studionet client configuration
│   │   ├── components/
│   │   │   ├── Navbar.tsx        # Wallet connection, StudioNet switch, GEN balance
│   │   │   ├── StatsOverview.tsx # Metrics for relief locked, fires settled, hectares
│   │   │   ├── CreatePolicyModal.tsx # Geofence polygon builder & escrow funder
│   │   │   ├── PolicyCard.tsx    # Interactive thermal monitoring card
│   │   │   ├── TriggerAlertModal.tsx # NASA/Copernicus telemetry alert submission
│   │   │   ├── ThermalInspectorModal.tsx # AI jury forensic audit & FRP comparison
│   │   │   ├── AppealModal.tsx   # 24-block dispute portal with 10% staked bond
│   │   │   └── PullPayoutButton.tsx  # Pull-payment claim interface
│   │   ├── utils/formatters.ts   # Formatters for GEN, dates, addresses, statuses
│   │   └── App.tsx               # Main war room dashboard
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── deployment.json               # Authoritative Studionet deployment receipt
├── ARCHITECTURE.md               # Detailed architectural specification & state machine
├── CHANGELOG.md                  # Release versioning history
├── SECURITY.md                   # Security model & threat vectors
└── LICENSE                       # MIT License
```

---

## 🧪 Comprehensive Test Suite (8/8 Passing)

Run the full pytest suite locally:
```bash
python -m pytest -v
```

### Verified Test Cases:
1. `test_agentwildfire_confirmed_disaster_relief_payout`: Proves that a verified severe wildfire alert releases 100% relief funds to beneficiary.
2. `test_agentwildfire_unaccredited_source_rejected`: Proves that trigger alerts from unaccredited sources (e.g. random blog) are rejected.
3. `test_agentwildfire_partial_relief_payout`: Proves that a moderate spot fire awards 40% relief and refunds 60% to sponsor.
4. `test_agentwildfire_false_alarm_dismissed_refund`: Proves that a controlled burn is classified FALSE_ALARM and refunds sponsor.
5. `test_agentwildfire_appeal_with_bond_and_overturn`: Proves that a dispute filed within cooling-off with 10% bond triggers appellate review and reversal.
6. `test_agentwildfire_unresolved_telemetry_fetch_failure`: Proves that a broken satellite endpoint reverts safely to `STATUS_UNRESOLVED` without settling.
7. `test_agentwildfire_cancel_or_reclaim_expired`: Proves sponsor can reclaim unbreached escrow after policy expiration.
8. `test_agentwildfire_pull_payment_claim`: Proves that beneficiary can claim buffered balances via pull-payment.

---

## 🚀 Getting Started & Local Development

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- MetaMask wallet connected to GenLayer Studionet (`Chain ID: 61999`, RPC: `https://studio.genlayer.com/api`)

### 2. Run Frontend War Room
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 License
Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
