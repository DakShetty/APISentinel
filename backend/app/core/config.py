import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings:
    PROJECT_NAME: str = "API Sentinel"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "apisentinel_super_secret_jwt_key_2026_x89a!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/apisentinel.db")
    
    # SSRF & Safety Protection
    ALLOW_LOCAL_NETWORK_SCAN: bool = True  # Allowed for local demo lab / user verification flag
    SCAN_DEFAULT_TIMEOUT: int = 8
    MAX_CONCURRENT_SCANS: int = 3
    MAX_REQUESTS_PER_ENDPOINT: int = 15
    
    # Storage
    REPORTS_DIR: str = str(BASE_DIR / "generated_reports")

settings = Settings()

os.makedirs(settings.REPORTS_DIR, exist_ok=True)
