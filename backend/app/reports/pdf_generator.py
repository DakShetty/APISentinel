import os
import datetime
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Canvas that computes total pages dynamically and adds professional header & footer."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 755, "API SENTINEL — REST API SECURITY ASSESSMENT REPORT")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 750, 558, 750)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "CONFIDENTIAL — STRICTLY FOR AUTHORIZED SECURITY PERSONNEL ONLY")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 46, 558, 46)
        
        self.restoreState()


def generate_security_pdf_report(
    output_path: str,
    scan_data: Dict[str, Any],
    target_data: Dict[str, Any],
    vulnerabilities: List[Dict[str, Any]]
) -> str:
    """Generate comprehensive executive security assessment PDF report."""
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        "CoverSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0284c7"),
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    code_style = ParagraphStyle(
        "Code_Custom",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPadding=4
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("API SENTINEL", subtitle_style))
    story.append(Paragraph("API Security Assessment & Vulnerability Audit Report", title_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0284c7"), spaceAfter=15))

    # Assessment Meta Grid
    scan_id = scan_data.get("id", "N/A")
    score = scan_data.get("security_score", 100.0)
    target_name = target_data.get("name", "Unknown API")
    base_url = target_data.get("base_url", "Unknown URL")
    date_str = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    meta_table_data = [
        [
            Paragraph("<b>Assessment ID:</b>", body_style),
            Paragraph(f"SENTINEL-SCAN-{scan_id:04d}", body_style),
            Paragraph("<b>Generated Date:</b>", body_style),
            Paragraph(date_str, body_style)
        ],
        [
            Paragraph("<b>Target API Name:</b>", body_style),
            Paragraph(target_name, body_style),
            Paragraph("<b>Base URL:</b>", body_style),
            Paragraph(base_url, body_style)
        ],
        [
            Paragraph("<b>Overall Security Score:</b>", body_style),
            Paragraph(f"<b>{score:.1f} / 100</b>", body_style),
            Paragraph("<b>Assessment Duration:</b>", body_style),
            Paragraph(f"{scan_data.get('duration_seconds', 0):.2f} seconds", body_style)
        ]
    ]

    meta_table = Table(meta_table_data, colWidths=[110, 140, 110, 144])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))

    # Executive Summary
    story.append(Paragraph("1. Executive Summary", h1_style))
    
    crit = scan_data.get("critical_count", 0)
    high = scan_data.get("high_count", 0)
    med = scan_data.get("medium_count", 0)
    low = scan_data.get("low_count", 0)
    info = scan_data.get("info_count", 0)
    total_findings = crit + high + med + low + info

    if score >= 90:
        posture_text = "exhibits an <b>Excellent</b> defensive posture with strong authentication and security controls."
    elif score >= 75:
        posture_text = "demonstrates a <b>Good</b> security baseline, but minor configuration and header findings were discovered."
    elif score >= 50:
        posture_text = "reveals a <b>Moderate</b> risk level with notable vulnerabilities that require prioritized remediation."
    else:
        posture_text = "demonstrates a <b>High / Critical Risk</b> profile. Immediate remedial intervention is urgently advised."

    summary_p = (
        f"API Sentinel executed an automated, non-destructive vulnerability assessment against <b>{target_name}</b> "
        f"covering OWASP API Security Top 10 categories. The target evaluated to a Security Posture Score of "
        f"<b>{score:.1f} out of 100</b>. The system {posture_text} A total of <b>{total_findings} findings</b> "
        f"were detected across {scan_data.get('endpoints_tested_count', 1)} evaluated endpoint configurations."
    )
    story.append(Paragraph(summary_p, body_style))
    story.append(Spacer(1, 10))

    # Vulnerability Breakdown Table
    story.append(Paragraph("2. Vulnerability Severity Distribution", h1_style))
    
    breakdown_data = [
        ["Severity Level", "Findings Count", "Score Weight / Impact", "Action SLA Recommendation"],
        ["Critical", str(crit), "-25 points per finding", "Immediate remediation (< 24 hours)"],
        ["High", str(high), "-15 points per finding", "Remediate within next sprint (< 7 days)"],
        ["Medium", str(med), "-7 points per finding", "Scheduled remediation (< 30 days)"],
        ["Low", str(low), "-3 points per finding", "Maintenance backlog / Defense in depth"],
        ["Informational", str(info), "0 points", "Best practice enhancement"],
        ["Total Findings", str(total_findings), f"Score: {score:.1f}/100", "—"]
    ]

    breakdown_table = Table(breakdown_data, colWidths=[110, 100, 130, 164])
    breakdown_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor("#fee2e2")), # Crit
        ('BACKGROUND', (0,2), (-1,2), colors.HexColor("#ffedd5")), # High
        ('BACKGROUND', (0,3), (-1,3), colors.HexColor("#fef3c7")), # Med
        ('BACKGROUND', (0,4), (-1,4), colors.HexColor("#f1f5f9")), # Low
        ('BACKGROUND', (0,5), (-1,5), colors.HexColor("#f8fafc")), # Info
        ('BACKGROUND', (0,6), (-1,6), colors.HexColor("#e2e8f0")), # Total
        ('FONTNAME', (0,6), (-1,6), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ALIGN', (1,0), (1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(breakdown_table)
    story.append(Spacer(1, 15))

    # Detailed Vulnerability Findings
    story.append(Paragraph("3. Detailed Vulnerability Findings", h1_style))
    
    if not vulnerabilities:
        story.append(Paragraph("No vulnerabilities were identified during this assessment.", body_style))
    else:
        for idx, vuln in enumerate(vulnerabilities, start=1):
            sev = vuln.get("severity", "Medium")
            sev_color = "#dc2626" if sev == "Critical" else "#ea580c" if sev == "High" else "#d97706" if sev == "Medium" else "#2563eb"
            
            vuln_elements = []
            vuln_title = f"{idx}. [{sev.upper()}] {vuln.get('name', 'Vulnerability')}"
            vuln_elements.append(Paragraph(vuln_title, h2_style))
            
            detail_data = [
                [Paragraph("<b>Category:</b>", body_style), Paragraph(vuln.get("category", "General"), body_style)],
                [Paragraph("<b>OWASP Mapping:</b>", body_style), Paragraph(vuln.get("owasp_category", "N/A"), body_style)],
                [Paragraph("<b>Affected Endpoint:</b>", body_style), Paragraph(f"<code>{vuln.get('http_method', 'GET')} {vuln.get('endpoint', '/')}</code>", code_style)],
                [Paragraph("<b>Description:</b>", body_style), Paragraph(vuln.get("description", "No description"), body_style)],
                [Paragraph("<b>Evidence Summary:</b>", body_style), Paragraph(vuln.get("evidence_summary", "No evidence recorded"), code_style)],
                [Paragraph("<b>Remediation:</b>", body_style), Paragraph(vuln.get("remediation", "Apply vendor patch or input validation"), body_style)],
            ]
            
            t = Table(detail_data, colWidths=[120, 384])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#f8fafc")),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            vuln_elements.append(t)
            vuln_elements.append(Spacer(1, 10))
            story.append(KeepTogether(vuln_elements))

    # Testing Methodology & Limitations
    story.append(Spacer(1, 10))
    story.append(Paragraph("4. Assessment Methodology & Limitations", h1_style))
    method_text = (
        "<b>Non-Destructive Testing Policy:</b> API Sentinel assessments utilize non-destructive, controlled, and rate-bounded "
        "security probes designed exclusively to detect improper authorization boundaries, configuration discrepancies, "
        "and missing defensive headers. Testing was confined strictly to the designated target URL and explicitly registered endpoints. "
        "<br/><br/>"
        "<b>Limitations:</b> This automated scan does not constitute a full manual penetration test or formal cryptographic source code audit. "
        "Security scores reflect observed posture at the time of assessment and do not represent a guarantee of absolute security."
    )
    story.append(Paragraph(method_text, body_style))
    story.append(Spacer(1, 15))

    # Build the PDF using NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    return output_path

