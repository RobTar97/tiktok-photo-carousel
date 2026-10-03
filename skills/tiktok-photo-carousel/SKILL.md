---
name: tiktok-photo-carousel
description: Designs and renders TikTok photo-mode carousels from the user's own photos. Composes each slide in HTML from twelve layout templates (editorial split, duotone poster, polaroid, notes card, arch window, film strip and more), derives colour and crop from the photographs themselves, lets the user review and edit the deck in their browser before anything is final, then exports pixel-exact 1080x1920 slides with Playwright and verifies nothing lands under TikTok's interface. Writes the hooks, slide copy and caption when the user has none. Use when the user asks for a TikTok carousel, a photo-mode post, a photo slideshow, text over photos, slide captions, "dreamcore slides", a travel or list carousel, or burning text onto a folder of images.
license: MIT
compatibility: Node 18+ and Playwright for the HTML engine (npm install, then npx playwright install chromium). Python 3.9+ and Pillow for photo analysis and the legacy renderer. Works on Windows, macOS and Linux.
metadata:
  version: "2.0.0"
---

# TikTok Photo Carousel

Turns a folder of photos into numbered 9:16 slides with real layout, plus a
caption. Your judgment goes into choosing photos, writing copy and directing
the design. The geometry — crop, contrast, type fitting, safe zones — is
measured by code, not estimated.

Run every command from this skill's directory. Use `python3` on macOS/Linux
and `python` on Windows.

First run:

```bash
pip install -r requirements.txt
npm install && npx playwright install chromium
node scripts/selftest.js            # prints: OK
```

## Which engine

| | `html` (default) | `pil` (legacy) |
|---|---|---|
| Layout | 12 composition templates | text over the photo, nothing else |
| Review | browser studio, inline editing | contact sheet after the fact |
| Needs | Node + Playwright | Pillow only, fully offline |
| Use when | almost always | no Node available, or re-running a v1 script |

The legacy path is unchanged and documented in
[references/styles-and-filters.md](references/styles-and-filters.md) and
[references/script-format.md](references/script-format.md). Everything below
is the HTML engine.

---

## Phase 0 — Brief

Ask only what you do not already know: niche, goal, language, slide count,
where the photos are. Niches and what each implies:
[references/niches.md](references/niches.md).

Then read any brand context the user has — guidelines, a notes app, an
existing design system file. **Their rules beat every default in this skill.**
If they have a kit, use it ([references/brand-kit.md](references/brand-kit.md)).

## Phase 1 — Photos

```bash
python3 scripts/analyze.py --photos <photo-dir> \
        --out work/<name>/analysis.json --resize work/<name>/photos
```

`--resize` is not optional in practice: a folder of 16 MP originals makes the
studio crawl, and the slide is 1080px wide. The resized copies become the
deck's photo folder; the originals are never touched.

This writes, per photo: a five-colour palette, a focus point for the crop, and
the luminance and busyness of each text band with the scrim strength that
follows from them.

Then **look at every photo yourself** — a numbered contact sheet is fastest.
The analysis cannot tell you what a picture is about. Judge:

- Slide 1 is the most striking frame, not the most informative.
- Prefer one clear subject and strong geometry. Reject dim, cluttered,
  duplicated.
- Mix wide shots, details, and one frame with human warmth in it.
- Assign a role as you go: hook, build, payoff, cta.

## Phase 2 — Copy

If the user gave you text, use theirs.

If not, write it — hook first, then one idea per slide, then the payoff and
**one** call to action. The `/hook-generator` skill is good for three
competing openers and `/copywriting` for the bodies; `/pinned-comment` for the
comment hook. Rules and caption format:
[references/captions.md](references/captions.md).

Never invent facts — prices, rankings, opening times, dates. Use only what the
user or their notes provide.

## Phase 3 — Concepts (review gate 1)

Build **slide 1 only, three ways**, and open it in the browser. Vary template,
type, colour and texture; keep the hook copy and the photo fixed. Then ask
which direction, offering "mix".

How to structure the three and what to vary:
[references/review-loop.md](references/review-loop.md).

Do not skip this. Three rendered options settle a design conversation that
twenty questions will not.

## Phase 4 — Build the deck (review gate 2)

Write `deck.json` ([references/deck-format.md](references/deck-format.md)),
choosing a template per slide by the job that slide does
([references/templates.md](references/templates.md)). Read
[references/design-system.md](references/design-system.md) before settling the
theme.

```bash
node scripts/build.js --deck work/<name>/deck.json \
                      --out work/<name>/carousel.html
```

Open `carousel.html` and hand it to the user. Tell them the four keys:
`X` safe zones, `C` the real TikTok interface, `E` edit any text in place,
`Ctrl+S` download `edits.json`.

When `edits.json` comes back, merge it into `deck.json` by index and rebuild.
Copy and layout are separate files on purpose — a round of text edits cannot
break the geometry.

## Phase 5 — Export and verify

```bash
node scripts/export.js --html work/<name>/carousel.html --out ./out
```

Produces `01.png`…`NN.png` at exactly 1080x1920, a labelled
`_contact_sheet.png`, and `_report.json`. The safe-zone verifier runs as part
of the export and prints what it found.

**Fix everything it reports, then re-export.** What each message means and how
to fix it is in [references/review-loop.md](references/review-loop.md).

Then look at the contact sheet yourself, and at any slide the verifier was
quiet about but you are unsure of, at full size. Check:

- Copy does not sit on a face or the subject — fix with `pos` or `focus`.
- The hook reads in about one second with no context.
- At most one highlighted word per slide.
- No two neighbouring slides use the same template.
- Line breaks fall where you would break them — add ` // ` if not.

## Phase 6 — Deliver

Write `caption.md` next to the slides. Report the output folder, the slide
count and anything you changed from the user's brief.

Do not post anything for the user.

---

## Files

| Path | What it is |
|---|---|
| `scripts/analyze.py` | photos -> palette, focus, contrast; optional resize |
| `scripts/build.js` | deck.json -> one self-contained carousel.html |
| `scripts/export.js` | carousel.html -> slides + contact sheet + report |
| `scripts/selftest.js` | end-to-end check on generated demo photos |
| `scripts/carousel.py` | legacy Pillow renderer (v1, unchanged) |
| `html/templates.css` | the twelve templates and the layer system |
| `html/engine.js` | rendering, autofit, scrim fitting, verifier, studio |
| `html/shell.html` | page shell the build fills in |
| `brand/` | brand kits |

## Limits

Cannot remove objects, cut subjects out, extend backgrounds or restyle
photographs — those need an image editor or a generative model. The engine
composes and treats what it is given.

Fonts load from Google Fonts by default, so the first build of a new theme
needs a network connection. Set `theme.fontSource: "local"` and supply your
own `@font-face` to work fully offline; the legacy Pillow path bundles its
fonts and never needs the network.
