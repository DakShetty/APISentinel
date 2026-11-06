from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Vulnerability, User, APITarget
from app.schemas.schemas import VulnerabilityResponse, VulnerabilityStatusUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/vulnerabilities", tags=["Vulnerability Management"])

@router.get("", response_model=List[VulnerabilityResponse])
def get_vulnerabilities(
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    target_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Vulnerability).filter(Vulnerability.user_id == current_user.id)

    if severity:
        query = query.filter(Vulnerability.severity.ilike(severity))
    if category:
        query = query.filter(Vulnerability.category.ilike(f"%{category}%"))
    if target_id:
        query = query.filter(Vulnerability.target_id == target_id)
    if status:
        query = query.filter(Vulnerability.status == status)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Vulnerability.name.ilike(search_fmt)) |
            (Vulnerability.endpoint.ilike(search_fmt)) |
            (Vulnerability.description.ilike(search_fmt)) |
            (Vulnerability.owasp_category.ilike(search_fmt))
        )

    findings = query.order_by(Vulnerability.id.desc()).all()
    
    # Enrich with target_name
    result = []
    targets_map = {t.id: t.name for t in db.query(APITarget).filter(APITarget.user_id == current_user.id).all()}
    
    for f in findings:
        item = VulnerabilityResponse.model_validate(f)
        item.target_name = targets_map.get(f.target_id, "Target Deleted")
        result.append(item)

    return result

@router.get("/{vuln_id}", response_model=VulnerabilityResponse)
def get_vulnerability(vuln_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    vuln = db.query(Vulnerability).filter(Vulnerability.id == vuln_id, Vulnerability.user_id == current_user.id).first()
    if not vuln:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vulnerability finding not found")
    
    item = VulnerabilityResponse.model_validate(vuln)
    item.target_name = vuln.target.name if vuln.target else "Target Deleted"
    return item

@router.patch("/{vuln_id}/status", response_model=VulnerabilityResponse)
def update_vulnerability_status(
    vuln_id: int,
    status_update: VulnerabilityStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vuln = db.query(Vulnerability).filter(Vulnerability.id == vuln_id, Vulnerability.user_id == current_user.id).first()
    if not vuln:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vulnerability finding not found")
    
    vuln.status = status_update.status
    db.commit()
    db.refresh(vuln)
    
    item = VulnerabilityResponse.model_validate(vuln)
    item.target_name = vuln.target.name if vuln.target else "Target Deleted"
    return item

