import requests
from typing import List, Dict, Any, Optional

def check_input_validation(
    base_url: str,
    endpoint_config: Dict[str, Any],
    auth_header_key: str = "Authorization",
    auth_token: Optional[str] = None,
    timeout: int = 8
) -> List[Dict[str, Any]]:
    """
    Test for Input Validation & Improper Error Handling (OWASP API8:2023):
    Sends invalid types, oversized safe inputs, and malformed payloads,
    checking if the server returns standard validation errors (400/422) or unhandled 500 server crashes.
    """
    findings = []
    path = endpoint_config.get("path", "/")
    method = endpoint_config.get("method", "GET").upper()
    full_url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    
    headers = endpoint_config.get("headers") or {}
    if auth_token:
        headers[auth_header_key] = auth_token if "bearer" in auth_token.lower() or "apikey" in auth_token.lower() else f"Bearer {auth_token}"

    # 1. Malformed JSON Body check for POST/PUT/PATCH
    if method in ("POST", "PUT", "PATCH"):
        malformed_headers = headers.copy()
        malformed_headers["Content-Type"] = "application/json"
        try:
            resp = requests.request(
                method=method,
                url=full_url,
                headers=malformed_headers,
                data='{"malformed_payload": ',  # Intentional invalid JSON
                timeout=timeout
            )
            # If server crashes with 500 instead of 400 Bad Request or 422 Unprocessable Entity
            if resp.status_code >= 500:
                findings.append({
                    "name": "Unhandled 500 Crash on Malformed JSON Input",
                    "category": "Input Validation",
                    "severity": "Medium",
                    "owasp_category": "API8:2023 Security Misconfiguration & Input Handling",
                    "endpoint": path,
                    "http_method": method,
                    "description": f"The endpoint crashed with HTTP {resp.status_code} Internal Server Error when receiving malformed JSON, indicating missing input parsing guards.",
                    "evidence_summary": f"Sent invalid JSON syntax. Received HTTP {resp.status_code} with body snippet: \"{resp.text[:120]}\". Expected HTTP 400 Bad Request.",
                    "remediation": "Implement strict JSON deserialization error handlers to return HTTP 400 Bad Request on invalid payloads.",
                    "status": "open"
                })
        except requests.RequestException:
            pass

    # 2. Type Mismatch / Unexpected Type Check on Parameters
    type_probe_params = {"id": "invalid_alphanumeric_string_when_integer_expected!@#", "page": "invalid_page_type"}
    try:
        resp_type = requests.request(
            method=method,
            url=full_url,
            headers=headers,
            params=type_probe_params,
            timeout=timeout
        )
        if resp_type.status_code >= 500:
            findings.append({
                "name": "Unhandled 500 Error on Unexpected Input Type",
                "category": "Input Validation",
                "severity": "Medium",
                "owasp_category": "API8:2023 Security Misconfiguration & Input Handling",
                "endpoint": path,
                "http_method": method,
                "description": f"Endpoint '{path}' threw an unhandled server error (HTTP {resp_type.status_code}) when queried with non-conforming parameter types.",
                "evidence_summary": f"Sent parameter id=invalid_alphanumeric... which triggered HTTP {resp_type.status_code}. Expected HTTP 400 or 422.",
                "remediation": "Apply schema validation (e.g. Pydantic, Joi, Zod) to catch type mismatches before execution.",
                "status": "open"
            })
    except requests.RequestException:
        pass

    return findings

