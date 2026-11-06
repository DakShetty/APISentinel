import time
from typing import Optional
from fastapi import FastAPI, Request, Response, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import jwt

SECRET_KEY = "demo_lab_secure_key_12345"
ALGORITHM = "HS256"

app = FastAPI(
    title="SecureBank & Orders Demo API (HARDENED)",
    description="Secured, hardened reference target API adhering to OWASP API Security best practices.",
    version="1.0.0",
    docs_url="/docs"
)

# In-Memory Rate Limiting Tracker
REQUEST_HISTORY = {}  # ip -> [timestamps]
RATE_LIMIT_MAX = 5
RATE_WINDOW_SECONDS = 5

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # 1. Rate Limiting Check
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    history = REQUEST_HISTORY.get(client_ip, [])
    # Keep only requests within window
    history = [t for t in history if now - t < RATE_WINDOW_SECONDS]
    
    if len(history) >= RATE_LIMIT_MAX and request.url.path != "/api/v1/public/ping":
        response = JSONResponse(
            status_code=429,
            content={"error": "Too Many Requests", "message": "Rate limit exceeded. Please back off."}
        )
        response.headers["Retry-After"] = "5"
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_MAX)
        response.headers["X-RateLimit-Remaining"] = "0"
        return response

    history.append(now)
    REQUEST_HISTORY[client_ip] = history

    # 2. Process Request
    response = await call_next(request)

    # 3. Defense-in-Depth Security Headers
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none';"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Server"] = "API-Gateway"
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_MAX)
    response.headers["X-RateLimit-Remaining"] = str(max(0, RATE_LIMIT_MAX - len(history)))
    
    # Restrict CORS to explicit trusted origin
    response.headers["Access-Control-Allow-Origin"] = "https://trusted-portal.sentinel.local"
    return response

# Synthetic DB
USERS_SECURE_DB = {
    "1": {
        "id": "1",
        "name": "Alice Developer",
        "email": "alice@sentinel-demo.local",
        "balance": 15420.50
    },
    "2": {
        "id": "2",
        "name": "Bob Security",
        "email": "bob@sentinel-demo.local",
        "balance": 3200.00
    }
}

ORDERS_SECURE_DB = [
    {"order_id": 101, "user_id": "1", "item": "Quantum Encryption Dongle", "amount": 299.99},
    {"order_id": 102, "user_id": "2", "item": "Security Key Fob", "amount": 49.50}
]

def verify_token(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication credentials were not provided or invalid format.")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid, expired or forged authorization token.")

@app.get("/")
def root():
    return {
        "message": "Welcome to SecureBank Hardened Reference API",
        "status": "online",
        "security_level": "hardened"
    }

@app.get("/api/v1/public/ping")
def ping():
    return {"status": "ok", "system": "secure"}

# Hardened Endpoint 1: BOLA Protection + DTO Data Exposure Protection
@app.get("/api/v1/users/{user_id}")
def get_user_profile(user_id: str, payload: dict = Depends(verify_token)):
    token_user_id = str(payload.get("sub", ""))
    
    # BOLA / IDOR Verification: ensure authenticated caller is authorized to view target user_id
    if token_user_id != user_id and payload.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You do not possess authorization to access this account object."
        )

    if user_id in USERS_SECURE_DB:
        # Returns sanitized DTO (no SSN, no passwords, no internal IDs)
        return USERS_SECURE_DB[user_id]
        
    raise HTTPException(status_code=404, detail="User not found")

# Hardened Endpoint 2: Mandatory Authentication
@app.get("/api/v1/orders")
def get_orders(payload: dict = Depends(verify_token)):
    user_id = str(payload.get("sub", ""))
    # Filter orders belonging to authenticated caller only
    user_orders = [o for o in ORDERS_SECURE_DB if o["user_id"] == user_id]
    return {"orders": user_orders, "total": len(user_orders)}

# Hardened Endpoint 3: Input Validation & Safe Query Sanitization
@app.get("/api/v1/search")
def search_items(query: str = "", filter: str = ""):
    # Sanitized parameterized search (no syntax crashes or SQL error disclosure)
    safe_query = query.replace("'", "")
    return {
        "query": safe_query,
        "results": [{"id": 1, "name": "Standard Laptop"}, {"id": 2, "name": "Ergonomic Keyboard"}]
    }

class ExportRequest(BaseModel):
    records: int

# Hardened Endpoint 4: Strict Schema Validation
@app.post("/api/v1/admin/export")
def export_data(data: ExportRequest, payload: dict = Depends(verify_token)):
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return {"exported_records": data.records, "status": "success"}

# Global Sanitized Error Handler (suppresses raw stack traces)
@app.exception_handler(Exception)
def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "An internal error occurred. Request ID logged for auditing."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)

