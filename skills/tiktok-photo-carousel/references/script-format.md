# Script format

> **Legacy engine.** This script format belongs to `scripts/carousel.py`.
> The HTML engine is driven by `deck.json` - see
> [deck-format.md](deck-format.md).

The script lists one entry per slide. Photos are taken from `--photos` in sorted filename order unless a slide names its own `photo`.

## Contents
- [Plain text](#plain-text)
- [JSON](#json)
- [Text markup](#text-markup)
- [Positions](#positions)
- [Examples](#examples)

## Plain text

One slide per line. Lines starting with `#` and blank lines are ignored.

```text
# hook
top | Best sunset spots in *Osaka*
upper | A 450m palm promenade // right on the water
Save this for your trip
```

An optional `top|upper|middle |` prefix sets the position; the default comes from `--pos` (`upper`).

## JSON

A list of slide objects (or `{"slides": [...]}`). Only `text` is normally needed.

| Field | Type | Meaning |
|---|---|---|
| `text` | string | Main text. Supports the markup below. Omit for a photo-only slide. |
| `photo` | string | File name inside `--photos`, or an absolute path. Default: next photo in sorted order. |
| `pos` | `top` `upper` `middle` | Vertical position of the text block (22% / 32% / 43% down). |
| `style` | string | Style name from `scripts/styles.json`. Default: `--style`. |
| `filter` | string | `none` `dreamcore` `bloom` `golden` `warm` `vhs` `contrast` `bw`. Default: the style's filter. |
| `align` | `center` `left` | Text alignment. Default: the style's. |
| `kicker` | string | Small letter-spaced label above the text, e.g. `"01"`. |
| `sub` | string | Small line below the text, e.g. `"(nobody tells you these)"`. |
| `size` | integer | Starting font size in px (it still shrinks to fit). Use ~100 for hooks. |
| `fit` | `cover` `blur` | `cover` crops to fill; `blur` keeps the whole photo over a blurred copy of itself. |
| `focus` | `[x, y]` | Crop center, 0-1 each (default `[0.5, 0.5]`). Shift it toward the subject. |
| `stamp` | string | Retro camcorder date such as `"1994 07 31"`, drawn in the top-left safe corner. |

## Text markup

- `*word*` - highlight colour (use at most one phrase per slide).
- ` // ` or a newline - forced line break.
- Japanese/Chinese/Korean text wraps per character and uses a CJK font (auto-detected, or `--cjk-font`).
- Emoji are not rendered.

## Positions

`top` suits photos whose subject is in the lower half; `upper` is the general default; `middle` only when the empty area (sky, wall) is there. Text is never placed in the bottom 25% (TikTok UI).

## Examples

```json
[
  {"photo": "sunset.jpg", "text": "Best sunset spots // in *your city*", "sub": "(nobody tells you these)", "pos": "top", "size": 104},
  {"photo": "sea.jpg", "kicker": "01", "text": "A seaside promenade // with room to breathe", "pos": "top"},
  {"photo": "hall.jpg", "text": "Rewind to *1994*", "stamp": "1994 07 31", "style": "vhs-mono"}
]
```
