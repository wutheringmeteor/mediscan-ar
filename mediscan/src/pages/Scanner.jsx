/**
 * pages/Scanner.jsx
 * Main scanning page.
 * Pipeline: Upload → Tesseract OCR → Medicine parsing → openFDA lookup → Display
 *
 * RxNorm removed. openFDA is queried directly — faster and free forever.
 * OCR now runs fully in-browser via Tesseract.js LSTM.
 */

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T, VARIANTS } from "../tokens.js";
import UploadBox from "../components/UploadBox.jsx";
import LoadingScreen from "../components/LoadingScreen.jsx";
import OCRPreview from "../components/OCRPreview.jsx";
import MedicineCard from "../components/MedicineCard.jsx";
import RiskIndicator from "../components/RiskIndicator.jsx";

import { extractTextFromImage } from "../services/ocrService.js";
import { fetchDrugLabel, FDAError } from "../services/openfdaService.js";
import { cleanOCRText } from "../utils/textCleaner.js";
import { extractMedicineNames } from "../utils/medicineParser.js";
import { inferRiskLevel } from "../utils/summarizer.js";
import { generateReport } from "../utils/pdfReport.js";
import { getDemoOCRResult, getDemoMedicine, DEMO_MEDICINES } from "../assets/demoData.js";

const STEP = {
  IDLE:  "idle",
  OCR:   "ocr",
  PARSE: "parse",
  FDA:   "fda",
  DONE:  "done",
  ERROR: "error",
};

