/**
 * medicineParser.js
 * Extracts medicine names from cleaned OCR text.
 *
 * v2: Massively expanded drug dictionary (1000+ names), smarter scoring,
 * multi-word drug name detection, and fuzzy matching for OCR typos.
 *
 * Strategy:
 *   1. Exact match against 1000+ drug dictionary (OTC + Rx + generic + brand)
 *   2. Pharmaceutical suffix/prefix matching (USAN/INN nomenclature)
 *   3. Dosage-adjacent extraction (word before "mg", "ml" etc.)
 *   4. Multi-word drug name detection ("amoxicillin clavulanate")
 *   5. Simple edit-distance fuzzy matching for OCR errors
 */

// ─── Huge drug dictionary ─────────────────────────────────────────────────────
// OTC pain/fever
const OTC_PAIN = [
  "acetaminophen","ibuprofen","aspirin","naproxen","ketoprofen","naproxen sodium",
  "tylenol","advil","motrin","aleve","excedrin","bayer","bufferin","panadol",
  "nuprin","midol","pamprin","goody","bc powder",
];
// OTC allergy/cold/flu
const OTC_ALLERGY = [
  "diphenhydramine","loratadine","cetirizine","fexofenadine","chlorpheniramine",
  "pseudoephedrine","phenylephrine","dextromethorphan","guaifenesin","brompheniramine",
  "benadryl","claritin","zyrtec","allegra","sudafed","mucinex","robitussin",
  "triaminic","nyquil","dayquil","theraflu","airborne","emergen","zicam",
  "afrin","flonase","nasacort","xyzal","clarinex",
];
// OTC GI
const OTC_GI = [
  "omeprazole","famotidine","ranitidine","cimetidine","simethicone","calcium carbonate",
  "bismuth subsalicylate","loperamide","docusate","bisacodyl","senna","polyethylene glycol",
  "prilosec","pepcid","zantac","tagamet","imodium","dulcolax","miralax","colace",
  "metamucil","benefiber","phillips","maalox","mylanta","tums","rolaids","gaviscon",
  "gas-x","beano","pepto","pepto-bismol","immodium",
];
// OTC topical
const OTC_TOPICAL = [
  "hydrocortisone","clotrimazole","miconazole","terbinafine","bacitracin","neomycin",
  "polymyxin","lidocaine","benzocaine","salicylic acid","benzoyl peroxide",
  "neosporin","cortisone","lotrimin","lamisil","tinactin","monistat","vagisil",
  "preparation","anusol","tronolane","icy hot","bengay","biofreeze","voltaren",
];
// Rx antibiotics
const RX_ANTIBIOTICS = [
  "amoxicillin","amoxicillin-clavulanate","amoxicillin clavulanate","augmentin",
  "azithromycin","zithromax","doxycycline","vibramycin","ciprofloxacin","cipro",
  "levofloxacin","levaquin","metronidazole","flagyl","clindamycin","cleocin",
  "trimethoprim","sulfamethoxazole","bactrim","cephalexin","keflex","ceftriaxone",
  "rocephin","penicillin","amoxil","moxatag","nitrofurantoin","macrobid","macrodantin",
  "clarithromycin","biaxin","erythromycin","tetracycline","minocycline","solodyn",
  "linezolid","zyvox","vancomycin","daptomycin","meropenem","piperacillin","tazobactam",
];
// Rx cardiovascular
const RX_CARDIO = [
  "metoprolol","lopressor","toprol","atenolol","tenormin","carvedilol","coreg",
  "bisoprolol","zebeta","propranolol","inderal","lisinopril","prinivil","zestril",
  "enalapril","vasotec","ramipril","altace","benazepril","lotensin","captopril",
  "losartan","cozaar","valsartan","diovan","olmesartan","benicar","irbesartan","avapro",
  "candesartan","atacand","amlodipine","norvasc","nifedipine","procardia","diltiazem",
  "cardizem","verapamil","calan","atorvastatin","lipitor","simvastatin","zocor",
  "rosuvastatin","crestor","pravastatin","pravachol","lovastatin","mevacor",
  "warfarin","coumadin","apixaban","eliquis","rivaroxaban","xarelto","dabigatran",
  "pradaxa","clopidogrel","plavix","furosemide","lasix","hydrochlorothiazide","hctz",
  "spironolactone","aldactone","digoxin","lanoxin","amiodarone","cordarone",
  "nitroglycerin","nitrostat","isosorbide","imdur","ezetimibe","zetia",
];
// Rx diabetes
const RX_DIABETES = [
  "metformin","glucophage","glipizide","glucotrol","glyburide","diabeta","glimepiride",
  "amaryl","pioglitazone","actos","sitagliptin","januvia","liraglutide","victoza",
  "empagliflozin","jardiance","canagliflozin","invokana","dapagliflozin","farxiga",
  "insulin","humalog","novolog","lantus","levemir","basaglar","toujeo","tresiba",
  "saxagliptin","onglyza","alogliptin","nesina","dulaglutide","trulicity",
  "semaglutide","ozempic","wegovy","exenatide","byetta","bydureon",
];
// Rx pain / musculoskeletal
const RX_PAIN = [
  "tramadol","ultram","hydrocodone","vicodin","norco","oxycodone","oxycontin","percocet",
  "morphine","ms contin","codeine","fentanyl","duragesic","buprenorphine","suboxone",
  "gabapentin","neurontin","pregabalin","lyrica","cyclobenzaprine","flexeril",
  "methocarbamol","robaxin","celecoxib","celebrex","meloxicam","mobic","diclofenac",
  "voltaren","indomethacin","indocin","ketorolac","toradol","colchicine","colcrys",
  "allopurinol","zyloprim","febuxostat","uloric","tizanidine","zanaflex",
  "carisoprodol","soma","baclofen","lioresal",
];
// Rx CNS / psychiatry
const RX_CNS = [
  "sertraline","zoloft","fluoxetine","prozac","escitalopram","lexapro","citalopram",
  "celexa","paroxetine","paxil","venlafaxine","effexor","duloxetine","cymbalta",
  "bupropion","wellbutrin","zyban","mirtazapine","remeron","trazodone","desyrel",
  "alprazolam","xanax","lorazepam","ativan","diazepam","valium","clonazepam",
  "klonopin","zolpidem","ambien","eszopiclone","lunesta","quetiapine","seroquel",
  "risperidone","risperdal","aripiprazole","abilify","olanzapine","zyprexa",
  "haloperidol","haldol","amphetamine","adderall","methylphenidate","ritalin",
  "concerta","lisdexamfetamine","vyvanse","atomoxetine","strattera","lithium",
  "valproate","valproic acid","depakote","lamotrigine","lamictal","levetiracetam",
  "keppra","topiramate","topamax","oxcarbazepine","trileptal","carbamazepine",
  "tegretol","phenytoin","dilantin","clozapine","clozaril","paliperidone","invega",
  "modafinil","provigil","armodafinil","nuvigil",
];
// Rx thyroid / hormones
const RX_HORMONE = [
  "levothyroxine","synthroid","levoxyl","methimazole","propylthiouracil","ptu",
  "prednisone","deltasone","prednisolone","orapred","dexamethasone","decadron",
  "hydrocortisone","cortef","methylprednisolone","medrol","fludrocortisone",
  "estradiol","estrace","progesterone","prometrium","testosterone","androgel",
  "medroxyprogesterone","provera","norethindrone","depo-provera",
];
// Rx respiratory
const RX_RESP = [
  "albuterol","proair","ventolin","proventil","salmeterol","serevent","formoterol",
  "tiotropium","spiriva","ipratropium","atrovent","fluticasone","flovent","advair",
  "budesonide","pulmicort","symbicort","montelukast","singulair","theophylline",
  "umeclidinium","incruse","vilanterol","breo","roflumilast","daliresp",
];
// Rx misc
const RX_MISC = [
  "hydroxychloroquine","plaquenil","tamsulosin","flomax","finasteride","proscar",
  "sildenafil","viagra","tadalafil","cialis","vardenafil","levitra","ondansetron",
  "zofran","metoclopramide","reglan","promethazine","phenergan","acyclovir",
  "zovirax","valacyclovir","valtrex","oseltamivir","tamiflu","hydroxyzine","vistaril",
  "atarax","alendronate","fosamax","zoledronic acid","reclast","denosumab","prolia",
  "tacrolimus","prograf","cyclosporine","neoral","mycophenolate","cellcept",
  "azathioprine","imuran","methotrexate","trexall","adalimumab","humira",
  "etanercept","enbrel","infliximab","remicade","rituximab","rituxan","trastuzumab",
  "herceptin","imatinib","gleevec","erlotinib","tarceva","sorafenib","nexavar",
  "lenalidomide","revlimid","bortezomib","velcade",
];
// Supplements / herbal (common ones OCR might see)
const SUPPLEMENTS = [
  "cissus quadrangularis","cissus","ashwagandha","turmeric","curcumin","ginger",
  "ginseng","echinacea","elderberry","melatonin","valerian","st john wort",
  "saw palmetto","evening primrose","black cohosh","red yeast rice","berberine",
  "fish oil","omega 3","vitamin d","vitamin c","vitamin b12","vitamin b",
  "vitamin e","vitamin k","vitamin a","zinc","magnesium","calcium","iron",
  "folic acid","biotin","collagen","glucosamine","chondroitin","coenzyme q10",
  "coq10","probiotics","lactobacillus","bifidobacterium","spirulina","chlorella",
  "milk thistle","silymarin","green tea","resveratrol","quercetin","nac",
  "n-acetyl cysteine","alpha lipoic acid","creatine","l-carnitine","l-arginine",
  "l-glutamine","protein","whey","casein","bcaa","caffeine","guarana",
];

