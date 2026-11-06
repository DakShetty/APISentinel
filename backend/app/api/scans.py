import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import ScanJob, APITarget, Vulnerability, User
from app.schemas.schemas import ScanCreate, ScanResponse, VulnerabilityResponse
from app.api.deps import get_current_user
from app.scanner.engine import run_scan_in_background, cancel_scan

router = APIRouter(prefix="/scans", tags=["Security Scans"])

def _format_scan_response(scan: ScanJob) -> dict:
    target_name = scan.target.name if scan.target else "Target Deleted"
    return {
        "id": scan.id,
        "target_id": scan.target_id,
        "target_name": target_name,
        "status": scan.status,
        "progress_percent": scan.progress_percent,
        "current_stage": scan.current_stage or "",
        "endpoints_tested_count": scan.endpoints_tested_count,
        "vulnerabilities_count": scan.vulnerabilities_count,
        "critical_count": scan.critical_count,
        "high_count": scan.high_count,
        "medium_count": scan.medium_count,
        "low_count": scan.low_count,
        "info_count": scan.info_count,
        "security_score": scan.security_score,
        "started_at": scan.started_at,
        "completed_at": scan.completed_at,
        "duration_seconds": scan.duration_seconds,
        "error_message": scan.error_message
    }

@router.post("", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
def start_scan(scan_in: ScanCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not scan_in.authorization_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit permission to assess target must be acknowledged before initiating scan."
        )

    target = db.query(APITarget).filter(APITarget.id == scan_in.target_id, APITarget.user_id == current_user.id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")

    # If custom endpoints were submitted with the scan request, update the target's endpoints
    if scan_in.custom_endpoints is not None and len(scan_in.custom_endpoints) > 0:
        target.endpoints_json = json.dumps([ep.model_dump() for ep in scan_in.custom_endpoints])
        db.commit()

    scan_config = {
        "scan_types": scan_in.scan_types,
        "timeout": target.timeout_seconds
    }

    new_scan = ScanJob(
        target_id=target.id,
        user_id=current_user.id,
        status="queued",
        progress_percent=0,
        current_stage="Assessment queued for background execution",
        scan_config_json=json.dumps(scan_config)
    )
    db.add(new_scan)
    db.commit()
    db.refresh(new_scan)

    # Launch background thread
    run_scan_in_background(new_scan.id)

    return _format_scan_response(new_scan)

@router.get("", response_model=List[ScanResponse])
def get_scans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scans = db.query(ScanJob).filter(ScanJob.user_id == current_user.id).order_by(ScanJob.id.desc()).all()
    return [_format_scan_response(s) for s in scans]

@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(scan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id, ScanJob.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan job not found")
    return _format_scan_response(scan)

@router.get("/{scan_id}/results", response_model=List[VulnerabilityResponse])
def get_scan_results(scan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id, ScanJob.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan job not found")
    
    findings = db.query(Vulnerability).filter(Vulnerability.scan_id == scan_id).order_by(Vulnerability.id.asc()).all()
    target_name = scan.target.name if scan.target else "Target Deleted"

    result = []
    for f in findings:
        item = VulnerabilityResponse.model_validate(f)
        item.target_name = target_name
        result.append(item)
    return result

@router.post("/{scan_id}/cancel")
def cancel_scan_endpoint(scan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id, ScanJob.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan job not found")
    
    if scan.status in ("completed", "failed", "cancelled"):
        return {"message": f"Scan is already {scan.status}"}

    cancel_scan(scan_id)
    scan.status = "cancelled"
    scan.current_stage = "Scan was cancelled by user"
    db.commit()
    return {"message": "Scan cancelled successfully"}

