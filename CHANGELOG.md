# Changelog

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

### Fixed
- Japanese filenames no longer crash the Python scripts on Windows consoles
  (cp932/cp1252); stdout is forced to UTF-8.

### Unchanged
- `scripts/carousel.py`, its 8 styles, 7 filters and script formats.

## 1.0.0

- First public release.
- Renderer: crop/fit to 9:16, 8 style presets, 7 filters, highlight words, kicker/sub lines, camcorder stamp, TikTok and Instagram safe-zone presets, JPG/PNG output, contact sheet, `--debug` safe-zone overlay.
- Cross-platform: bundled OFL fonts, automatic system CJK font detection.
- Docs: SKILL.md plus references (script format, niches, captions, safe zones, styles and filters).
- `scripts/selftest.py` smoke test and CI on Linux, macOS and Windows.