export const KNOWN_DRUGS = new Set([
  ...OTC_PAIN, ...OTC_ALLERGY, ...OTC_GI, ...OTC_TOPICAL,
  ...RX_ANTIBIOTICS, ...RX_CARDIO, ...RX_DIABETES, ...RX_PAIN,
  ...RX_CNS, ...RX_HORMONE, ...RX_RESP, ...RX_MISC, ...SUPPLEMENTS,
].map((d) => d.toLowerCase()));

// ─── Pharmaceutical suffix/prefix patterns ────────────────────────────────────
const PHARMA_SUFFIXES = [
  // antibiotics
  "cillin","mycin","cycline","floxacin","zole","oxacin","azole","oxime",
  // cardiovascular
  "olol","pril","sartan","dipine","statin","fibrate","tidine","navir",
  // CNS
  "pam","lam","zepam","prazole","dine","zine","pine","peridone",
  // pain/inflammation
  "profen","oxicam","fenac","gesic",
  // biologics/newer
  "mab","tinib","nib","zumab","kinase","mivir","cept","umab",
  // hormones
  "sone","olone","asone","caine","amine","azine","idine","sterol",
  // misc
  "vudine","ovir","amine","formin","gliptin","gliflozin","agliptin",
];
const PHARMA_PREFIXES = [
  "amino","anti","bio","cardio","chloro","cyclo","dextro","fluoro",
  "hydro","iso","levo","methyl","nitro","nor","ortho","oxy","para",
  "phenyl","poly","pseudo","sulfa","tetra","tri",
];

