import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    targets = relationship("APITarget", back_populates="user", cascade="all, delete-orphan")
    scans = relationship("ScanJob", back_populates="user", cascade="all, delete-orphan")
    vulnerabilities = relationship("Vulnerability", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")


class APITarget(Base):
    __tablename__ = "api_targets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    base_url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    auth_type = Column(String(50), default="none")  # none, bearer, api_key, basic
    auth_token = Column(Text, nullable=True)  # Primary account token/key
    auth_header_key = Column(String(100), default="Authorization")
    
    # Secondary test credentials specifically for controlled BOLA/authorization isolation testing
    secondary_auth_token = Column(Text, nullable=True)
    
    timeout_seconds = Column(Integer, default=10)
    documentation_url = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=False)
    allow_private_ip = Column(Boolean, default=True)  # Explicit authorization for localhost/internal lab testing
    endpoints_json = Column(Text, default="[]")  # JSON-serialized list of endpoints
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="targets")
    scans = relationship("ScanJob", back_populates="target", cascade="all, delete-orphan")
    vulnerabilities = relationship("Vulnerability", back_populates="target", cascade="all, delete-orphan")


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(Integer, primary_key=True, index=True)
    target_id = Column(Integer, ForeignKey("api_targets.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    status = Column(String(50), default="queued")  # queued, running, completed, failed, cancelled
    progress_percent = Column(Integer, default=0)
    current_stage = Column(String(255), default="Initializing scanner")
    
    endpoints_tested_count = Column(Integer, default=0)
    vulnerabilities_count = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    info_count = Column(Integer, default=0)
    
    security_score = Column(Float, default=100.0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    scan_config_json = Column(Text, default="{}")

    target = relationship("APITarget", back_populates="scans")
    user = relationship("User", back_populates="scans")
    vulnerabilities = relationship("Vulnerability", back_populates="scan", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="scan", cascade="all, delete-orphan")


class Vulnerability(Base):
    __tablename__ = "vulnerabilities"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_jobs.id"), nullable=False, index=True)
    target_id = Column(Integer, ForeignKey("api_targets.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)  # Critical, High, Medium, Low, Informational
    owasp_category = Column(String(255), nullable=False)
    endpoint = Column(String(500), nullable=False)
    http_method = Column(String(20), nullable=False)
    
    description = Column(Text, nullable=False)
    evidence_summary = Column(Text, nullable=False)
    remediation = Column(Text, nullable=False)
    status = Column(String(50), default="open")  # open, resolved, accepted_risk
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)

    scan = relationship("ScanJob", back_populates="vulnerabilities")
    target = relationship("APITarget", back_populates="vulnerabilities")
    user = relationship("User", back_populates="vulnerabilities")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scan_jobs.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    title = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    security_score = Column(Float, default=100.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    scan = relationship("ScanJob", back_populates="reports")
    user = relationship("User", back_populates="reports")

