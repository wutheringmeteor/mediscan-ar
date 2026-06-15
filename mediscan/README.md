# MediScan — University Project

Medicine scanning app. Upload a photo of a medicine label to extract text and look up drug information.

## Tech Stack

- **OCR**: [Tesseract.js](https://github.com/naptha/tesseract.js) — runs fully in the browser via WebAssembly, no API key, no rate limits
- **Drug data**: [openFDA Drug Label API](https://open.fda.gov/apis/drug/label/) — free, no key required
- **Frontend**: React + Vite + Framer Motion

Everything is free forever. No paid services.

## How it works

1. Upload a photo of a medicine label
2. Tesseract.js LSTM runs OCR in-browser (image never leaves your device)
3. Medicine names are extracted from the text
4. openFDA is queried for full drug label data
5. Results shown with warnings, dosage, side effects

## Running locally

```bash
npm install
npm run dev
```

## Deploying to Vercel

```bash
npm run build
vercel --prod
```

The `vercel.json` file sets the required `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers needed for Tesseract's WebAssembly to work.

## Notes

- First scan may take ~3–5s while Tesseract downloads its language model (~10MB, cached after first load)
- Subsequent scans are fast (~1–3s depending on image complexity)
- For best OCR results: good lighting, label fills most of the frame, text is in focus

**Not medical advice. For educational use only.**
