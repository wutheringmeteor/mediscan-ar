/**
 * pdfReport.js
 * Generates a downloadable PDF scan report using the browser's print API
 * (no paid library needed — works everywhere, including offline).
 *
 * Opens a styled print window that the user can save as PDF via Ctrl+P / ⌘+P.
 * Falls back to a structured HTML blob download if window.print is blocked.
 */

import { stripMarkup, truncateForDisplay } from "./textCleaner.js";

/**
 * Generate and trigger download of a scan report.
 *
 * @param {import('../hooks/useScanHistory').ScanEntry} entry
 */
export function generateReport(entry) {
  const html = buildReportHTML(entry);

  // Open in a new window for printing
  const win = window.open("", "_blank", "width=800,height=900");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  } else {
    // Popup blocked — download as .html file instead
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mediscan-report-${entry.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** Build full HTML string for the report */
function buildReportHTML(entry) {
  const date = new Date(entry.timestamp).toLocaleString();
  const riskColor = { high: "#FC8181", medium: "#F6AD55", low: "#68D391" }[entry.riskLevel] || "#68D391";

  const medicineBlocks = (entry.medicines || [])
    .map((med) => buildMedicineBlock(med))
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>MediScan AR Report — ${entry.imageName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600;700&family=DM+Mono:wght@400&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      color: #1a202c;
      background: #fff;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .logo { font-size: 22px; font-weight: 700; color: #2b6cb0; letter-spacing: -0.5px; }
    .logo span { color: #4299e1; }
    .meta { text-align: right; font-size: 11px; color: #718096; }
    .meta strong { display: block; font-size: 13px; color: #2d3748; }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      background: ${riskColor}22;
      color: ${riskColor === "#FC8181" ? "#c53030" : riskColor === "#F6AD55" ? "#b7791f" : "#276749"};
      border: 1px solid ${riskColor}55;
    }
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: #718096;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px; margin-bottom: 12px;
    }
    .ocr-box {
      background: #f7fafc; border: 1px solid #e2e8f0;
      border-radius: 8px; padding: 14px;
      font-family: 'DM Mono', monospace;
      font-size: 11px; color: #4a5568;
      white-space: pre-wrap; word-break: break-word;
      max-height: 120px; overflow: hidden;
    }
    .medicine-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px; margin-bottom: 20px;
      overflow: hidden;
    }
    .medicine-header {
      background: #ebf8ff;
      padding: 14px 18px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .medicine-name { font-size: 16px; font-weight: 700; color: #2b6cb0; }
    .medicine-generic { font-size: 11px; color: #4a5568; margin-top: 2px; }
    .medicine-body { padding: 16px 18px; }
    .field { margin-bottom: 12px; }
    .field-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: #a0aec0; margin-bottom: 4px;
    }
    .field-value { font-size: 12px; color: #2d3748; line-height: 1.6; }
    .warning-box {
      background: #fff5f5; border-left: 3px solid #fc8181;
      padding: 10px 14px; border-radius: 4px; margin-top: 8px;
    }
    .pill-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .pill {
      background: #ebf8ff; color: #2b6cb0;
      font-size: 11px; padding: 2px 10px; border-radius: 20px;
      border: 1px solid #bee3f8;
    }
    .footer {
      margin-top: 32px; padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px; color: #a0aec0; text-align: center;
    }
    .disclaimer {
      background: #fffaf0; border: 1px solid #fbd38d;
      border-radius: 8px; padding: 12px 16px;
      font-size: 11px; color: #744210; margin-top: 20px;
    }
    @media print {
      body { padding: 20px; }
      .medicine-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">MediScan <span>AR</span></div>
      <div style="font-size:11px;color:#718096;margin-top:4px;">Medicine Intelligence Platform</div>
    </div>
    <div class="meta">
      <strong>Scan Report</strong>
      ${date}<br/>
      File: ${entry.imageName}<br/>
      OCR Confidence: ${entry.ocrConfidence}%<br/>
      <span class="badge">${entry.riskLevel} risk</span>
      ${entry.isDemo ? '<br/><span style="color:#e53e3e;font-size:10px;">DEMO MODE</span>' : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Extracted Text (OCR)</div>
    <div class="ocr-box">${truncateForDisplay(entry.ocrText, 600)}</div>
  </div>

  <div class="section">
    <div class="section-title">Identified Medicines (${entry.medicines?.length || 0})</div>
    ${medicineBlocks || '<p style="color:#a0aec0;font-size:12px;">No medicines identified.</p>'}
  </div>

  <div class="disclaimer">
    <strong>Important Disclaimer:</strong> This report is generated for informational purposes only and is based on publicly available FDA drug label data. It does not constitute medical advice. Always consult a qualified healthcare professional before making any medical decisions.
  </div>

  <div class="footer">
    Generated by MediScan AR &mdash; University Project &mdash; Data source: openFDA
  </div>
</body>
</html>`;
}

function buildMedicineBlock(med) {
  const purposeText = med.purpose || med.indicationsAndUsage;
  const warningText = med.warnings || med.warningsCautions;

  return `
  <div class="medicine-card">
    <div class="medicine-header">
      <div>
        <div class="medicine-name">${escHtml(med.brandName)}</div>
        ${med.genericName ? `<div class="medicine-generic">${escHtml(med.genericName)}</div>` : ""}
      </div>
      <div style="text-align:right;font-size:11px;color:#4a5568;">
        ${med.routeOfAdmin ? escHtml(med.routeOfAdmin) : ""}
        ${med.dosageForm ? ` &bull; ${escHtml(med.dosageForm)}` : ""}
      </div>
    </div>
    <div class="medicine-body">
      ${purposeText ? `
      <div class="field">
        <div class="field-label">Purpose / Use</div>
        <div class="field-value">${escHtml(truncateForDisplay(stripMarkup(purposeText), 300))}</div>
      </div>` : ""}

      ${med.dosageAndAdmin ? `
      <div class="field">
        <div class="field-label">Dosage &amp; Administration</div>
        <div class="field-value">${escHtml(truncateForDisplay(stripMarkup(med.dosageAndAdmin), 300))}</div>
      </div>` : ""}

      ${warningText ? `
      <div class="field">
        <div class="field-label">Warnings</div>
        <div class="warning-box field-value">${escHtml(truncateForDisplay(stripMarkup(warningText), 300))}</div>
      </div>` : ""}

      ${med.activeIngredient ? `
      <div class="field">
        <div class="field-label">Active Ingredient(s)</div>
        <div class="field-value">${escHtml(truncateForDisplay(stripMarkup(med.activeIngredient), 200))}</div>
      </div>` : ""}

      ${med.ndcCode ? `
      <div class="field">
        <div class="field-label">NDC Code</div>
        <div class="field-value" style="font-family:monospace">${escHtml(med.ndcCode)}</div>
      </div>` : ""}
    </div>
  </div>`;
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
