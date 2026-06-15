/**
 * components/OCRPreview.jsx
 * Shows extracted OCR text and detected medicine candidates.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { T, VARIANTS } from "../tokens.js";

export default function OCRPreview({ ocrText, confidence, candidates, isDemo }) {
  const [expanded, setExpanded] = useState(false);

  if (!ocrText) return null;

  const truncated = ocrText.length > 280;
  const confColor = confidence >= 75 ? T.green : confidence >= 50 ? T.amber : T.red;

  return (
    <motion.div variants={VARIANTS.fadeUp} initial="hidden" animate="visible"
      style={{
        background: T.panel, border: `1px solid ${T.border}`,
        borderRadius: T.r16, padding: "18px 20px",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Extracted Text</span>
          {isDemo && (
            <span style={{
              fontSize: 9, padding: "2px 7px", borderRadius: T.rFull,
              background: T.amberDim, color: T.amber, border: "1px solid rgba(246,173,85,0.25)",
              fontWeight: 600, letterSpacing: "0.06em",
            }}>DEMO</span>
          )}
        </div>
        <ConfidencePill value={confidence} color={confColor} />
      </div>

      {/* Text */}
      <div style={{
        background: "#050709", border: `1px solid ${T.border}`,
        borderRadius: T.r8, padding: "11px 13px",
        fontFamily: T.mono, fontSize: 11, color: "#94A3B8",
        lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word",
        maxHeight: expanded ? 360 : 120, overflowY: expanded ? "auto" : "hidden",
        transition: "max-height 0.3s ease", position: "relative",
      }}>
        {expanded ? ocrText : ocrText.slice(0, 280)}
        {!expanded && truncated && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 36,
            background: "linear-gradient(transparent, #050709)", pointerEvents: "none",
          }} />
        )}
      </div>

      {truncated && (
        <button onClick={() => setExpanded(!expanded)} style={{
          alignSelf: "flex-start", background: "none", border: "none",
          color: T.cyan, fontSize: 11, cursor: "pointer", fontFamily: T.sans, padding: 0,
        }}>
          {expanded ? "Show less ↑" : `Show all (${ocrText.length} chars) ↓`}
        </button>
      )}

      {/* Candidates */}
      {candidates && candidates.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7 }}>
            Detected medicines
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {candidates.map((c) => (
              <span key={c.name} style={{
                fontSize: 11, padding: "3px 9px", borderRadius: T.rFull,
                background: T.cyanDim, color: T.cyan, border: `1px solid ${T.borderAccent}`,
                fontFamily: T.mono, display: "flex", alignItems: "center", gap: 5,
              }}>
                {c.displayName}
                <span style={{ opacity: 0.5, fontSize: 9 }}>{c.score}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ConfidencePill({ value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{ width: 52, height: 3, background: T.subtle, borderRadius: T.rFull, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: T.rFull }}
        />
      </div>
      <span style={{ fontSize: 11, fontFamily: T.mono, color, fontWeight: 500 }}>{value}%</span>
      <span style={{ fontSize: 10, color: T.muted }}>confidence</span>
    </div>
  );
}
