/**
 * components/Navbar.jsx
 * Clean top nav — no API mentions in the UI.
 */

import { motion } from "framer-motion";
import { T } from "../tokens.js";

const NAV_ITEMS = [
  { id: "scanner", label: "Scanner" },
  { id: "reports", label: "Reports" },
];

export default function Navbar({ page, setPage, demoMode }) {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: `${T.surface}ee`,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: `1px solid ${T.border}`,
      height: 54,
      display: "flex", alignItems: "center",
      padding: "0 22px", gap: 28,
    }}>
      {/* Logo */}
      <div onClick={() => setPage("scanner")}
        style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
        <div style={{
          width: 26, height: 26, borderRadius: T.r8,
          background: `linear-gradient(135deg, ${T.blue}, ${T.cyan})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#05111f", flexShrink: 0,
        }}>M</div>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.text, letterSpacing: "-0.3px" }}>
          MediScan
        </span>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", gap: 4, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              background: active ? T.cyanDim : "none",
              border: `1px solid ${active ? T.borderAccent : "transparent"}`,
              borderRadius: T.r8,
              color: active ? T.cyan : T.muted,
              fontSize: 12, fontWeight: active ? 500 : 400,
              padding: "4px 12px", cursor: "pointer",
              fontFamily: T.sans, transition: "all 0.15s",
            }}>{item.label}</button>
          );
        })}
      </nav>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {demoMode && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: T.rFull,
              background: T.amberDim, border: "1px solid rgba(246,173,85,0.25)",
              fontSize: 10, color: T.amber, fontWeight: 600, letterSpacing: "0.05em",
            }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.amber, boxShadow: `0 0 5px ${T.amber}`, animation: "blink 1.5s ease-in-out infinite" }} />
            DEMO
          </motion.div>
        )}
        <div style={{ fontSize: 11, color: T.faded }}>
          Scans locally · No server
        </div>
      </div>
    </header>
  );
}
