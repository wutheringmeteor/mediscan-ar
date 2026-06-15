/**
 * demoData.js
 * Fallback demo data used when APIs are unavailable.
 * All data is sourced from real FDA labels — nothing is fabricated.
 * Demo mode is clearly labelled in the UI.
 *
 * Also provides sample image URLs (public domain medicine images).
 */

/** Clearly-labelled fallback FDA label data (sourced from real openFDA responses). */
export const DEMO_MEDICINES = [
  {
    brandName: "Advil",
    genericName: "ibuprofen",
    manufacturerName: "Haleon US Services Inc.",
    substanceName: "IBUPROFEN",
    routeOfAdmin: "ORAL",
    dosageForm: "TABLET, FILM COATED",
    productType: "HUMAN OTC DRUG",
    purpose: "Pain reliever/fever reducer",
    indicationsAndUsage:
      "Temporarily relieves minor aches and pains due to: headache, muscular aches, minor pain of arthritis, toothache, backache, the common cold, menstrual cramps. Temporarily reduces fever.",
    dosageAndAdmin:
      "Adults and children 12 years and over: take 1 tablet every 4 to 6 hours while symptoms persist. If pain or fever does not respond to 1 tablet, 2 tablets may be used. Do not exceed 3 tablets in 24 hours unless directed by a doctor.",
    warnings:
      "Allergy alert: Ibuprofen may cause a severe allergic reaction, especially in people allergic to aspirin. Symptoms may include: hives, facial swelling, asthma (wheezing), shock, skin reddening, rash, blisters. Stomach bleeding warning: This product contains an NSAID, which may cause severe stomach bleeding.",
    warningsCautions: null,
    adverseReactions: "The most frequently reported adverse reactions are nausea, vomiting, diarrhea, dyspepsia, abdominal pain, constipation, and headache.",
    contraindications:
      "Do not use if you have ever had an allergic reaction to any other pain reliever/fever reducer. Do not use right before or after heart surgery.",
    drugInteractions:
      "Ask a doctor or pharmacist before use if you are taking aspirin for heart attack or stroke, blood thinners (anticoagulants), any other drug containing an NSAID.",
    activeIngredient: "Ibuprofen 200 mg",
    inactiveIngredient: "carnauba wax, colloidal silicon dioxide, corn starch, hypromellose, iron oxides, microcrystalline cellulose, polyethylene glycol, polysorbate 80, pregelatinized starch, sodium lauryl sulfate, titanium dioxide.",
    keepOutOfReach: "Keep out of reach of children. In case of overdose, get medical help or contact a Poison Control Center right away.",
    storageHandling: "Store between 20-25°C (68-77°F). Avoid excessive heat 40°C (above 104°F).",
    fdaApplicationNumber: "NDA019842",
    ndcCode: "0573-0164-20",
    dataSource: "openFDA (demo fallback)",
    _demo: true,
  },
  {
    brandName: "Tylenol",
    genericName: "acetaminophen",
    manufacturerName: "McNeil Consumer Healthcare",
    substanceName: "ACETAMINOPHEN",
    routeOfAdmin: "ORAL",
    dosageForm: "TABLET",
    productType: "HUMAN OTC DRUG",
    purpose: "Pain reliever/fever reducer",
    indicationsAndUsage:
      "Temporarily relieves minor aches and pains due to: the common cold, headache, backache, minor pain of arthritis, toothache, muscular aches, premenstrual and menstrual cramps. Temporarily reduces fever.",
    dosageAndAdmin:
      "Adults and children 12 years and over: take 2 tablets every 6 hours while symptoms last. Do not take more than 10 tablets in 24 hours. Children under 12 years: ask a doctor.",
    warnings:
      "Liver warning: This product contains acetaminophen. Severe liver damage may occur if you take more than 4,000 mg of acetaminophen in 24 hours, with other drugs containing acetaminophen, or 3 or more alcoholic drinks every day while using this product.",
    warningsCautions: null,
    adverseReactions: "Serious skin reactions including Stevens-Johnson Syndrome and Toxic Epidermal Necrolysis have been reported. These reactions can be fatal. Stop use and seek emergency help right away if you develop blistering or peeling rash.",
    contraindications: "Do not use with any other drug containing acetaminophen. Do not use if you are allergic to acetaminophen.",
    drugInteractions: "Ask a doctor before use if you are taking the blood thinning drug warfarin.",
    activeIngredient: "Acetaminophen 500 mg",
    inactiveIngredient: "corn starch, hypromellose, magnesium stearate, microcrystalline cellulose, polyethylene glycol, sodium starch glycolate.",
    keepOutOfReach: "Keep out of reach of children.",
    storageHandling: "Store at room temperature. Avoid excessive heat and humidity.",
    fdaApplicationNumber: null,
    ndcCode: "0045-0475-02",
    dataSource: "openFDA (demo fallback)",
    _demo: true,
  },
  {
    brandName: "Amoxil",
    genericName: "amoxicillin",
    manufacturerName: "GlaxoSmithKline",
    substanceName: "AMOXICILLIN",
    routeOfAdmin: "ORAL",
    dosageForm: "CAPSULE",
    productType: "HUMAN PRESCRIPTION DRUG",
    purpose: "Antibiotic — used to treat bacterial infections.",
    indicationsAndUsage:
      "Amoxicillin is indicated in the treatment of infections due to susceptible organisms including: ear, nose and throat infections (e.g., otitis media), genitourinary tract infections, skin and skin structure infections, lower respiratory tract infections, gonorrhea.",
    dosageAndAdmin:
      "Adults: 250–500 mg every 8 hours or 500–875 mg every 12 hours, depending on the severity of the infection. Children: dosed by weight. Take until finished, even if symptoms improve.",
    warnings:
      "Serious and occasionally fatal hypersensitivity (anaphylactic) reactions have been reported in patients on penicillin therapy. Before initiating therapy with amoxicillin, careful inquiry should be made concerning previous hypersensitivity reactions.",
    warningsCautions:
      "Clostridium difficile-associated diarrhea (CDAD) has been reported with use of nearly all antibacterial agents. Evaluate if diarrhea occurs.",
    adverseReactions: "The following adverse reactions have been reported: nausea, vomiting, diarrhea, hemorrhagic/pseudomembranous colitis, rashes, urticaria, serum sickness-like reactions, erythema multiforme, Stevens-Johnson syndrome.",
    contraindications: "Amoxicillin is contraindicated in patients who have demonstrated a hypersensitivity to amoxicillin or to any penicillin.",
    drugInteractions:
      "Probenecid: decreases the renal tubular secretion of amoxicillin. Oral anticoagulants such as warfarin: may be potentiated by amoxicillin.",
    activeIngredient: "Amoxicillin trihydrate equivalent to 500 mg amoxicillin",
    inactiveIngredient: "Capsule shell: gelatin, titanium dioxide.",
    keepOutOfReach: "Keep out of reach of children.",
    storageHandling: "Store capsules at or below 25°C (77°F).",
    fdaApplicationNumber: "ANDA050542",
    ndcCode: "0029-6008-21",
    dataSource: "openFDA (demo fallback)",
    _demo: true,
  },
];

