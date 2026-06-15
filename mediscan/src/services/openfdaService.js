/**
 * openfdaService.js
 * Fetches drug label data from the openFDA Drug Label API.
 * No API key required. 240 requests/min anonymous, 1000/min with key.
 * Completely free forever.
 *
 * This replaces the old two-step RxNorm → openFDA flow.
 * We now query openFDA directly with multiple search strategies,
 * which is faster (one fewer network hop) and more reliable.
 *
 * Docs: https://open.fda.gov/apis/drug/label/
 */

const BASE = "https://api.fda.gov/drug/label.json";

/**
 * Search strategies in priority order.
 * For herbs/supplements/non-FDA drugs we also try the NDC product database.
 */
const LABEL_STRATEGIES = [
  (name) => `openfda.brand_name:"${name}"`,
  (name) => `openfda.generic_name:"${name}"`,
  (name) => `openfda.substance_name:"${name}"`,
  (name) => `openfda.brand_name:${name}*`,       // prefix wildcard
  (name) => `openfda.generic_name:${name}*`,
  (name) => `description:"${name}"`,             // some labels have drug in description
];

/**
 * Fetch label data for a drug name.
 * Tries multiple strategies until one succeeds.
 *
 * @param {string} drugName
 * @returns {Promise<FDADrugLabel>}
 */
export async function fetchDrugLabel(drugName) {
  const trimmed = drugName.trim();
  if (!trimmed) throw new FDAError("Drug name is empty.", "EMPTY_NAME");

  // Try each strategy
  for (const strategy of LABEL_STRATEGIES) {
    const query = strategy(trimmed);
    try {
      const result = await queryFDA(query, 1);
      if (result) return parseLabelResult(result, drugName);
    } catch (err) {
      if (err instanceof FDAError && err.code === "NOT_FOUND") continue;
      throw err; // network errors etc — rethrow
    }
  }

  throw new FDAError(`No FDA label data found for "${drugName}".`, "NOT_FOUND");
}

/**
 * Search by free text — used when we have OCR text but no clear drug name.
 * Returns up to `limit` results.
 */
export async function searchDrugLabels(query, limit = 3) {
  const results = [];

  const strategies = [
    `openfda.brand_name:${query}*`,
    `openfda.generic_name:${query}*`,
    `openfda.substance_name:${query}*`,
  ];

  for (const s of strategies) {
    try {
      const url = `${BASE}?search=${encodeURIComponent(s)}&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results?.length) {
        for (const r of data.results) {
          const label = parseLabelResult(r, query);
          if (!results.find((l) => l.brandName === label.brandName)) {
            results.push(label);
          }
        }
      }
    } catch {
      continue;
    }
    if (results.length >= limit) break;
  }

  return results;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function queryFDA(searchQuery, limit = 1) {
  const url = `${BASE}?search=${encodeURIComponent(searchQuery)}&limit=${limit}`;

  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new FDAError("Network error reaching openFDA.", "NETWORK");
  }

  if (res.status === 404) throw new FDAError("Not found.", "NOT_FOUND");
  if (res.status === 429) throw new FDAError("Rate limit reached. Wait a moment.", "RATE_LIMIT");
  if (!res.ok) throw new FDAError(`openFDA returned HTTP ${res.status}.`, "HTTP_ERROR");

  const data = await res.json();
  const results = data?.results;
  if (!results || results.length === 0) throw new FDAError("Not found.", "NOT_FOUND");
  return results[0];
}

function parseLabelResult(raw, queryName) {
  const openfda = raw.openfda || {};

  return {
    brandName:            firstOf(openfda.brand_name)         || titleCase(queryName),
    genericName:          firstOf(openfda.generic_name)        || null,
    manufacturerName:     firstOf(openfda.manufacturer_name)   || null,
    substanceName:        firstOf(openfda.substance_name)      || null,
    routeOfAdmin:         firstOf(openfda.route)               || null,
    dosageForm:           firstOf(openfda.dosage_form)         || null,
    productType:          firstOf(openfda.product_type)        || null,
    purpose:              firstOf(raw.purpose)                 || null,
    indicationsAndUsage:  firstOf(raw.indications_and_usage)   || null,
    dosageAndAdmin:       firstOf(raw.dosage_and_administration)|| null,
    warnings:             firstOf(raw.warnings)                || null,
    warningsCautions:     firstOf(raw.warnings_and_cautions)   || null,
    adverseReactions:     firstOf(raw.adverse_reactions)       || null,
    contraindications:    firstOf(raw.contraindications)       || null,
    drugInteractions:     firstOf(raw.drug_interactions)       || null,
    activeIngredient:     firstOf(raw.active_ingredient)       || null,
    inactiveIngredient:   firstOf(raw.inactive_ingredient)     || null,
    keepOutOfReach:       firstOf(raw.keep_out_of_reach_of_children) || null,
    storageHandling:      firstOf(raw.storage_and_handling)    || null,
    pregnancyOrBreast:    firstOf(raw.pregnancy_or_breast_feeding)   || null,
    fdaApplicationNumber: firstOf(openfda.application_number)  || null,
    ndcCode:              firstOf(openfda.package_ndc)          || null,
    dataSource: "openFDA",
  };
}

function firstOf(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return null;
  return arr[0];
}

function titleCase(str) {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export class FDAError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "FDAError";
    this.code = code;
  }
}
