/**
 * App.jsx — Root application component.
 * Clean version: no API mentions in UI, preloads Tesseract on mount.
 */

import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { T, VARIANTS } from "./tokens.js";
import Navbar from "./components/Navbar.jsx";
import Scanner from "./pages/Scanner.jsx";
import Reports from "./pages/Reports.jsx";
import { useScanHistory } from "./hooks/useScanHistory.js";
import { preloadOCR } from "./services/ocrService.js";

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: #07090E;
  color: #EDF2F7;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-weight: 300;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  min-height: 100vh;
}
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: #07090E; }
::-webkit-scrollbar-thumb { background: #1E2534; border-radius: 2px; }
::selection { background: rgba(99,179,237,0.15); color: #63B3ED; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.grid-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(99,179,237,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,179,237,0.03) 1px, transparent 1px);
  background-size: 52px 52px;
}
.orb-tl {
  position: fixed; top: -20%; left: -10%;
  width: 480px; height: 480px;
  background: radial-gradient(circle, rgba(66,153,225,0.06) 0%, transparent 70%);
  border-radius: 50%; pointer-events: none; z-index: 0;
}
.orb-br {
  position: fixed; bottom: -15%; right: -5%;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(99,179,237,0.04) 0%, transparent 70%);
  border-radius: 50%; pointer-events: none; z-index: 0;
}
`;

function StyleInjector() {
  return <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />;
}

export default function App() {
  const [page, setPage] = useState("scanner");
  const [demoMode, setDemoMode] = useState(false);

  const { history, addEntry, removeEntry, clearHistory } = useScanHistory();

  // Preload Tesseract worker on app mount so first scan is instant
  useEffect(() => {
    preloadOCR();
  }, []);

  const handleScanComplete = useCallback((scanData) => {
    addEntry(scanData);
    setDemoMode(!!scanData.isDemo);
  }, [addEntry]);

  return (
    <>
      <StyleInjector />
      <div className="grid-bg" />
      <div className="orb-tl" />
      <div className="orb-br" />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
        <Navbar page={page} setPage={setPage} demoMode={demoMode} />

        <main>
          <AnimatePresence mode="wait">
            {page === "scanner" && (
              <motion.div key="scanner" variants={VARIANTS.fadeUp} initial="hidden" animate="visible" exit="exit">
                <Scanner onScanComplete={handleScanComplete} />
              </motion.div>
            )}
            {page === "reports" && (
              <motion.div key="reports" variants={VARIANTS.fadeUp} initial="hidden" animate="visible" exit="exit">
                <Reports history={history} onRemove={removeEntry} onClear={clearHistory} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer style={{
          borderTop: `1px solid ${T.border}`,
          padding: "14px 22px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 8, marginTop: 32,
        }}>
          <span style={{ fontSize: 11, color: T.muted }}>MediScan — University Project</span>
          <span style={{ fontSize: 11, color: T.faded, fontStyle: "italic" }}>
            Not medical advice. For educational use only.
          </span>
        </footer>
      </div>
    </>
  );
}
