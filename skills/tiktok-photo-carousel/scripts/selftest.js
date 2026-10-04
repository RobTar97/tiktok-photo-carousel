#!/usr/bin/env node
/**
 * selftest.js - end-to-end check of the whole skill.
 *
 *   node scripts/selftest.js
 *
 * Draws placeholder photos in the browser (no bundled images), then:
 *   1. analyse them (python + Pillow)               -> grids for art
 *   2. render every template, preset and generator   -> 1080x1920, safe zones clear
 *   3. audit the pixels, with --fix, until clean     -> contrast and size floors hold
 *   4. drive the studio like a reviewer              -> verdicts, edits, play mode
 *   5. merge the edits with apply-edits.js           -> copy lands in the deck
 *   6. pull frames from a generated clip             -> if ffmpeg is installed
 *
 * Prints OK or the first failure. Steps that need a missing tool are skipped
 * and named, never silently passed.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const HERE = path.resolve(__dirname, "..");
const TMP = path.join(HERE, ".selftest");
const PHOTOS = path.join(TMP, "photos");
const OUT = path.join(TMP, "out");
const skipped = [];

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
function step(msg) { process.stdout.write("  " + msg + "\n"); }

function pngSize(file) {
  const b = fs.readFileSync(file).subarray(0, 24);
  if (b.toString("ascii", 1, 4) !== "PNG") fail(file + " is not a PNG");
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
function findPython() {
  for (const c of ["python3", "python"]) {
    const r = spawnSync(c, ["-c", "import PIL"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  return null;
}
function run(cmd, args, label) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) fail(label + " exited " + r.status + "\n" + (r.stderr || r.stdout));
  return r.stdout;
}
const node = (script, args) => run(process.execPath, [path.join(HERE, "scripts", script), ...args], script);

/* --- every template, with the fields it actually needs --------------- */
const TEMPLATES = [
  { template: "cover", role: "cover", photo: "a.png", kicker: "osaka", text: "The *cover* slide", sub: "survives the grid crop" },
  { template: "full-bleed-hook", photo: "b.png", kicker: "look up", text: "A hook that fits", sub: "and a second line" },
  { template: "duotone-poster", photo: "c.png", text: "Goes vertical", pos: "top" },
  { template: "torn-reveal", photo: "a.png", text: "Torn open", sub: "paper over photo" },
  { template: "editorial-split", photo: "b.png", kicker: "01", text: "Editorial split", sub: "A block holds the copy." },
  { template: "arch-window", photo: "c.png", text: "Arch window", sub: "calm and premium" },
  { template: "frosted-card", photo: "a.png", kicker: "02", text: "Frosted card", sub: "photo as atmosphere" },
  { template: "film-strip", photos: ["a.png", "b.png", "c.png"], text: "Film strip" },
  { template: "notes-card", photo: "b.png", noteLabel: "go at", text: "16:40", sub: "a concrete fact" },
  { template: "polaroid-stack", photo: "c.png", photos: ["c.png", "a.png"], text: "polaroid stack" },
  { template: "sticker-chaos", photo: "a.png", text: "sticker chaos", stickers: [{ text: "here", x: 0.6, y: 0.5 }] },
  { template: "dreamcore-glow", photo: "b.png", text: "Dreamcore glow", sub: "bloom and haze" },
  { template: "index-card", photo: "c.png", edgeLabel: "west side", text: "Index card", sub: "a tab on a rule" },
  { template: "quote-pull", photo: "a.png", text: "The line is the subject here", sub: "slide nine" },
  { template: "diagonal-split", photo: "b.png", text: "Diagonal split", sub: "copy in the wedge" },
  { template: "caption-bar", photo: "c.png", text: "A lower third, like a subtitle" },
  { template: "compare", photos: ["a.png", "c.png"], labels: ["before", "after"], text: "Two frames" },
  { template: "bento", photos: ["a.png", "b.png", "c.png", "a.png"], labels: ["mon", "", "", "thu"], text: "One week, four frames" },
  { template: "end-card", text: "Save this", sub: "no photo at all", cta: "save" },
  // Japanese, including vertical type - the path most likely to regress.
  { template: "full-bleed-hook", photo: "b.png", text: "大阪に // こんな場所", sub: "誰も教えてくれない" },
  { template: "arch-window", photo: "c.png", text: "海の駅", vertical: true },
];

