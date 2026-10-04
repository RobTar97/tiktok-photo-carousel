#!/usr/bin/env node
/**
 * build.js - deck.json (+ analysis.json, + brand kit, + presets) -> one
 * self-contained carousel.html that opens straight off the filesystem.
 *
 *   node scripts/build.js --deck work/deck.json --out work/carousel.html
 *
 * Options:
 *   --deck      the deck (required)
 *   --out       output html (default: next to the deck, carousel.html)
 *   --analysis  analysis.json from scripts/analyze.py (default: beside the deck)
 *   --brand     brand kit to merge under the deck's own theme
 *   --photos    photo folder, if deck.photos is not set
 *   --strict    exit non-zero when the copy lint finds an error
 *   --caption   caption.md to lint (default: caption.md beside the deck)
 *   --watch     serve the studio on localhost and rebuild on every change
 *   --port      port for --watch (default 4173)
 *
 * Theme layering, lowest first: preset < brand kit < deck.theme < slide.
 *
 * Everything the page needs is inlined except the photos, which stay as
 * relative <img src> so the file stays small and originals are never
 * re-encoded. Photo grids for code-drawn art are inlined only for photos
 * the deck actually uses.
 */
const fs = require("fs");
const path = require("path");

/* --- args ------------------------------------------------------------- */
function argv(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  if (i < 0) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
const deckPath = argv("deck");
if (!deckPath || deckPath === true) {
  console.error("usage: node scripts/build.js --deck <deck.json> [--out <carousel.html>]");
  process.exit(1);
}
const deckDir = path.dirname(path.resolve(deckPath));
const outPath = path.resolve(argv("out", path.join(deckDir, "carousel.html")));
const HERE = path.resolve(__dirname, "..");
const strict = argv("strict", false) === true;

const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, ""));

const deck = readJSON(deckPath);
deck.slides = deck.slides || [];
const analysisPath = argv("analysis", path.join(deckDir, "analysis.json"));
const analysis = fs.existsSync(analysisPath) ? readJSON(analysisPath) : {};
const brandArg = argv("brand");
const brand = brandArg && brandArg !== true ? readJSON(path.resolve(brandArg)) : null;

const warnings = [];
const errors = [];

/* --- presets ------------------------------------------------------------
   A preset is a complete ready-made look: fonts, colours, texture, the art
   each slide gets, and a little CSS. deck.theme.preset picks one for the
   deck; slide.preset picks one for a single slide (concept boards use that
   to put three looks side by side).                                      */
function loadPreset(name) {
  const file = /\.json$/i.test(name)
    ? path.resolve(deckDir, name)
    : path.join(HERE, "presets", name + ".json");
  if (!fs.existsSync(file)) {
    const have = fs.readdirSync(path.join(HERE, "presets"))
      .filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
    errors.push(`unknown preset "${name}" - available: ${have.join(", ")}`);
    return null;
  }
  const p = readJSON(file);
  p.name = p.name || path.basename(file, ".json");
  return p;
}
const presetNames = new Set();
const deckTheme = deck.theme || {};
if (deckTheme.preset) presetNames.add(deckTheme.preset);
deck.slides.forEach((s) => s.preset && presetNames.add(s.preset));
const presets = {};
presetNames.forEach((n) => { const p = loadPreset(n); if (p) presets[n] = p; });

/* --- theme: preset < brand kit < the deck's own choices --------------- */
const base = deckTheme.preset && presets[deckTheme.preset] ? presets[deckTheme.preset].theme || {} : {};
const theme = Object.assign({}, base, brand ? (brand.theme || brand) : {}, deckTheme);
delete theme.preset;
deck.theme = theme;
if (brand && brand.rules) deck.brandRules = brand.rules;
deck.presets = {};
Object.keys(presets).forEach((n) => {
  deck.presets[n] = { name: n, theme: presets[n].theme || {}, art: presets[n].art || {} };
});
if (deckTheme.preset && presets[deckTheme.preset]) deck.preset = deck.presets[deckTheme.preset];

