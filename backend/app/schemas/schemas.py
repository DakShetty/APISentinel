from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Endpoint Schema ---
class EndpointConfig(BaseModel):
    path: str
    method: str = "GET"
    headers: Optional[Dict[str, str]] = None
    query_params: Optional[Dict[str, Any]] = None
    body: Optional[Any] = None
    requires_auth: bool = True
    supports_bola_test: bool = False
    param_key: Optional[str] = None
    param_account_a: Optional[str] = None
    param_account_b: Optional[str] = None


# --- Target Schemas ---
class TargetCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    base_url: str = Field(..., min_length=7, max_length=500)
    description: Optional[str] = None
    auth_type: str = "none"  # none, bearer, api_key, basic
    auth_token: Optional[str] = None
    auth_header_key: str = "Authorization"
    secondary_auth_token: Optional[str] = None
    timeout_seconds: int = Field(10, ge=1, le=60)
    documentation_url: Optional[str] = None
    allow_private_ip: bool = True
    endpoints: List[EndpointConfig] = []
    authorization_confirmed: bool = Field(..., description="Explicit confirmation of authorized testing permission")

class TargetUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    description: Optional[str] = None
    auth_type: Optional[str] = None
    auth_token: Optional[str] = None
    auth_header_key: Optional[str] = None
    secondary_auth_token: Optional[str] = None
    timeout_seconds: Optional[int] = None
    documentation_url: Optional[str] = None
    allow_private_ip: Optional[bool] = None
    endpoints: Optional[List[EndpointConfig]] = None

class TargetResponse(BaseModel):
    id: int
    user_id: int
    name: str
    base_url: str
    description: Optional[str] = None
    auth_type: str
    auth_header_key: str
    has_auth_token: bool
    has_secondary_token: bool
    timeout_seconds: int
    documentation_url: Optional[str] = None
    is_verified: bool
    allow_private_ip: bool
    endpoints: List[EndpointConfig] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TargetVerifyResponse(BaseModel):
    success: bool
    status_code: Optional[int] = None
    latency_ms: Optional[float] = None
    message: str
    server_header: Optional[str] = None


# --- Scan Schemas ---
class ScanCreate(BaseModel):
    target_id: int
    authorization_confirmed: bool = Field(..., description="Confirmed permission to execute automated security assessment")
    scan_types: Optional[List[str]] = [
        "headers",
        "auth",
        "bola",
        "rate_limiting",
        "data_exposure",
        "injection",
        "misconfiguration",
        "input_validation"
    ]
    custom_endpoints: Optional[List[EndpointConfig]] = None

class ScanResponse(BaseModel):
    id: int
    target_id: int
    target_name: Optional[str] = None
    status: str
    progress_percent: int
    current_stage: str
    endpoints_tested_count: int
    vulnerabilities_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    info_count: int
    security_score: float
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: float
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


# --- Vulnerability Schemas ---
class VulnerabilityResponse(BaseModel):
    id: int
    scan_id: int
    target_id: int
    target_name: Optional[str] = None
    name: str
    category: str
    severity: str
    owasp_category: str
    endpoint: str
    http_method: str
    description: str
    evidence_summary: str
    remediation: str
    status: str
    detected_at: datetime

    class Config:
        from_attributes = True

class VulnerabilityStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(open|resolved|accepted_risk)$")


# --- Report Schemas ---
class ReportResponse(BaseModel):
    id: int
    scan_id: int
    title: str
    file_path: str
    file_size_bytes: int
    security_score: float
    created_at: datetime

    class Config:
        from_attributes = True


# --- Dashboard Schemas ---
class SeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    informational: int = 0

class DashboardStats(BaseModel):
    total_targets: int
    total_scans: int
    total_vulnerabilities: int
    severity_breakdown: SeverityCounts
    overall_posture_score: float
    recent_scans: List[ScanResponse]
    top_vulnerable_targets: List[Dict[str, Any]]

class DashboardActivity(BaseModel):
    date: str
    scans_count: int
    findings_count: int
