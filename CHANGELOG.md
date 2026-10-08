# Changelog

## Unreleased

- Keep generated sparkles clear of annotation labels, including when Liminal
  is paired with Dew layouts. Add a geometry regression check.

Five reference-led families add 15 layouts, bringing the library to **15
presets, 37 templates and 9 covers**. Includes runnable decks, refreshed
full-library galleries, reference breakdowns and a style selection guide.

- Add Dew: paired routine photos, rounded sans type and positioned annotations. Include label copy in studio editing, edits merging, copy lint, safe zones and pixel contrast auditing.

- Add Weekender: small white mono captions, a centered cover, low location captions and a two-photo stack with independent lower cropping. Accept consecutive diary-note entries.

- Add Harvest: cream brush type, individually audited typewriter labels, and two offset photo collage layouts with independent inset cropping. Keep both photos below the contrast scrim.

- Add Together, a reference-led editorial preset with italic cover, numbered activity and quiet closing layouts. Allow consecutive numbered entries and retain editable copy and safe-zone auditing.

- Add the reference-led Sunlit preset and three ribbon layouts: cream serif titles, warm photos, yellow italic labels and editable copy with vector edge linework.
- Measure ribbon labels individually against their own background for accurate readability auditing.
- Extend Riso's paper backing to the ribbon family so blue text stays readable over its halftone art.
- Document reference provenance and adaptation; test ribbon layouts across every preset.

## 3.1.1

First real-phone test (iPhone 16e, posted as a draft).

### Fixed
- **Dark copy on a card or paper carried a dark drop shadow.** The shadow
  that helps white type over a photo was applied to every slide with a
  photo, so on notes-card, arch-window and other solid-ground templates dark
  letters got a grey halo. On the phone it read as an odd, smudged font.
  Copy on a card, paper or block now has no shadow - including a preset's
  own glow.

### Added
- The verifier checks TikTok's own photo counter ("5 / 8"), which sits at
  the top right and was not in the published specs.
- `safe-zones.md` records what was measured on the phone against what the
  skill reserves. Every reservation was a little more generous than reality;
  nothing in the test deck touched the interface.

## 3.1.0

Covers, brush-ups to the weakest templates, and two workflow additions.

### Added
- **Three more covers**: `cover-word` (a poster stack - every line set to the
  full width on its own), `cover-split` (half photo, half block), and
  `cover-frame` (the photo as a framed print, title in ink beneath). All keep
  the title inside the 1080x1080 band the profile grid keeps. Ten presets on
  one centred cover made a grid of posts read as one layout in ten fonts.
- **Live reload**: `build.js --watch` serves the studio on localhost and
  rebuilds on every change to the deck, a preset or the engine; the page
  reloads itself and keeps its scroll, verdicts and notes. Read-only, bound
  to 127.0.0.1, serving only the folder that holds the page and the photos.
- **Caption lint**: `caption.md` is checked like the slides - TikTok's
  4,000-character limit, a first line short enough to show before "more",
  3-5 hashtags, one call to action, filler and brand-forbidden words.

### Changed
- **Line-aware fitting.** A short hook fitted to the largest size could wrap
  to three lines - "This / isn't a / render". Autofit now prefers a slightly
  smaller size (never under 72%) that keeps the words together.
- **notes-card** runs its photo full bleed under the card; it used to end
  above a dark band.
- **compare** fills the frame, with the headline on a gradient over both
  photos instead of above them on an empty band.
- **frosted-card** spans the width; only its copy keeps clear of the icon
  column. It sat small and to the left.
- **halftone, dither and ascii stretch the photo's own tonal range first** -
  riso's dots all but vanished on bright photos.
- **Kickers on covers are filled labels** (an outlined pill measured 1.2:1),
  and frosted-card kickers too.
- **Coloured-text highlights are checked**: over a photo they take a lifted
  tint of the accent; on paper, the accent only where it holds 4.5:1.

### Fixed
- `audit.py --fix` raised the deck's scrim value even when a template floor
  sat above it, so nothing changed on screen. It now reads the opacity that
  was actually rendered and starts from that, and reports slides with no
  scrim at all as a colour decision.

## 3.0.0

Ready-made styles, imagery drawn in code from your own photos, video as a
source, a hook method, and an approval loop you can actually run. Still no AI
image generation - every image is something the user shot, or a drawing made
from it.

