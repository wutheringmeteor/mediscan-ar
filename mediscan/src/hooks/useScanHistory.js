/**
 * useScanHistory.js
 * React hook for persisting scan results to localStorage.
 *
 * Schema per entry:
 * {
 *   id: string (uuid-like timestamp),
 *   timestamp: ISO string,
 *   imageName: string,
 *   imageDataUrl: string (base64, stored for report generation),
 *   ocrText: string,
 *   ocrConfidence: number,
 *   medicines: FDADrugLabel[],
 *   riskLevel: 'high'|'medium'|'low',
 *   isDemo: boolean,
 * }
 */

import { useState, useCallback } from "react";

const STORAGE_KEY = "mediscan_history";
const MAX_ENTRIES = 30; // cap to avoid blowing localStorage quota

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    // Quota exceeded — trim oldest entries and retry
    const trimmed = entries.slice(0, Math.floor(MAX_ENTRIES / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Give up silently — localStorage may be unavailable
    }
  }
}

/**
 * @returns {{
 *   history: ScanEntry[],
 *   addEntry: (entry: Omit<ScanEntry, 'id'|'timestamp'>) => void,
 *   removeEntry: (id: string) => void,
 *   clearHistory: () => void,
 * }}
 */
export function useScanHistory() {
  const [history, setHistory] = useState(() => loadHistory());

  const addEntry = useCallback((entry) => {
    const newEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    setHistory((prev) => {
      const updated = [newEntry, ...prev].slice(0, MAX_ENTRIES);
      saveHistory(updated);
      return updated;
    });

    return newEntry.id;
  }, []);

  const removeEntry = useCallback((id) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}

/**
 * @typedef {Object} ScanEntry
 * @property {string} id
 * @property {string} timestamp
 * @property {string} imageName
 * @property {string} imageDataUrl
 * @property {string} ocrText
 * @property {number} ocrConfidence
 * @property {import('../services/openfdaService').FDADrugLabel[]} medicines
 * @property {'high'|'medium'|'low'} riskLevel
 * @property {boolean} isDemo
 */