/* If no palette was chosen, take it from the photo on slide 1. The deck
   then sits in the same colour world as the photography. */
if (!theme.palette) {
  const first = (deck.slides.find((s) => s.photo) || {}).photo;
  if (first && analysis[first]) theme.palette = analysis[first].palette;
}
if (!deck.seed) deck.seed = deck.title || "deck";

/* --- photo base: relative path from the html to the photo folder ------ */
// A relative path in the deck is relative to the deck file, not to wherever
// the command happened to be run from.
const photosArg = argv("photos");
const photosDir = path.resolve(deckDir, photosArg && photosArg !== true ? photosArg : deck.photos || "photos");
let rel = path.relative(path.dirname(outPath), photosDir).split(path.sep).join("/");
if (rel && !rel.endsWith("/")) rel += "/";
deck.photoBase = deck.photoBase != null ? deck.photoBase : rel;

/* --- per-slide defaults from the photo analysis ----------------------- */
deck.grids = {};
deck.slides.forEach((s, i) => {
  s.pos = s.pos || "upper";
  const used = [].concat(s.photo || [], s.photos || []);
  used.forEach((p) => {
    if (!fs.existsSync(path.join(photosDir, p))) warnings.push(`slide ${i + 1}: photo not found - ${p}`);
    else if (Object.keys(analysis).length && !analysis[p]) warnings.push(`slide ${i + 1}: "${p}" is not in analysis.json - run analyze.py again`);
  });
  const a = s.photo ? analysis[s.photo] : null;
  if (!a) return;

  const band = a.bands[s.pos] || a.bands.upper;
  if (s.scrim == null) s.scrim = band.scrim;
  if (s.shadow == null) s.shadow = band.needsShadow;
  if (!s.focus) s.focus = a.focus;
  if (s.template === "duotone-poster" && !s.duotone) {
    s.duotone = a.duotone || [a.palette[0], a.palette[2] || a.palette[1]];
  }
  if (a.grid) deck.grids[s.photo] = a.grid;     // for code-drawn art
});

/* --- fonts ---------------------------------------------------------------
   A theme that lists googleFonts gets exactly those (presets do, so an
   italic is a real italic and a single-weight face is asked for once).
   Anything else is derived from the family names in use.                */
