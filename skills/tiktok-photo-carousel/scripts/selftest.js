#!/usr/bin/env node
/**
 * selftest.js - end-to-end check of the HTML engine.
 *
 *   node scripts/selftest.js
 *
 * Renders every template once over generated placeholder photos, exports
 * them, and asserts each slide came out at exactly 1080x1920 with nothing
 * under TikTok's interface. Prints "OK" or the first failure.
 *
 * No bundled test images: the placeholders are drawn in the browser that is
 * already needed for the export.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const HERE = path.resolve(__dirname, "..");
const TMP = path.join(HERE, ".selftest");
const PHOTOS = path.join(TMP, "photos");
const OUT = path.join(TMP, "out");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  fail("Playwright is missing. Run: npm install && npx playwright install chromium");
}

function fail(msg) {
  console.error("FAIL: " + msg);
  process.exit(1);
}

/* PNG dimensions live in the IHDR chunk, bytes 16-24. */
function pngSize(file) {
  const b = fs.readFileSync(file).subarray(0, 24);
  if (b.toString("ascii", 1, 4) !== "PNG") fail(file + " is not a PNG");
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

/* Every template, each exercised with the fields it actually needs. */
const SLIDES = [
  { template: "full-bleed-hook", photo: "a.png", text: "A *hook* that fits", sub: "and a second line" },
  { template: "duotone-poster", photo: "b.png", text: "Goes vertical", pos: "top" },
  { template: "torn-reveal", photo: "c.png", text: "Torn open", sub: "paper over photo" },
  { template: "editorial-split", photo: "a.png", kicker: "01", text: "Editorial split", sub: "A colour block holds the copy." },
  { template: "arch-window", photo: "b.png", text: "Arch window", sub: "calm and premium" },
  { template: "frosted-card", photo: "c.png", kicker: "02", text: "Frosted card", sub: "the photo becomes atmosphere" },
  { template: "film-strip", photos: ["a.png", "b.png", "c.png"], text: "Film strip" },
  { template: "notes-card", photo: "a.png", noteLabel: "go at", text: "16:40", sub: "a single concrete fact" },
  { template: "polaroid-stack", photo: "b.png", photos: ["b.png", "c.png"], text: "polaroid stack" },
  { template: "sticker-chaos", photo: "c.png", text: "sticker chaos", stickers: [{ text: "here", x: 0.6, y: 0.5, rot: -8 }] },
  { template: "dreamcore-glow", photo: "a.png", text: "Dreamcore glow", sub: "bloom and haze" },
  { template: "end-card", text: "Save this", sub: "no photo at all", cta: "part 2?" },
  // Japanese, including vertical type - the path most likely to regress.
  { template: "full-bleed-hook", photo: "b.png", text: "大阪に // こんな場所", sub: "誰も教えてくれない" },
  { template: "arch-window", photo: "c.png", text: "海の駅", vertical: true },
];

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(PHOTOS, { recursive: true });

  /* --- placeholder photos ------------------------------------------- */
  const browser = await chromium.launch();
  const painter = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const grounds = {
    "a.png": "linear-gradient(160deg,#1b3a8f,#c8102e 60%,#f2b705)",
    "b.png": "linear-gradient(20deg,#0b1020,#4a5a7a 50%,#e8e2d6)",
    "c.png": "radial-gradient(60% 50% at 40% 35%,#fff0c4,#8a4f2a 70%,#201008)",
  };
  for (const [name, bg] of Object.entries(grounds)) {
    await painter.setContent(
      `<body style="margin:0"><div style="width:1600px;height:1200px;background:${bg}"></div></body>`
    );
    await painter.screenshot({ path: path.join(PHOTOS, name) });
  }
  await browser.close();

  /* --- deck ---------------------------------------------------------- */
  const deck = {
    title: "selftest",
    photos: "./photos",
    theme: {
      display: "Bricolage Grotesque",
      text: "Zen Kaku Gothic New",
      hand: "Caveat",
      mono: "Space Mono",
      accent: "#f2b705",
      highlight: "marker",
    },
    slides: SLIDES,
  };
  fs.writeFileSync(path.join(TMP, "deck.json"), JSON.stringify(deck, null, 2));

  /* --- build + export ------------------------------------------------ */
  const run = (script, args) => {
    const r = spawnSync(process.execPath, [path.join(HERE, "scripts", script), ...args], {
      encoding: "utf8",
    });
    if (r.status !== 0) fail(script + " exited " + r.status + "\n" + (r.stderr || r.stdout));
    return r.stdout;
  };

  run("build.js", ["--deck", path.join(TMP, "deck.json"), "--out", path.join(TMP, "carousel.html")]);
  run("export.js", ["--html", path.join(TMP, "carousel.html"), "--out", OUT, "--no-contact"]);

  /* --- assertions ---------------------------------------------------- */
  const report = JSON.parse(fs.readFileSync(path.join(OUT, "_report.json"), "utf8"));

  if (report.pageErrors.length) fail("page errors: " + report.pageErrors.join("; "));
  if (report.slides.length !== SLIDES.length) {
    fail("expected " + SLIDES.length + " slides, got " + report.slides.length);
  }
  for (const name of report.slides) {
    const [w, h] = pngSize(path.join(OUT, name));
    if (w !== 1080 || h !== 1920) fail(name + " is " + w + "x" + h + ", expected 1080x1920");
  }
  if (report.issues.length) {
    report.issues.forEach((i) =>
      console.error(`  ! slide ${i.slide} ${i.el} ${i.reason} [${i.overlap}] "${i.text}"`)
    );
    fail(report.issues.length + " safe-zone issue(s) in the template set");
  }

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log("OK - " + SLIDES.length + " slides, all templates, 1080x1920, safe zones clear");
})().catch((e) => fail(String(e && e.stack ? e.stack : e)));
