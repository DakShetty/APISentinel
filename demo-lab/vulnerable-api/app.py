from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse
import traceback

app = FastAPI(
    title="InsecureBank & Orders Demo API (VULNERABLE)",
    description="Intentionally vulnerable local test target for API Sentinel security assessments. Uses synthetic data only.",
    version="1.0.0",
    docs_url="/docs"
)

# Synthetic Mock In-Memory Database
USERS_DB = {
    "1": {
        "id": "1",
        "name": "Alice Developer",
        "email": "alice@sentinel-demo.local",
        "ssn": "987-65-4321",
        "password_hash": "$2b$12$eX4mpL3H4shNotS3cur3000000000000000000000000",
        "secret_api_key": "sec_live_alice_982347109238471029384",
        "internal_id": "SYS-ACNT-9988-INTERNAL",
        "balance": 15420.50
    },
    "2": {
        "id": "2",
        "name": "Bob Security",
        "email": "bob@sentinel-demo.local",
        "ssn": "123-45-6789",
        "password_hash": "$2b$12$b0bH4shNotS3cur30000000000000000000000000000",
        "secret_api_key": "sec_live_bob_182736451928374619283",
        "internal_id": "SYS-ACNT-1122-INTERNAL",
        "balance": 3200.00
    }
}

ORDERS_DB = [
    {"order_id": 101, "user_id": "1", "item": "Quantum Encryption Dongle", "amount": 299.99},
    {"order_id": 102, "user_id": "2", "item": "Security Key Fob", "amount": 49.50}
]

# Vulnerability 1: Permissive CORS and verbose server headers
@app.middleware("http")
async def cors_and_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    # Permissive wildcard CORS reflection
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    # Excessive server information disclosure
    response.headers["Server"] = "VulnerableBank-Core/2.4.1 (Ubuntu 18.04 Linux) OpenSSL/1.0.2g"
    response.headers["X-Powered-By"] = "Python/FastAPI-Legacy-Unpatched"
    # Note: Missing HSTS, CSP, X-Content-Type-Options, X-Frame-Options
    return response

@app.get("/")
def root():
    return {
        "message": "Welcome to InsecureBank Demo Target API",
        "status": "online",
        "endpoints": [
            "/api/v1/public/ping",
            "/api/v1/users/{id}",
            "/api/v1/orders",
            "/api/v1/search",
            "/api/v1/admin/export"
        ]
    }

@app.get("/api/v1/public/ping")
def ping():
    return {"status": "ok", "system": "ready"}

# Vulnerability 2: BOLA / IDOR + Excessive Data Exposure
# Allows any caller (User 2 or unauthenticated) to access User 1's full profile including ssn and password_hash
@app.get("/api/v1/users/{user_id}")
def get_user_profile(user_id: str, request: Request):
    # No authorization check between user_id and authorization token!
    if user_id in USERS_DB:
        # Leaks password_hash, ssn, secret_api_key, internal_id
        return USERS_DB[user_id]
    raise HTTPException(status_code=404, detail="User not found")

# Vulnerability 3: Missing Authentication on Sensitive Resource
# Should require auth, but returns orders without checking Authorization header
@app.get("/api/v1/orders")
def get_orders(request: Request):
    # Missing authentication validation
    return {"orders": ORDERS_DB, "total": len(ORDERS_DB)}

# Vulnerability 4: Safe Injection Indicator & Error Leakage
@app.get("/api/v1/search")
def search_items(query: str = "", filter: str = ""):
    # If single quote is passed, simulate raw SQL/database syntax error
    if "'" in query or "'" in filter:
        error_msg = (
            "sqlite3.OperationalError: near \"'\": syntax error. "
            "Failed query: SELECT * FROM items WHERE name LIKE '%" + query + "%' AND status = '" + filter + "';"
        )
        return PlainTextResponse(error_msg, status_code=500)
    return {"results": [{"id": 1, "name": "Standard Laptop"}, {"id": 2, "name": "Ergonomic Keyboard"}]}

# Vulnerability 5: Unhandled Crash & Verbose Stack Trace on Input Validation
@app.post("/api/v1/admin/export")
async def export_data(request: Request):
    body = await request.body()
    try:
        import json
        data = json.loads(body)
        records = int(data.get("records"))
        return {"exported_records": records}
    except Exception as e:
        # Intentionally returns verbose traceback in response body!
        tb = traceback.format_exc()
        return PlainTextResponse(f"Internal Server Error: {str(e)}\n\n{tb}", status_code=500)

# Vulnerability 6: No rate limiting on any endpoint (handled by lack of rate limiting middleware)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)

