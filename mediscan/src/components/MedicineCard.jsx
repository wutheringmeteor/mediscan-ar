/**
 * components/MedicineCard.jsx
 * Displays a single medicine's FDA label data.
 * RxNorm section removed from expanded details.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T, VARIANTS } from "../tokens.js";
import RiskIndicator from "./RiskIndicator.jsx";
import { summarizeSection, extractSideEffectList, inferRiskLevel } from "../utils/summarizer.js";
import { truncateForDisplay, stripMarkup } from "../utils/textCleaner.js";

export default function MedicineCard({ medicine, isDemo }) {
  const [expanded, setExpanded] = useState(false);

  const risk = inferRiskLevel(medicine.warnings, medicine.contraindications);

  const purposeSummary = summarizeSection(medicine.purpose || medicine.indicationsAndUsage, "purpose", 2);
  const dosageSummary  = summarizeSection(medicine.dosageAndAdmin, "dosage", 2);
  const warningSummary = summarizeSection(medicine.warnings || medicine.warningsCautions, "warnings", 3);
  const sideEffects    = extractSideEffectList(medicine.adverseReactions);

  return (
    <motion.div variants={VARIANTS.fadeUp} initial="hidden" animate="visible" layout
      style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: T.r16, overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${T.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: T.text, letterSpacing: "-0.3px" }}>
              {medicine.brandName}
            </h3>
            {isDemo || medicine._demo ? <DemoBadge /> : <LiveBadge />}
          </div>
          {medicine.genericName && (
            <div style={{ fontSize: 11, color: T.muted }}>
              Generic: <span style={{ color: "#94A3B8", fontFamily: T.mono }}>{medicine.genericName}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
            {medicine.routeOfAdmin && <Tag color={T.blue}>{medicine.routeOfAdmin}</Tag>}
            {medicine.dosageForm && <Tag color={T.cyan}>{medicine.dosageForm}</Tag>}
            {medicine.productType && (
              <Tag color={medicine.productType?.includes("PRESCRIPTION") ? T.amber : T.green}>
                {medicine.productType?.includes("PRESCRIPTION") ? "Rx" : "OTC"}
              </Tag>
            )}
          </div>
        </div>
        <RiskIndicator level={risk} />
      </div>

      {/* Body */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Purpose" icon="💊">
          {purposeSummary || <NoData />}
        </Field>

        <Field label="Dosage" icon="⏱">
          {dosageSummary || <NoData />}
        </Field>

        <Field label="Side Effects" icon="⚠">
          {sideEffects.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
              {sideEffects.map((s) => <Tag key={s} color={T.amber}>{s}</Tag>)}
            </div>
          ) : medicine.adverseReactions ? (
            <span style={{ fontSize: 12, color: "#94A3B8" }}>
              {truncateForDisplay(stripMarkup(medicine.adverseReactions), 180)}
            </span>
          ) : <NoData />}
        </Field>

        <button onClick={() => setExpanded((v) => !v)} style={{
          alignSelf: "flex-start", background: "none",
          border: `1px solid ${T.border}`, borderRadius: T.r8,
          color: T.cyan, fontSize: 11, cursor: "pointer",
          fontFamily: T.sans, padding: "5px 12px",
          display: "flex", alignItems: "center", gap: 5, transition: "border-color 0.15s",
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.borderHover}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
        >{expanded ? "Hide details ↑" : "Full details ↓"}</button>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 14 }}>

              <Field label="Warnings" icon="🚨" accent={T.red}>
                {warningSummary ? (
                  <div style={{
                    padding: "10px 12px", borderRadius: T.r8,
                    background: T.redDim, borderLeft: `3px solid ${T.red}`,
                    fontSize: 12, color: "#FCA5A5", lineHeight: 1.6,
                  }}>{warningSummary}</div>
                ) : <NoData />}
              </Field>

              <Field label="Contraindications" icon="⛔">
                {medicine.contraindications ? (
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>
                    {truncateForDisplay(stripMarkup(medicine.contraindications), 280)}
                  </span>
                ) : <NoData />}
              </Field>

              <Field label="Drug Interactions" icon="⚡">
                {medicine.drugInteractions ? (
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>
                    {truncateForDisplay(stripMarkup(medicine.drugInteractions), 280)}
                  </span>
                ) : <NoData />}
              </Field>

              <Field label="Active Ingredient(s)" icon="🧪">
                {medicine.activeIngredient ? (
                  <span style={{ fontSize: 12, color: T.cyan, fontFamily: T.mono }}>
                    {stripMarkup(medicine.activeIngredient)}
                  </span>
                ) : <NoData />}
              </Field>

              {medicine.storageHandling && (
                <Field label="Storage" icon="📦">
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{stripMarkup(medicine.storageHandling)}</span>
                </Field>
              )}

              {medicine.pregnancyOrBreast && (
                <Field label="Pregnancy / Breastfeeding" icon="🤰">
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>
                    {truncateForDisplay(stripMarkup(medicine.pregnancyOrBreast), 240)}
                  </span>
                </Field>
              )}

              {(medicine.ndcCode || medicine.fdaApplicationNumber) && (
                <div style={{
                  padding: "9px 12px", borderRadius: T.r8,
                  background: T.subtle, border: `1px solid ${T.border}`,
                  display: "flex", gap: 14, flexWrap: "wrap",
                }}>
                  {medicine.ndcCode && <MetaItem label="NDC Code" value={medicine.ndcCode} mono />}
                  {medicine.fdaApplicationNumber && <MetaItem label="FDA Application" value={medicine.fdaApplicationNumber} mono />}
                </div>
              )}

              <div style={{
                fontSize: 10, color: T.muted, padding: "8px 10px",
                borderRadius: T.r8, background: T.faint,
                borderLeft: `2px solid ${T.subtle}`, lineHeight: 1.6,
              }}>
                Source: {medicine.dataSource}.{" "}
                {medicine._demo ? "Demo fallback from real FDA label." : "Live data from openFDA."}
                {" "}For educational purposes only — not medical advice.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, icon, children, accent }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: accent || T.muted }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function NoData() {
  return <span style={{ color: T.muted, fontStyle: "italic", fontSize: 11 }}>No data available.</span>;
}

function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "2px 7px", borderRadius: T.rFull,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      fontFamily: T.mono,
    }}>{children}</span>
  );
}

function MetaItem({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: T.muted, marginBottom: 2, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 11, color: T.text, fontFamily: mono ? T.mono : T.sans }}>{value}</div>
    </div>
  );
}

function LiveBadge() {
  return (
    <span style={{
      fontSize: 9, padding: "2px 7px", borderRadius: T.rFull,
      background: T.greenDim, color: T.green, border: "1px solid rgba(104,211,145,0.25)",
      fontWeight: 600, letterSpacing: "0.06em",
    }}>LIVE</span>
  );
}

function DemoBadge() {
  return (
    <span style={{
      fontSize: 9, padding: "2px 7px", borderRadius: T.rFull,
      background: T.amberDim, color: T.amber, border: "1px solid rgba(246,173,85,0.25)",
      fontWeight: 600, letterSpacing: "0.06em",
    }}>DEMO</span>
  );
}
