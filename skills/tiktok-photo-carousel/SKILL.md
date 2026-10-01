---
name: tiktok-photo-carousel
description: Builds TikTok photo-mode carousels from the user's own photos by writing hook-first slide text and a caption, then burning the text onto the images with Python (Pillow) inside TikTok's safe zones. Includes style presets (dreamcore, editorial travel, bold, handwritten, VHS), simple photo filters, highlight words and Japanese/CJK support. No video and no AI image generation. Use when the user asks for a TikTok carousel, a photo slideshow, text over photos, slide captions, "dreamcore slides", a travel or list carousel, or burning text onto a folder of images.
license: MIT
compatibility: Requires Python 3.9+ and Pillow (pip install -r requirements.txt). Works offline on Windows, macOS and Linux.
metadata:
  version: "1.0.0"
---

# TikTok Photo Carousel

Turns a folder of photos into numbered 9:16 slides with on-image text, plus a caption. The image work is deterministic code (`scripts/carousel.py`, Pillow only): crop, simple filters, text layout, safe zones. Your judgment goes into choosing photos, writing copy and checking the result.

Run every command from this skill's directory (the folder containing this SKILL.md). Use `python3` on macOS/Linux and `python` on Windows. First run: `pip install -r requirements.txt`, then `python3 scripts/selftest.py` should print `OK`.

## Workflow

1. **Brief** - ask what the carousel is for (skip anything already answered): niche, goal, language, slide count. Niches and what each implies: [references/niches.md](references/niches.md).
2. **Brand context** - if the user has brand guidelines or notes (files, docs, a notes app), read the tone rules, palette and forbidden words first. Their rules beat these defaults.
3. **Pick photos** - view every candidate (a numbered contact sheet is fastest). Prefer bright, one clear subject, strong geometry; mix wide shots, details and one human-warmth frame. Reject dim, cluttered and duplicate shots. Slide 1 is the most striking frame, not the most informative.
4. **Write copy** - hook first, then one idea per slide, then payoff + one call to action. Rules and caption format: [references/captions.md](references/captions.md). Never invent facts (prices, rankings, dates); use only what the user or their notes provide.
5. **Render** - write a script file and run the renderer (below).
6. **Check** - view `_contact_sheet.png`, then any risky slide at full size. Fix and re-render. Report the output folder. Do not post anything for the user.

## Render

```bash
python3 scripts/carousel.py --photos <photo-dir> --script <script.json|script.txt> --out <out-dir> --style dreamcore
```

Simple script (`.txt`, one slide per line, photos used in sorted filename order):

```text
top | Accidentally found *Level 1994* in Osaka...
upper | This hallway felt wrong // and I could not leave
```

`*word*` highlights a word, ` // ` forces a line break, `top|upper|middle` sets the position.
Per-slide control (`photo`, `focus`, `style`, `filter`, `kicker`, `sub`, `align`, `size`, `stamp`) uses `.json`: see [references/script-format.md](references/script-format.md).

Key options: `--style` (see below), `--filter none|dreamcore|bloom|golden|warm|vhs|contrast|bw`, `--preset tiktok|instagram`, `--fit cover|blur`, `--format png|jpg`, `--cjk-font PATH`, `--debug` (shades unsafe zones red). `--list-styles` and `--list-filters` print what is available.

## Check list (step 6)

- Text inside the safe zone, nothing at the bottom (run once with `--debug` if unsure).
- Text does not cover faces or the main subject. Fix with `pos`, or `focus: [x, y]` to move the crop.
- Contrast is fine on bright skies/walls. Fix with another style, `--filter`, or shorter text.
- Awkward line breaks: add ` // `. A `WARNING` line in the log means the text is too long; shorten it.
- Highlights: at most one word per slide.

## Styles

`dreamcore` (soft rounded, glow, faded teal) | `dreamcore-quiet` (serif, bloom) | `editorial` (left-aligned travel-magazine look, top gradient; use `kicker` for "01") | `clean-bold` | `impact-meme` | `handwritten` | `vhs-mono` | `serif-soft`. Details, adding your own style and font licensing: [references/styles-and-filters.md](references/styles-and-filters.md).

## Safe zones

TikTok covers the top ~12% (status bar), the bottom ~25% (caption, music, progress bar) and the right edge (like/comment/share). Text is laid out inside the remaining area with 8% side margins and auto-shrinks to fit. Why and how to tune it: [references/safe-zones.md](references/safe-zones.md).

## Limits

Cannot remove objects, cut out subjects, extend backgrounds or restyle photos; those need an image editor or a generative model. Filters are intentionally simple. Emoji are not rendered (Pillow limitation).
