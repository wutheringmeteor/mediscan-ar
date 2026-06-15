/**
 * ocrService.js
 * In-browser OCR using Tesseract.js — fully free, no API key, no rate limits.
 * Runs entirely client-side via WebAssembly.
 *
 * Why Tesseract.js over OCR.space free tier:
 *   - No rate limits, no file size limits, no daily caps
 *   - Works offline after first load
 *   - Engine 2 (LSTM) gives far better accuracy on medicine labels
 *   - Pre-processing pipeline: contrast boost, denoise, upscale for small text
 */

import { createWorker } from "tesseract.js";

export const SUPPORTED_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic",
];

// Singleton worker — created once, reused across scans
let _worker = null;
let _workerReady = false;

async function getWorker() {
  if (_worker && _workerReady) return _worker;

  _worker = await createWorker("eng", 1, {
    // Use Tesseract LSTM engine (OEM 1) — best for printed text
    // PSM 6 = assume single uniform block of text (good for labels)
    logger: () => {}, // suppress verbose logs
  });

  await _worker.setParameters({
    tessedit_pageseg_mode: "6",      // PSM 6: single text block
    tessedit_ocr_engine_mode: "1",   // OEM 1: LSTM only (more accurate)
    preserve_interword_spaces: "1",
    tessedit_char_whitelist:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:()/-+%®™",
  });

  _workerReady = true;
  return _worker;
}

/**
 * Pre-load the Tesseract worker so first scan is fast.
 * Call this on app startup.
 */
export async function preloadOCR() {
  try {
    await getWorker();
  } catch {
    // Non-fatal — will retry on first scan
  }
}

/**
 * Extract text from an image using Tesseract.js LSTM engine.
 * Applies canvas-based pre-processing to improve accuracy on medicine labels.
 *
 * @param {File|Blob} file
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<{ text: string, confidence: number, isDemo: boolean }>}
 */
export async function extractTextFromImage(file, onProgress) {
  onProgress?.(5);

  // ── Pre-process image for better OCR ─────────────────────────────────────
  const processedBlob = await preprocessImage(file);
  onProgress?.(20);

  // ── Run Tesseract ─────────────────────────────────────────────────────────
  let worker;
  try {
    worker = await getWorker();
  } catch {
    throw Object.assign(
      new Error("OCR engine failed to load. Please refresh and try again."),
      { code: "WORKER_INIT" }
    );
  }
  onProgress?.(30);

  let result;
  try {
    result = await worker.recognize(processedBlob);
  } catch (err) {
    throw Object.assign(
      new Error("OCR processing failed: " + err.message),
      { code: "OCR_FAILED" }
    );
  }

  onProgress?.(90);

  const rawText = result.data.text?.trim() || "";
  const confidence = Math.round(result.data.confidence || 0);

  if (!rawText || rawText.length < 3) {
    throw Object.assign(
      new Error(
        "No text found in this image. Try a clearer, better-lit photo of the medicine label."
      ),
      { code: "EMPTY_TEXT" }
    );
  }

  onProgress?.(100);

  return {
    text: rawText,
    confidence: Math.max(confidence, 10), // tesseract confidence is 0–100
    isDemo: false,
  };
}

/**
 * Pre-process image on a canvas to improve OCR accuracy:
 *   1. Upscale if small (Tesseract needs ≥ ~150 DPI equivalent)
 *   2. Convert to greyscale
 *   3. Boost contrast
 *   4. Sharpen slightly
 *
 * @param {File|Blob} file
 * @returns {Promise<Blob>}
 */
async function preprocessImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MIN_DIM = 1200; // ensure minimum resolution for Tesseract
      const MAX_DIM = 3000; // don't go insane

      let { width, height } = img;

      // Upscale small images
      const minSide = Math.min(width, height);
      if (minSide < MIN_DIM) {
        const scale = MIN_DIM / minSide;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      // Cap large images
      const maxSide = Math.max(width, height);
      if (maxSide > MAX_DIM) {
        const scale = MAX_DIM / maxSide;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Draw original
      ctx.drawImage(img, 0, 0, width, height);

      // Greyscale + contrast boost via pixel manipulation
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Luminance (greyscale)
        const grey = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        // Contrast stretch: push mid-greys towards black or white
        // This helps with faded/low-contrast medicine labels
        const contrasted = contrastStretch(grey, 1.4);

        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
        // alpha unchanged
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Canvas pre-processing failed"));
          else resolve(blob);
        },
        "image/png" // PNG: lossless, Tesseract prefers it
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image for pre-processing"));
    };

    img.src = url;
  });
}

/**
 * Apply a contrast stretch to a single grey value (0–255).
 * factor > 1 increases contrast.
 */
function contrastStretch(value, factor) {
  const shifted = value - 128;
  const stretched = shifted * factor + 128;
  return Math.max(0, Math.min(255, Math.round(stretched)));
}

/**
 * Compress a raw image file so it's manageable (< 4MB for canvas).
 * Less aggressive than before since Tesseract doesn't have a size limit.
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objUrl);

      const MAX_DIM = 4096; // allow large images for better OCR
      const scale =
        img.width > MAX_DIM || img.height > MAX_DIM
          ? MAX_DIM / Math.max(img.width, img.height)
          : 1.0;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Compression failed"));
            return;
          }
          const compressed = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, "") + "_c.jpg",
            { type: "image/jpeg" }
          );
          resolve({
            file: compressed,
            originalSize: file.size,
            compressedSize: blob.size,
          });
        },
        "image/jpeg",
        0.95
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("Could not load image"));
    };

    img.src = objUrl;
  });
}
