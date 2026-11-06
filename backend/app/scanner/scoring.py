from typing import List, Dict, Any

SEVERITY_WEIGHTS = {
    "Critical": 25.0,
    "High": 15.0,
    "Medium": 7.0,
    "Low": 3.0,
    "Informational": 0.0,
}

def calculate_security_score(vulnerabilities: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate an explainable security posture score between 0.0 and 100.0.
    
    Formula:
      Base Score = 100.0
      Total Deduction = (Critical * 25.0) + (High * 15.0) + (Medium * 7.0) + (Low * 3.0)
      Security Score = max(0.0, 100.0 - Total Deduction)
    """
    counts = {
        "Critical": 0,
        "High": 0,
        "Medium": 0,
        "Low": 0,
        "Informational": 0,
    }
    
    total_deductions = 0.0
    
    for vuln in vulnerabilities:
        sev = vuln.get("severity", "Informational")
        if sev in counts:
            counts[sev] += 1
            total_deductions += SEVERITY_WEIGHTS.get(sev, 0.0)
        else:
            counts["Informational"] += 1

    final_score = round(max(0.0, min(100.0, 100.0 - total_deductions)), 1)
    
    # Posture classification
    if final_score >= 90:
        grade = "A"
        posture = "Excellent"
        summary = "Minimal risk exposure. API adheres to primary defense-in-depth security best practices."
    elif final_score >= 75:
        grade = "B"
        posture = "Good"
        summary = "Acceptable security baseline with minor non-critical configuration or header deviations."
    elif final_score >= 50:
        grade = "C"
        posture = "Fair / Needs Attention"
        summary = "Moderate risk exposure. Multiple medium or high-severity vulnerabilities require remediation."
    elif final_score >= 30:
        grade = "D"
        posture = "Poor / High Risk"
        summary = "Significant security deficiencies discovered, including potential authentication or authorization bypasses."
    else:
        grade = "F"
        posture = "Critical / Severe Risk"
        summary = "Severe vulnerability footprint detected. The API exhibits critical vulnerabilities requiring immediate patching."

    return {
        "score": final_score,
        "grade": grade,
        "posture": posture,
        "summary": summary,
        "total_deductions": round(total_deductions, 1),
        "counts": counts,
        "formula_description": "Score = 100 - (Critical x 25 + High x 15 + Medium x 7 + Low x 3), bounded between 0 and 100"
    }

