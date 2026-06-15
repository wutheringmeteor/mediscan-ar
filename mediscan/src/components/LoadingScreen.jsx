/**
 * components/LoadingScreen.jsx
 * Pipeline progress — OCR → Parse → openFDA
 * RxNorm step removed.
 */

import { motion, AnimatePresence } from "framer-motion";
import { T, VARIANTS } from "../tokens.js";

const STEPS = [
  { id: "ocr",   label: "Running OCR (in-browser)",       icon: "🔍" },
  { id: "parse", label: "Identifying medicine names",      icon: "🧩" },
  { id: "fda",   label: "Fetching drug data (openFDA)",   icon: "📋" },
  { id: "done",  label: "Analysis complete",               icon: "✓"  },
];

export default function LoadingScreen({ currentStep, ocrProgress, log }) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {STEPS.map((step, idx) => {
          const done    = idx < currentIdx;
          const active  = idx === currentIdx;
          const pending = idx > currentIdx;

          return (
            <motion.div key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: pending ? 0.3 : 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: done ? 13 : 15,
                background: done ? T.greenDim : active ? T.cyanDim : T.subtle,
                border: `1px solid ${done ? "rgba(104,211,145,0.4)" : active ? T.borderAccent : T.border}`,
                color: done ? T.green : active ? T.cyan : T.muted,
                transition: "all 0.3s",
                boxShadow: active ? `0 0 10px ${T.cyanGlow}` : "none",
              }}>
                {done ? "✓" : active ? <Spinner /> : step.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 12, fontWeight: active ? 500 : 400,
                  color: done ? T.green : active ? T.text : T.muted,
                  transition: "color 0.3s",
                }}>{step.label}</div>

                {active && step.id === "ocr" && ocrProgress != null && (
                  <div style={{ marginTop: 5, height: 2, background: T.subtle, borderRadius: T.rFull, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ocrProgress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      style={{ height: "100%", background: `linear-gradient(90deg, ${T.blue}, ${T.cyan})`, borderRadius: T.rFull }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Log console */}
      <AnimatePresence>
        {log && log.length > 0 && (
          <motion.div variants={VARIANTS.fadeIn} initial="hidden" animate="visible"
            style={{
              background: "#050709", border: `1px solid ${T.border}`,
              borderRadius: T.r10, padding: "12px 14px",
              fontFamily: T.mono, fontSize: 10,
              maxHeight: 110, overflowY: "auto",
            }}>
            {log.map((entry, i) => (
              <motion.div key={i}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                style={{ color: i === log.length - 1 ? T.cyan : T.muted, marginBottom: 2, lineHeight: 1.5 }}>
                <span style={{ color: T.subtle, marginRight: 6, userSelect: "none" }}>{String(i + 1).padStart(2, "0")}</span>
                {entry}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      style={{ width: 13, height: 13, border: `2px solid ${T.subtle}`, borderTop: `2px solid ${T.cyan}`, borderRadius: "50%" }}
    />
  );
}
