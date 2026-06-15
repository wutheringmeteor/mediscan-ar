/**
 * components/UploadBox.jsx
 *
 * Three input modes:
 *   1. Drag-and-drop file upload
 *   2. Click-to-browse file picker
 *   3. Live camera capture (getUserMedia + snapshot)
 *
 * Images are compressed client-side before OCR processing
 * so large phone photos (10+ MB) work fine within the 1 MB API limit.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T, VARIANTS } from "../tokens.js";
import { compressImage } from "../services/ocrService.js";

// We bypass the hard 1 MB limit by compressing first — accept any size from camera/file
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];
const ACCEPTED_ATTR  = ".jpg,.jpeg,.png,.webp,.heic,image/*";
const MAX_OCR_BYTES  = 900 * 1024; // 900 KB target after compression (leaves margin under 1 MB)

// ── Main component ────────────────────────────────────────────────────────────
export default function UploadBox({ onFileSelected, disabled }) {
  const [mode, setMode]         = useState("idle"); // idle | camera | preview
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview]   = useState(null);   // data URL for display
  const [error, setError]       = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(null); // null=unknown

  // Camera refs
  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const fileInputRef = useRef(null);

  // ── Camera lifecycle ────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null);
    setCameraError(null);
    setMode("camera");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }, // prefer back camera on mobile
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setHasCameraPermission(true);

      // Attach stream to video element once it mounts
      // (small delay to let React render the <video> first)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch (err) {
      setHasCameraPermission(false);
      const msg =
        err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permission in your browser settings."
          : err.name === "NotFoundError"
          ? "No camera found on this device."
          : `Camera error: ${err.message}`;
      setCameraError(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Stop camera when component unmounts or mode changes away from camera
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ── Snapshot from camera ────────────────────────────────────────────────────
  const takeSnapshot = useCallback(async () => {
    if (!videoRef.current) return;
    setError(null);

    const video  = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) { setError("Snapshot failed. Try again."); return; }

      stopCamera();

      const snapshotFile = new File([blob], `camera-snapshot-${Date.now()}.jpg`, { type: "image/jpeg" });
      await processFile(snapshotFile, canvas.toDataURL("image/jpeg", 0.92));
    }, "image/jpeg", 0.95);
  }, [stopCamera]);

  // ── File processing (compress → validate → pass up) ─────────────────────────
  const processFile = useCallback(async (rawFile, previewUrl = null) => {
    setError(null);
    setCompressing(true);

    try {
      // Generate preview URL if not provided (camera already has one)
      const displayUrl = previewUrl || URL.createObjectURL(rawFile);

      // Compress the image
      const { file: compressed, originalSize, compressedSize } = await compressImage(rawFile);

      console.log(
        `[UploadBox] Compressed ${(originalSize / 1024).toFixed(0)} KB → ${(compressedSize / 1024).toFixed(0)} KB`
      );

      setPreview(displayUrl);
      setMode("preview");
      onFileSelected(compressed, displayUrl);
    } catch (err) {
      setError(`Image processing failed: ${err.message}`);
    } finally {
      setCompressing(false);
    }
  }, [onFileSelected]);

  // ── File input handler ──────────────────────────────────────────────────────
  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be re-selected
    if (!file) return;

    // Basic type check (before compression)
    const isImage = file.type.startsWith("image/") || ACCEPTED_TYPES.includes(file.type);
    if (!isImage) {
      setError("Please select an image file (JPG, PNG, WEBP).");
      return;
    }

    processFile(file);
  }, [processFile]);

  // ── Drag and drop ───────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please drop an image file.");
      return;
    }
    processFile(file);
  }, [disabled, processFile]);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = () => {
    stopCamera();
    setMode("idle");
    setPreview(null);
    setError(null);
    setCameraError(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── CAMERA MODE ── */}
      <AnimatePresence mode="wait">
        {mode === "camera" && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "relative",
              borderRadius: T.r16,
              overflow: "hidden",
              background: "#000",
              border: `1px solid ${T.borderAccent}`,
              boxShadow: `0 0 30px ${T.cyanGlow}`,
            }}
          >
            {cameraError ? (
              /* Camera permission denied / not found */
              <div style={{ padding: "32px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 32, opacity: 0.5 }}>📵</div>
                <div style={{ fontSize: 13, color: T.red, lineHeight: 1.6 }}>{cameraError}</div>
                <button onClick={reset} style={btnStyle(T.muted)}>Close</button>
              </div>
            ) : (
              <>
                {/* Live viewfinder */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", maxHeight: 340, objectFit: "cover", display: "block" }}
                />

                {/* Scan frame overlay */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  {/* Corner brackets */}
                  {[
                    { top: 16, left: 16, borderTop: `2px solid ${T.cyan}`, borderLeft: `2px solid ${T.cyan}` },
                    { top: 16, right: 16, borderTop: `2px solid ${T.cyan}`, borderRight: `2px solid ${T.cyan}` },
                    { bottom: 56, left: 16, borderBottom: `2px solid ${T.cyan}`, borderLeft: `2px solid ${T.cyan}` },
                    { bottom: 56, right: 16, borderBottom: `2px solid ${T.cyan}`, borderRight: `2px solid ${T.cyan}` },
                  ].map((s, i) => (
                    <div key={i} style={{ position: "absolute", width: 24, height: 24, ...s }} />
                  ))}
                  {/* Animated scan line */}
                  <motion.div
                    animate={{ top: ["12%", "82%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
                    style={{
                      position: "absolute", left: "5%", right: "5%", height: 2,
                      background: `linear-gradient(90deg, transparent, ${T.cyan}, transparent)`,
                      boxShadow: `0 0 12px ${T.cyanGlow}`,
                    }}
                  />
                </div>

                {/* Controls bar */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "12px 16px",
                  background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                }}>
                  <button onClick={reset} style={btnStyle(T.muted, true)}>✕ Cancel</button>
                  <button
                    onClick={takeSnapshot}
                    style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: `linear-gradient(135deg, ${T.blue}, ${T.cyan})`,
                      border: "3px solid rgba(255,255,255,0.3)",
                      cursor: "pointer", fontSize: 22,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 0 20px ${T.cyanGlow}`,
                      transition: "transform 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    title="Take photo"
                  >
                    📸
                  </button>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "right", lineHeight: 1.4 }}>
                    Point at<br />medicine label
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── PREVIEW MODE ── */}
        {mode === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "relative",
              borderRadius: T.r16,
              overflow: "hidden",
              border: `1px solid ${T.borderAccent}`,
              background: "#000",
              minHeight: 160,
            }}
          >
            <img
              src={preview}
              alt="Medicine to scan"
              style={{ width: "100%", maxHeight: 280, objectFit: "contain", display: "block", opacity: disabled ? 0.45 : 1 }}
            />
            {disabled && (
              <div style={{
                position: "absolute", inset: 0,
                background: `${T.bg}99`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {/* Animated scan line over preview */}
                <motion.div
                  animate={{ top: ["5%", "90%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
                  style={{
                    position: "absolute", left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${T.cyan}, transparent)`,
                    boxShadow: `0 0 16px ${T.cyanGlow}`,
                  }}
                />
                <span style={{ fontSize: 11, color: T.cyan, fontFamily: T.mono, letterSpacing: "0.12em", zIndex: 1 }}>
                  SCANNING…
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── IDLE / DROP ZONE ── */}
        {mode === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? T.cyan : T.border}`,
              borderRadius: T.r16,
              minHeight: 140,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8,
              cursor: disabled ? "not-allowed" : "pointer",
              background: dragOver ? T.cyanDim : T.faint,
              transition: "all 0.2s",
              padding: "20px 16px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_ATTR}
              style={{ display: "none" }}
              onChange={handleFileInput}
              disabled={disabled}
            />
            {compressing ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  style={{ width: 24, height: 24, border: `2px solid ${T.subtle}`, borderTop: `2px solid ${T.cyan}`, borderRadius: "50%" }} />
                <span style={{ fontSize: 12, color: T.cyan, fontFamily: T.mono }}>Compressing image…</span>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 28, opacity: 0.5 }}>🖼️</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>Drop image here</div>
                <div style={{ fontSize: 11, color: T.muted }}>or click to browse files</div>
                <div style={{ fontSize: 10, color: T.faded, fontFamily: T.mono }}>JPG · PNG · WEBP · any size (auto-compressed)</div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action buttons (idle + preview modes) ── */}
      {mode !== "camera" && (
        <div style={{ display: "flex", gap: 8 }}>
          {/* Camera button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={startCamera}
            disabled={disabled || compressing}
            style={{
              flex: 1, padding: "11px 8px",
              borderRadius: T.r10,
              background: T.cyanDim,
              border: `1px solid ${T.borderAccent}`,
              color: T.cyan,
              fontSize: 13, fontWeight: 500,
              cursor: disabled || compressing ? "not-allowed" : "pointer",
              fontFamily: T.sans,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              opacity: disabled || compressing ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            📷 Use Camera
          </motion.button>

          {/* Upload button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => !disabled && fileInputRef.current?.click()}
            disabled={disabled || compressing}
            style={{
              flex: 1, padding: "11px 8px",
              borderRadius: T.r10,
              background: T.faint,
              border: `1px solid ${T.border}`,
              color: T.muted,
              fontSize: 13, fontWeight: 400,
              cursor: disabled || compressing ? "not-allowed" : "pointer",
              fontFamily: T.sans,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              opacity: disabled || compressing ? 0.5 : 1,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.borderHover; } }}
            onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
          >
            📂 Upload File
          </motion.button>

          {/* Reset / retake button — only in preview */}
          {mode === "preview" && !disabled && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={reset}
              style={{
                padding: "11px 14px", borderRadius: T.r10,
                background: "none", border: `1px solid ${T.border}`,
                color: T.muted, fontSize: 12, cursor: "pointer",
                fontFamily: T.sans, transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = T.red; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}
              title="Remove image"
            >
              ✕
            </motion.button>
          )}
        </div>
      )}

      {/* ── Error display ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              padding: "10px 14px", borderRadius: T.r8,
              background: T.redDim, border: `1px solid rgba(252,129,129,0.3)`,
              fontSize: 12, color: T.red, display: "flex", gap: 8, alignItems: "flex-start",
            }}
          >
            <span style={{ flexShrink: 0 }}>⚠</span>
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tiny style helpers ────────────────────────────────────────────────────────
const T_LOCAL = {
  r10: "10px",
};

function btnStyle(color, small = false) {
  return {
    padding: small ? "7px 14px" : "9px 18px",
    borderRadius: "8px",
    background: "rgba(0,0,0,0.4)",
    border: `1px solid ${color}55`,
    color,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    backdropFilter: "blur(8px)",
  };
}
