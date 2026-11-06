from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import APITarget, ScanJob, Vulnerability, User
from app.schemas.schemas import DashboardStats, DashboardActivity, SeverityCounts, ScanResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    targets_count = db.query(func.count(APITarget.id)).filter(APITarget.user_id == current_user.id).scalar() or 0
    scans_count = db.query(func.count(ScanJob.id)).filter(ScanJob.user_id == current_user.id).scalar() or 0
    
    # Severity counts
    crit_count = db.query(func.count(Vulnerability.id)).filter(Vulnerability.user_id == current_user.id, Vulnerability.severity == "Critical").scalar() or 0
    high_count = db.query(func.count(Vulnerability.id)).filter(Vulnerability.user_id == current_user.id, Vulnerability.severity == "High").scalar() or 0
    med_count = db.query(func.count(Vulnerability.id)).filter(Vulnerability.user_id == current_user.id, Vulnerability.severity == "Medium").scalar() or 0
    low_count = db.query(func.count(Vulnerability.id)).filter(Vulnerability.user_id == current_user.id, Vulnerability.severity == "Low").scalar() or 0
    info_count = db.query(func.count(Vulnerability.id)).filter(Vulnerability.user_id == current_user.id, Vulnerability.severity == "Informational").scalar() or 0
    total_vulns = crit_count + high_count + med_count + low_count + info_count

    # Overall posture score: average of user's completed scans (or 100 if no completed scans)
    avg_score = db.query(func.avg(ScanJob.security_score)).filter(ScanJob.user_id == current_user.id, ScanJob.status == "completed").scalar()
    overall_score = round(float(avg_score), 1) if avg_score is not None else 100.0

    # Recent scans
    recent_scans_raw = db.query(ScanJob).filter(ScanJob.user_id == current_user.id).order_by(ScanJob.id.desc()).limit(5).all()
    recent_scans = []
    for s in recent_scans_raw:
        t_name = s.target.name if s.target else "Target Deleted"
        scan_resp = ScanResponse.model_validate(s)
        scan_resp.target_name = t_name
        recent_scans.append(scan_resp)

    # Top vulnerable targets
    targets = db.query(APITarget).filter(APITarget.user_id == current_user.id).all()
    target_vulns = []
    for t in targets:
        v_count = db.query(func.count(Vulnerability.id)).filter(Vulnerability.target_id == t.id).scalar() or 0
        latest_scan = db.query(ScanJob).filter(ScanJob.target_id == t.id, ScanJob.status == "completed").order_by(ScanJob.id.desc()).first()
        target_vulns.append({
            "target_id": t.id,
            "target_name": t.name,
            "base_url": t.base_url,
            "vulnerabilities_count": v_count,
            "last_score": latest_scan.security_score if latest_scan else 100.0,
            "last_scan_date": latest_scan.completed_at if latest_scan else None
        })
    target_vulns.sort(key=lambda x: x["vulnerabilities_count"], reverse=True)

    return {
        "total_targets": targets_count,
        "total_scans": scans_count,
        "total_vulnerabilities": total_vulns,
        "severity_breakdown": {
            "critical": crit_count,
            "high": high_count,
            "medium": med_count,
            "low": low_count,
            "informational": info_count
        },
        "overall_posture_score": overall_score,
        "recent_scans": recent_scans,
        "top_vulnerable_targets": target_vulns[:5]
    }

@router.get("/activity", response_model=List[DashboardActivity])
def get_dashboard_activity(days: int = 7, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return day-by-day scan and findings count for line/bar charts."""
    activity = []
    today = datetime.utcnow().date()
    
    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        scans = db.query(func.count(ScanJob.id)).filter(
            ScanJob.user_id == current_user.id,
            ScanJob.started_at >= day_start,
            ScanJob.started_at <= day_end
        ).scalar() or 0

        findings = db.query(func.count(Vulnerability.id)).filter(
            Vulnerability.user_id == current_user.id,
            Vulnerability.detected_at >= day_start,
            Vulnerability.detected_at <= day_end
        ).scalar() or 0
        
        activity.append({
            "date": day.strftime("%b %d"),
            "scans_count": scans,
            "findings_count": findings
        })
        
    return activity

