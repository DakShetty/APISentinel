import json
import time
import datetime
import threading
import requests
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import ScanJob, APITarget, Vulnerability, Report
from app.scanner.scoring import calculate_security_score
from app.scanner.modules.headers import check_security_headers
from app.scanner.modules.authentication import check_authentication
from app.scanner.modules.bola import check_bola
from app.scanner.modules.rate_limiting import check_rate_limiting
from app.scanner.modules.data_exposure import check_excessive_data_exposure
from app.scanner.modules.injection import check_safe_injection_indicators
from app.scanner.modules.misconfiguration import check_security_misconfiguration
from app.scanner.modules.input_validation import check_input_validation

# Active scan cancellation registry
CANCELLED_SCANS = set()

def cancel_scan(scan_id: int):
    CANCELLED_SCANS.add(scan_id)

def is_scan_cancelled(scan_id: int) -> bool:
    return scan_id in CANCELLED_SCANS

def run_scan_in_background(scan_id: int):
    """Launch scan execution in a separate daemon thread."""
    thread = threading.Thread(target=_execute_scan, args=(scan_id,), daemon=True)
    thread.start()

def _execute_scan(scan_id: int):
    db: Session = SessionLocal()
    start_time = time.time()
    
    try:
        scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
        if not scan:
            return
        
        target = db.query(APITarget).filter(APITarget.id == scan.target_id).first()
        if not target:
            scan.status = "failed"
            scan.error_message = "Associated target could not be found."
            db.commit()
            return
        
        scan.status = "running"
        scan.started_at = datetime.datetime.utcnow()
        scan.progress_percent = 5
        scan.current_stage = "Resolving target host and baseline connectivity"
        db.commit()

        # Parse endpoints
        endpoints = []
        try:
            endpoints = json.loads(target.endpoints_json or "[]")
        except Exception:
            endpoints = []
            
        if not endpoints:
            # Default root probe if no specific endpoints configured
            endpoints = [{"path": "/", "method": "GET", "requires_auth": False}]

        # Parse scan configuration
        scan_types = [
            "headers",
            "auth",
            "bola",
            "rate_limiting",
            "data_exposure",
            "injection",
            "misconfiguration",
            "input_validation"
        ]
        try:
            cfg = json.loads(scan.scan_config_json or "{}")
            if "scan_types" in cfg and cfg["scan_types"]:
                scan_types = cfg["scan_types"]
        except Exception:
            pass

        all_findings: List[Dict[str, Any]] = []
        session = requests.Session()
        timeout = target.timeout_seconds or 8
        base_url = target.base_url.rstrip('/')
        total_steps = len(endpoints) * len(scan_types)
        current_step = 0

        # Run checks across endpoints
        for ep_idx, ep in enumerate(endpoints):
            if is_scan_cancelled(scan_id):
                scan.status = "cancelled"
                scan.current_stage = "Scan cancelled by user"
                db.commit()
                return

            ep_path = ep.get("path", "/")
            ep_method = ep.get("method", "GET").upper()

            # 1. HTTP Security Headers Check
            if "headers" in scan_types:
                scan.current_stage = f"Testing Security Headers on {ep_method} {ep_path}"
                db.commit()
                findings = check_security_headers(base_url, ep_path, session, timeout=timeout)
                all_findings.extend(findings)
                current_step += 1
                scan.progress_percent = min(95, int(10 + (current_step / max(1, total_steps)) * 80))
                db.commit()

            # 2. Authentication Verification
            if "auth" in scan_types:
                scan.current_stage = f"Evaluating Authentication Controls on {ep_method} {ep_path}"
                db.commit()
                findings = check_authentication(
                    base_url=base_url,
                    endpoint_config=ep,
                    session=session,
                    auth_header_key=target.auth_header_key or "Authorization",
                    valid_token=target.auth_token,
                    timeout=timeout
                )
                all_findings.extend(findings)
                current_step += 1
                scan.progress_percent = min(95, int(10 + (current_step / max(1, total_steps)) * 80))
                db.commit()

            # 3. BOLA / IDOR Verification
            if "bola" in scan_types:
                scan.current_stage = f"Analyzing Object Level Authorization (BOLA) on {ep_method} {ep_path}"
                db.commit()
                findings = check_bola(
                    base_url=base_url,
                    endpoint_config=ep,
                    auth_header_key=target.auth_header_key or "Authorization",
                    token_account_a=target.auth_token,
                    token_account_b=target.secondary_auth_token,
                    timeout=timeout
                )
                all_findings.extend(findings)
                current_step += 1
                scan.progress_percent = min(95, int(10 + (current_step / max(1, total_steps)) * 80))
                db.commit()

            # 4. Rate Limiting Assessment
            if "rate_limiting" in scan_types:
                scan.current_stage = f"Probing Rate Limiting Thresholds on {ep_method} {ep_path}"
                db.commit()
                findings = check_rate_limiting(
                    base_url=base_url,
                    endpoint_config=ep,
                    auth_header_key=target.auth_header_key or "Authorization",
                    auth_token=target.auth_token,
                    burst_count=8,
                    timeout=timeout
                )
                all_findings.extend(findings)
                current_step += 1
                scan.progress_percent = min(95, int(10 + (current_step / max(1, total_steps)) * 80))
                db.commit()

            # 5. Excessive Data Exposure Check
            if "data_exposure" in scan_types:
                scan.current_stage = f"Auditing Data Exposure on {ep_method} {ep_path}"
                db.commit()
                findings = check_excessive_data_exposure(
                    base_url=base_url,
                    endpoint_config=ep,
                    auth_header_key=target.auth_header_key or "Authorization",
                    auth_token=target.auth_token,
                    timeout=timeout
                )
                all_findings.extend(findings)
                current_step += 1
                scan.progress_percent = min(95, int(10 + (current_step / max(1, total_steps)) * 80))
                db.commit()

            # 6. Injection & Error Leakage Check
            if "injection" in scan_types:
                scan.current_stage = f"Executing Safe Injection Syntax Probing on {ep_method} {ep_path}"
                db.commit()
                findings = check_safe_injection_indicators(
                    base_url=base_url,
                    endpoint_config=ep,
                    auth_header_key=target.auth_header_key or "Authorization",
                    auth_token=target.auth_token,
                    timeout=timeout
                )
                all_findings.extend(findings)
                current_step += 1
                scan.progress_percent = min(95, int(10 + (current_step / max(1, total_steps)) * 80))
                db.commit()

            # 7. Security Misconfiguration & CORS
            if "misconfiguration" in scan_types:
                scan.current_stage = f"Testing CORS and Configuration Flags on {ep_method} {ep_path}"
                db.commit()
                findings = check_security_misconfiguration(
                    base_url=base_url,
                    endpoint=ep_path,
                    auth_header_key=target.auth_header_key or "Authorization",
                    auth_token=target.auth_token,
                    timeout=timeout
                )
                all_findings.extend(findings)
                current_step += 1
                scan.progress_percent = min(95, int(10 + (current_step / max(1, total_steps)) * 80))
                db.commit()

            # 8. Input Validation & Type Strictness
            if "input_validation" in scan_types:
                scan.current_stage = f"Evaluating Input Validation on {ep_method} {ep_path}"
                db.commit()
                findings = check_input_validation(
                    base_url=base_url,
                    endpoint_config=ep,
                    auth_header_key=target.auth_header_key or "Authorization",
                    auth_token=target.auth_token,
                    timeout=timeout
                )
                all_findings.extend(findings)
                current_step += 1
                scan.progress_percent = min(95, int(10 + (current_step / max(1, total_steps)) * 80))
                db.commit()

        # Deduplicate findings by (endpoint, http_method, name)
        unique_findings = []
        seen = set()
        for f in all_findings:
            key = (f.get("endpoint"), f.get("http_method"), f.get("name"))
            if key not in seen:
                seen.add(key)
                unique_findings.append(f)

        # Persist findings to database
        scan.current_stage = "Calculating Posture Score and Saving Findings"
        scan.progress_percent = 96
        db.commit()

        for f in unique_findings:
            vuln_obj = Vulnerability(
                scan_id=scan.id,
                target_id=target.id,
                user_id=scan.user_id,
                name=f.get("name"),
                category=f.get("category"),
                severity=f.get("severity"),
                owasp_category=f.get("owasp_category"),
                endpoint=f.get("endpoint"),
                http_method=f.get("http_method"),
                description=f.get("description"),
                evidence_summary=f.get("evidence_summary"),
                remediation=f.get("remediation"),
                status="open",
                detected_at=datetime.datetime.utcnow()
            )
            db.add(vuln_obj)

        # Calculate security score
        score_data = calculate_security_score(unique_findings)
        counts = score_data["counts"]

        duration = round(time.time() - start_time, 2)
        scan.status = "completed"
        scan.progress_percent = 100
        scan.current_stage = "Assessment completed successfully"
        scan.endpoints_tested_count = len(endpoints)
        scan.vulnerabilities_count = len(unique_findings)
        scan.critical_count = counts["Critical"]
        scan.high_count = counts["High"]
        scan.medium_count = counts["Medium"]
        scan.low_count = counts["Low"]
        scan.info_count = counts["Informational"]
        scan.security_score = score_data["score"]
        scan.completed_at = datetime.datetime.utcnow()
        scan.duration_seconds = duration

        db.commit()

    except Exception as e:
        db.rollback()
        try:
            scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
            if scan:
                scan.status = "failed"
                scan.error_message = f"Scan error: {str(e)}"
                scan.completed_at = datetime.datetime.utcnow()
                scan.duration_seconds = round(time.time() - start_time, 2)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
        if scan_id in CANCELLED_SCANS:
            CANCELLED_SCANS.remove(scan_id)

