import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_filename="API_Sentinel_Presentation.pptx"):
    prs = Presentation()
    # Widescreen 16:9
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette
    BG_COLOR = RGBColor(9, 13, 22)        # #090D16
    CARD_BG = RGBColor(15, 23, 42)        # #0F172A
    CARD_BORDER = RGBColor(30, 41, 59)    # #1E293B
    CYAN = RGBColor(6, 182, 212)          # #06B6D4
    BLUE = RGBColor(59, 130, 246)         # #3B82F6
    WHITE = RGBColor(248, 250, 252)       # #F8FAFC
    MUTED = RGBColor(148, 163, 184)       # #94A3B8
    GREEN = RGBColor(16, 185, 129)        # #10B981
    RED = RGBColor(239, 68, 68)           # #EF4444
    AMBER = RGBColor(245, 158, 11)        # #F59E0B

    blank_layout = prs.slide_layouts[6]

    def set_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.fill.background()

    def add_header(slide, title_text, category_text="API SENTINEL | CYBERSECURITY PLATFORM"):
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = CYAN

        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.8), Inches(11.7), Inches(0.8))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = WHITE

    def add_card(slide, left, top, width, height, title, items, badge=None, border_color=CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = border_color
        card.line.width = Pt(1.5)

        tx_box = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), height - Inches(0.4))
        tf = tx_box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = title
        p0.font.size = Pt(15)
        p0.font.bold = True
        p0.font.color.rgb = CYAN
        p0.space_after = Pt(8)

        if badge:
            p_badge = tf.add_paragraph()
            p_badge.text = f"[{badge}]"
            p_badge.font.size = Pt(10)
            p_badge.font.bold = True
            p_badge.font.color.rgb = AMBER
            p_badge.space_after = Pt(6)

        for item in items:
            p = tf.add_paragraph()
            p.text = f"•  {item}"
            p.font.size = Pt(12)
            p.font.color.rgb = WHITE
            p.space_after = Pt(5)

    # ---------------- SLIDE 1: Cover ----------------
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    tbox = s1.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(11), Inches(3.2))
    tf1 = tbox.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = "API SENTINEL"
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = WHITE

    p2 = tf1.add_paragraph()
    p2.text = "API Security Assessment & Automated Vulnerability Detection Platform"
    p2.font.size = Pt(20)
    p2.font.bold = True
    p2.font.color.rgb = CYAN
    p2.space_before = Pt(8)

    p3 = tf1.add_paragraph()
    p3.text = "Comprehensive OWASP API Top 10 Auditing • Non-Destructive Probing • Posture Scoring • PDF Reporting"
    p3.font.size = Pt(13)
    p3.font.color.rgb = MUTED
    p3.space_before = Pt(16)

    # ---------------- SLIDE 2: Problem Statement ----------------
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "The API Security Crisis in Modern Architectures")
    add_card(s2, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), "Why Traditional Scanners Fail", [
        "Over 83% of internet traffic is now API-driven (REST, GraphQL, microservices).",
        "Legacy DAST scanners evaluate web forms and HTML DOMs, completely blind to JSON state.",
        "Traditional Web Application Firewalls (WAFs) lack object-level context to detect authorization flaws.",
        "APIs have become the #1 threat vector in high-profile data breaches globally."
    ])
    add_card(s2, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8), "The API Sentinel Solution", [
        "Purpose-built for modern REST APIs and JSON endpoints.",
        "Automated discovery and validation of OWASP API Security Top 10 vulnerabilities.",
        "Strictly non-destructive, rate-bounded test engine with zero database corruption risk.",
        "Deterministic, explainable security posture scoring and executive reporting."
    ])

    # ---------------- SLIDE 3: Primary Objectives ----------------
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "Core Objectives & Security Principles")
    add_card(s3, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), "1. Automated Detection", [
        "Detects BOLA (API1), Broken Auth (API2), and Data Exposure (API3).",
        "Probes rate-limiting thresholds and security headers automatically.",
        "Identifies database driver exceptions safely."
    ], "Detection")
    add_card(s3, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), "2. Safety & SSRF Guard", [
        "Controlled rate-bounded probes prevent denial of service.",
        "SSRF protection strictly blocks cloud metadata (169.254.169.254).",
        "Mandatory authorization agreement prior to scanning."
    ], "Safety")
    add_card(s3, Inches(8.8), Inches(1.8), Inches(3.7), Inches(4.8), "3. Actionable Remediation", [
        "Real-time background scanning with progress tracking.",
        "Severity-weighted risk scoring formula (0 - 100).",
        "Board-ready, multi-page ReportLab PDF export."
    ], "Reporting")

    # ---------------- SLIDE 4: Tech Stack ----------------
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "Full-Stack Technology Architecture")
    add_card(s4, Inches(0.8), Inches(1.8), Inches(2.7), Inches(4.8), "Frontend", [
        "React 19 & TypeScript",
        "Tailwind CSS v4",
        "Vite 8 Build Engine",
        "Lucide React Icons",
        "Recharts Visualizations",
        "Axios + Interceptors"
    ], "Client")
    add_card(s4, Inches(3.8), Inches(1.8), Inches(2.7), Inches(4.8), "Backend", [
        "Python 3.11+",
        "FastAPI Server",
        "Pydantic v2 Models",
        "SQLAlchemy ORM",
        "Uvicorn ASGI Server",
        "Python Requests Pools"
    ], "API")
    add_card(s4, Inches(6.8), Inches(1.8), Inches(2.7), Inches(4.8), "Security & DB", [
        "Bcrypt Password Hash",
        "PyJWT Authentication",
        "SQLite Persistence",
        "PostgreSQL-Ready ORM",
        "SSRF Host Filtering",
        "User Data Isolation"
    ], "Storage")
    add_card(s4, Inches(9.8), Inches(1.8), Inches(2.7), Inches(4.8), "Reporting", [
        "ReportLab 5.0 Engine",
        "Dynamic NumberedCanvas",
        "PDF Metric Tables",
        "Remediation Roadmaps",
        "On-Demand Downloads"
    ], "PDF")

    # ---------------- SLIDE 5: OWASP Modules Part 1 ----------------
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "Security Scanner Engine: Auth & Authorization")
    add_card(s5, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), "BOLA / IDOR (API1)", [
        "Broken Object Level Authorization testing.",
        "Dual-account token testing (Account A vs Account B).",
        "Evaluates cross-tenant resource ID tampering.",
        "Flags unauthorized access returning HTTP 200.",
        "Severity: Critical (-25 pts)."
    ], "OWASP API1:2023")
    add_card(s5, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), "Broken Auth (API2)", [
        "Probes protected endpoints without credentials.",
        "Sends expired, malformed, and forged JWT tokens.",
        "Detects missing 401/403 authorization enforcement.",
        "Flags inconsistent auth schemes.",
        "Severity: Critical (-25 pts)."
    ], "OWASP API2:2023")
    add_card(s5, Inches(8.8), Inches(1.8), Inches(3.7), Inches(4.8), "Data Exposure (API3)", [
        "Recursively inspects JSON response structures.",
        "Flags password hashes, secret keys, and SSNs.",
        "Detects credit card numbers and internal primary keys.",
        "Recommends Data Transfer Objects (DTOs).",
        "Severity: High (-15 pts)."
    ], "OWASP API3:2023")

    # ---------------- SLIDE 6: OWASP Modules Part 2 ----------------
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "Security Scanner Engine: Misconfig & Injection")
    add_card(s6, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), "Rate Limiting (API4)", [
        "Controlled rapid request bursts.",
        "Verifies HTTP 429 Too Many Requests response.",
        "Validates X-RateLimit-* and Retry-After headers.",
        "Prevents resource consumption & scraping.",
        "Severity: Medium (-7 pts)."
    ], "OWASP API4:2023")
    add_card(s6, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), "Safe Injection Probing", [
        "Non-destructive syntax error detection.",
        "Probes SQLite, Postgres, MySQL, Mongo drivers.",
        "Detects leaked database stack traces.",
        "Recommends parameterized queries and ORMs.",
        "Severity: High (-15 pts)."
    ], "OWASP API8:2023")
    add_card(s6, Inches(8.8), Inches(1.8), Inches(3.7), Inches(4.8), "Headers & Misconfig", [
        "Checks HSTS, CSP, nosniff, and X-Frame-Options.",
        "Flags wildcard CORS with credentials (* with true).",
        "Detects verbose Server and X-Powered-By banners.",
        "Checks for enabled HTTP TRACE (XST).",
        "Severity: Low to Medium."
    ], "OWASP API8:2023")

    # ---------------- SLIDE 7: Scoring Formula ----------------
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "Explainable Security Posture Scoring (0 – 100)")
    add_card(s7, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), "Deterministic Scoring Formula", [
        "Score = max(0.0, 100.0 - Total Deductions)",
        "Critical Findings: -25.0 points per vulnerability",
        "High Severity Findings: -15.0 points per vulnerability",
        "Medium Severity Findings: -7.0 points per vulnerability",
        "Low Severity Findings: -3.0 points per vulnerability",
        "Informational Findings: 0.0 points (best practice notice)",
        "Completely transparent with no black-box estimations."
    ], "Mathematical Formula")
    add_card(s7, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8), "Posture Classification Bands", [
        "Grade A (90 - 100): Excellent defense-in-depth security.",
        "Grade B (75 - 89): Good baseline with minor header deviations.",
        "Grade C (50 - 74): Moderate risk; prioritized remediation advised.",
        "Grade D (30 - 49): Poor security; high risk exposure.",
        "Grade F (< 30): Critical risk; urgent intervention required.",
        "Used for organizational compliance and executive reporting."
    ], "Tiers & SLA")

    # ---------------- SLIDE 8: Demo Lab Benchmark ----------------
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "Demonstration Lab: Vulnerable vs Hardened Benchmark")
    add_card(s8, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), "Target 1: InsecureBank (:8001)", [
        "Deliberately exhibits OWASP API Top 10 vulnerabilities.",
        "BOLA vulnerability on /api/v1/users/{id}.",
        "Unauthenticated orders endpoint /api/v1/orders.",
        "Excessive data exposure: returns password hash & SSN.",
        "SQLite syntax error disclosure on single quotes.",
        "Zero security headers and missing rate limiting.",
        "Scan Result: 0.0 / 100 (Grade F - Critical Risk)."
    ], "Vulnerable Target", RED)
    add_card(s8, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8), "Target 2: SecureBank (:8002)", [
        "Secured, hardened reference implementation.",
        "Strict 403 Forbidden BOLA ownership validation.",
        "Mandatory JWT authentication (HTTP 401 on missing/bad token).",
        "Sanitized DTO responses (passwords and SSNs excluded).",
        "Sliding window rate limiting with HTTP 429 & headers.",
        "Full HSTS, CSP, nosniff, and sanitized Server banner.",
        "Scan Result: Posture improved by +52.0 points!"
    ], "Hardened Benchmark", GREEN)

    # ---------------- SLIDE 9: Scan Comparison ----------------
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, "Scan Comparison: Remediation Verification")
    add_card(s9, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), "Score Delta Analysis", [
        "Side-by-side posture comparison between baseline and target.",
        "Visual delta metric indicator (e.g. +52.0 points).",
        "Provides clear proof of security posture improvement.",
        "Essential for sprint and release sign-offs."
    ], "Posture Delta")
    add_card(s9, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), "Remediated Findings", [
        "Automatically identifies resolved vulnerabilities.",
        "Verifies that BOLA and auth bypasses have been fixed.",
        "Validates defensive header additions.",
        "Eliminates false sense of security."
    ], "Verification")
    add_card(s9, Inches(8.8), Inches(1.8), Inches(3.7), Inches(4.8), "Regression Prevention", [
        "Flags newly introduced vulnerabilities between releases.",
        "Tracks persistent findings requiring engineering attention.",
        "Maintains historic audit trail for compliance.",
        "Ensures long-term security maturity."
    ], "Drift Tracking")

    # ---------------- SLIDE 10: PDF Reporting ----------------
    s10 = prs.slides.add_slide(blank_layout)
    set_slide_background(s10)
    add_header(s10, "Executive PDF Reporting Engine")
    add_card(s10, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), "Report Content & Structure", [
        "Official Report Title & Assessment ID (e.g. SENTINEL-SCAN-0001).",
        "Target API details, base URL, and scan duration.",
        "Executive summary and overall posture score with letter grade.",
        "Vulnerability severity breakdown table.",
        "Detailed findings with raw evidence and HTTP status codes.",
        "Actionable remediation guidance and testing limitations."
    ], "ReportLab Engine")
    add_card(s10, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8), "Enterprise Value & Compliance", [
        "Professional typography and dynamic page numbering (Page X of Y).",
        "Board-ready document suitable for CTOs, CISOs, and audit teams.",
        "Direct one-click download from web console or REST endpoint.",
        "Permanently archived in backend generated_reports directory.",
        "Non-destructive testing disclaimer and methodology notes."
    ], "Compliance Ready")

    # ---------------- SLIDE 11: Empirical Test Results ----------------
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11)
    add_header(s11, "Empirical Validation & Test Results")
    add_card(s11, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), "Automated Pytest Suite (7/7 Passed)", [
        "test_password_hashing: Bcrypt salt rounds verified.",
        "test_jwt_creation_and_decoding: HMAC-SHA256 verified.",
        "test_ssrf_protection_cloud_metadata: 169.254.169.254 blocked.",
        "test_security_scoring_formula: Weighted deduction verified.",
        "test_excessive_data_exposure_traversal: Secret detection verified.",
        "test_pdf_report_generator: PDF compiled & size validated.",
        "test_auth_and_target_api_flow: Full REST integration passed."
    ], "Pytest Suite", GREEN)
    add_card(s11, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8), "Live Demo Lab Scan (End-to-End)", [
        "Vulnerable API (:8001): 59 findings detected, Score 0.0/100.",
        "BOLA cross-account and ID tampering confirmed.",
        "Unauthenticated sensitive routes detected.",
        "SQLite syntax disclosure and stack trace leaks identified.",
        "Secure API (:8002): Zero BOLA, zero auth bypass, score +52.0 pts.",
        "PDF Report generated: 50.3 KB multi-page report verified."
    ], "Live Execution", CYAN)

    # ---------------- SLIDE 12: Safety & Ethical Design ----------------
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12)
    add_header(s12, "Safety Restrictions & Ethical Testing Guardrails")
    add_card(s12, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), "Non-Destructive Guarantee", [
        "Strictly harmless, non-destructive probe payloads.",
        "Zero database mutation, dropping, or data exfiltration.",
        "Rate-bounded bursts with configurable delay to prevent DoS.",
        "No brute-force credential stuffing or password guessing.",
        "Safe syntax error probes detecting improper handling without harm."
    ], "Controlled DAST")
    add_card(s12, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8), "SSRF & Authorization Guardrails", [
        "Unconditionally blocks cloud metadata (169.254.169.254).",
        "Blocks Google, AWS, and Azure internal metadata hostnames.",
        "Private loopback IP testing requires explicit user permission.",
        "Mandatory legal authorization consent checkbox before every scan.",
        "Full audit logging and user session isolation."
    ], "Defense in Depth")

    # ---------------- SLIDE 13: Live Console Tour ----------------
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_background(s13)
    add_header(s13, "Platform Feature Tour & User Journey")
    add_card(s13, Inches(0.8), Inches(1.8), Inches(3.6), Inches(4.8), "1. Dashboard & Target", [
        "Real-time database statistics and risk score gauge.",
        "Vulnerability severity distribution bar chart.",
        "API Target registration with custom endpoints and methods.",
        "Live connectivity verification and latency probing."
    ], "Setup")
    add_card(s13, Inches(4.8), Inches(1.8), Inches(3.6), Inches(4.8), "2. Live Scan Monitor", [
        "Selectable security check modules (all 8 or custom).",
        "Background worker execution with progress bar (0% - 100%).",
        "Live stage indicator showing current probe step.",
        "Safe scan abort / cancellation button."
    ], "Execution")
    add_card(s13, Inches(8.8), Inches(1.8), Inches(3.7), Inches(4.8), "3. Triage & Reports", [
        "Interactive vulnerability modal with raw evidence payload.",
        "Lifecycle status changer (Open, Resolved, Accepted Risk).",
        "Side-by-side scan comparison.",
        "One-click downloadable PDF security assessment report."
    ], "Remediation")

    # ---------------- SLIDE 14: Future Roadmap ----------------
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_background(s14)
    add_header(s14, "Project Milestones & Future Enhancements")
    add_card(s14, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), "Delivered Capabilities", [
        "Complete full-stack cybersecurity application.",
        "100% real database telemetry with zero mock statistics.",
        "Modular Python scanner covering OWASP API Top 10.",
        "Dual-account BOLA validation engine.",
        "Multi-page ReportLab PDF report generation.",
        "Comprehensive demo lab with vulnerable and secure APIs."
    ], "Milestones Achieved", GREEN)
    add_card(s14, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.8), "Future Roadmap", [
        "CI/CD Pipeline Integration (GitHub Actions / GitLab CI runner).",
        "OpenAPI / Swagger JSON import for automatic route discovery.",
        "Role-Based Access Control (RBAC: Admin, Analyst, Auditor).",
        "Enterprise PostgreSQL & Redis cluster deployment.",
        "Automated patch and remediation snippet generator."
    ], "Next Steps", BLUE)

    # ---------------- SLIDE 15: Conclusion ----------------
    s15 = prs.slides.add_slide(blank_layout)
    set_slide_background(s15)

    cbox = s15.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(11), Inches(3.2))
    tfc = cbox.text_frame
    tfc.word_wrap = True
    pc1 = tfc.paragraphs[0]
    pc1.text = "API SENTINEL"
    pc1.font.size = Pt(40)
    pc1.font.bold = True
    pc1.font.color.rgb = WHITE

    pc2 = tfc.add_paragraph()
    pc2.text = "Securing the Future of REST APIs Through Automated Intelligence"
    pc2.font.size = Pt(20)
    pc2.font.bold = True
    pc2.font.color.rgb = CYAN
    pc2.space_before = Pt(8)

    pc3 = tfc.add_paragraph()
    pc3.text = "Thank You! Questions, Discussion & Live Demonstration."
    pc3.font.size = Pt(16)
    pc3.font.color.rgb = MUTED
    pc3.space_before = Pt(18)

    prs.save(output_filename)
    print(f"Successfully generated PowerPoint presentation: {output_filename}")

if __name__ == "__main__":
    create_deck()

