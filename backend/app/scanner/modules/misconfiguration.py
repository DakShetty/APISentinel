import re
import requests
from typing import List, Dict, Any, Optional

VERBOSE_ERROR_PATTERNS = [
    re.compile(r"Traceback \(most recent call last\):", re.I),
    re.compile(r"File \".*?\", line \d+", re.I),
    re.compile(r"ZeroDivisionError|NullPointerException|UnhandledException", re.I),
    re.compile(r"at (org|com|net)\.[a-zA-Z0-9_\.]+\(", re.I),  # Java stack trace
    re.compile(r"Internal Server Error:.*?\n", re.I),
]

def check_security_misconfiguration(
    base_url: str,
    endpoint: str,
    auth_header_key: str = "Authorization",
    auth_token: Optional[str] = None,
    timeout: int = 8
) -> List[Dict[str, Any]]:
    """
    Test for Security Misconfiguration (OWASP API8:2023):
    1. Insecure CORS policies (wildcard with credentials or untrusted origin reflection).
    2. Server banner and technology version disclosure.
    3. Verbose error stack traces.
    4. Risky HTTP methods (TRACE).
    """
    findings = []
    full_url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"
    headers = {}
    if auth_token:
        headers[auth_header_key] = auth_token if "bearer" in auth_token.lower() or "apikey" in auth_token.lower() else f"Bearer {auth_token}"

    # 1. CORS check
    cors_headers = headers.copy()
    untrusted_origin = "https://unauthorized-sentinel-probe.io"
    cors_headers["Origin"] = untrusted_origin
    
    try:
        cors_resp = requests.options(full_url, headers=cors_headers, timeout=timeout)
        allow_origin = cors_resp.headers.get("access-control-allow-origin", "")
        allow_creds = cors_resp.headers.get("access-control-allow-credentials", "").lower()
        
        if allow_origin == "*" and allow_creds == "true":
            findings.append({
                "name": "Insecure CORS Policy (Wildcard with Credentials)",
                "category": "Security Misconfiguration",
                "severity": "High",
                "owasp_category": "API8:2023 Security Misconfiguration",
                "endpoint": endpoint,
                "http_method": "OPTIONS",
                "description": "The API allows Access-Control-Allow-Origin: * in combination with Access-Control-Allow-Credentials: true, allowing arbitrary cross-origin sites to execute authenticated requests.",
                "evidence_summary": f"Header Access-Control-Allow-Origin was '*' with Allow-Credentials: {allow_creds}",
                "remediation": "Never permit wildcard origin when credentials are authenticated. Whitelist explicit, trusted domain origins.",
                "status": "open"
            })
        elif allow_origin == untrusted_origin:
            findings.append({
                "name": "Permissive CORS Origin Reflection",
                "category": "Security Misconfiguration",
                "severity": "Medium",
                "owasp_category": "API8:2023 Security Misconfiguration",
                "endpoint": endpoint,
                "http_method": "OPTIONS",
                "description": "The API dynamically reflects any provided Origin header in Access-Control-Allow-Origin without validating against an allowed whitelist.",
                "evidence_summary": f"Sent Origin '{untrusted_origin}' which was echoed verbatim in Access-Control-Allow-Origin header.",
                "remediation": "Maintain a strict whitelist of authorized frontend origins. Do not reflect untrusted Origin request headers.",
                "status": "open"
            })
    except requests.RequestException:
        pass

    # 2. Server Banner / Technology Information Disclosure
    try:
        get_resp = requests.get(full_url, headers=headers, timeout=timeout)
        server_header = get_resp.headers.get("Server") or get_resp.headers.get("server")
        powered_by = get_resp.headers.get("X-Powered-By") or get_resp.headers.get("x-powered-by")
        
        if server_header and any(char.isdigit() for char in server_header):
            findings.append({
                "name": "Excessive Server Information Disclosure (Server Banner)",
                "category": "Security Misconfiguration",
                "severity": "Low",
                "owasp_category": "API8:2023 Security Misconfiguration",
                "endpoint": endpoint,
                "http_method": "GET",
                "description": f"The API discloses precise server software and version details in the 'Server' header ('{server_header}'). This aids attackers in fingerprinting known CVEs.",
                "evidence_summary": f"Server header returned: '{server_header}'",
                "remediation": "Suppress or sanitize the Server HTTP header in the reverse proxy or web server configuration.",
                "status": "open"
            })
            
        if powered_by:
            findings.append({
                "name": "Technology Disclosure via X-Powered-By",
                "category": "Security Misconfiguration",
                "severity": "Low",
                "owasp_category": "API8:2023 Security Misconfiguration",
                "endpoint": endpoint,
                "http_method": "GET",
                "description": f"The response contains an X-Powered-By header ('{powered_by}'), exposing underlying framework details.",
                "evidence_summary": f"X-Powered-By header: '{powered_by}'",
                "remediation": "Disable the X-Powered-By header in your application framework settings.",
                "status": "open"
            })

        # 3. Verbose Error / Stack Trace Disclosure check
        for pattern in VERBOSE_ERROR_PATTERNS:
            if pattern.search(get_resp.text):
                findings.append({
                    "name": "Verbose Error Message & Stack Trace Disclosure",
                    "category": "Security Misconfiguration",
                    "severity": "Medium",
                    "owasp_category": "API8:2023 Security Misconfiguration",
                    "endpoint": endpoint,
                    "http_method": "GET",
                    "description": "The API returned a verbose debug stack trace or internal exception log in its response body.",
                    "evidence_summary": f"Found stack trace pattern '{pattern.pattern}' in response body ({len(get_resp.content)} bytes).",
                    "remediation": "Disable debug mode in production. Implement global exception handlers returning generic JSON error messages.",
                    "status": "open"
                })
                break
    except requests.RequestException:
        pass

    # 4. Check for TRACE method
    try:
        trace_resp = requests.request("TRACE", full_url, headers=headers, timeout=timeout)
        if trace_resp.status_code == 200:
            findings.append({
                "name": "HTTP TRACE Method Enabled",
                "category": "Security Misconfiguration",
                "severity": "Medium",
                "owasp_category": "API8:2023 Security Misconfiguration",
                "endpoint": endpoint,
                "http_method": "TRACE",
                "description": "The API server supports the HTTP TRACE method, which can be leveraged for Cross-Site Tracing (XST) attacks to steal sensitive authentication headers or cookies.",
                "evidence_summary": f"HTTP TRACE request received status {trace_resp.status_code} OK.",
                "remediation": "Disable TRACE and TRACK methods in your web server or reverse proxy configuration.",
                "status": "open"
            })
    except requests.RequestException:
        pass

    return findings