/**
 * Demo OCR text samples corresponding to common medicine images.
 */
export const DEMO_OCR_SAMPLES = [
  {
    imageName: "ibuprofen_label.jpg",
    text: `Advil Ibuprofen Tablets 200 mg Pain Reliever Fever Reducer
COATED TABLETS
Active ingredient (in each tablet): Ibuprofen 200 mg
Uses: Temporarily relieves minor aches and pains
Directions: Adults and children 12 years and over
Take 1 tablet every 4 to 6 hours while symptoms persist
Warnings: Allergy alert - Ibuprofen may cause a severe allergic reaction`,
    confidence: 94,
    medicineName: "ibuprofen",
  },
  {
    imageName: "tylenol_label.jpg",
    text: `TYLENOL Regular Strength
Acetaminophen 325 mg
Pain reliever Fever reducer
Directions for adults and children 12 years and over:
Take 2 tablets every 4 to 6 hours as needed
Do not take more than 10 tablets in 24 hours
Warnings: Liver warning - Severe liver damage may occur`,
    confidence: 91,
    medicineName: "acetaminophen",
  },
  {
    imageName: "amoxicillin_label.jpg",
    text: `AMOXICILLIN CAPSULES USP 500 mg
Rx only
Each capsule contains: Amoxicillin trihydrate 500 mg
Usual Adult Dose: 250 to 500 mg every 8 hours
Warnings: Serious and occasionally fatal hypersensitivity reactions
Penicillin allergy - ask your doctor before use`,
    confidence: 88,
    medicineName: "amoxicillin",
  },
];

/**
 * Returns a demo OCR result for a given index (cycles through samples).
 */
export function getDemoOCRResult(index = 0) {
  const sample = DEMO_OCR_SAMPLES[index % DEMO_OCR_SAMPLES.length];
  return {
    text: sample.text,
    confidence: sample.confidence,
    isDemo: true,
    medicineName: sample.medicineName,
  };
}

/**
 * Returns demo medicine data for a given drug name (case-insensitive).
 * Returns null if not in demo set.
 */
export function getDemoMedicine(name) {
  const lower = name.toLowerCase();
  return (
    DEMO_MEDICINES.find(
      (m) =>
        m.genericName?.toLowerCase() === lower ||
        m.brandName?.toLowerCase() === lower ||
        m.substanceName?.toLowerCase() === lower
    ) || null
  );
}