const PRESETS = fs.readdirSync(path.join(HERE, "presets")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

const ART = [
  { type: "contour", over: true, opacity: 0.6 }, { type: "halftone", replace: true },
  { type: "ascii", replace: true, ground: "bg" }, { type: "dither", replace: true, ground: "bg" },
  { type: "mosaic", reveal: { at: [0.5, 0.5], w: 0.6, h: 0.4 } },
  { type: "flowfield", opacity: 0.3 }, { type: "rings", opacity: 0.3 }, { type: "rays", opacity: 0.1 },
  { type: "grid", opacity: 0.3, crosses: true }, { type: "dimension", label: "selftest" },
  { type: "rough", kind: "circle", target: "mark" }, { type: "rough", kind: "underline", target: "headline" },
  { type: "rough", kind: "arrow", fromTarget: "sub" }, { type: "route", opacity: 0.8 },
  { type: "badge", text: "SELF TEST" }, { type: "hanko", text: "試験" }, { type: "tape" },
  { type: "sparkles" }, { type: "lightleak", opacity: 0.4 }, { type: "blobs", opacity: 0.3 }, { type: "fibres" },
];

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(PHOTOS, { recursive: true });

  /* --- placeholder photos, drawn by the browser ------------------------ */
  const browser = await chromium.launch();
  const painter = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const grounds = {
    "a.png": "linear-gradient(160deg,#1b3a8f,#c8102e 60%,#f2b705)",
    "b.png": "radial-gradient(40% 30% at 30% 60%,#e8e2d6,transparent),linear-gradient(20deg,#0b1020,#4a5a7a 50%,#c9c2b6)",
    "c.png": "repeating-linear-gradient(90deg,#201008 0 60px,#8a4f2a 60px 120px),radial-gradient(60% 50% at 40% 35%,#fff0c4,#201008)",
  };
  for (const [name, bg] of Object.entries(grounds)) {
    await painter.setContent(`<body style="margin:0"><div style="width:1600px;height:1200px;background:${bg}"></div></body>`);
    await painter.screenshot({ path: path.join(PHOTOS, name) });
  }
  await browser.close();
  step("placeholder photos drawn");

  /* --- 1. analyse ------------------------------------------------------- */
  const py = findPython();
  const analysis = path.join(TMP, "analysis.json");
  if (py) {
    run(py, [path.join(HERE, "scripts", "analyze.py"), "--photos", PHOTOS, "--out", analysis], "analyze.py");
    step("analysed (grids for art)");
  } else {
    skipped.push("analysis, photo-derived art and the audit (no python with Pillow)");
  }

  /* --- 2. one deck: every template, every preset, every generator ------- */
  const slides = [];
  TEMPLATES.forEach((t) => slides.push(Object.assign({ group: "templates" }, t)));
  PRESETS.forEach((p) => {
    slides.push({ group: "presets", preset: p, template: "cover", photo: "a.png", text: "Preset *" + p + "*", sub: "cover in this look" });
    slides.push({ group: "presets", preset: p, template: "editorial-split", photo: "b.png", kicker: "look", text: "A build slide", sub: "in " + p });
  });
  ART.forEach((a) => slides.push({
    // A pen mark crosses the letters it annotates, so it has to be a colour
    // white type reads against - the audit flags a pale one, correctly.
    group: "art", template: "full-bleed-hook", photo: "c.png", art: [a], accent: "#D7263D",
    text: "Art: *" + a.type + "*", sub: a.kind || "generator",
  }));
  const deck = {
    title: "selftest", photos: "./photos", board: true, seed: "selftest",
    theme: { display: "Bricolage Grotesque", text: "Zen Kaku Gothic New", hand: "Caveat", mono: "Space Mono",
             accent: "#f2b705", highlight: "marker", seal: "試験" },
    slides,
  };
  const deckPath = path.join(TMP, "deck.json");
  fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2));
  const html = path.join(TMP, "carousel.html");
  const buildArgs = ["--deck", deckPath, "--out", html].concat(py ? ["--analysis", analysis] : []);
  node("build.js", buildArgs.concat(["--strict"]));
  node("export.js", ["--html", html, "--out", OUT, "--no-contact"]);

  const report = JSON.parse(fs.readFileSync(path.join(OUT, "_report.json"), "utf8"));
  if (report.pageErrors.length) fail("page errors: " + report.pageErrors.join("; "));
  if (report.slides.length !== slides.length) fail(`expected ${slides.length} slides, got ${report.slides.length}`);
  for (const name of report.slides) {
    const [w, h] = pngSize(path.join(OUT, name));
    if (w !== 1080 || h !== 1920) fail(`${name} is ${w}x${h}, expected 1080x1920`);
  }
  if (report.issues.length) {
    report.issues.forEach((i) => console.error(`  ! slide ${i.slide} ${i.el} ${i.reason} [${i.overlap}] "${i.text}"`));
    fail(report.issues.length + " safe-zone issue(s)");
  }
  const up = path.join(OUT, "upload");
  if (fs.readdirSync(up).length !== slides.length) fail("upload/ does not hold one JPEG per slide");
  step(`${slides.length} slides: ${TEMPLATES.length} template cases, ${PRESETS.length} presets, ${ART.length} generators - 1080x1920, safe zones clear, upload/ written`);

  /* --- 3. audit, fixing until clean ------------------------------------- */
  if (py) {
    let clean = false, last = "";
    for (let round = 1; round <= 4 && !clean; round++) {
      const r = spawnSync(py, [path.join(HERE, "scripts", "audit.py"), "--out", OUT, "--fix", deckPath], { encoding: "utf8" });
      last = r.stdout || "";
      clean = !/^FAIL/m.test(last);
      if (!clean) {
        node("build.js", buildArgs);
        node("export.js", ["--html", html, "--out", OUT, "--no-contact", "--no-upload"]);
      }
    }
    if (!clean) {
      console.error(last.split("\n").filter((l) => /^\s*X|FAIL/.test(l)).join("\n"));
      fail("readability audit still failing after --fix");
    }
    step("readability audit clean (contrast >= 3:1 everywhere, size floors held)");
  }

  /* --- 4. the studio, driven like a reviewer ---------------------------- */
  const b2 = await chromium.launch();
  const page = await b2.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto("file:///" + html.replace(/\\/g, "/"));
  await page.waitForSelector('body[data-ready="1"]');
  await page.waitForFunction(() => window.CAROUSEL && window.CAROUSEL.toggle);
  await page.click('.review[data-index="0"] [data-v="keep"]');
  await page.click('.review[data-index="1"] [data-v="change"]');
  await page.fill('.review[data-index="1"] textarea', "selftest note");
  await page.evaluate(() => {
    window.CAROUSEL.slides[2].querySelector(".headline").innerHTML = "Goes <mark>sideways</mark>";
  });
  const edits = await page.evaluate(() => window.CAROUSEL.collectEdits(true));
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press("p");
  await page.waitForSelector(".play .play-slot .slide", { timeout: 5000 }).catch(() => fail("play mode did not open"));
  await page.keyboard.press("ArrowRight");
  const now = await page.evaluate(() => [].indexOf.call(document.querySelectorAll(".play-bars i"), document.querySelector(".play-bars i.now")));
  await page.keyboard.press("Escape");
  const closed = await page.evaluate(() => !document.querySelector(".play"));
  await b2.close();
  if (errs.length) fail("studio errors: " + errs.join("; "));
  if (!edits.approved || edits.slides[0].status !== "keep" || edits.slides[1].status !== "change" ||
      edits.slides[1].note !== "selftest note" || edits.slides[2].text !== "Goes *sideways*") {
    fail("studio edits came back wrong: " + JSON.stringify(edits.slides.slice(0, 3)));
  }
  if (now !== 1 || !closed) fail("play mode did not advance or close");
  step("studio: verdicts, notes, inline edit, approve, play mode");

  /* --- 5. apply-edits round trip ---------------------------------------- */
  const editsPath = path.join(TMP, "edits.json");
  fs.writeFileSync(editsPath, JSON.stringify(edits));
  const outText = node("apply-edits.js", ["--deck", deckPath, "--edits", editsPath]);
  const merged = JSON.parse(fs.readFileSync(deckPath, "utf8"));
  if (merged.slides[2].text !== "Goes *sideways*") fail("apply-edits did not write the edited copy");
  if (!/APPROVED/.test(outText) || !/selftest note/.test(outText)) fail("apply-edits summary is missing the verdict or the note");
  step("apply-edits merged the copy and reported the request");

  /* --- 6. frames from video --------------------------------------------- */
  const ff = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (ff.status === 0 && py) {
    const clips = path.join(TMP, "clips");
    fs.mkdirSync(clips, { recursive: true });
    run("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=720x1280:rate=24:duration=3",
                   "-pix_fmt", "yuv420p", path.join(clips, "t.mp4")], "ffmpeg");
    run(py, [path.join(HERE, "scripts", "frames.py"), "--videos", clips, "--out", path.join(TMP, "frames"), "--count", "3"], "frames.py");
    const got = JSON.parse(fs.readFileSync(path.join(TMP, "frames", "_frames.json"), "utf8"));
    if (!got.length) fail("frames.py extracted nothing");
    step(`frames.py pulled ${got.length} frame(s) from a clip`);
  } else {
    skipped.push("video frames (" + (py ? "no ffmpeg" : "no python") + ")");
  }

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log("OK - " + slides.length + " slides, " + TEMPLATES.length + " template cases, " +
    PRESETS.length + " presets, " + ART.length + " generators" +
    (skipped.length ? "  (skipped: " + skipped.join("; ") + ")" : ""));
})().catch((e) => fail(String(e && e.stack ? e.stack : e)));
