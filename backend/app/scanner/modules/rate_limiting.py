import time
import requests
from typing import List, Dict, Any, Optional

RATE_LIMIT_HEADERS = [
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
    "ratelimit-limit",
    "ratelimit-remaining",
    "retry-after",
]

def check_rate_limiting(
    base_url: str,
    endpoint_config: Dict[str, Any],
    auth_header_key: str = "Authorization",
    auth_token: Optional[str] = None,
    burst_count: int = 10,
    timeout: int = 5
) -> List[Dict[str, Any]]:
    """
    Test for Missing Rate Limiting and Unrestricted Resource Consumption (OWASP API4:2023).
    Sends a controlled burst of requests (default 10) and checks for throttling indicators.
    """
    findings = []
    path = endpoint_config.get("path", "/")
    method = endpoint_config.get("method", "GET").upper()
    full_url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    
    headers = endpoint_config.get("headers") or {}
    if auth_token:
        headers[auth_header_key] = auth_token if "bearer" in auth_token.lower() or "apikey" in auth_token.lower() else f"Bearer {auth_token}"

    got_429 = False
    has_rate_limit_headers = False
    successful_requests = 0

    try:
        for i in range(burst_count):
            resp = requests.request(
                method=method,
                url=full_url,
                headers=headers,
                timeout=timeout
            )
            
            if resp.status_code == 429:
                got_429 = True
                break
            
            resp_headers = {k.lower(): v for k, v in resp.headers.items()}
            if any(h in resp_headers for h in RATE_LIMIT_HEADERS):
                has_rate_limit_headers = True
                
            if resp.status_code < 400:
                successful_requests += 1
                
            time.sleep(0.05)  # small 50ms interval between requests
            
        if not got_429 and not has_rate_limit_headers and successful_requests >= burst_count - 1:
            findings.append({
                "name": "Missing Rate Limiting & Resource Throttling",
                "category": "Rate Limiting",
                "severity": "Medium",
                "owasp_category": "API4:2023 Unrestricted Resource Consumption",
                "endpoint": path,
                "http_method": method,
                "description": f"The endpoint '{path}' processed {successful_requests} rapid consecutive requests without triggering HTTP 429 Too Many Requests or returning standard RateLimit headers.",
                "evidence_summary": f"Sent a burst of {burst_count} rapid requests. 100% succeeded without rate limit enforcement or X-RateLimit headers.",
                "remediation": "Implement rate limiting using an API Gateway, Redis token bucket, or middleware (e.g. slowapi). Return HTTP 429 with Retry-After and X-RateLimit-* headers when limits are reached.",
                "status": "open"
            })
    except requests.RequestException:
        pass

    return findings

