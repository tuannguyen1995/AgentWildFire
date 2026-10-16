import pytest
import json
from genlayer import *


def test_agentwildfire_confirmed_disaster_relief_payout(client):
    """Proves that a verified severe wildfire alert releases 100% relief funds to beneficiary."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    beneficiary = client.accounts[1]

    # Step 1: Sponsor locks 1.5 GEN relief escrow
    tx_create = contract.connect(sponsor).create_relief_policy(
        args=[str(beneficiary), "POLYGON((-121.5 39.5, -121.0 39.5, -121.0 40.0, -121.5 40.0))", 250, 6000],
        value=1500000000000000000  # 1.5 GEN
    )
    policy_id = str(tx_create.return_value)

    # Step 2: Trigger alert with NASA FIRMS active fire endpoint
    firms_url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/MODIS_NRT/california_fire.json"
    contract.connect(beneficiary).trigger_wildfire_alert(
        args=[policy_id, firms_url]
    )

    # Step 3: Mock AI Satellite Jury -> Peak FRP 420 MW (> 250 MW threshold)
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WILDFIRE_RELIEF_V1",
                    "verdict": "DISASTER_RELIEF_CONFIRMED",
                    "confidence": 98,
                    "measured_peak_frp_mw": 420,
                    "burned_area_hectares": 1250,
                    "reason": "Severe thermal signature detected. FRP breached 250 MW trigger threshold."
                })
            },
            "web_mocks": {
                firms_url: {"status": 200, "body": '{"latitude": 39.75, "longitude": -121.3, "frp": 420.5}'}
            }
        }
    )

    contract.connect(beneficiary).adjudicate_wildfire_severity(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert p_data["verdict"] == "DISASTER_RELIEF_CONFIRMED"
    assert p_data["measured_peak_frp_mw"] == 420

    # Step 4: Advance past 24-block (~72s) cooling window and finalize
    contract.advance_time(75)
    contract.connect(beneficiary).finalize_settlement(args=[policy_id])

    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 3  # STATUS_SETTLED_DISASTER_PAID
    assert p_settled["escrow_amount"] == "0"


def test_agentwildfire_unaccredited_source_rejected(client):
    """Proves that trigger alerts from unaccredited sources (e.g. random blog) are rejected."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    beneficiary = client.accounts[1]

    tx_create = contract.connect(sponsor).create_relief_policy(
        args=[str(beneficiary), "POLYGON((-120 38, -119 38, -119 39, -120 39))", 300, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    # Fake blog source must be reverted
    with pytest.raises(Exception) as exc_info:
        contract.connect(beneficiary).trigger_wildfire_alert(
            args=[policy_id, "https://my-wildfire-blog.com/alerts/fake.json"]
        )
    assert "Telemetry unauthenticated" in str(exc_info.value)


def test_agentwildfire_partial_relief_payout(client):
    """Proves that a moderate spot fire awards 40% relief and refunds 60% to sponsor."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    beneficiary = client.accounts[1]

    tx_create = contract.connect(sponsor).create_relief_policy(
        args=[str(beneficiary), "POLYGON((-122 37, -121 37, -121 38, -122 38))", 300, 6000],
        value=1000000000000000000  # 1.0 GEN
    )
    policy_id = str(tx_create.return_value)

    sentinel_url = "https://sentinel-hub.com/api/v1/wildfire_thermal_zone_42.json"
    contract.connect(beneficiary).trigger_wildfire_alert(args=[policy_id, sentinel_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WILDFIRE_RELIEF_V1",
                    "verdict": "PARTIAL_RELIEF_GRANTED",
                    "confidence": 92,
                    "measured_peak_frp_mw": 180,
                    "burned_area_hectares": 350,
                    "reason": "Spot fire detected within containment corridor. 40% relief authorized."
                })
            },
            "web_mocks": {
                sentinel_url: {"status": 200, "body": '{"band_frp": 180.2, "perimeter_status": "contained"}'}
            }
        }
    )

    contract.connect(sponsor).adjudicate_wildfire_severity(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert p_data["verdict"] == "PARTIAL_RELIEF_GRANTED"

    contract.advance_time(80)
    contract.connect(sponsor).finalize_settlement(args=[policy_id])

    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 4  # STATUS_SETTLED_PARTIAL_RELIEF

    # Beneficiary received 40% (0.4 GEN = 400000000000000000)
    bal_beneficiary = contract.get_claimable_balance(args=[beneficiary]).call()
    assert int(bal_beneficiary) == 400000000000000000


def test_agentwildfire_false_alarm_dismissed_refund(client):
    """Proves that a controlled burn / low-thermal flare is classified FALSE_ALARM and refunds sponsor."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    beneficiary = client.accounts[1]

    tx_create = contract.connect(sponsor).create_relief_policy(
        args=[str(beneficiary), "POLYGON((-123 45, -122 45, -122 46, -123 46))", 400, 6000],
        value=2000000000000000000  # 2.0 GEN
    )
    policy_id = str(tx_create.return_value)

    noaa_url = "https://noaa.gov/telemetry/hazard_mapping_system.json"
    contract.connect(beneficiary).trigger_wildfire_alert(args=[policy_id, noaa_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WILDFIRE_RELIEF_V1",
                    "verdict": "FALSE_ALARM_DISMISSED",
                    "confidence": 96,
                    "measured_peak_frp_mw": 45,
                    "burned_area_hectares": 5,
                    "reason": "Controlled prescribed agricultural burn verified. No threat to protected canopy."
                })
            },
            "web_mocks": {
                noaa_url: {"status": 200, "body": '{"detected_burn_type": "prescribed", "frp": 45.0}'}
            }
        }
    )

    contract.connect(beneficiary).adjudicate_wildfire_severity(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["verdict"] == "FALSE_ALARM_DISMISSED"

    contract.advance_time(75)
    contract.connect(sponsor).finalize_settlement(args=[policy_id])

    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 5  # STATUS_SETTLED_FALSE_ALARM

    # 100% refunded to sponsor
    sponsor_bal = contract.get_claimable_balance(args=[sponsor]).call()
    assert int(sponsor_bal) == 2000000000000000000


def test_agentwildfire_appeal_with_bond_and_overturn(client):
    """Proves that a dispute filed within cooling-off with 10% bond triggers appellate review."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    beneficiary = client.accounts[1]

    # Escrow 1.0 GEN
    tx_create = contract.connect(sponsor).create_relief_policy(
        args=[str(beneficiary), "POLYGON((-121 38, -120 38, -120 39, -121 39))", 200, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    effis_url = "https://effis.jrc.ec.europa.eu/api/active_fires.json"
    contract.connect(beneficiary).trigger_wildfire_alert(args=[policy_id, effis_url])

    # Initial jury renders FALSE_ALARM_DISMISSED
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WILDFIRE_RELIEF_V1",
                    "verdict": "FALSE_ALARM_DISMISSED",
                    "confidence": 75,
                    "measured_peak_frp_mw": 90,
                    "burned_area_hectares": 20,
                    "reason": "Cloud cover obscured sensor readings."
                })
            },
            "web_mocks": {
                effis_url: {"status": 200, "body": '{"cloud_cover": 0.85, "detected_frp": 90.0}'}
            }
        }
    )
    contract.connect(sponsor).adjudicate_wildfire_severity(args=[policy_id])

    p_awaiting = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_awaiting["status"] == 2  # STATUS_AWAITING_PAYOUT

    # Beneficiary stakes 10% bond (0.1 GEN) with high-res Sentinel telemetry
    copernicus_url = "https://emergency.copernicus.eu/mapping/ems-rapid/EMSR999_thermal.json"
    contract.connect(beneficiary).appeal_verdict(
        args=[policy_id, "Cloud cleared: Severe crown fire breach verified by Copernicus Sentinel-2.", copernicus_url],
        value=100000000000000000  # 0.1 GEN (10%)
    )

    p_disputed = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_disputed["status"] == 6  # STATUS_DISPUTED
    assert int(p_disputed["dispute_bond"]) == 100000000000000000

    # Appellate tribunal verifies full disaster breach
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WILDFIRE_RELIEF_V1",
                    "verdict": "APPEAL_UPHELD_DISASTER",
                    "reason": "Copernicus multispectral sensors verify uncontrolled crown fire exceeding 380 MW."
                })
            },
            "web_mocks": {
                copernicus_url: {"status": 200, "body": '{"frp_infrared_mw": 382.5, "burn_severity": "EXTREME"}'}
            }
        }
    )

    contract.connect(beneficiary).adjudicate_appeal(args=[policy_id])

    p_final = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_final["status"] == 3  # STATUS_SETTLED_DISASTER_PAID
    assert p_final["verdict"] == "DISASTER_RELIEF_CONFIRMED"

    # Beneficiary received 100% escrow (1.0 GEN) + refund of 10% dispute bond (0.1 GEN) = 1.1 GEN
    ben_bal = contract.get_claimable_balance(args=[beneficiary]).call()
    assert int(ben_bal) == 1100000000000000000


def test_agentwildfire_unresolved_telemetry_fetch_failure(client):
    """Proves that a broken satellite endpoint reverts safely to STATUS_UNRESOLVED without settling."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    beneficiary = client.accounts[1]

    tx_create = contract.connect(sponsor).create_relief_policy(
        args=[str(beneficiary), "POLYGON((-120 37, -119 37, -119 38, -120 38))", 250, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    nasa_url = "https://firms.modaps.eosdis.nasa.gov/api/unavailable_data.json"
    contract.connect(beneficiary).trigger_wildfire_alert(args=[policy_id, nasa_url])

    # Satellite endpoint is 404 / down
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {
                nasa_url: {"status": 404, "body": ""}
            }
        }
    )

    contract.connect(beneficiary).adjudicate_wildfire_severity(args=[policy_id])

    p_unresolved = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_unresolved["status"] == 8  # STATUS_UNRESOLVED
    assert p_unresolved["verdict"] == "UNRESOLVED_FETCH_FAILED"

    # Cannot finalize an unresolved policy
    with pytest.raises(Exception) as exc_info:
        contract.connect(beneficiary).finalize_settlement(args=[policy_id])
    assert "unresolved error state" in str(exc_info.value)


def test_agentwildfire_cancel_or_reclaim_expired(client):
    """Proves sponsor can reclaim unbreached escrow after policy expiration."""
    contract = client.deploy("contracts/contract.py")
    sponsor = client.accounts[0]
    beneficiary = client.accounts[1]

    # Create policy with duration 100 blocks = 300s
    tx_create = contract.connect(sponsor).create_relief_policy(
        args=[str(beneficiary), "POLYGON((-121 39, -120 39, -120 40, -121 40))", 200, 100],
        value=500000000000000000  # 0.5 GEN
    )
    policy_id = str(tx_create.return_value)

    # Reclaim before expiry must fail
    with pytest.raises(Exception) as exc_info:
        contract.connect(sponsor).cancel_or_reclaim(args=[policy_id])
    assert "still active" in str(exc_info.value)

    # Advance time beyond 300 seconds
    contract.advance_time(350)
    contract.connect(sponsor).cancel_or_reclaim(args=[policy_id])

    p_reclaimed = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_reclaimed["status"] == 7  # STATUS_EXPIRED_RECLAIMED
    assert p_reclaimed["verdict"] == "EXPIRED_CLEAN"

    # Sponsor received full refund in claimable balance
    sponsor_bal = contract.get_claimable_balance(args=[sponsor]).call()
    assert int(sponsor_bal) == 500000000000000000


def test_agentwildfire_pull_payment_claim(client):
    """Proves that beneficiary can claim buffered balances via pull-payment."""
    contract = client.deploy("contracts/contract.py")
    beneficiary = client.accounts[1]

    # Artificially credit balance and claim
    contract._safe_transfer(beneficiary, 750000000000000000)
    assert int(contract.get_claimable_balance(args=[beneficiary]).call()) == 750000000000000000

    contract.connect(beneficiary).claim_payout()
    assert int(contract.get_claimable_balance(args=[beneficiary]).call()) == 0


def test_agentwildfire_deploy_with_int_or_str_address(client):
    """Proves that contract safely initializes when Studio passes an integer or string address."""
    # Deploy with integer address argument (as GenLayer Studio does: 312826998849709214553341560051459171502959144246)
    int_addr = 312826998849709214553341560051459171502959144246
    contract_int = client.deploy("contracts/contract.py", args=[int_addr])
    stats = json.loads(contract_int.get_stats().call())
    assert stats["owner"] == "0x36cba5d4d4d0a2dc6d57e81d8e82385a08c8ad36"

    # Also deploy with no arguments
    contract_empty = client.deploy("contracts/contract.py")
    stats_empty = json.loads(contract_empty.get_stats().call())
    assert stats_empty["owner"] != ""

