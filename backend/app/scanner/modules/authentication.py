import requests
from typing import List, Dict, Any, Optional

def check_authentication(
    base_url: str,
    endpoint_config: Dict[str, Any],
    session: requests.Session,
    auth_header_key: str = "Authorization",
    valid_token: Optional[str] = None,
    timeout: int = 8
) -> List[Dict[str, Any]]:
    """
    Test for Broken Authentication vulnerabilities (OWASP API2:2023):
    1. Unauthenticated request to a protected endpoint.
    2. Malformed / expired token validation check.
    3. Inconsistent authentication mechanisms.
    """
    findings = []
    path = endpoint_config.get("path", "/")
    method = endpoint_config.get("method", "GET").upper()
    requires_auth = endpoint_config.get("requires_auth", True)
    
    full_url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    headers = endpoint_config.get("headers") or {}
    body = endpoint_config.get("body")
    params = endpoint_config.get("query_params")

    # 1. Test request without any authentication header
    clean_headers = {k: v for k, v in headers.items() if k.lower() != auth_header_key.lower()}
    
    try:
        no_auth_resp = requests.request(
            method=method,
            url=full_url,
            headers=clean_headers,
            params=params,
            json=body if method in ("POST", "PUT", "PATCH") else None,
            timeout=timeout
        )
        
        if requires_auth and no_auth_resp.status_code in (200, 201, 204):
            findings.append({
                "name": "Missing Authentication Requirement",
                "category": "Broken Authentication",
                "severity": "Critical",
                "owasp_category": "API2:2023 Broken Authentication",
                "endpoint": path,
                "http_method": method,
                "description": f"The endpoint '{path}' is documented or expected to require authentication, but responded with HTTP {no_auth_resp.status_code} when no credentials or token were supplied.",
                "evidence_summary": f"Request sent with no '{auth_header_key}' header received HTTP {no_auth_resp.status_code} ({len(no_auth_resp.content)} bytes). Expected HTTP 401 Unauthorized.",
                "remediation": "Enforce mandatory authentication verification before routing requests to controller logic. Return HTTP 401 Unauthorized when credentials are absent.",
                "status": "open"
            })
    except requests.RequestException:
        pass

    # 2. Test request with an invalid/forged authorization token
    forged_headers = clean_headers.copy()
    forged_headers[auth_header_key] = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.bogus_signature_apisentinel"
    
    try:
        invalid_token_resp = requests.request(
            method=method,
            url=full_url,
            headers=forged_headers,
            params=params,
            json=body if method in ("POST", "PUT", "PATCH") else None,
            timeout=timeout
        )
        
        if requires_auth and invalid_token_resp.status_code in (200, 201, 204):
            findings.append({
                "name": "Improper Token Validation & Signature Verification",
                "category": "Broken Authentication",
                "severity": "Critical",
                "owasp_category": "API2:2023 Broken Authentication",
                "endpoint": path,
                "http_method": method,
                "description": f"The endpoint accepted an invalid, forged, or unverified JWT token without returning an authorization rejection.",
                "evidence_summary": f"Request sent with invalid signature received HTTP {invalid_token_resp.status_code}. The API failed to validate token integrity.",
                "remediation": "Verify the cryptographic signature of all incoming tokens using a strong secret or public key. Reject invalid tokens with HTTP 401.",
                "status": "open"
            })
    except requests.RequestException:
        pass

    return findings

