// Copies the OCR engine files (tesseract.js worker, WASM core, English data)
// into public/ocr so the admin's screenshot splitter can run without any
// outside server. Runs after `npm install`; skips quietly if a package is missing.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "public", "ocr");

function copy(from, to) {
  if (!fs.existsSync(from)) {
    console.warn(`[ocr] missing ${path.relative(root, from)} - skipped`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

copy(path.join(root, "node_modules/tesseract.js/dist/worker.min.js"), path.join(out, "worker.min.js"));

const coreDir = path.join(root, "node_modules/tesseract.js-core");
if (fs.existsSync(coreDir)) {
  for (const file of fs.readdirSync(coreDir)) {
    if (/^tesseract-core.*-lstm\.wasm\.js$/.test(file)) copy(path.join(coreDir, file), path.join(out, "core", file));
  }
}

copy(
  path.join(root, "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"),
  path.join(out, "lang", "eng.traineddata.gz")
);
