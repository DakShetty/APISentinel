import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import decode_access_token
from app.models.models import Report, ScanJob, Vulnerability, APITarget, User
from app.schemas.schemas import ReportResponse
from app.api.deps import get_current_user
from app.reports.pdf_generator import generate_security_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports"])

oauth2_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user_flexible(
    token_header: Optional[str] = Depends(oauth2_optional),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> User:
    """Accept JWT authentication from either Authorization header or ?token= query parameter."""
    token = token_header or token_query
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid token in the Authorization header or ?token= parameter.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(User).filter(User.username == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    return user

@router.get("", response_model=List[ReportResponse])
def get_reports(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reports = db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.id.desc()).all()
    return reports

@router.post("/{scan_id}/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(scan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id, ScanJob.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan job not found")
        
    target = db.query(APITarget).filter(APITarget.id == scan.target_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated target not found")

    findings = db.query(Vulnerability).filter(Vulnerability.scan_id == scan.id).all()
    vuln_dicts = [
        {
            "name": f.name,
            "category": f.category,
            "severity": f.severity,
            "owasp_category": f.owasp_category,
            "endpoint": f.endpoint,
            "http_method": f.http_method,
            "description": f.description,
            "evidence_summary": f.evidence_summary,
            "remediation": f.remediation,
            "status": f.status
        }
        for f in findings
    ]

    scan_dict = {
        "id": scan.id,
        "security_score": scan.security_score,
        "duration_seconds": scan.duration_seconds,
        "endpoints_tested_count": scan.endpoints_tested_count,
        "critical_count": scan.critical_count,
        "high_count": scan.high_count,
        "medium_count": scan.medium_count,
        "low_count": scan.low_count,
        "info_count": scan.info_count
    }

    target_dict = {
        "name": target.name,
        "base_url": target.base_url,
        "auth_type": target.auth_type
    }

    filename = f"API_Sentinel_Report_Scan_{scan.id:04d}_{target.name.replace(' ', '_')}.pdf"
    output_path = os.path.join(settings.REPORTS_DIR, filename)

    generate_security_pdf_report(
        output_path=output_path,
        scan_data=scan_dict,
        target_data=target_dict,
        vulnerabilities=vuln_dicts
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    new_report = Report(
        scan_id=scan.id,
        user_id=current_user.id,
        title=f"Security Assessment: {target.name} (Scan #{scan.id})",
        file_path=output_path,
        file_size_bytes=file_size,
        security_score=scan.security_score
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return new_report

@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    current_user: User = Depends(get_current_user_flexible),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found on disk")

    filename = os.path.basename(report.file_path)
    return FileResponse(
        path=report.file_path,
        filename=filename,
        media_type="application/pdf"
    )