export default function Scanner({ onScanComplete }) {
  const [step, setStep]               = useState(STEP.IDLE);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [log, setLog]                 = useState([]);
  const [error, setError]             = useState(null);

  const [ocrResult, setOcrResult]     = useState(null);
  const [candidates, setCandidates]   = useState([]);
  const [medicines, setMedicines]     = useState([]);
  const [usingDemo, setUsingDemo]     = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);

  const abortRef = useRef(false);

  const addLog = useCallback((msg) => setLog((p) => [...p, msg]), []);

  // ── Pipeline ───────────────────────────────────────────────────────────────
  const runPipeline = useCallback(async (file, previewUrl) => {
    abortRef.current = false;
    setError(null); setLog([]); setOcrResult(null);
    setCandidates([]); setMedicines([]); setUsingDemo(false);
    setCurrentFile(file); setImageDataUrl(previewUrl);

    // Step 1: OCR
    setStep(STEP.OCR);
    addLog("Starting in-browser OCR (Tesseract LSTM)…");

    let rawOCR;
    try {
      rawOCR = await extractTextFromImage(file, (pct) => {
        setOcrProgress(pct);
        if (pct === 20)  addLog("Pre-processing image (contrast + upscale)…");
        if (pct === 30)  addLog("Tesseract LSTM engine running…");
        if (pct === 90)  addLog("OCR complete, extracting text…");
      });
      addLog(`Extracted ${rawOCR.text.length} chars (confidence: ${rawOCR.confidence}%)`);
    } catch (err) {
      addLog(`OCR failed: ${err.message}. Switching to demo.`);
      rawOCR = getDemoOCRResult(0);
      setUsingDemo(true);
    }

    if (abortRef.current) return;
    const cleanedText = cleanOCRText(rawOCR.text);
    setOcrResult({ ...rawOCR, text: cleanedText });

    // Step 2: Parse medicine names
    setStep(STEP.PARSE);
    addLog("Identifying medicine names…");
    await sleep(150);

    let cands = extractMedicineNames(cleanedText);
    setCandidates(cands);

    if (cands.length === 0) {
      if (rawOCR.isDemo && rawOCR.medicineName) {
        cands = [{ name: rawOCR.medicineName, displayName: titleCase(rawOCR.medicineName), score: 80 }];
      } else {
        setStep(STEP.ERROR);
        setError(
          "No medicine names found in the scanned text. " +
          "Try a clearer, closer photo of the medicine label — " +
          "or use the demo button below."
        );
        return;
      }
    }

    addLog(`Found: ${cands.map((c) => c.displayName).join(", ")}`);

    // Step 3: openFDA lookup (no RxNorm middleman)
    setStep(STEP.FDA);
    addLog("Looking up drug data from openFDA…");

    const fetchedMeds = [];

    for (const cand of cands) {
      if (abortRef.current) break;
      addLog(`  → Searching openFDA for "${cand.displayName}"…`);

      try {
        const label = await fetchDrugLabel(cand.name);
        fetchedMeds.push({ label });
        addLog(`  ✓ ${label.brandName}${label.genericName ? ` (${label.genericName})` : ""}`);
      } catch (err) {
        if (err instanceof FDAError && err.code === "NOT_FOUND") {
          // Try the display name (may have better casing/brand match)
          try {
            const label = await fetchDrugLabel(cand.displayName);
            fetchedMeds.push({ label });
            addLog(`  ✓ ${label.brandName} (via brand name)`);
            continue;
          } catch {}

          const demo = getDemoMedicine(cand.name);
          if (demo) {
            fetchedMeds.push({ label: demo });
            setUsingDemo(true);
            addLog(`  ↩ Using demo fallback for ${demo.brandName}`);
          } else {
            addLog(`  ✗ No data found for "${cand.displayName}" — skipping`);
          }
        } else {
          addLog(`  ✗ Error: ${err.message}`);
          const demo = getDemoMedicine(cand.name);
          if (demo) { fetchedMeds.push({ label: demo }); setUsingDemo(true); }
        }
      }
    }

    if (fetchedMeds.length === 0) {
      addLog("No medicines found. Loading demo data.");
      fetchedMeds.push({ label: DEMO_MEDICINES[0] });
      setUsingDemo(true);
    }

    setMedicines(fetchedMeds);
    setStep(STEP.DONE);
    addLog(`Done. Showing ${fetchedMeds.length} medicine(s).`);

    const overallRisk = computeOverallRisk(fetchedMeds.map((m) => m.label));
    onScanComplete({
      imageName: file.name,
      imageDataUrl: previewUrl,
      ocrText: cleanedText,
      ocrConfidence: rawOCR.confidence,
      medicines: fetchedMeds.map((m) => m.label),
      riskLevel: overallRisk,
      isDemo: rawOCR.isDemo || usingDemo,
    });
  }, [addLog, onScanComplete]);

  // ── Demo ───────────────────────────────────────────────────────────────────
  const runDemo = useCallback(async (demoIndex = 0) => {
    abortRef.current = false;
    setError(null); setLog([]); setOcrResult(null);
    setCandidates([]); setMedicines([]); setUsingDemo(true);
    setCurrentFile(null); setImageDataUrl(null);

    setStep(STEP.OCR);
    addLog("[DEMO] Loading sample medicine data…");
    await sleep(500);

    const demo = getDemoOCRResult(demoIndex);
    const cleaned = cleanOCRText(demo.text);
    setOcrProgress(100);
    setOcrResult({ ...demo, text: cleaned });
    addLog(`[DEMO] Sample text loaded.`);

    setStep(STEP.PARSE);
    await sleep(300);
    let cands = extractMedicineNames(cleaned);
    if (cands.length === 0 && demo.medicineName) {
      cands = [{ name: demo.medicineName, displayName: titleCase(demo.medicineName), score: 80 }];
    }
    setCandidates(cands);
    addLog(`[DEMO] Candidates: ${cands.map((c) => c.displayName).join(", ")}`);

    setStep(STEP.FDA);
    addLog("[DEMO] Fetching openFDA data…");
    const fetchedMeds = [];

    for (const cand of cands) {
      addLog(`  → "${cand.displayName}"…`);
      try {
        const label = await fetchDrugLabel(cand.name);
        fetchedMeds.push({ label });
        addLog(`  ✓ ${label.brandName}`);
      } catch {
        const fallback = getDemoMedicine(cand.name) || DEMO_MEDICINES[demoIndex];
        fetchedMeds.push({ label: fallback });
        addLog(`  ↩ Demo fallback: ${fallback.brandName}`);
      }
    }

    if (fetchedMeds.length === 0) fetchedMeds.push({ label: DEMO_MEDICINES[demoIndex] });

    setMedicines(fetchedMeds);
    setStep(STEP.DONE);
    addLog(`[DEMO] Complete — ${fetchedMeds.length} medicine(s).`);

    const overallRisk = computeOverallRisk(fetchedMeds.map((m) => m.label));
    onScanComplete({
      imageName: `demo-${demoIndex + 1}.jpg`,
      imageDataUrl: null,
      ocrText: cleaned,
      ocrConfidence: demo.confidence,
      medicines: fetchedMeds.map((m) => m.label),
      riskLevel: overallRisk,
      isDemo: true,
    });
  }, [addLog, onScanComplete]);

  const handleReset = () => {
    abortRef.current = true;
    setStep(STEP.IDLE); setLog([]); setError(null);
    setOcrResult(null); setCandidates([]); setMedicines([]);
    setUsingDemo(false); setCurrentFile(null); setImageDataUrl(null);
    setOcrProgress(0);
  };

  const isProcessing = ![STEP.IDLE, STEP.DONE, STEP.ERROR].includes(step);
  const isDone  = step === STEP.DONE;
  const isIdle  = step === STEP.IDLE;
  const isError = step === STEP.ERROR;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(320px, 400px) 1fr",
      gap: 20,
      alignItems: "start",
      padding: "28px 20px",
      maxWidth: 1160,
      margin: "0 auto",
    }}>
      {/* Left: upload + pipeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel title="Scan Medicine" subtitle="Photo or upload a medicine label">
          <UploadBox onFileSelected={(file, url) => runPipeline(file, url)} disabled={isProcessing} />

          {isIdle && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: T.muted, textAlign: "center", marginBottom: 8 }}>
                Try a demo scan:
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["Ibuprofen", "Tylenol", "Amoxicillin"].map((name, i) => (
                  <button key={name} onClick={() => runDemo(i)} style={{
                    flex: 1, padding: "7px 4px", borderRadius: T.r8,
                    background: T.faint, border: `1px solid ${T.border}`,
                    color: T.muted, fontSize: 11, cursor: "pointer",
                    fontFamily: T.sans, transition: "all 0.15s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.cyan; e.currentTarget.style.borderColor = T.borderAccent; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
                  >{name}</button>
                ))}
              </div>
            </div>
          )}

          {!isIdle && (
            <button onClick={handleReset} disabled={isProcessing} style={{
              marginTop: 10, width: "100%", padding: "8px",
              borderRadius: T.r8, background: "none",
              border: `1px solid ${T.border}`, color: T.muted,
              fontSize: 12, cursor: isProcessing ? "not-allowed" : "pointer",
              fontFamily: T.sans, opacity: isProcessing ? 0.4 : 1,
            }}>← New scan</button>
          )}
        </Panel>

        <AnimatePresence>
          {(isProcessing || isDone || isError) && (
            <motion.div variants={VARIANTS.fadeUp} initial="hidden" animate="visible" exit="exit">
              <Panel title="Pipeline">
                <LoadingScreen
                  currentStep={isError ? "error" : step}
                  ocrProgress={ocrProgress}
                  log={log}
                />
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isError && error && (
            <motion.div variants={VARIANTS.fadeUp} initial="hidden" animate="visible" exit="exit"
              style={{ padding: 16, borderRadius: T.r12, background: T.redDim, border: "1px solid rgba(252,129,129,0.25)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.red, marginBottom: 6 }}>Scan Failed</div>
              <div style={{ fontSize: 12, color: "#FCA5A5", lineHeight: 1.6 }}>{error}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: results */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <AnimatePresence mode="wait">
          {isIdle && (
            <motion.div key="idle" variants={VARIANTS.fadeIn} initial="hidden" animate="visible" exit="exit"
              style={{ display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", minHeight: 320, gap: 14, color: T.muted }}>
              <div style={{ fontSize: 44, opacity: 0.15 }}>⊕</div>
              <div style={{ fontSize: 14 }}>Upload a medicine image to begin</div>
              <div style={{ fontSize: 12, color: T.faded, textAlign: "center", maxWidth: 280, lineHeight: 1.6 }}>
                OCR runs in your browser. No data is sent to any server.
              </div>
            </motion.div>
          )}

          {isProcessing && !ocrResult && (
            <motion.div key="proc" variants={VARIANTS.fadeIn} initial="hidden" animate="visible" exit="exit"
              style={{ display: "flex", alignItems: "center", justifyContent: "center",
                minHeight: 180, color: T.muted, fontSize: 13 }}>
              Scanning…
            </motion.div>
          )}

          {(ocrResult || isDone) && (
            <motion.div key="results" variants={VARIANTS.fadeUp} initial="hidden" animate="visible" exit="exit"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {usingDemo && (
                <motion.div variants={VARIANTS.fadeUp} initial="hidden" animate="visible"
                  style={{ padding: "10px 14px", borderRadius: T.r8, background: T.amberDim,
                    border: "1px solid rgba(246,173,85,0.25)", fontSize: 12, color: T.amber,
                    display: "flex", gap: 8, alignItems: "center" }}>
                  <span>⚠</span>
                  <span><strong>Demo data active.</strong> Real FDA labels used as fallback.</span>
                </motion.div>
              )}

              {ocrResult && (
                <OCRPreview
                  ocrText={ocrResult.text}
                  confidence={ocrResult.confidence}
                  candidates={candidates}
                  isDemo={ocrResult.isDemo}
                />
              )}

              {medicines.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {medicines.length} medicine{medicines.length !== 1 ? "s" : ""} found
                    </span>
                    {isDone && (
                      <button onClick={() => generateReport({
                        id: Date.now(), timestamp: new Date().toISOString(),
                        imageName: currentFile?.name || "scan",
                        imageDataUrl,
                        ocrText: ocrResult?.text || "",
                        ocrConfidence: ocrResult?.confidence || 0,
                        medicines: medicines.map((m) => m.label),
                        riskLevel: computeOverallRisk(medicines.map((m) => m.label)),
                        isDemo: usingDemo,
                      })} style={{
                        padding: "5px 12px", borderRadius: T.r8, background: T.cyanDim,
                        border: `1px solid ${T.borderAccent}`, color: T.cyan,
                        fontSize: 12, cursor: "pointer", fontFamily: T.sans,
                      }}>Export PDF ↓</button>
                    )}
                  </div>

                  {medicines.map((m, i) => (
                    <MedicineCard
                      key={i}
                      medicine={m.label}
                      rxnorm={null}
                      isDemo={m.label._demo || usingDemo}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Panel({ title, subtitle, children }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: T.r16, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function computeOverallRisk(labels) {
  const risks = labels.map((l) => inferRiskLevel(l.warnings, l.contraindications));
  if (risks.includes("high")) return "high";
  if (risks.includes("medium")) return "medium";
  return "low";
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function titleCase(str) {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}
