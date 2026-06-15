/**
 * pages/Reports.jsx
 * Scan history viewer.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T, VARIANTS } from "../tokens.js";
import ScanHistory from "../components/ScanHistory.jsx";
import MedicineCard from "../components/MedicineCard.jsx";
import OCRPreview from "../components/OCRPreview.jsx";
import RiskIndicator from "../components/RiskIndicator.jsx";
import { generateReport } from "../utils/pdfReport.js";

export default function Reports({ history, onRemove, onClear }) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: selected ? "360px 1fr" : "1fr",
      gap: 20, padding: "28px 20px", maxWidth: 1160,
      margin: "0 auto", alignItems: "start",
    }}>
      {/* History list */}
      <div style={{
        background: T.panel, border: `1px solid ${T.border}`,
        borderRadius: T.r16, overflow: "hidden",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Scan History</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Saved locally in your browser</div>
        </div>
        <ScanHistory
          history={history}
          onRemove={(id) => { onRemove(id); if (selected?.id === id) setSelected(null); }}
          onClear={() => { onClear(); setSelected(null); }}
          onSelect={(entry) => setSelected(entry)}
        />
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div key={selected.id} variants={VARIANTS.slideRight} initial="hidden" animate="visible" exit="exit"
            style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Entry header */}
            <div style={{
              background: T.panel, border: `1px solid ${T.border}`,
              borderRadius: T.r16, padding: "16px 20px",
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", gap: 14,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 600, color: T.text,
                  overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", marginBottom: 4,
                }}>{selected.imageName}</div>
                <div style={{ fontSize: 11, color: T.muted, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span>{new Date(selected.timestamp).toLocaleString()}</span>
                  <span>OCR: {selected.ocrConfidence}%</span>
                  <span>{selected.medicines?.length || 0} medicine(s)</span>
                  {selected.isDemo && <span style={{ color: T.amber }}>Demo</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <RiskIndicator level={selected.riskLevel} />
                <button onClick={() => generateReport(selected)} style={{
                  padding: "6px 12px", borderRadius: T.r8, background: T.cyanDim,
                  border: `1px solid ${T.borderAccent}`, color: T.cyan,
                  fontSize: 11, cursor: "pointer", fontFamily: T.sans, whiteSpace: "nowrap",
                }}>Export PDF ↓</button>
                <button onClick={() => setSelected(null)} style={{
                  padding: "6px 9px", borderRadius: T.r8, background: "none",
                  border: `1px solid ${T.border}`, color: T.muted,
                  fontSize: 11, cursor: "pointer", fontFamily: T.sans,
                }}>✕</button>
              </div>
            </div>

            {selected.ocrText && (
              <OCRPreview ocrText={selected.ocrText} confidence={selected.ocrConfidence} candidates={[]} isDemo={selected.isDemo} />
            )}

            {selected.medicines?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 11, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {selected.medicines.length} medicine{selected.medicines.length !== 1 ? "s" : ""}
                </div>
                {selected.medicines.map((med, i) => (
                  <MedicineCard key={i} medicine={med} isDemo={med._demo || selected.isDemo} />
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: "center", padding: 40, color: T.muted, fontSize: 13,
                background: T.panel, borderRadius: T.r16, border: `1px solid ${T.border}`,
              }}>No medicine data for this scan.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