function familyOf(css) {
  return css ? String(css).split(",")[0].replace(/['"]/g, "").trim() : "";
}
const GENERIC = /^(system-ui|ui-|serif|sans-serif|monospace|cursive|Georgia|Times New Roman)/;
function fontsTag() {
  if (theme.fontLink) return theme.fontLink;
  if (theme.fontSource === "local" || theme.fontSource === "none") return "";
  const specs = new Map();                       // family -> query fragment
  const addSpec = (spec) => {
    const fam = spec.split(":")[0].trim();
    if (!specs.has(fam)) specs.set(fam, spec.trim());
  };
  const addFam = (css, weights) => {
    const fam = familyOf(css);
    if (!fam || GENERIC.test(fam) || specs.has(fam)) return;
    specs.set(fam, fam + ":wght@" + weights);
  };
  const fromTheme = (t) => {
    if (!t) return;
    (t.googleFonts || []).forEach(addSpec);
    addFam(t.display, "400;600;700;800;900");
    addFam(t.text, "300;400;500;600");
    addFam(t.hand, "400;700");
    addFam(t.mono, "400;700");
  };
  fromTheme(theme);
  Object.values(deck.presets).forEach((p) => fromTheme(p.theme));
  deck.slides.forEach((s) => s.fonts && fromTheme(s.fonts));
  if (!specs.size) return "";
  const q = [...specs.values()].map((v) => "family=" + v.replace(/ /g, "+")).join("&");
  return (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' + q + '&display=swap">'
  );
}

/* --- copy lint: TikTok fit -----------------------------------------------
   Photo mode auto-advances every few seconds and most people read on a
   phone at arm's length. These are mechanical checks; the judgement of
   whether a hook is any good lives in references/hooks.md.              */
const words = (s) => String(s || "").replace(/\*|\/\//g, " ").trim().split(/\s+/).filter(Boolean);
const FILLER = ["amazing", "must-see", "must see", "hidden gem", "unlock", "elevate", "seamless",
  "unleash", "game-changer", "game changer", "next-level", "next level", "breathtaking",
  "stunning", "incredible", "you won't believe", "insane", "ultimate"];
const CLAIMS = /\b(best|#1|number one|most|top \d+|only|never|always|everyone|nobody)\b/i;
const LOUD = ["duotone-poster", "sticker-chaos", "dreamcore-glow"];

function lintCopy() {
  const n = deck.slides.length;
  const lint = [];
  const ja = /^ja/.test(deck.lang || "");
  // A concept board is several decks' openers side by side, not a deck:
  // judge each slide's copy, skip the rules about the deck as a whole.
  const board = deck.board === true;
  if (!board && n < 3) lint.push(["warn", `only ${n} slide(s) - a carousel needs at least 3 to earn a swipe`]);
  if (!board && n > 35) lint.push(["error", `${n} slides - TikTok photo mode takes at most 35`]);
  else if (!board && n > 12) lint.push(["warn", `${n} slides - swipe-through drops off past ~10; cut or split into a part 2`]);

  const first = deck.slides[0] || {};
  if (!board && !/^cover/.test(first.template || "")) {
    lint.push(["warn", `slide 1 is "${first.template}" - the first image is the cover and the profile grid crops it to 1:1; use the cover template`]);
  }
  const hook = words(first.text);
  if (!ja && hook.length > 12) lint.push(["error", `hook is ${hook.length} words - keep it under 9 so it reads before the thumb moves`]);
  else if (!ja && hook.length > 9) lint.push(["warn", `hook is ${hook.length} words - aim for 5-9`]);
  if (ja && String(first.text || "").replace(/\*|\s|\/\//g, "").length > 20) {
    lint.push(["warn", `hook is ${String(first.text).replace(/\*|\s|\/\//g, "").length} characters - Japanese hooks read best under ~16`]);
  }

  let ctas = 0, loud = 0;
  const never = ((deck.brandRules && deck.brandRules.never) || []).map((w) => w.toLowerCase());
  deck.slides.forEach((s, i) => {
    const at = `slide ${i + 1}`;
    const all = [s.kicker, s.text, s.sub, s.cta].filter(Boolean).join(" ");
    const count = ja ? all.replace(/\s|\*|\/\//g, "").length / 2.5 : words(all).length;
    // ~4 words a second on a phone; photo mode moves on after 3-5 seconds.
    if (count > 18) lint.push(["error", `${at}: ~${Math.round(count)} words - nobody reads that before it advances; split the slide`]);
    else if (count > 14) lint.push(["warn", `${at}: ~${Math.round(count)} words - tight for a 3-4 second slide`]);
    const marks = (String(s.text || "").match(/\*[^*]+\*/g) || []).length;
    if (marks > 1) lint.push(["warn", `${at}: ${marks} highlights - one per slide, or none of them stands out`]);
    if (s.cta || s.role === "cta") ctas++;
    if (LOUD.indexOf(s.template) >= 0) loud++;
    if (!board && i > 0 && s.template === deck.slides[i - 1].template) {
      lint.push(["warn", `${at}: same template as the slide before - neighbours should differ`]);
    }
    const low = all.toLowerCase();
    FILLER.concat(never).forEach((w) => {
      if (w && low.indexOf(w) >= 0) lint.push(["warn", `${at}: "${w}" - filler or a word the brand avoids`]);
    });
    const claim = all.match(CLAIMS);
    if (claim && s.role !== "cta") {
      lint.push(["info", `${at}: "${claim[0]}" is a claim - fine if the user said it, otherwise cut it`]);
    }
  });
  if (!board && ctas > 1) lint.push(["warn", `${ctas} calls to action - keep one, on the last slide`]);
  if (!board && loud > 3) lint.push(["warn", `${loud} loud templates - more than three and none of them is loud any more`]);
  return lint;
}
const lint = lintCopy();
lint.forEach(([lvl, msg]) => {
  if (lvl === "error") errors.push(msg);
  else if (lvl === "warn") warnings.push(msg);
});

/* --- assemble --------------------------------------------------------- */
const shell = fs.readFileSync(path.join(HERE, "html", "shell.html"), "utf8");
const presetCss = Object.values(presets)
  .filter((p) => p.css)
  .map((p) => `/* === PRESET: ${p.name} === */\n${p.css}`)
  .join("\n");
const css = fs.readFileSync(path.join(HERE, "html", "templates.css"), "utf8") +
  (presetCss ? "\n\n" + presetCss : "");
const js = fs.readFileSync(path.join(HERE, "html", "art.js"), "utf8") + "\n" +
  fs.readFileSync(path.join(HERE, "html", "engine.js"), "utf8");

const meta =
  deck.slides.length + " slides · " +
  (deck.preset ? deck.preset.name + " · " : "") +
  [...new Set(deck.slides.map((s) => s.template))].join(" · ");

const html = shell
  .replace(/\{\{LANG\}\}/g, deck.lang || "en")
  .replace(/\{\{TITLE\}\}/g, (deck.title || "Carousel").replace(/[<&]/g, ""))
  .replace(/\{\{META\}\}/g, meta.replace(/[<&]/g, ""))
  .replace("{{FONTS}}", fontsTag())
  .replace("{{CSS}}", () => css)
  .replace("{{JS}}", () => js)
  // JSON goes in last and literally: a $& or $1 in the copy must not be
  // treated as a replacement pattern, and </script> in copy must not end
  // the script block.
  .replace("{{DECK}}", () => JSON.stringify(deck).replace(/<\/script/gi, "<\\/script"));

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, "utf8");

console.log("built  " + outPath);
console.log("       " + meta);
console.log("       photos: " + (deck.photoBase || "./") +
  (Object.keys(deck.grids).length ? "  (" + Object.keys(deck.grids).length + " photo grid(s) for art)" : ""));

const show = (label, rows) => {
  if (!rows.length) return;
  console.log("\n" + label + ":");
  rows.forEach((r) => console.log("  " + r));
};
show("errors", errors.map((e) => "X " + e));
show("warnings", warnings.map((w) => "! " + w));
show("notes", lint.filter((l) => l[0] === "info").map((l) => "- " + l[1]));
if (strict && errors.length) process.exit(2);

/* --- caption lint ---------------------------------------------------------
   caption.md next to the deck (or --caption) gets the same scrutiny as the
   slides. Only the caption itself is checked - the part above the first
   "---" - not the pinned comment or notes beneath it.                     */
function lintCaption() {
  const capArg = argv("caption");
  const capPath = capArg && capArg !== true ? path.resolve(capArg) : path.join(deckDir, "caption.md");
  if (!fs.existsSync(capPath)) return [];
  const raw = fs.readFileSync(capPath, "utf8").replace(/^﻿/, "");
  const body = raw.split(/\n-{3,}\s*\n/)[0]
    .split("\n").filter((l) => !/^\s*#{1,6}\s/.test(l)).join("\n").trim();
  const out = [];
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || "";
  const tags = body.match(/(^|\s)#[^\s#]+/g) || [];
  if (body.length > 4000) out.push(["error", `caption is ${body.length} characters - TikTok's limit is 4,000`]);
  if (first.length > 100) out.push(["warn", `caption's first line is ${first.length} characters - most people only see the first line before "more"`]);
  if (/#/.test(first)) out.push(["warn", "caption opens with a hashtag - lead with the hook and its search keyword"]);
  if (tags.length && (tags.length < 3 || tags.length > 5)) out.push(["warn", `${tags.length} hashtags - 3-5 that match the photos beat a wall of them`]);
  if (!tags.length) out.push(["info", "caption has no hashtags - 3-5 specific ones help search"]);
  const ctas = (body.toLowerCase().match(/\b(save (this|it)|send (this|it)|follow|comment|share this|link in bio)\b/g) || []);
  if (ctas.length > 1) out.push(["warn", `caption asks for ${ctas.length} things (${ctas.join(", ")}) - one call to action, the same as the last slide`]);
  const never = ((deck.brandRules && deck.brandRules.never) || []).map((w) => w.toLowerCase());
  FILLER.concat(never).forEach((w) => {
    if (w && body.toLowerCase().indexOf(w) >= 0) out.push(["warn", `caption: "${w}" - filler or a word the brand avoids`]);
  });
  return out;
}
lintCaption().forEach(([lvl, msg]) => {
  if (lvl === "error") { errors.push(msg); console.log("  X " + msg); }
  else if (lvl === "warn") { warnings.push(msg); console.log("  ! " + msg); }
  else console.log("  - " + msg);
});
if (strict && errors.length) process.exit(2);

/* --- live reload -----------------------------------------------------------
   --watch serves the studio on localhost and rebuilds whenever the deck, a
   preset or the engine changes; the open page reloads itself and keeps its
   scroll position, verdicts and notes. Bound to 127.0.0.1, read-only, and
   only the folder holding both the page and the photos is served.          */
if (argv("watch", false) !== false) {
  const http = require("http");
  const { spawn } = require("child_process");
  const portArg = argv("port");
  const port = portArg && portArg !== true ? parseInt(portArg, 10) : 4173;

  const a = path.dirname(outPath).split(path.sep), b = photosDir.split(path.sep);
  let i = 0;
  while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++;
  const root = a.slice(0, i).join(path.sep) + path.sep;
  const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
    ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".svg": "image/svg+xml", ".gif": "image/gif" };
  const clients = new Set();

  http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (url === "/__live") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      res.write("retry: 1000" + String.fromCharCode(10, 10));
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    const file = path.normalize(path.join(root, url));
    if (!file.toLowerCase().startsWith(root.toLowerCase()) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end("not found"); return;
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  }).listen(port, "127.0.0.1", () => {
    const rel = path.relative(root, outPath).split(path.sep).map(encodeURIComponent).join("/");
    console.log("\nlive  http://localhost:" + port + "/" + rel);
    console.log("      rebuilding on changes to the deck, presets and engine - Ctrl+C to stop");
  });

  const rebuildArgs = process.argv.slice(2).filter((x, k, all) =>
    x !== "--watch" && x !== "--port" && all[k - 1] !== "--port");
  let timer = null, busy = false;
  const rebuild = (why) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (busy) return rebuild(why);
      busy = true;
      const p = spawn(process.execPath, [__filename].concat(rebuildArgs), { stdio: ["ignore", "pipe", "pipe"] });
      let log = "";
      p.stdout.on("data", (d) => (log += d)); p.stderr.on("data", (d) => (log += d));
      p.on("close", (code) => {
        busy = false;
        const issues = log.split(String.fromCharCode(10)).filter((l) => /^\s+[X!]/.test(l));
        console.log("rebuilt (" + why + ")" + (code ? "  - FAILED" : "") + (issues.length ? "  " + issues.length + " lint issue(s)" : ""));
        issues.forEach((l) => console.log(l));
        clients.forEach((c) => c.write("data: reload" + String.fromCharCode(10, 10)));
      });
    }, 150);
  };
  const watchList = [[deckPath, "deck"], [path.join(HERE, "presets"), "preset"], [path.join(HERE, "html"), "engine"]];
  if (brandArg && brandArg !== true) watchList.push([path.resolve(brandArg), "brand kit"]);
  watchList.forEach(([target, why]) => {
    try { fs.watch(target, () => rebuild(why)); } catch (e) { /* missing folder: nothing to watch */ }
  });
}
