import re
import requests
from typing import List, Dict, Any, Optional

DB_ERROR_PATTERNS = [
    (re.compile(r"sqlite3\.(OperationalError|DatabaseError)", re.I), "SQLite Database Syntax Error"),
    (re.compile(r"(syntax error near|unclosed quotation mark after the character string)", re.I), "SQL Syntax Error"),
    (re.compile(r"pg_query\(\)|psycopg2\.errors\.", re.I), "PostgreSQL Database Exception"),
    (re.compile(r"mysql_fetch_array\(\)|ORA-[0-9]{4,5}", re.I), "RDBMS Engine Exception Leak"),
    (re.compile(r"MongoError|BSONTypeError", re.I), "NoSQL Query Driver Exception"),
    (re.compile(r"SQLSTATE\[[0-9A-Z]{5}\]", re.I), "Standard SQLSTATE Exception"),
]

def check_safe_injection_indicators(
    base_url: str,
    endpoint_config: Dict[str, Any],
    auth_header_key: str = "Authorization",
    auth_token: Optional[str] = None,
    timeout: int = 8
) -> List[Dict[str, Any]]:
    """
    Perform safe, non-destructive syntax probes to detect improper SQL/query handling or error leakage.
    Uses benign syntax probes (e.g. single quote `'` in safe non-destructive context).
    Does NOT use destructive payloads or attempt data extraction.
    """
    findings = []
    path = endpoint_config.get("path", "/")
    method = endpoint_config.get("method", "GET").upper()
    full_url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    
    headers = endpoint_config.get("headers") or {}
    if auth_token:
        headers[auth_header_key] = auth_token if "bearer" in auth_token.lower() or "apikey" in auth_token.lower() else f"Bearer {auth_token}"

    # Benign probe characters
    probe_test_param = {"search": "'", "filter": "''", "id": "1'"}

    try:
        if method == "GET":
            resp = requests.get(full_url, headers=headers, params=probe_test_param, timeout=timeout)
        elif method in ("POST", "PUT", "PATCH"):
            resp = requests.request(method, full_url, headers=headers, json={"query": "'", "filter": "'"}, timeout=timeout)
        else:
            return findings

        resp_text = resp.text

        for pattern, engine_name in DB_ERROR_PATTERNS:
            match = pattern.search(resp_text)
            if match:
                matched_snippet = resp_text[max(0, match.start() - 40): min(len(resp_text), match.end() + 60)]
                findings.append({
                    "name": "Database Error & Syntax Disclosure (Potential Injection)",
                    "category": "Injection",
                    "severity": "High",
                    "owasp_category": "API8:2023 Security Misconfiguration & Injection",
                    "endpoint": path,
                    "http_method": method,
                    "description": f"The endpoint returned raw database error signatures ('{engine_name}') when supplied with single-quote syntax characters. This indicates concatenated or unparameterized queries and improper database exception handling.",
                    "evidence_summary": f"Detected error signature: '{match.group(0)}' in HTTP {resp.status_code} response. Snippet: \"...{matched_snippet.strip()}...\"",
                    "remediation": "Use parameterized queries, PreparedStatements, or ORM object models (e.g. SQLAlchemy, Prisma, Hibernate). Never concatenate raw user input into query strings. Catch and sanitize database exceptions so raw traces never reach clients.",
                    "status": "open"
                })
                break
    except requests.RequestException:
        pass

    return findings

