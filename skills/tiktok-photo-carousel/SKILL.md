---
name: tiktok-photo-carousel
description: Create TikTok photo-mode carousels from the user's photos and video clips. Includes fifteen style presets, thirty-seven layouts, reference-led styling, frame extraction, code-drawn art, a review studio, 1080x1920 export, safe-zone checks and readability audits. Use for photo carousels, travel or tips slides, photo dumps, and text over the user's photos; does not generate or source replacement photography.
license: MIT
metadata:
  version: "3.1.1"
---

# TikTok Photo Carousel

Turns the user's photos and clips into a finished 9:16 carousel: designed,
reviewed, approved, exported, and checked.

**Imagery comes only from what the user shot.** Photos, frames pulled from
their video, and drawings made by code from those photos. Never generate
images with AI, and never use stock.

Your judgment goes into choosing frames, writing the hook, picking the style
and ordering the deck. Geometry, contrast and type fitting are measured by
code - trust the reports over your eye, then check the pictures with your eye.

**Requirements:** Node 18+ and Playwright (npm install, then npx playwright install chromium). Python 3.9+ and Pillow. ffmpeg for video frames. Works on Windows, macOS and Linux.

Run commands from this skill's directory. `python3` on macOS/Linux, `python`
on Windows. First run:

```bash
pip install -r requirements.txt
npm install && npx playwright install chromium
node scripts/selftest.js            # prints: OK
```

---

## Phase 0 - Brief

Ask what you do not already know, **in one AskUserQuestion call**: niche,
goal, language, slide count. Ask where the photos and clips are if it is not
obvious. Niches: [references/niches.md](references/niches.md).

Read any brand context the user has - a brand kit, guidelines, a design system
file. **Their rules beat every default here.**
([references/brand-kit.md](references/brand-kit.md))

## Phase 1 - Source

Clips first, if there are any:

```bash
python3 scripts/frames.py --videos <clips> --out <photos> --count 8
```

Sharpest, well-exposed, distinct frames, HDR tone-mapped. Then everything:

```bash
python3 scripts/analyze.py --photos <photos> \
        --out work/<name>/analysis.json --resize work/<name>/photos
```

`--resize` matters: it writes upright, web-sized copies (phone photos carry
EXIF rotation that Pillow ignores) and keeps the studio fast.

Then **look at every photo** on a contact sheet. Reject dim, cluttered and
duplicated frames. Choose the cover for how strongly it stops a thumb, not how
much it explains. Assign roles: cover, build, payoff, cta.
([references/video.md](references/video.md))

## Phase 2 - Hook and copy

The hook decides everything. Follow [references/hooks.md](references/hooks.md):
write 8-10 candidates across four or more mechanisms, score them, and offer
the **top three** in AskUserQuestion with the mechanism and why it fits this
cover photo.

Then the rest: one idea per slide, **14 words or fewer** per slide (photo mode
moves on after 3-5 seconds), a payoff that answers the hook, **one** call to
action. Caption rules: [references/captions.md](references/captions.md).

Never invent facts - prices, rankings, counts, dates, measurements. Use what
the user or their notes provide, or what the photos plainly show.

## Reference-led styling

When the user supplies visual references, read
[references/reference-styles.md](references/reference-styles.md). Extract their
photo treatment, typography, labels and composition. Use the `sunlit` preset
and ribbon layouts for warm travel photography with cream serif titles,
yellow italic labels and flowing yellow linework. Use `together` for muted
lifestyle photos, butter-yellow italic titles, numbered activities and a quiet
parenthetical close. Use `harvest` for cream brush capitals, typewriter paper
labels and offset photo collages for markets and makers. Use `weekender` for
candid photo diaries with small white mono captions and two-photo stacks. Use
`dew` for paired product/routine photos with rounded sans type and movable
translucent annotations.

An explicitly selected reference is already a style direction: build its
preview directly; offer alternatives only when useful or requested. Review
the resulting slides in the studio as usual.

## Phase 3 - Concept board (gate 1)

Pick three presets that suit the niche and the photos
([references/presets.md](references/presets.md)). Build one board: the same
cover and two slides, in each preset, side by side.

```jsonc
{ "board": true, "slides": [
  { "group": "A - Contour", "preset": "contour", "template": "cover", ... }, ... ] }
```

```bash
node scripts/build.js --deck work/<name>/board.json --out work/<name>/board.html
```