### Added
- **Ten presets** (`presets/*.json`): `liminal`, `contour`, `riso`,
  `fieldnotes`, `blueprint`, `washi`, `terminal`, `photodump`, `kinetic`,
  `atlas`. Fonts with exact axes, palette, texture, per-template art and
  scoped CSS, each built around one signature element. `theme.preset` picks
  one for a deck; `slide.preset` puts one on a single slide, which is how the
  concept board shows three looks side by side. Layering: preset < brand kit
  < theme < slide.
- **`html/art.js` - code-drawn imagery**, 21 seeded generators. Photo-derived:
  `contour` (the photo's own light as a topographic map), `halftone`,
  `ascii`, `dither`, `mosaic` - computed from grids `analyze.py` now exports,
  aligned to the photo's crop with the browser's own object-fit maths, and
  never reading pixels (which `file://` forbids). Procedural: `flowfield`,
  `rings`, `rays`, `grid`, `dimension`, `rough`, `route`, `badge`, `hanko`,
  `tape`, `sparkles`, `lightleak`, `blobs`, `fibres`.
- **Art that aims at the copy.** Art is drawn after the type is fitted, so
  `target: "mark"` circles the highlighted word wherever it landed, and
  `fromTarget` starts an arrow at a line of copy. Sparkles, light leaks,
  badges, seals and tape keep off the copy on their own.
- **`scripts/frames.py`** - the best stills from video: sharpness and exposure
  scoring, perceptual-hash dedupe, spread across the clip, HDR (HLG/PQ)
  tone-mapped to SDR so phone clips do not come out grey.
- **`bento` template** - a 3-5 photo dump. Nineteen templates.
- **Studio review**: Keep / Change and a note on every slide, a review tally,
  **Approve deck**, group headings for concept boards, and **Play** - the deck
  in a phone frame with TikTok's interface, auto-advancing like photo mode.
- **`scripts/apply-edits.js`** - merges the studio's `edits.json` into the
  deck (keeping a `.bak`) and lists every change request for the agent.
- **Copy linting in `build.js`**: TikTok's 35-slide limit, hook length, words
  per slide against the 3-5 second auto-advance, highlights, CTAs, repeated
  templates, filler, brand-forbidden words, unverifiable claims.
  `--strict` fails on errors; `"board": true` skips deck-shape rules.
- **`audit.py --fix`** raises the scrim on slides whose copy over a photo
  falls short, and remembers rounds in `_fix.json` - when a raise did not
  help, it says the scrim is not the problem instead of darkening again.
- **`upload/`** in the export - numbered JPEGs in posting order.
- **`references/hooks.md`** (eight mechanisms, a scoring rubric, rewrites,
  Japanese patterns), `presets.md`, `art.md`, `video.md`.
- **Self-test covers everything**: every template, preset and generator
  rendered and audited, the studio driven like a reviewer, edits merged,
  frames pulled from a generated clip.

### Changed
- **Torn edges, sparkles and sticker-chaos marks are generated per slide**
  from the seed. `sticker-chaos` used to circle a fixed pixel whatever the
  photo showed; it now circles the photo's focus point.
- **Kickers over photos are solid labels.** Accent text set straight onto a
  photograph measured 1.0:1 on red steel.
- **Kickers on a block use a colour checked against that block.**
- **`index-card` edge labels are solid tabs.**
- **Highlight bands are exactly one line tall.** Inline backgrounds paint the
  font's whole content area, which for a tall display face covered the line
  above.
- **Palette-derived grounds are deepened** until text holds on them.
- **The SKILL.md workflow** is rebuilt around brief, source, hook, concept
  board, studio approval, export and audit.

### Fixed
- **Photos with EXIF rotation were analysed on the wrong axis and resized
  sideways.** Phones store a portrait shot as landscape pixels plus a rotate
  tag; Pillow ignores the tag. `analyze.py` now applies it before measuring
  and before writing copies.
- **Black-or-white text on a colour was chosen by a luminance threshold**,
  which put white on orange at 3.0:1. It now compares real WCAG contrast.
- **`index-card` and `film-strip` put their scrim on the wrong side** - their
  copy sits at the foot of the frame.
- **Vertical Japanese type overrode the template's padding**, so in
  `arch-window` the column ran over the photo in dark ink.
- **The audit measured highlight bands as background**, and the plates kept
  `bento` label glyphs; both reported failures that were not there.
- Docs: several v2 documentation edits had silently not applied (the old
  patches matched on hyphens where the files had em dashes). The review-loop
  audit section and deck-format fields are now actually present.

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
