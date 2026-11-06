import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.main import app
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.ssrf import validate_target_url
from app.scanner.scoring import calculate_security_score
from app.reports.pdf_generator import generate_security_pdf_report
from app.scanner.modules.data_exposure import traverse_json

client = TestClient(app)

def test_password_hashing():
    pwd = "SecOpsPassword123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_creation_and_decoding():
    payload = {"sub": "analyst_bob", "user_id": 42}
    token = create_access_token(payload)
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded.get("sub") == "analyst_bob"
    assert decoded.get("user_id") == 42

def test_ssrf_protection_cloud_metadata():
    # Cloud metadata IPs must NEVER be allowed under any conditions
    is_valid, reason = validate_target_url("http://169.254.169.254/latest/meta-data/", allow_private_subnets=True)
    assert is_valid is False
    assert "metadata" in reason.lower() or "forbidden" in reason.lower()

    is_valid, reason = validate_target_url("http://metadata.google.internal/computeMetadata/v1/", allow_private_subnets=True)
    assert is_valid is False

def test_security_scoring_formula():
    findings = [
        {"severity": "Critical", "name": "BOLA"},
        {"severity": "High", "name": "Missing Auth"},
        {"severity": "Medium", "name": "Missing Rate Limit"},
        {"severity": "Low", "name": "Server Banner Disclosure"},
        {"severity": "Informational", "name": "Missing Referrer-Policy"},
    ]
    # Expected deduction = 25 + 15 + 7 + 3 + 0 = 50
    # Expected score = 100 - 50 = 50.0
    result = calculate_security_score(findings)
    assert result["score"] == 50.0
    assert result["counts"]["Critical"] == 1
    assert result["counts"]["High"] == 1
    assert result["counts"]["Medium"] == 1
    assert result["counts"]["Low"] == 1
    assert result["grade"] == "C"

def test_excessive_data_exposure_traversal():
    mock_payload = {
        "status": "success",
        "user": {
            "id": 1,
            "username": "alice",
            "password_hash": "$2b$12$eX4mpL3H4sh",
            "ssn": "123-45-6789",
            "public_bio": "Cybersecurity researcher"
        }
    }
    leaks = traverse_json(mock_payload)
    assert len(leaks) >= 2
    keys = [l["key"] for l in leaks]
    assert any("password_hash" in k for k in keys)
    assert any("ssn" in k for k in keys)

def test_pdf_report_generator(tmp_path):
    output_pdf = str(tmp_path / "test_assessment_report.pdf")
    scan_data = {
        "id": 1,
        "security_score": 85.0,
        "duration_seconds": 3.45,
        "endpoints_tested_count": 4,
        "critical_count": 0,
        "high_count": 1,
        "medium_count": 0,
        "low_count": 0,
        "info_count": 0
    }
    target_data = {
        "name": "Integration Test Target API",
        "base_url": "http://127.0.0.1:8001",
        "auth_type": "bearer"
    }
    vulns = [
        {
            "name": "Excessive Data Exposure",
            "category": "Data Exposure",
            "severity": "High",
            "owasp_category": "API3:2023 Broken Object Property Level Authorization",
            "endpoint": "/api/v1/users/1",
            "http_method": "GET",
            "description": "Sensitive credentials leaked in response.",
            "evidence_summary": "Found 'password_hash' and 'ssn' fields.",
            "remediation": "Apply DTO response models.",
            "status": "open"
        }
    ]
    res_path = generate_security_pdf_report(output_pdf, scan_data, target_data, vulns)
    assert os.path.exists(res_path)
    assert os.path.getsize(res_path) > 1000  # valid pdf file size

def test_auth_and_target_api_flow():
    # 1. Register a test user
    rand_username = f"analyst_test_{os.urandom(3).hex()}"
    reg_res = client.post("/api/auth/register", json={
        "email": f"{rand_username}@sentinel.test",
        "username": rand_username,
        "password": "Password123!",
        "full_name": "Test Officer"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get profile
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == rand_username

    # 3. Create target
    target_res = client.post("/api/targets", headers=headers, json={
        "name": "My Secure Endpoint",
        "base_url": "http://127.0.0.1:8001",
        "description": "Lab target",
        "auth_type": "bearer",
        "auth_token": "Bearer test_token",
        "timeout_seconds": 5,
        "allow_private_ip": True,
        "authorization_confirmed": True,
        "endpoints": [
            {"path": "/api/v1/public/ping", "method": "GET", "requires_auth": False}
        ]
    })
    assert target_res.status_code == 201
    target_id = target_res.json()["id"]

    # 4. List targets
    list_res = client.get("/api/targets", headers=headers)
    assert list_res.status_code == 200
    assert any(t["id"] == target_id for t in list_res.json())

    # 5. Dashboard stats
    dash_res = client.get("/api/dashboard/stats", headers=headers)
    assert dash_res.status_code == 200
    assert dash_res.json()["total_targets"] >= 1

