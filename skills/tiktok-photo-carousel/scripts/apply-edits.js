#!/usr/bin/env node
/**
 * apply-edits.js - merge what the reviewer did in the studio back into the
 * deck, and say plainly what is left to do.
 *
 *   node scripts/apply-edits.js --deck work/deck.json --edits ~/Downloads/edits.json
 *
 * Copy edits (text, sub, kicker, cta) are written into deck.json - the
 * previous version is kept as deck.json.bak. Verdicts and notes are not
 * copy, so they are reported for the agent to act on, slide by slide.
 *
 * Exit code: 0 always, unless the files are unreadable. The summary says
 * whether the deck is approved, and if not, what the reviewer asked for.
 */
const fs = require("fs");
const path = require("path");

function argv(name) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const deckPath = argv("deck"), editsPath = argv("edits");
if (!deckPath || !editsPath) {
  console.error("usage: node scripts/apply-edits.js --deck <deck.json> --edits <edits.json>");
  process.exit(1);
}
const readJSON = (p) => JSON.parse(fs.readFileSync(path.resolve(p), "utf8").replace(/^﻿/, ""));
const deck = readJSON(deckPath);
const edits = readJSON(editsPath);
const slides = deck.slides || [];
const rows = edits.slides || [];

if (rows.length !== slides.length) {
  console.log(`! edits.json has ${rows.length} slides, the deck has ${slides.length} - ` +
    "the deck changed after this studio was built. Applying by index; check the result.");
}

const FIELDS = ["text", "sub", "kicker", "cta"];
const show = (v) => (v == null || v === "" ? "(none)" : JSON.stringify(v));
const changed = [], asked = [], unreviewed = [];

rows.forEach((r) => {
  const s = slides[r.index];
  if (!s) return;
  FIELDS.forEach((f) => {
    if (!(f in r)) return;
    const was = s[f] == null ? "" : String(s[f]);
    const now = r[f] == null ? "" : String(r[f]);
    if (was.trim() === now.trim()) return;
    if (now.trim()) s[f] = now; else delete s[f];
    changed.push(`  slide ${r.index + 1} ${f}: ${show(was)} -> ${show(now)}`);
  });
  // Only annotation copy is editable here; retain the authored placement.
  if (Array.isArray(r.annotations) && Array.isArray(s.annotations)) {
    r.annotations.forEach((text, i) => {
      if (!s.annotations[i] || typeof text !== "string") return;
      if (s.annotations[i].text === text) return;
      s.annotations[i].text = text;
      changed.push(`  slide ${r.index + 1} annotation ${i + 1}: ${show(text)}`);
    });
  }
  if (r.status === "change" || (r.note && r.status !== "keep")) {
    asked.push(`  slide ${r.index + 1} [${s.template || "?"}]: ${r.note || "(marked Change, no note)"}`);
  } else if (!r.status || r.status === "unreviewed") {
    unreviewed.push(r.index + 1);
  }
});

if (changed.length) {
  fs.copyFileSync(deckPath, deckPath + ".bak");
  fs.writeFileSync(deckPath, JSON.stringify(deck, null, 2) + "\n", "utf8");
}

const approved = !!edits.approved;
console.log(approved ? "APPROVED by the reviewer" : "not approved yet");
console.log(changed.length ? `\ncopy updated (${changed.length}):` : "\ncopy: no changes");
changed.forEach((c) => console.log(c));
if (asked.length) {
  console.log(`\nchanges requested (${asked.length}) - act on these, then rebuild:`);
  asked.forEach((a) => console.log(a));
}
if (edits.notes) console.log("\ndeck notes:\n  " + edits.notes.split("\n").join("\n  "));
if (!approved && unreviewed.length) console.log("\nnot reviewed yet: slides " + unreviewed.join(", "));

console.log("\nnext:");
if (approved && !asked.length) {
  console.log("  rebuild, export, audit - then deliver upload/");
} else if (asked.length) {
  console.log("  make the requested changes in " + path.basename(deckPath) + ", rebuild, and send the studio back");
} else {
  console.log("  rebuild and send the studio back for approval");
}
if (changed.length) console.log("  (previous deck kept as " + path.basename(deckPath) + ".bak)");
