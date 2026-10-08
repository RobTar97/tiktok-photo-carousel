# Quality and testing

How the skill checks its own output, and what has been verified where.

## Four layers of checking

| Check | When | Catches |
|---|---|---|
| **Copy lint** (`build.js`) | every build | hooks over 9 words, slides over ~14, more than one highlight or CTA, filler, unverifiable claims, a caption that breaks TikTok's limits |
| **Safe-zone verifier** (`export.js`) | every export | copy under TikTok's header, photo counter, buttons or caption |
| **Readability audit** (`audit.py`) | after export | contrast below 4.5:1 (warn) or 3:1 (fail) against the real pixels; text under 48px / 32px |
| **Self-test** (`selftest.js`) | before every change, and in CI | anything in the engine that breaks |

## The readability audit

The audit measures **WCAG contrast** for every headline, sub line, label and
highlighted word, against what is actually behind it in the exported slide.

To know what is behind a line, `export.js` renders each slide twice: once as
shipped, once as a **background plate** with every glyph made transparent and
everything else - photos, scrims, cards, chips, bands, art - still painted.
The audit samples the plate under each line:

- **ratio** - against the mean background
- **worst** - against the 2nd percentile, the spot where the line gives out
- a highlighted word is measured on its own, on its glyph body
- a label that paints its own ground is measured inside that ground

`--fix` raises the scrim on any slide whose copy over a photo falls short,
starting from the opacity actually rendered (a template's floor can sit above
the deck's value). It remembers each round, and when a raise did not help it
stops and reports that something above the scrim is in the way.

## The self-test

```bash
node skills/tiktok-photo-carousel/scripts/selftest.js
```

| Step | Asserts |
|---|---|
| Placeholder photos | drawn by the browser - no bundled test images |
| Analysis | grids for photo-derived art |
| Render | every template, preset and generator, 1080x1920, safe zones clear, `upload/` written |
| Audit | contrast >= 3:1 everywhere after `--fix`, size floors held |
| Studio | Keep / Change, a note, an inline edit with its highlight, Approve, play mode pauses and steps |
| apply-edits | the copy lands in the deck, annotation placement is retained, and the request is reported |
| Video | frames pulled from a generated clip, if ffmpeg is installed |

Steps that need a missing tool are skipped **and named**, never passed
silently.

The suite covers 315 slides: 39 template cases, all 15 presets, the five new
layout families across every preset, and 21 art generators. The additional
template cases exercise alternate content arrangements. Dew annotation text
is included in editing, copy linting, safe zones and contrast checks.

## CI

Every push runs on **Linux, macOS and Windows**:

- `html-engine` - the full self-test (with ffmpeg on Linux), then the example
  deck built, exported with `--strict` and audited with `--strict`.
- `legacy-pil` - the v1 Pillow renderer on Python 3.9 and 3.12.

## The real-phone test

The safe zones started as published numbers. They were then checked by
posting a deck privately and screenshotting it on an **iPhone 16e**
(19.5:9). The full 9:16 slide shows uncropped between the status bar and the
navigation, and TikTok draws over it:

| | Measured | Reserved by the skill |
|---|---|---|
| Header ("Following / For You") | top ~6.5% | 8.5% |
| Photo counter ("5 / 8") | top right, ~8.5-12% down | checked by the verifier |
| Avatar and buttons | ~47-86% down, right ~13% | from 42%, right 16% |
| Dots, caption, username | bottom ~9-14% | 15% |

Every reservation was a little more generous than reality, and nothing in the
test deck touched the interface.

The same test found one real defect: copy on a cream card had inherited the
drop shadow meant for copy over photos, and on the phone it read as a
smudged font. Fixed in 3.1.1.

**Not yet measured:** the profile grid's crop of the cover (1:1 or 3:4 -
published sources disagree) and how much of the caption shows before "more".
See the [roadmap](roadmap.md).

## Bugs the checks have caught

A selection, because they show what each check is for:

| Found by | Bug |
|---|---|
| verifier | a long word overflowing its box while the box reported it fit |
| audit | the `marker` highlight putting white text on an accent band at 2.1:1 |
| audit | accent-coloured kickers on photos at 1.0:1, on blocks at 1.5:1 |
| audit | black-or-white text chosen by a luminance threshold - white on orange at 3.0:1 |
| self-test | vertical Japanese type running over the photo in dark ink |
| audit and geometry check | Liminal sparkles landing behind Dew annotation text |
| analysis | phone photos with EXIF rotation resized sideways |
| `--fix` history | the fixer raising a scrim that sat under a template floor |
| real phone | dark text on cards carrying a drop shadow |

The full story of each is in the [changelog](../CHANGELOG.md).
