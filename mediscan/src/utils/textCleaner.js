/**
 * textCleaner.js
 * Cleans raw Tesseract.js OCR output.
 *
 * Tesseract-specific artifacts differ from OCR.space:
 *   - More newlines (it preserves layout more)
 *   - Occasional garbage chars from label borders/images
 *   - Better word spacing overall, but can confuse hyphens as dashes
 *   - Ligature issues (fi → ﬁ, fl → ﬂ) from some fonts
 */

export function cleanOCRText(raw) {
  if (!raw || typeof raw !== "string") return "";

  let t = raw;
  t = fixLigatures(t);
  t = fixNumericLookalikes(t);
  t = removeArtifactChars(t);
  t = normalizeWhitespace(t);
  t = fixBrokenLineWraps(t);
  t = collapseDuplicateLines(t);
  t = removeSingleCharLines(t);

  return t.trim();
}

/** Fix common font ligatures that Tesseract may not handle */
function fixLigatures(text) {
  return text
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl")
    .replace(/ﬅ/g, "st")
    .replace(/ﬆ/g, "st");
}

/** Fix numeric lookalikes in drug/dosage context */
function fixNumericLookalikes(text) {
  return text
    .replace(/\b0(?=[a-z]{2,})/gi, "O")    // 0xford → Oxford
    .replace(/\bI(?=\d{2,})/g, "1")          // I00mg → 100mg
    .replace(/\bl(?=\d)/g, "1");              // l5mg → 15mg
}

/** Remove chars that are almost certainly OCR noise */
function removeArtifactChars(text) {
  return text
    .replace(/[©®™°•·¶§]/g, " ")
    .replace(/[|\\{}\[\]<>]/g, " ")
    .replace(/[^\x20-\x7E\n]/g, " ")         // non-printable / non-ASCII (after ligature fix)
    .replace(/\s*[~@#$^&*=]+\s*/g, " ");
}

/** Normalize whitespace */
function normalizeWhitespace(text) {
  return text
    .replace(/\t+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Rejoin lines that look like a single word broken across two lines */
function fixBrokenLineWraps(text) {
  // Only rejoin if line ends mid-word (lowercase, no trailing punctuation)
  return text.replace(/([a-z])[\r\n]+([a-z])/g, "$1 $2");
}

/** Remove duplicate consecutive lines */
function collapseDuplicateLines(text) {
  const lines = text.split("\n");
  const deduped = [];
  for (const line of lines) {
    const l = line.trim();
    if (l && l !== deduped[deduped.length - 1]) deduped.push(l);
  }
  return deduped.join("\n");
}

/** Remove lines that are just 1–2 random characters (Tesseract noise from borders) */
function removeSingleCharLines(text) {
  return text
    .split("\n")
    .filter((line) => line.trim().length > 2)
    .join("\n");
}

/** Truncate a long FDA text field for display */
export function truncateForDisplay(text, maxChars = 400) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const sub = text.slice(0, maxChars);
  const lastSentence = sub.search(/[.!?][^.!?]*$/);
  if (lastSentence > maxChars * 0.6) return sub.slice(0, lastSentence + 1) + " …";
  return sub + "…";
}

/** Strip HTML-like markup from FDA label text */
export function stripMarkup(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
