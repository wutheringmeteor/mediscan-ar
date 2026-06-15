/**
 * components/RiskIndicator.jsx
 * Visual risk level badge + optional meter bar.
 */

import { motion } from "framer-motion";
import { T, RISK_COLORS } from "../tokens.js";

/**
 * @param {'high'|'medium'|'low'|'unknown'} level
 * @param {boolean} showMeter - show horizontal bar
 * @param {boolean} large
 */
export default function RiskIndicator({ level = "unknown", showMeter = false, large = false }) {
  const cfg = RISK_COLORS[level] || RISK_COLORS.unknown;

  const LABEL = { high: "High Risk", medium: "Moderate Risk", low: "Low Risk", unknown: "Unknown" };
  const METER = { high: 90, medium: 52, low: 14, unknown: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: showMeter ? 8 : 0 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: large ? "5px 14px" : "3px 10px",
          borderRadius: T.rFull,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          color: cfg.fg,
          fontSize: large ? 12 : 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          width: "fit-content",
        }}
      >
        <span
          style={{
            width: large ? 8 : 6,
            height: large ? 8 : 6,
            borderRadius: "50%",
            background: cfg.fg,
            boxShadow: `0 0 6px ${cfg.fg}`,
            flexShrink: 0,
          }}
        />
        {LABEL[level]}
      </span>

      {showMeter && (
        <div
          style={{
            width: "100%",
            height: 4,
            background: T.subtle,
            borderRadius: T.rFull,
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${METER[level]}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              height: "100%",
              background: cfg.fg,
              borderRadius: T.rFull,
              boxShadow: `0 0 8px ${cfg.fg}66`,
            }}
          />
        </div>
      )}
    </div>
  );
}
