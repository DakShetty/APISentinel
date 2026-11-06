import re
import json
import requests
from typing import List, Dict, Any, Optional

SENSITIVE_KEY_PATTERNS = [
    (re.compile(r"password|passwd|pwd", re.I), "High", "Password or Hash Exposure", "Plaintext or hashed credentials exposed in API response body."),
    (re.compile(r"secret|private_key|privkey", re.I), "High", "Private Key / Secret Leakage", "Cryptographic keys or client secrets disclosed."),
    (re.compile(r"ssn|social_security|national_id", re.I), "Critical", "Personally Identifiable Information (SSN/National ID)", "Sensitive government identification numbers exposed."),
    (re.compile(r"credit_card|card_num|cvv|cvc", re.I), "Critical", "Payment Card Data Exposure", "Payment card numbers or security verification codes leaked."),
    (re.compile(r"api_key|access_token|auth_token", re.I), "High", "Access Token Leakage", "Internal access tokens or API keys exposed in output."),
    (re.compile(r"salary|bank_account|routing_number", re.I), "Medium", "Financial Information Exposure", "Sensitive financial or compensation data exposed."),
    (re.compile(r"internal_id|db_id|sys_guid", re.I), "Low", "Internal Architecture Identifier Disclosure", "Underlying database primary keys or architecture identifiers exposed."),
]

def mask_sensitive_value(val: Any) -> str:
    """Safely mask sensitive values for evidence display."""
    s = str(val)
    if len(s) <= 4:
        return "****"
    return f"{s[:2]}****{s[-2:]}"

def traverse_json(data: Any, path: str = "") -> List[Dict[str, Any]]:
    """Recursively search for sensitive keys in JSON structures."""
    matches = []
    if isinstance(data, dict):
        for k, v in data.items():
            current_path = f"{path}.{k}" if path else k
            for pattern, severity, name, desc in SENSITIVE_KEY_PATTERNS:
                if pattern.search(k):
                    matches.append({
                        "key": current_path,
                        "masked_val": mask_sensitive_value(v),
                        "severity": severity,
                        "name": name,
                        "desc": desc
                    })
            if isinstance(v, (dict, list)):
                matches.extend(traverse_json(v, current_path))
    elif isinstance(data, list):
        for idx, item in enumerate(data[:5]):  # check up to first 5 items
            matches.extend(traverse_json(item, f"{path}[{idx}]"))
    return matches

def check_excessive_data_exposure(
    base_url: str,
    endpoint_config: Dict[str, Any],
    auth_header_key: str = "Authorization",
    auth_token: Optional[str] = None,
    timeout: int = 8
) -> List[Dict[str, Any]]:
    """
    Test for Excessive Data Exposure / Broken Object Property Level Authorization (OWASP API3:2023).
    """
    findings = []
    path = endpoint_config.get("path", "/")
    method = endpoint_config.get("method", "GET").upper()
    full_url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    
    headers = endpoint_config.get("headers") or {}
    if auth_token:
        headers[auth_header_key] = auth_token if "bearer" in auth_token.lower() or "apikey" in auth_token.lower() else f"Bearer {auth_token}"

    try:
        resp = requests.request(
            method=method,
            url=full_url,
            headers=headers,
            params=endpoint_config.get("query_params"),
            timeout=timeout
        )
        
        if resp.status_code == 200 and "application/json" in resp.headers.get("content-type", "").lower():
            try:
                data = resp.json()
                detected_leaks = traverse_json(data)
                
                # Group by highest severity
                if detected_leaks:
                    flagged_keys = [f"'{d['key']}' ({d['desc']})" for d in detected_leaks[:4]]
                    highest_sev = "Critical" if any(d["severity"] == "Critical" for d in detected_leaks) else \
                                  "High" if any(d["severity"] == "High" for d in detected_leaks) else "Medium"
                    
                    findings.append({
                        "name": "Excessive Data Exposure in Response Payload",
                        "category": "Data Exposure",
                        "severity": highest_sev,
                        "owasp_category": "API3:2023 Broken Object Property Level Authorization",
                        "endpoint": path,
                        "http_method": method,
                        "description": f"The API endpoint exposes sensitive data attributes in its JSON response body that should not be visible to client callers.",
                        "evidence_summary": f"Detected sensitive properties: {', '.join(flagged_keys)}. Total sensitive fields found: {len(detected_leaks)}.",
                        "remediation": "Apply Data Transfer Objects (DTOs) or Pydantic response models using 'response_model_exclude' to ensure only legitimate public fields are serialized to clients.",
                        "status": "open"
                    })
            except (json.JSONDecodeError, ValueError):
                pass
    except requests.RequestException:
        pass

    return findings

