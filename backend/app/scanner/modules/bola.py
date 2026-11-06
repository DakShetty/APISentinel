import re
import requests
from typing import List, Dict, Any, Optional

OBJECT_ID_PATTERNS = [
    re.compile(r'/(\d+)(?:/|$)', re.IGNORECASE),
    re.compile(r'/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:/|$)', re.IGNORECASE),
    re.compile(r'/(user|account|order|invoice|profile|item|document|patient|record)s?/([^/?#]+)', re.IGNORECASE)
]

def check_bola(
    base_url: str,
    endpoint_config: Dict[str, Any],
    auth_header_key: str = "Authorization",
    token_account_a: Optional[str] = None,
    token_account_b: Optional[str] = None,
    timeout: int = 8
) -> List[Dict[str, Any]]:
    """
    Test for Broken Object Level Authorization (BOLA/IDOR) (OWASP API1:2023).
    Compares access boundaries between two controlled test entities:
    - Account A accesses Object A (baseline legitimate access)
    - Account B accesses Object A (unauthorized cross-tenant access test)
    """
    findings = []
    path = endpoint_config.get("path", "/")
    method = endpoint_config.get("method", "GET").upper()
    supports_bola = endpoint_config.get("supports_bola_test", False)
    
    # Check if path contains an object identifier
    has_id_in_path = any(p.search(path) for p in OBJECT_ID_PATTERNS)
    
    if not (supports_bola or has_id_in_path):
        return findings

    full_url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    headers_base = endpoint_config.get("headers") or {}
    
    # Format tokens
    token_a = token_account_a or "Bearer test_account_a_token"
    token_b = token_account_b or "Bearer test_account_b_token"
    
    headers_a = headers_base.copy()
    headers_a[auth_header_key] = token_a if "bearer" in token_a.lower() or "apikey" in token_a.lower() else f"Bearer {token_a}"
    
    headers_b = headers_base.copy()
    headers_b[auth_header_key] = token_b if "bearer" in token_b.lower() or "apikey" in token_b.lower() else f"Bearer {token_b}"

    # Scenario 1: Two tokens provided - test cross-account authorization boundary
    if token_account_a and token_account_b:
        try:
            # Baseline: Account A requests its object
            resp_a = requests.request(method, full_url, headers=headers_a, timeout=timeout)
            
            # Cross-tenant: Account B requests Account A's object
            resp_b = requests.request(method, full_url, headers=headers_b, timeout=timeout)
            
            # If Account A succeeded (200 OK) and Account B also receives 200 OK with identical/unrestricted content
            if resp_a.status_code == 200 and resp_b.status_code == 200:
                # Potential BOLA detected!
                findings.append({
                    "name": "Broken Object Level Authorization (BOLA/IDOR)",
                    "category": "BOLA",
                    "severity": "Critical",
                    "owasp_category": "API1:2023 Broken Object Level Authorization",
                    "endpoint": path,
                    "http_method": method,
                    "description": f"Endpoint '{path}' returned HTTP 200 to Account B when attempting to read or manipulate an object owned by Account A. The server failed to validate whether the authenticated subject possesses authorization over the requested resource ID.",
                    "evidence_summary": f"Account A (Owner) received HTTP 200 ({len(resp_a.content)} bytes). Account B (Non-Owner) also received HTTP 200 ({len(resp_b.content)} bytes). Expected HTTP 403 Forbidden or HTTP 404 Not Found.",
                    "remediation": "Implement strict object-level authorization checks. Query the database verifying that the requested resource ID belongs to the tenant or user identified in the validated session token before returning or modifying data.",
                    "status": "open"
                })
        except requests.RequestException:
            pass
            
    # Scenario 2: Test with swapped resource IDs if configured
    param_account_a = endpoint_config.get("param_account_a")
    param_account_b = endpoint_config.get("param_account_b")
    if param_account_a and param_account_b and token_account_b:
        # User B tries to request User A's ID
        swapped_path = path.replace(str(param_account_b), str(param_account_a))
        swapped_url = f"{base_url.rstrip('/')}/{swapped_path.lstrip('/')}"
        try:
            resp_swapped = requests.request(method, swapped_url, headers=headers_b, timeout=timeout)
            if resp_swapped.status_code == 200:
                findings.append({
                    "name": "Broken Object Level Authorization (Resource ID Tampering)",
                    "category": "BOLA",
                    "severity": "Critical",
                    "owasp_category": "API1:2023 Broken Object Level Authorization",
                    "endpoint": swapped_path,
                    "http_method": method,
                    "description": f"Account B was able to access resource '{param_account_a}' by substituting the object identifier in the request URL.",
                    "evidence_summary": f"Request with Account B token to '{swapped_path}' succeeded with HTTP 200 ({len(resp_swapped.content)} bytes).",
                    "remediation": "Verify tenant ownership and enforce fine-grained authorization filters in the data access layer for all object references.",
                    "status": "open"
                })
        except requests.RequestException:
            pass

    return findings

