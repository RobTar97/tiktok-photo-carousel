#!/usr/bin/env node
/**
 * build.js - deck.json (+ analysis.json, + brand.json) -> one self-contained
 * carousel.html that opens straight off the filesystem.
 *
 *   node scripts/build.js --deck work/deck.json --out work/carousel.html
 *
 * Options:
 *   --deck      the deck (required)
 *   --out       output html (default: next to the deck, carousel.html)
 *   --analysis  analysis.json from scripts/analyze.py (default: beside the deck)
 *   --brand     brand kit to merge under the deck's own theme
 *   --photos    photo folder, if deck.photos is not set
 *
 * Everything the page needs is inlined except the photos themselves, which
 * stay as relative <img src> so the file stays small and the originals are
 * never re-encoded.
 */
const fs = require("fs");
const path = require("path");

/* --- args ------------------------------------------------------------- */
function argv(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const deckPath = argv("deck");
if (!deckPath) {
  console.error("usage: node scripts/build.js --deck <deck.json> [--out <carousel.html>]");
  process.exit(1);
}
const deckDir = path.dirname(path.resolve(deckPath));
const outPath = path.resolve(argv("out", path.join(deckDir, "carousel.html")));
const HERE = path.resolve(__dirname, "..");

const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, ""));

const deck = readJSON(deckPath);
const analysisPath = argv("analysis", path.join(deckDir, "analysis.json"));
const analysis = fs.existsSync(analysisPath) ? readJSON(analysisPath) : {};
const brand = argv("brand") ? readJSON(path.resolve(argv("brand"))) : null;

/* --- theme: brand kit under the deck's own choices -------------------- */
if (brand) {
  deck.theme = Object.assign({}, brand.theme || brand, deck.theme || {});
  if (brand.rules) deck.brandRules = brand.rules;
}
const theme = (deck.theme = deck.theme || {});

/* If no palette was chosen, take it from the photo on slide 1. The deck
   then sits in the same colour world as the photography. */
if (!theme.palette) {
  const first = (deck.slides.find((s) => s.photo) || {}).photo;
  if (first && analysis[first]) theme.palette = analysis[first].palette;
}

/* --- photo base: relative path from the html to the photo folder ------ */
// A relative path in the deck is relative to the deck file, not to wherever
// the command happened to be run from.
const photosDir = path.resolve(deckDir, argv("photos", deck.photos || "photos"));
let base = path.relative(path.dirname(outPath), photosDir).split(path.sep).join("/");
if (base && !base.endsWith("/")) base += "/";
deck.photoBase = deck.photoBase != null ? deck.photoBase : base;

/* --- per-slide defaults from the photo analysis ----------------------- */
const warnings = [];
deck.slides.forEach((s, i) => {
  s.pos = s.pos || "upper";
  const a = s.photo ? analysis[s.photo] : null;

  if (s.photo && !a && Object.keys(analysis).length) {
    warnings.push(`slide ${i + 1}: "${s.photo}" is not in analysis.json`);
  }
  if (s.photo && !fs.existsSync(path.join(photosDir, s.photo))) {
    warnings.push(`slide ${i + 1}: photo not found - ${s.photo}`);
  }
  if (!a) return;

  const band = a.bands[s.pos] || a.bands.upper;
  if (s.scrim == null) s.scrim = band.scrim;
  if (s.shadow == null) s.shadow = band.needsShadow;
  if (!s.focus) s.focus = a.focus;
  if (s.template === "duotone-poster" && !s.duotone) {
    s.duotone = a.duotone || [a.palette[0], a.palette[2] || a.palette[1]];
  }
});

/* --- fonts: one Google Fonts request for everything the theme uses ---- */
function fontsTag(t) {
  if (t.fontLink) return t.fontLink;                  // caller supplied their own
  if (t.fontSource === "local" || t.fontSource === "none") return "";
  const fams = [];
  const push = (css, weights) => {
    if (!css) return;
    const fam = String(css).split(",")[0].replace(/['"]/g, "").trim();
    if (!fam || /^(system-ui|ui-|serif|sans-serif|monospace|cursive)/.test(fam)) return;
    if (!fams.some((f) => f.fam === fam)) fams.push({ fam, weights });
  };
  push(t.display, "400;600;700;800;900");
  push(t.text, "300;400;500;600");
  push(t.hand, "400;700");
  push(t.mono, "400;700");
  if (!fams.length) return "";
  const q = fams
    .map((f) => "family=" + f.fam.replace(/ /g, "+") + ":wght@" + f.weights)
    .join("&");
  return (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' + q + '&display=swap">'
  );
}

/* --- assemble --------------------------------------------------------- */
const shell = fs.readFileSync(path.join(HERE, "html", "shell.html"), "utf8");
const css = fs.readFileSync(path.join(HERE, "html", "templates.css"), "utf8");
const js = fs.readFileSync(path.join(HERE, "html", "engine.js"), "utf8");

const meta =
  deck.slides.length + " slides · " +
  [...new Set(deck.slides.map((s) => s.template))].join(" · ");

const html = shell
  .replace(/\{\{LANG\}\}/g, deck.lang || "en")
  .replace(/\{\{TITLE\}\}/g, (deck.title || "Carousel").replace(/[<&]/g, ""))
  .replace(/\{\{META\}\}/g, meta)
  .replace("{{FONTS}}", fontsTag(theme))
  .replace("{{CSS}}", css)
  .replace("{{JS}}", js)
  // JSON goes in last and literally: a $& or $1 in the copy must not be
  // treated as a replacement pattern.
  .replace("{{DECK}}", () => JSON.stringify(deck, null, 2));

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, "utf8");

console.log("built  " + outPath);
console.log("       " + meta);
console.log("       photos: " + (deck.photoBase || "./"));
if (warnings.length) {
  console.log("\nwarnings:");
  warnings.forEach((w) => console.log("  ! " + w));
}
