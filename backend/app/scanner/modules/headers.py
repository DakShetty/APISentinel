import requests
from typing import List, Dict, Any

SECURITY_HEADERS = {
    "Strict-Transport-Security": {
        "severity": "Medium",
        "name": "Missing HTTP Strict Transport Security (HSTS)",
        "description": "The API does not enforce HTTPS via the Strict-Transport-Security header, leaving traffic susceptible to SSL-stripping and man-in-the-middle (MitM) attacks.",
        "owasp": "API8:2023 Security Misconfiguration",
        "remediation": "Configure your reverse proxy or API gateway to send 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'."
    },
    "X-Content-Type-Options": {
        "severity": "Low",
        "name": "Missing X-Content-Type-Options Header",
        "description": "The API response does not instruct browsers to disable MIME-type sniffing, which can lead to unexpected script execution when serving user-controlled content.",
        "owasp": "API8:2023 Security Misconfiguration",
        "remediation": "Add 'X-Content-Type-Options: nosniff' to all API HTTP response headers."
    },
    "Content-Security-Policy": {
        "severity": "Low",
        "name": "Missing Content-Security-Policy (CSP)",
        "description": "No Content-Security-Policy header was returned. While primary for browser UI, CSP restricts executable sources and prevents clickjacking and inline script execution.",
        "owasp": "API8:2023 Security Misconfiguration",
        "remediation": "Add 'Content-Security-Policy: default-src \\'none\\'; frame-ancestors \\'none\\';' for API responses."
    },
    "X-Frame-Options": {
        "severity": "Low",
        "name": "Missing X-Frame-Options Header",
        "description": "The endpoint does not restrict whether it can be framed within an iframe, increasing susceptibility to clickjacking if rendered in a browser.",
        "owasp": "API8:2023 Security Misconfiguration",
        "remediation": "Add 'X-Frame-Options: DENY' or 'SAMEORIGIN' to all HTTP response headers."
    },
    "Referrer-Policy": {
        "severity": "Informational",
        "name": "Missing Referrer-Policy Header",
        "description": "No Referrer-Policy header was defined. Sensitive request URL tokens or parameters might leak in the Referer header to external origins.",
        "owasp": "API8:2023 Security Misconfiguration",
        "remediation": "Send 'Referrer-Policy: strict-origin-when-cross-origin' or 'no-referrer'."
    },
    "Permissions-Policy": {
        "severity": "Informational",
        "name": "Missing Permissions-Policy Header",
        "description": "Permissions-Policy header is absent, which allows browser clients to execute default browser device APIs (camera, geolocation, microphone).",
        "owasp": "API8:2023 Security Misconfiguration",
        "remediation": "Define 'Permissions-Policy: geolocation=(), microphone=(), camera=()'."
    }
}

def check_security_headers(base_url: str, endpoint: str, session: requests.Session, timeout: int = 8) -> List[Dict[str, Any]]:
    """Scan an endpoint for missing essential security headers."""
    findings = []
    full_url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"
    
    try:
        resp = session.get(full_url, timeout=timeout)
        response_headers = {k.lower(): v for k, v in resp.headers.items()}
        
        for header_name, meta in SECURITY_HEADERS.items():
            if header_name.lower() not in response_headers:
                findings.append({
                    "name": meta["name"],
                    "category": "HTTP Headers",
                    "severity": meta["severity"],
                    "owasp_category": meta["owasp"],
                    "endpoint": endpoint,
                    "http_method": "GET",
                    "description": meta["description"],
                    "evidence_summary": f"Header '{header_name}' was not found in HTTP {resp.status_code} response headers.",
                    "remediation": meta["remediation"],
                    "status": "open"
                })
    except requests.RequestException as e:
        # Request failed (e.g. timeout or connection error), cannot perform header check
        pass
        
    return findings

