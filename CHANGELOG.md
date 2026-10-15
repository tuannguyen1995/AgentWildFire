# Changelog

All notable changes to the **AgentWildFire** protocol and decentralized application are documented in this file.

## [1.0.0] - 2026-10-15

### Added
- **Intelligent Contract Core (`contracts/contract.py`)**:
  - `py-genlayer` pragma with `@allow_storage` and `TreeMap[str, WildfirePolicy]` persistent storage.
  - Multi-stakeholder parametric policy initialization (`create_relief_policy`).
  - Remote sensing telemetry ingestion via `gl.nondet.web.render` targeting accredited earth observation authorities.
  - Non-deterministic semantic consensus (`gl.vm.run_nondet`) comparing leader and validator outputs on Fire Radiative Power (MW) and burn acreage.
  - Multi-verdict resolution: `DISASTER_RELIEF_CONFIRMED` (100%), `PARTIAL_RELIEF_GRANTED` (40%), `FALSE_ALARM_DISMISSED` (0% / 100% refund).
  - 24-block (~72 second) cooling-off challenge window with a mandatory 10% staked dispute bond (`appeal_verdict`).
  - Supreme Satellite Appellate Tribunal re-evaluation (`adjudicate_appeal`).
  - Uncontested settlement execution after cooling window expiry (`finalize_settlement`).
  - Pull-payment safety withdrawal method (`claim_payout`) preventing stuck balances.
  - Fail-safe non-settling error state (`STATUS_UNRESOLVED`) for network timeouts and canary mismatches.
- **Pytest Test Suite (`tests/test_agentwildfire.py`)**:
  - Full end-to-end parametric relief disbursement verification.
  - Rejection of unaccredited telemetry sources.
  - Partial containment payout verification.
  - False alarm / prescribed agricultural burn classification and sponsor refund.
  - Appellate dispute bond staking and reversal verification.
  - Resilient `STATUS_UNRESOLVED` state verification under simulated 404 network failure.
  - Pull-payment buffered withdrawal testing.
- **Deployment Scripts (`scripts/deploy_studionet.py`)**:
  - Automated deployment script for GenLayer Studionet (Chain ID: 61999).
  - Synchronous block receipt tracking and `deployment.json` receipt generation.
- **Full-Stack Web3 dApp (`frontend/`)**:
  - Built with React 18, Vite, TypeScript, and TailwindCSS.
  - "Wildfire Thermal War Room" dark design theme with volcanic charcoal, plasma orange, and flame red accents.
  - Real-time GenLayer Studionet RPC and MetaMask integration (`genlayer-js`).
  - Live policy dashboard with interactive geofence coordinates, FRP intensity meters, and thermal gauges.
  - Dedicated modals: `CreatePolicyModal`, `TriggerAlertModal`, `ThermalInspectorModal`, and `AppealModal`.
  - Pull-payment withdrawal interface (`PullPayoutButton`).
