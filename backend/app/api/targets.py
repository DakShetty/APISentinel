import json
import time
import requests
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.ssrf import validate_target_url
from app.models.models import APITarget, User
from app.schemas.schemas import TargetCreate, TargetUpdate, TargetResponse, TargetVerifyResponse, EndpointConfig
from app.api.deps import get_current_user

router = APIRouter(prefix="/targets", tags=["API Targets"])

def _format_target_response(target: APITarget) -> dict:
    endpoints = []
    try:
        endpoints_data = json.loads(target.endpoints_json or "[]")
        for ep in endpoints_data:
            endpoints.append(EndpointConfig(**ep))
    except Exception:
        endpoints = []

    return {
        "id": target.id,
        "user_id": target.user_id,
        "name": target.name,
        "base_url": target.base_url,
        "description": target.description,
        "auth_type": target.auth_type,
        "auth_header_key": target.auth_header_key or "Authorization",
        "has_auth_token": bool(target.auth_token),
        "has_secondary_token": bool(target.secondary_auth_token),
        "timeout_seconds": target.timeout_seconds,
        "documentation_url": target.documentation_url,
        "is_verified": target.is_verified,
        "allow_private_ip": target.allow_private_ip,
        "endpoints": endpoints,
        "created_at": target.created_at,
        "updated_at": target.updated_at
    }

@router.get("", response_model=List[TargetResponse])
def get_targets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    targets = db.query(APITarget).filter(APITarget.user_id == current_user.id).order_by(APITarget.created_at.desc()).all()
    return [_format_target_response(t) for t in targets]

@router.post("", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
def create_target(target_in: TargetCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not target_in.authorization_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm explicit authorization to assess this target before proceeding."
        )

    # SSRF & URL Validation
    is_valid, reason = validate_target_url(target_in.base_url, allow_private_subnets=target_in.allow_private_ip)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    endpoints_json = json.dumps([ep.model_dump() for ep in target_in.endpoints])

    target = APITarget(
        user_id=current_user.id,
        name=target_in.name,
        base_url=target_in.base_url.rstrip('/'),
        description=target_in.description,
        auth_type=target_in.auth_type,
        auth_token=target_in.auth_token,
        auth_header_key=target_in.auth_header_key or "Authorization",
        secondary_auth_token=target_in.secondary_auth_token,
        timeout_seconds=target_in.timeout_seconds,
        documentation_url=target_in.documentation_url,
        allow_private_ip=target_in.allow_private_ip,
        endpoints_json=endpoints_json,
        is_verified=False
    )
    db.add(target)
    db.commit()
    db.refresh(target)
    return _format_target_response(target)

@router.get("/{target_id}", response_model=TargetResponse)
def get_target(target_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(APITarget).filter(APITarget.id == target_id, APITarget.user_id == current_user.id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")
    return _format_target_response(target)

@router.put("/{target_id}", response_model=TargetResponse)
def update_target(target_id: int, target_in: TargetUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(APITarget).filter(APITarget.id == target_id, APITarget.user_id == current_user.id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")

    if target_in.base_url:
        is_valid, reason = validate_target_url(
            target_in.base_url,
            allow_private_subnets=target_in.allow_private_ip if target_in.allow_private_ip is not None else target.allow_private_ip
        )
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)
        target.base_url = target_in.base_url.rstrip('/')

    if target_in.name is not None:
        target.name = target_in.name
    if target_in.description is not None:
        target.description = target_in.description
    if target_in.auth_type is not None:
        target.auth_type = target_in.auth_type
    if target_in.auth_token is not None:
        target.auth_token = target_in.auth_token
    if target_in.auth_header_key is not None:
        target.auth_header_key = target_in.auth_header_key
    if target_in.secondary_auth_token is not None:
        target.secondary_auth_token = target_in.secondary_auth_token
    if target_in.timeout_seconds is not None:
        target.timeout_seconds = target_in.timeout_seconds
    if target_in.documentation_url is not None:
        target.documentation_url = target_in.documentation_url
    if target_in.allow_private_ip is not None:
        target.allow_private_ip = target_in.allow_private_ip
    if target_in.endpoints is not None:
        target.endpoints_json = json.dumps([ep.model_dump() for ep in target_in.endpoints])

    db.commit()
    db.refresh(target)
    return _format_target_response(target)

@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(target_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(APITarget).filter(APITarget.id == target_id, APITarget.user_id == current_user.id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")
    db.delete(target)
    db.commit()
    return None

@router.post("/{target_id}/verify", response_model=TargetVerifyResponse)
def verify_target_connectivity(target_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(APITarget).filter(APITarget.id == target_id, APITarget.user_id == current_user.id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")

    start_time = time.time()
    try:
        headers = {}
        if target.auth_token:
            auth_val = target.auth_token if "bearer" in target.auth_token.lower() or "apikey" in target.auth_token.lower() else f"Bearer {target.auth_token}"
            headers[target.auth_header_key or "Authorization"] = auth_val

        resp = requests.get(target.base_url, headers=headers, timeout=target.timeout_seconds or 5)
        latency_ms = round((time.time() - start_time) * 1000, 2)
        
        target.is_verified = True
        db.commit()
        
        return {
            "success": True,
            "status_code": resp.status_code,
            "latency_ms": latency_ms,
            "message": f"Successfully connected to API target (HTTP {resp.status_code} in {latency_ms}ms).",
            "server_header": resp.headers.get("server") or resp.headers.get("Server") or "Hidden"
        }
    except requests.RequestException as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        return {
            "success": False,
            "status_code": None,
            "latency_ms": latency_ms,
            "message": f"Connection failed: {str(e)}",
            "server_header": None
        }