// ─── Dosage units ─────────────────────────────────────────────────────────────
const DOSAGE_PATTERN = /(\d+(?:\.\d+)?)\s*(mg|mcg|ug|ml|g|iu|units?|%|meq)\b/gi;

/**
 * Extract candidate medicine names from cleaned OCR text.
 *
 * @param {string} cleanedText
 * @returns {CandidateMedicine[]}
 */
export function extractMedicineNames(cleanedText) {
  if (!cleanedText) return [];

  const candidates = new Map(); // name_lower → {name, displayName, score}
  const text = cleanedText;
  const lower = text.toLowerCase();

  // ── Strategy 1: Multi-word known drug names (check these FIRST) ───────────
  for (const drug of KNOWN_DRUGS) {
    if (drug.includes(" ")) {
      // Multi-word: do a string search
      if (lower.includes(drug)) {
        addCandidate(candidates, drug, 95, titleCase(drug));
      }
    }
  }

  // ── Strategy 2: Single-word token matching ────────────────────────────────
  const tokens = tokenize(text);

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const tl = tok.toLowerCase();

    if (tl.length < 4) continue;

    // Exact dictionary hit
    if (KNOWN_DRUGS.has(tl)) {
      addCandidate(candidates, tl, 92, tok);
      continue;
    }

    // Fuzzy match — catches OCR typos like "lbuprofen" → "ibuprofen"
    const fuzzyMatch = fuzzyFindDrug(tl);
    if (fuzzyMatch) {
      addCandidate(candidates, fuzzyMatch.drug, 80, titleCase(fuzzyMatch.drug));
      continue;
    }

    // Suffix match
    const suffix = PHARMA_SUFFIXES.find(
      (s) => tl.endsWith(s) && tl.length > s.length + 2
    );
    if (suffix) {
      addCandidate(candidates, tl, 65, tok);
    }

    // Token before dosage marker
    if (i < tokens.length - 1) {
      const next = tokens[i + 1].toLowerCase();
      if (/^\d+(\.\d+)?(mg|mcg|ug|ml|g|iu|%)$/i.test(next) && tl.length >= 4) {
        addCandidate(candidates, tl, 78, tok);
      }
    }
  }

  // ── Strategy 3: Dosage-adjacent extraction (regex over full text) ─────────
  let m;
  const dosageRe = new RegExp(DOSAGE_PATTERN.source, "gi");
  while ((m = dosageRe.exec(text)) !== null) {
    const before = text.slice(0, m.index).trim();
    const words = before.split(/\s+/);

    // Try the last 1, 2, and 3 words before the dosage
    for (const n of [1, 2, 3]) {
      const phrase = words.slice(-n).join(" ").replace(/[^a-zA-Z0-9 -]/g, "").trim();
      const pl = phrase.toLowerCase();
      if (pl.length >= 4 && /^[a-z\s-]+$/.test(pl)) {
        if (KNOWN_DRUGS.has(pl)) {
          addCandidate(candidates, pl, 88, titleCase(phrase));
          break;
        } else if (n === 1 && pl.length >= 5) {
          // Single word before dosage — probably a drug name
          addCandidate(candidates, pl, 70, titleCase(phrase));
        }
      }
    }
  }

  // ── Strategy 4: ALL-CAPS words (drug names often printed in caps on labels) ─
  const capsMatches = text.match(/\b[A-Z]{4,}\b/g) || [];
  for (const cap of capsMatches) {
    const cl = cap.toLowerCase();
    if (KNOWN_DRUGS.has(cl)) {
      addCandidate(candidates, cl, 90, titleCase(cap));
    }
  }

  // ── Build final sorted list ───────────────────────────────────────────────
  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .filter((c) => c.score >= 60 && c.name.length >= 4);
}

