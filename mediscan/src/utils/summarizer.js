/**
 * summarizer.js
 * Rule-based plain-language summarizer for FDA label text.
 *
 * NO LLM required. Uses keyword extraction + sentence scoring
 * to produce short, readable summaries from long FDA sections.
 *
 * Approach:
 *   1. Split FDA text into sentences
 *   2. Score each sentence by keyword relevance
 *   3. Return top N sentences, cleaned
 */

import { stripMarkup, capitalize } from "./textCleaner.js";

// ─── Section-specific keyword weights ────────────────────────────────────────
const KEYWORD_WEIGHTS = {
  purpose: [
    ["used for", 10], ["indicated for", 10], ["treats", 9], ["relieves", 9],
    ["reduces", 7], ["helps", 6], ["temporary relief", 10], ["treatment of", 10],
  ],
  dosage: [
    ["take", 10], ["dose", 10], ["daily", 9], ["tablet", 8], ["capsule", 8],
    ["mg", 8], ["hour", 7], ["directed", 7], ["adult", 7], ["child", 7],
    ["maximum", 9], ["not more than", 9], ["do not exceed", 10],
  ],
  warnings: [
    ["do not", 10], ["warning", 10], ["caution", 9], ["risk", 8],
    ["stop use", 9], ["consult", 8], ["doctor", 7], ["serious", 9],
    ["death", 10], ["liver", 8], ["kidney", 8], ["bleed", 9], ["allerg", 9],
    ["avoid", 7], ["dangerous", 9], ["fatal", 10], ["overdose", 10],
  ],
  sideEffects: [
    ["may cause", 10], ["side effect", 10], ["nausea", 8], ["headache", 7],
    ["dizziness", 8], ["drowsiness", 8], ["stomach", 7], ["pain", 6],
    ["rash", 8], ["vomit", 8], ["diarrhea", 8], ["common", 7],
    ["uncommon", 7], ["rare", 7], ["occur", 6],
  ],
};

/**
 * Summarize a section of FDA text.
 *
 * @param {string|null} text    - raw FDA section text
 * @param {'purpose'|'dosage'|'warnings'|'sideEffects'} section
 * @param {number} maxSentences - how many top sentences to return (default 3)
 * @returns {string} - plain language summary, or empty string if no input
 */
export function summarizeSection(text, section, maxSentences = 3) {
  if (!text) return "";

  const cleaned = stripMarkup(text);
  const sentences = splitSentences(cleaned);
  if (sentences.length === 0) return cleaned.slice(0, 300);

  const keywords = KEYWORD_WEIGHTS[section] || [];
  const scored = sentences.map((s) => ({
    text: s,
    score: scoreSentence(s, keywords),
  }));

  const top = scored
    .filter((s) => s.score > 0 && s.text.length > 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    // Re-sort by original order to preserve readability
    .sort((a, b) => sentences.indexOf(a.text) - sentences.indexOf(b.text))
    .map((s) => cleanSentence(s.text));

  if (top.length === 0) {
    // fallback: first 250 chars of cleaned text
    return cleaned.slice(0, 250) + (cleaned.length > 250 ? "…" : "");
  }

  return top.join(" ");
}

/**
 * Score a sentence by keyword presence and weight.
 */
function scoreSentence(sentence, keywords) {
  const lower = sentence.toLowerCase();
  let score = 0;
  for (const [kw, weight] of keywords) {
    if (lower.includes(kw.toLowerCase())) score += weight;
  }
  // Penalise very long sentences (they tend to be run-ons in FDA text)
  if (sentence.length > 300) score -= 3;
  return score;
}

/**
 * Split text into sentences on common terminators.
 */
function splitSentences(text) {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

/**
 * Clean up a single extracted sentence for display.
 */
function cleanSentence(sentence) {
  let s = sentence.trim();
  // Remove leading bullets, numbers, etc.
  s = s.replace(/^[\d•·\-–—*]+[\s.)]*/u, "");
  // Capitalize first letter
  s = capitalize(s);
  // Ensure ends with punctuation
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}

/**
 * Build a risk level from a warnings string.
 * Returns: 'high' | 'medium' | 'low'
 *
 * @param {string|null} warningsText
 * @param {string|null} contraindicationsText
 * @returns {'high'|'medium'|'low'}
 */
export function inferRiskLevel(warningsText, contraindicationsText) {
  const combined = ((warningsText || "") + " " + (contraindicationsText || "")).toLowerCase();

  const HIGH_SIGNALS = [
    "death", "fatal", "life-threatening", "serious injury", "overdose",
    "do not use", "contraindicated", "severe", "anaphylaxis", "hemorrhage",
    "black box", "boxed warning", "fda warns",
  ];
  const MEDIUM_SIGNALS = [
    "consult", "doctor", "physician", "stop use", "avoid", "caution",
    "monitor", "allergy", "interact", "liver", "kidney", "heart",
  ];

  if (HIGH_SIGNALS.some((s) => combined.includes(s))) return "high";
  if (MEDIUM_SIGNALS.some((s) => combined.includes(s))) return "medium";
  return "low";
}

/**
 * Extract a bullet list of side effects from raw adverse reactions text.
 * Returns array of strings (max 8).
 *
 * @param {string|null} text
 * @returns {string[]}
 */
export function extractSideEffectList(text) {
  if (!text) return [];

  const cleaned = stripMarkup(text).toLowerCase();
  // Common side effects to look for
  const KNOWN_EFFECTS = [
    "nausea","vomiting","diarrhea","constipation","headache","dizziness",
    "drowsiness","fatigue","insomnia","rash","itching","hives","swelling",
    "stomach pain","abdominal pain","dry mouth","blurred vision","nervousness",
    "anxiety","depression","chest pain","shortness of breath","palpitations",
    "muscle pain","joint pain","back pain","fever","chills","sweating",
    "increased heart rate","low blood pressure","high blood pressure",
    "weight gain","weight loss","loss of appetite","hair loss",
  ];

  const found = KNOWN_EFFECTS.filter((e) => cleaned.includes(e));

  // Also extract from sentence patterns like "include X, Y, and Z"
  const includeMatch = cleaned.match(/include[sd]?[:\s]+([^.!?]+)/);
  if (includeMatch) {
    const extras = includeMatch[1]
      .split(/,|and/)
      .map((s) => s.trim().replace(/[^a-z\s]/g, ""))
      .filter((s) => s.length > 3 && s.length < 40);
    for (const e of extras) {
      if (!found.includes(e)) found.push(e);
    }
  }

  return [...new Set(found)].slice(0, 8).map(capitalize);
}
