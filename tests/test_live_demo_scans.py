import time
import requests
import json
import pytest

BASE_BACKEND = "http://127.0.0.1:8000/api"
VULN_TARGET = "http://127.0.0.1:8001"
SECURE_TARGET = "http://127.0.0.1:8002"

def test_live_demo_lab_assessment():
    # 1. Verify Demo APIs are listening
    try:
        r_vuln = requests.get(f"{VULN_TARGET}/api/v1/public/ping", timeout=3)
        assert r_vuln.status_code == 200
        r_sec = requests.get(f"{SECURE_TARGET}/api/v1/public/ping", timeout=3)
        assert r_sec.status_code == 200
    except requests.RequestException as e:
        pytest.skip(f"Demo servers are not running: {e}")

    # 2. Register analyst user
    username = f"analyst_live_{int(time.time())}"
    reg_resp = requests.post(f"{BASE_BACKEND}/auth/register", json={
        "email": f"{username}@sentinel.local",
        "username": username,
        "password": "SecOpsPassword123!",
        "full_name": "Demo Analyst"
    })
    assert reg_resp.status_code == 200
    token = reg_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Vulnerable Target
    vuln_target_resp = requests.post(f"{BASE_BACKEND}/targets", headers=headers, json={
        "name": "InsecureBank Demo Target (Vulnerable)",
        "base_url": VULN_TARGET,
        "description": "Vulnerable test API",
        "auth_type": "bearer",
        "auth_token": "Bearer test_alice_token",
        "secondary_auth_token": "Bearer test_bob_token",
        "timeout_seconds": 6,
        "allow_private_ip": True,
        "authorization_confirmed": True,
        "endpoints": [
            {"path": "/api/v1/public/ping", "method": "GET", "requires_auth": False},
            {"path": "/api/v1/users/1", "method": "GET", "requires_auth": True, "supports_bola_test": True, "param_account_a": "1", "param_account_b": "2"},
            {"path": "/api/v1/orders", "method": "GET", "requires_auth": True},
            {"path": "/api/v1/search", "method": "GET", "requires_auth": False},
            {"path": "/api/v1/admin/export", "method": "POST", "requires_auth": False, "body": {"records": "invalid"}}
        ]
    })
    assert vuln_target_resp.status_code == 201
    vuln_target_id = vuln_target_resp.json()["id"]

    # 4. Launch Scan on Vulnerable Target
    vuln_scan_resp = requests.post(f"{BASE_BACKEND}/scans", headers=headers, json={
        "target_id": vuln_target_id,
        "authorization_confirmed": True,
        "scan_types": ["headers", "auth", "bola", "rate_limiting", "data_exposure", "injection", "misconfiguration", "input_validation"]
    })
    assert vuln_scan_resp.status_code == 201
    vuln_scan_id = vuln_scan_resp.json()["id"]

    # 5. Wait for background execution to complete
    for _ in range(30):
        time.sleep(1)
        check_scan = requests.get(f"{BASE_BACKEND}/scans/{vuln_scan_id}", headers=headers).json()
        if check_scan["status"] in ("completed", "failed"):
            break

    assert check_scan["status"] == "completed"
    print(f"\nVulnerable API Scan #{vuln_scan_id} Completed!")
    print(f"Score: {check_scan['security_score']}/100, Findings: {check_scan['vulnerabilities_count']}")
    assert check_scan["security_score"] < 50.0  # Demonstrates severe posture degradation
    assert check_scan["vulnerabilities_count"] >= 4

    # 6. Verify Findings details
    vuln_findings = requests.get(f"{BASE_BACKEND}/scans/{vuln_scan_id}/results", headers=headers).json()
    finding_names = [f["name"] for f in vuln_findings]
    print("Detected Vulnerabilities:", finding_names)
    assert any("BOLA" in n or "Authorization" in n for n in finding_names)
    assert any("Authentication" in n for n in finding_names)
    assert any("Data Exposure" in n for n in finding_names)

    # 7. Generate PDF Report
    report_resp = requests.post(f"{BASE_BACKEND}/reports/{vuln_scan_id}/generate", headers=headers)
    assert report_resp.status_code == 201
    rep_id = report_resp.json()["id"]

    # Download report
    dl_resp = requests.get(f"{BASE_BACKEND}/reports/{rep_id}/download", headers=headers)
    assert dl_resp.status_code == 200
    assert dl_resp.headers.get("content-type") == "application/pdf"
    assert len(dl_resp.content) > 1000

    # 8. Create Secure Target (:8002)
    sec_target_resp = requests.post(f"{BASE_BACKEND}/targets", headers=headers, json={
        "name": "SecureBank Reference API (Hardened)",
        "base_url": SECURE_TARGET,
        "description": "Hardened test API",
        "auth_type": "bearer",
        "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkFsaWNlIn0.vWkZ11N2zU0v39eD9-x8xS77x1v68m8w1q4zQ",
        "secondary_auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwibmFtZSI6IkJvYiJ9.vWkZ11N2zU0v39eD9-x8xS77x1v68m8w1q4zQ",
        "timeout_seconds": 6,
        "allow_private_ip": True,
        "authorization_confirmed": True,
        "endpoints": [
            {"path": "/api/v1/public/ping", "method": "GET", "requires_auth": False},
            {"path": "/api/v1/users/1", "method": "GET", "requires_auth": True, "supports_bola_test": True, "param_account_a": "1", "param_account_b": "2"},
            {"path": "/api/v1/orders", "method": "GET", "requires_auth": True},
            {"path": "/api/v1/search", "method": "GET", "requires_auth": False}
        ]
    })
    assert sec_target_resp.status_code == 201
    sec_target_id = sec_target_resp.json()["id"]

    # 9. Launch Scan on Secure Target
    sec_scan_resp = requests.post(f"{BASE_BACKEND}/scans", headers=headers, json={
        "target_id": sec_target_id,
        "authorization_confirmed": True,
        "scan_types": ["headers", "auth", "bola", "rate_limiting", "data_exposure", "injection", "misconfiguration", "input_validation"]
    })
    assert sec_scan_resp.status_code == 201
    sec_scan_id = sec_scan_resp.json()["id"]

    for _ in range(30):
        time.sleep(1)
        check_sec_scan = requests.get(f"{BASE_BACKEND}/scans/{sec_scan_id}", headers=headers).json()
        if check_sec_scan["status"] in ("completed", "failed"):
            break

    assert check_sec_scan["status"] == "completed"
    print(f"\nSecure API Scan #{sec_scan_id} Completed!")
    print(f"Score: {check_sec_scan['security_score']}/100, Findings: {check_sec_scan['vulnerabilities_count']}")
    
    # 10. Compare scores
    assert check_sec_scan["security_score"] > check_scan["security_score"]
    score_improvement = check_sec_scan["security_score"] - check_scan["security_score"]
    print(f"Posture Improvement: +{score_improvement:.1f} points!")
    assert score_improvement >= 40.0

