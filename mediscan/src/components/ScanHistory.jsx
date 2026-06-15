/**
 * components/ScanHistory.jsx
 * Displays the localStorage scan history with export and delete actions.
 */

import { motion, AnimatePresence } from "framer-motion";
import { T, RISK_COLORS, VARIANTS } from "../tokens.js";
import RiskIndicator from "./RiskIndicator.jsx";
import { generateReport } from "../utils/pdfReport.js";

export default function ScanHistory({ history, onRemove, onClear, onSelect }) {
  if (history.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 24px",
          color: T.muted,
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📋</div>
        <div style={{ fontSize: 14, marginBottom: 6 }}>No scans yet</div>
        <div style={{ fontSize: 12, color: T.faded }}>
          Scans you run will appear here and persist across sessions.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <span style={{ fontSize: 12, color: T.muted }}>
          {history.length} scan{history.length !== 1 ? "s" : ""} stored locally
        </span>
        <button
          onClick={onClear}
          style={{
            background: "none",
            border: "none",
            color: T.red,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: T.sans,
            opacity: 0.7,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
        >
          Clear all
        </button>
      </div>

      {/* Entries */}
      <AnimatePresence initial={false}>
        {history.map((entry, idx) => (
          <HistoryRow
            key={entry.id}
            entry={entry}
            idx={idx}
            isLast={idx === history.length - 1}
            onRemove={() => onRemove(entry.id)}
            onSelect={() => onSelect(entry)}
            onExport={() => generateReport(entry)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function HistoryRow({ entry, isLast, onRemove, onSelect, onExport }) {
  const date = new Date(entry.timestamp);
  const relTime = formatRelTime(date);
  const medCount = entry.medicines?.length || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0, padding: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 20px",
        borderBottom: isLast ? "none" : `1px solid ${T.border}`,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = T.panelHover)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: T.r8,
          overflow: "hidden",
          background: T.subtle,
          flexShrink: 0,
          border: `1px solid ${T.border}`,
        }}
      >
        {entry.imageDataUrl ? (
          <img
            src={entry.imageDataUrl}
            alt={entry.imageName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            💊
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: T.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 3,
          }}
        >
          {entry.imageName}
        </div>
        <div
          style={{
            fontSize: 11,
            color: T.muted,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span>{relTime}</span>
          <span style={{ color: T.subtle }}>·</span>
          <span>
            {medCount} medicine{medCount !== 1 ? "s" : ""}
          </span>
          <span style={{ color: T.subtle }}>·</span>
          <span style={{ fontFamily: T.mono }}>
            OCR {entry.ocrConfidence}%
          </span>
          {entry.isDemo && (
            <>
              <span style={{ color: T.subtle }}>·</span>
              <span style={{ color: T.amber }}>demo</span>
            </>
          )}
        </div>
      </div>

      {/* Risk */}
      <RiskIndicator level={entry.riskLevel} />

      {/* Actions */}
      <div
        style={{ display: "flex", gap: 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ActionBtn
          title="Export PDF report"
          onClick={onExport}
          icon="↓"
          color={T.cyan}
        />
        <ActionBtn
          title="Delete this scan"
          onClick={onRemove}
          icon="✕"
          color={T.red}
        />
      </div>
    </motion.div>
  );
}

function ActionBtn({ title, onClick, icon, color }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: T.r8,
        background: "none",
        border: `1px solid ${T.border}`,
        color: T.muted,
        fontSize: 12,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
        fontFamily: T.sans,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = color;
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.background = `${color}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = T.muted;
        e.currentTarget.style.borderColor = T.border;
        e.currentTarget.style.background = "none";
      }}
    >
      {icon}
    </button>
  );
}

function formatRelTime(date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)  return `${days}d ago`;
  return date.toLocaleDateString();
}
