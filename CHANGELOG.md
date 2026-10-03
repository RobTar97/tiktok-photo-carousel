# Changelog

## 2.1.0

Six more templates, safe zones rebased on TikTok's published specs, a
grid-safe cover, and an audit of the pixels that actually ship.

### Added
- **Six templates** - `cover`, `index-card`, `quote-pull`, `diagonal-split`,
  `caption-bar`, `compare`. Eighteen in total.
- **A grid-safe cover.** On a photo post the first image is the cover and the
  profile grid centre-crops it to 1:1, cutting the top and bottom 420px. The
  `cover` template keeps the title inside the square that survives and puts
  the swipe cue in the band that does not. `export.js` writes `cover.png`;
  `audit.py` writes `_cover_grid.png` and reports anything outside the square.
- **`scripts/audit.py`** - real WCAG contrast for every line against the
  pixels behind it, plus TikTok's 48px headline / 32px body floors. It reads
  background plates that `export.js` renders with the glyphs made transparent
  and every card, chip and scrim still painted; measuring a finished slide
  does not work, because antialiased glyph edges form a continuous ramp
  between the text colour and the ground and every headline measures 1.1:1.
  A highlighted word is measured in its own right and cut out of its parent's
  sample.
- **Per-slide type and ground** - `slides[].fonts` and `slides[].bg`.

### Changed
- **Safe zones follow the published specs**: top 0.085, bottom 0.15, side
  0.07, icon column 0.16 wide from 0.42 down. The old 0.12/0.25 was safe but
  threw away about 300px of canvas - on a 9:16 frame, the difference between
  a 96px headline and a 132px one. `deck.safe` now drives both the CSS
  clearances and the verifier, so layout and check cannot disagree, and every
  template derives its padding from those fractions.
- **Legibility floors are absolute.** `.sub`, `.kicker`, `.cta` and the small
  labels never render below 32px however far the headline shrinks. Previously
  a sub line could reach 18px.

### Fixed
- The `marker` highlight set white text on an accent band - 2.1:1, which made
  the highlighted word the hardest one on the slide to read. The word now
  takes the colour that reads on the band.
- `torn-reveal` no longer darkens its own paper ground with the photo scrim.

## 2.0.0

HTML rendering engine. The Pillow renderer stays as the offline fallback.

### Added
- **Twelve composition templates** (`html/templates.css`): full-bleed-hook,
  duotone-poster, torn-reveal, editorial-split, arch-window, frosted-card,
  film-strip, notes-card, polaroid-stack, sticker-chaos, dreamcore-glow,
  end-card. A template sets the layout; the theme sets type and colour, so a
  deck still reads as one deck.
- **`scripts/analyze.py`** - per photo: a five-colour palette, a focus point
  for the crop, and the luminance/busyness of each text band with the scrim
  strength that follows. `--resize` writes web-sized copies in the same pass.
- **`scripts/build.js`** - `deck.json` -> one self-contained `carousel.html`,
  filling in scrim, shadow, crop focus and duotone from the analysis.
- **`scripts/export.js`** - Playwright export to exact 1080x1920 slides, a
  labelled contact sheet and `_report.json`.
- **Review studio** in the built page: safe-zone x-ray, a mock of TikTok's
  real interface, in-place text editing, and `edits.json` export.
- **Safe-zone verifier** - measures every copy element against the three zones
  TikTok covers and reports real overlaps in pixels, instead of leaving it to
  the eye.
- **Autofit** - binary-searches the display size against the measured box, so
  type can run far larger than the estimate-based Pillow fitter allowed.
- **Adaptive scrim** - the gradient ends just past the last line of copy,
  whatever size the autofit settled on.
- **Brand kits** (`brand/`, `--brand`) - a reusable theme plus copy rules,
  merged under the deck's own choices.
- **Japanese typography as a first-class path**: JP display/text faces, looser
  leading, and `"vertical": true` for vertical type.
- `scripts/selftest.js` - renders every template plus Japanese and vertical
  type, and asserts 1080x1920 output with clear safe zones.
- New references: templates, deck-format, design-system, review-loop,
  brand-kit. `examples/output-templates/` shows all twelve.

- **Per-slide type and ground** - `slides[].fonts` overrides the theme's
  typefaces for one slide (the concept gate needs three directions in one
  page), and `slides[].bg` gives the end card its own ground instead of
  forcing the accent across the whole frame.

### Fixed
- Japanese filenames no longer crash the Python scripts on Windows consoles
  (cp932/cp1252); stdout is forced to UTF-8.
- Autofit now catches a single long word overflowing its box. The block's
  rect does not grow when a word spills out, so the word ran off the edge of
  the slide while the verifier reported the slide clear.
- `torn-reveal` no longer darkens its paper ground with the photo scrim.

### Unchanged
- `scripts/carousel.py`, its 8 styles, 7 filters and script formats.

## 1.0.0

- First public release.
- Renderer: crop/fit to 9:16, 8 style presets, 7 filters, highlight words, kicker/sub lines, camcorder stamp, TikTok and Instagram safe-zone presets, JPG/PNG output, contact sheet, `--debug` safe-zone overlay.
- Cross-platform: bundled OFL fonts, automatic system CJK font detection.
- Docs: SKILL.md plus references (script format, niches, captions, safe zones, styles and filters).
- `scripts/selftest.py` smoke test and CI on Linux, macOS and Windows.
