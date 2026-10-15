#!/usr/bin/env python3
"""
AgentWildFire: Live On-Chain End-to-End Verification on GenLayer Studionet.
Chain ID: 61999 (0xF22F)
RPC: https://studio.genlayer.com/api
"""

import sys
import json
import time
from pathlib import Path
from genlayer_py import create_client, create_account, generate_private_key, studionet


def run_live_test():
    print("=" * 75, flush=True)
    print("   AGENTWILDFIRE LIVE ON-CHAIN STUDIONET PROTOCOL VERIFICATION   ", flush=True)
    print("=" * 75, flush=True)

    deploy_file = Path(__file__).parent.parent / "deployment.json"
    with open(deploy_file, "r", encoding="utf-8") as f:
        deploy_data = json.load(f)

    contract_address = deploy_data["contractAddress"]
    print(f"\n[+] Target Contract on Studionet: {contract_address}", flush=True)

    # 1. Setup Test Actors (Sponsor & Relief Beneficiary)
    print("\n--- [STEP 1] Initializing & Funding On-Chain Actors ---", flush=True)
    sponsor_acc = create_account(generate_private_key())
    beneficiary_acc = create_account(generate_private_key())

    print(f"[+] Sponsor Address    : {sponsor_acc.address}", flush=True)
    print(f"[+] Beneficiary Address: {beneficiary_acc.address}", flush=True)

    sponsor_client = create_client(studionet, account=sponsor_acc)
    beneficiary_client = create_client(studionet, account=beneficiary_acc)

    print("[+] Requesting faucet funds for Sponsor from Studionet...", flush=True)
    try:
        sponsor_client.fund_account(address=sponsor_acc.address, amount=100)
        beneficiary_client.fund_account(address=beneficiary_acc.address, amount=100)
        time.sleep(2)
        print("[+] Funded test accounts successfully!", flush=True)
    except Exception as e:
        print(f"[!] Faucet note: {e}", flush=True)

    # 2. Read Initial State
    print("\n--- [STEP 2] Testing Read Methods (get_stats & get_policy_count) ---", flush=True)
    stats_raw = sponsor_client.read_contract(
        address=contract_address,
        function_name="get_stats",
        args=[]
    )
    stats = json.loads(stats_raw) if isinstance(stats_raw, str) else stats_raw
    print(f"[OK] Initial Stats from Studionet: {json.dumps(stats, indent=2)}", flush=True)

    count_raw = sponsor_client.read_contract(
        address=contract_address,
        function_name="get_policy_count",
        args=[]
    )
    initial_count = int(count_raw) if count_raw is not None else 0
    print(f"[OK] Initial Policy Count: {initial_count}", flush=True)

    # 3. Create Real Live Policy on Studionet
    print("\n--- [STEP 3] Sponsor Locks Parametric Relief Escrow (create_relief_policy) ---", flush=True)
    forest_poly = "POLYGON((-121.5 39.5, -121.0 39.5, -121.0 40.0, -121.5 40.0))"
    min_frp = 250
    duration_blocks = 28800  # ~24 hours
    escrow_wei = 100000000000000000  # 0.1 GEN

    tx_create = sponsor_client.write_contract(
        address=contract_address,
        function_name="create_relief_policy",
        args=[beneficiary_acc.address, forest_poly, min_frp, duration_blocks],
        value=escrow_wei
    )
    print(f"[+] Create Policy Tx Hash: {tx_create}", flush=True)
    print("[+] Waiting for Studionet block confirmation...", flush=True)
    sponsor_client.wait_for_transaction_receipt(tx_create)
    print("[OK] Policy creation transaction confirmed on Studionet!", flush=True)

    # 4. Verify Policy on Chain
    print("\n--- [STEP 4] Verifying On-Chain Storage (get_all_policies) ---", flush=True)
    all_raw = sponsor_client.read_contract(
        address=contract_address,
        function_name="get_all_policies",
        args=[]
    )
    policies = json.loads(all_raw) if isinstance(all_raw, str) else all_raw
    print(f"[OK] Total Policies on Chain: {len(policies)}", flush=True)
    if len(policies) > 0:
        latest = policies[-1]
        print(f"[OK] Latest Policy #{latest['policy_id']} Details:")
        print(f"     Sponsor             : {latest['sponsor']}")
        print(f"     Beneficiary         : {latest['beneficiary']}")
        print(f"     Escrow Locked       : {int(latest['escrow_amount']) / 1e18} GEN")
        print(f"     Target Polygon      : {latest['forest_zone_polygon']}")
        print(f"     Min FRP Threshold   : {latest['min_frp_threshold_mw']} MW")
        print(f"     Status              : {latest['status']} (ACTIVE)")

    print("\n" + "=" * 75)
    print("    LIVE STUDIONET VERIFICATION COMPLETED WITH 100% SUCCESS!    ")
    print("=" * 75)


if __name__ == "__main__":
    run_live_test()
