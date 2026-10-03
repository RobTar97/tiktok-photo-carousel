#!/usr/bin/env node
/**
 * export.js - carousel.html -> numbered 1080x1920 slides, plus a safe-zone
 * report and a labelled contact sheet.
 *
 *   node scripts/export.js --html work/carousel.html --out ./out
 *
 * Options:
 *   --html     the built carousel (required)
 *   --out      output folder (default ./out)
 *   --format   png | jpg          (default png)
 *   --quality  jpeg quality        (default 92)
 *   --scale    device scale factor (default 1 -> exactly 1080x1920)
 *   --no-contact   skip the contact sheet
 *   --strict       exit non-zero if any slide collides with TikTok's UI
 *
 * The page is loaded twice: once with ?export=1 for clean slides, once
 * without for the contact sheet, which keeps the slide numbers and template
 * names visible so feedback can name a slide.
 */
const fs = require("fs");
const path = require("path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch (e) {
  console.error("Playwright is missing. Install it with:\n  npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

function argv(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  if (process.argv.includes("--no-" + name)) return false;
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : i > -1
    ? true
    : fallback;
}

const htmlArg = argv("html");
if (!htmlArg || htmlArg === true) {
  console.error("usage: node scripts/export.js --html <carousel.html> [--out ./out]");
  process.exit(1);
}
const htmlPath = path.resolve(htmlArg);
if (!fs.existsSync(htmlPath)) {
  console.error("No such file: " + htmlPath);
  process.exit(1);
}
const outDir = path.resolve(argv("out", "./out"));
const format = String(argv("format", "png")).toLowerCase() === "jpg" ? "jpeg" : "png";
const quality = parseInt(argv("quality", "92"), 10);
const scale = parseFloat(argv("scale", "1"));
const wantContact = argv("contact", true) !== false;
const strict = argv("strict", false) === true;

const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();

  /* --- pass 1: clean slides ------------------------------------------- */
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: scale,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(fileUrl + "?export=1", { waitUntil: "load" });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });

  const report = await page.evaluate(() => window.CAROUSEL.verify());
  const boxes = await page.evaluate(() => window.CAROUSEL.measure());
  const isCover = await page.evaluate(() =>
    window.CAROUSEL.slides.map(
      (s) => s.dataset.template === "cover" || s.dataset.role === "cover"
    )
  );
  const slides = await page.$$(".slide");

  const names = [];
  for (let i = 0; i < slides.length; i++) {
    const name = String(i + 1).padStart(2, "0") + "." + (format === "jpeg" ? "jpg" : "png");
    const opts = { path: path.join(outDir, name), type: format };
    if (format === "jpeg") opts.quality = quality;
    await slides[i].screenshot(opts);
    names.push(name);
    process.stdout.write("  " + name + "\n");
  }

  /* The cover is what people meet first, in the feed and again on the
     profile grid, so it gets its own file rather than being "the first
     one you happen to upload". */
  let coverIdx = isCover.indexOf(true);
  if (coverIdx === -1) coverIdx = 0;
  const coverName = "cover." + (format === "jpeg" ? "jpg" : "png");
  fs.copyFileSync(path.join(outDir, names[coverIdx]), path.join(outDir, coverName));
  process.stdout.write("  " + coverName + "  (from slide " + (coverIdx + 1) + ")\n");

  /* --- pass 1b: background plates --------------------------------------
     The same slides with the glyphs made transparent - every card, chip,
     bar and scrim still painted. scripts/audit.py
     measures contrast against these instead of trying to separate glyphs
     from their background inside a finished PNG, where antialiasing makes
     the two indistinguishable at the edges. */
  const bgDir = path.join(outDir, "_bg");
  fs.mkdirSync(bgDir, { recursive: true });
  await page.addStyleTag({
    content:
      ".headline,.headline mark,.sub,.kicker,.cta,.counter,.edge-label," +
      ".swipe,.note-bar,.pair figcaption{" +
      "color:transparent!important;text-shadow:none!important;" +
      "-webkit-text-stroke-color:transparent!important}",
  });
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({
      path: path.join(bgDir, String(i + 1).padStart(2, "0") + ".png"),
      type: "png",
    });
  }
  process.stdout.write("  _bg/  (background plates for the audit)\n");

  /* --- pass 2: labelled contact sheet ---------------------------------- */
  if (wantContact) {
    const sheet = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await sheet.goto(fileUrl, { waitUntil: "load" });
    await sheet.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
    await sheet.addStyleTag({ content: "#hud,#side,#toast{display:none!important}body{padding:26px}" });
    await sheet.screenshot({ path: path.join(outDir, "_contact_sheet.png"), fullPage: true });
    process.stdout.write("  _contact_sheet.png\n");
    await sheet.close();
  }

  await browser.close();

  /* --- report ---------------------------------------------------------- */
  fs.writeFileSync(
    path.join(outDir, "_report.json"),
    JSON.stringify(
      { slides: names, cover: coverName, coverSlide: coverIdx + 1,
        issues: report, boxes, pageErrors: errors },
      null, 2
    )
  );

  console.log("\n" + names.length + " slide(s) -> " + outDir);
  if (errors.length) {
    console.log("\npage errors:");
    errors.forEach((e) => console.log("  ! " + e));
  }
  if (!report.length) {
    console.log("safe zones: clear");
  } else {
    console.log("\nsafe-zone issues (" + report.length + "):");
    report.forEach((r) =>
      console.log(`  ! slide ${r.slide} ${r.el} ${r.reason} [${r.overlap}]  "${r.text}"`)
    );
    console.log("\nfix by changing pos/size/template or shortening the line, then rebuild.");
    if (strict) process.exit(2);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