Open it, then ask which direction, offering "mix". Three rendered options
settle a design conversation twenty questions will not.

## Phase 4 - The deck (gate 2)

Write `deck.json` with `"theme": { "preset": "<chosen>" }` and a template per
slide chosen by its job ([references/templates.md](references/templates.md)).
**Slide 1 is a cover** - `cover`, `cover-word`, `cover-split`,
`cover-frame`, `cover-ribbon`, `cover-italic`, `cover-brush`, `cover-diary` or `cover-routine`: the first image is the cover, and the profile
grid crops it to 1:1. Vary the cover across a user's posts, or their grid becomes one layout.
Schema: [references/deck-format.md](references/deck-format.md).

```bash
node scripts/build.js --deck work/<name>/deck.json --out work/<name>/carousel.html
```

The build lints the copy - and `caption.md`, once you have written it -
against TikTok's limits. Fix every error it prints. While the user reviews,
build with `--watch`: the studio reloads itself on every change and keeps
their verdicts and notes.
Then open `carousel.html` and tell the user:

- **P** plays the deck as a viewer sees it - phone frame, TikTok interface,
  auto-advancing. Judge pacing here.
- Each slide has **Keep / Change** and a note box. **E** edits any text in place.
- **Approve deck** downloads `edits.json`. Hand it back to you.

```bash
node scripts/apply-edits.js --deck work/<name>/deck.json --edits <edits.json>
```

It merges the copy and lists what the reviewer asked for. Act on every
request, rebuild, send the studio back. Repeat until it prints APPROVED with
no requests. ([references/review-loop.md](references/review-loop.md))

## Phase 5 - Export and audit

```bash
node scripts/export.js --html work/<name>/carousel.html --out <out>
python3 scripts/audit.py --out <out> --fix work/<name>/deck.json
```

`export.js` checks the safe zones. `audit.py` measures real contrast for every
line against the pixels behind it and the 48px / 32px size floors; `--fix`
raises the scrim on slides that fall short. **Rebuild, export and audit again
until it reports clean.** When it says raising the scrim did not help,
something above the scrim is in the way - fix that by hand.

Then look: the contact sheet, `_cover_grid.png` (the cover as the profile grid
shows it), and any slide you doubt at full size. Copy must not sit on a face
or on the subject.

## Phase 6 - Deliver

Write `caption.md` (hook line with the search keyword first, context, one
CTA, 3-5 hashtags) and a pinned comment that continues the hook. Report:

- `upload/` - the files to post, in order. **Post them in this order**; 01 is
  the cover.
- What you changed from the brief, and anything the audit flagged that you
  chose to keep.

Do not post anything for the user.

---

## Files

| Path | What it is |
|---|---|
| `scripts/frames.py` | clips -> best still frames (ffmpeg, HDR tone-mapped) |
| `scripts/analyze.py` | photos -> palette, focus, contrast bands, grids for art; upright resized copies |
| `scripts/build.js` | deck.json -> one self-contained carousel.html; lints copy and caption; `--watch` serves it with live reload |
| `scripts/apply-edits.js` | merges the studio's edits.json into deck.json |
| `scripts/export.js` | slides, `upload/`, cover, contact sheet, safe-zone report |
| `scripts/audit.py` | contrast and size audit of the shipped pixels; `--fix` |
| `scripts/selftest.js` | renders every template, preset and generator and checks them |
| `html/templates.css` `engine.js` `art.js` `shell.html` | the engine |
| `presets/*.json` | the fifteen ready-made looks |
| `brand/` | brand kits |
| `scripts/carousel.py` | legacy Pillow renderer - offline, text over photo only |

References: [templates](references/templates.md) ·
[presets](references/presets.md) · [art](references/art.md) ·
[hooks](references/hooks.md) · [deck-format](references/deck-format.md) ·
[review-loop](references/review-loop.md) · [design-system](references/design-system.md) ·
[safe-zones](references/safe-zones.md) · [video](references/video.md) ·
[captions](references/captions.md) · [niches](references/niches.md) ·
[brand-kit](references/brand-kit.md)

## Limits

Cannot remove objects, cut out subjects, extend backgrounds or invent scenery -
and will not, because that needs generative imagery. It composes, treats and
redraws what the user shot.

Fonts load from Google Fonts, so the first build of a new look needs a
connection. The legacy Pillow path (`carousel.py`, see
[styles-and-filters.md](references/styles-and-filters.md)) is fully offline.