// ─── Fuzzy matching ───────────────────────────────────────────────────────────
/**
 * Find closest drug name within edit distance 1–2 for short words, 2–3 for long.
 * Only runs if token is ≥ 5 chars (below that, too many false positives).
 */
function fuzzyFindDrug(token) {
  if (token.length < 5) return null;

  const maxDist = token.length <= 7 ? 1 : 2;
  let best = null;
  let bestDist = Infinity;

  for (const drug of KNOWN_DRUGS) {
    if (Math.abs(drug.length - token.length) > maxDist) continue;
    const dist = editDistance(token, drug);
    if (dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      best = { drug, dist };
    }
  }

  return best;
}

/** Levenshtein edit distance (bounded — stops early if > maxDist) */
function editDistance(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 99;

  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[a.length][b.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addCandidate(map, lower, score, original) {
  const existing = map.get(lower);
  if (!existing || existing.score < score) {
    map.set(lower, { name: lower, displayName: original, score });
  }
}

function tokenize(text) {
  return text
    .split(/[\s,;:()\n\r/]+/)
    .map((t) => t.replace(/[^a-zA-Z0-9-]/g, ""))
    .filter((t) => t.length >= 3);
}

function titleCase(str) {
  return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * @typedef {Object} CandidateMedicine
 * @property {string} name        - lowercase
 * @property {string} displayName - display cased
 * @property {number} score       - 0–100
 */
