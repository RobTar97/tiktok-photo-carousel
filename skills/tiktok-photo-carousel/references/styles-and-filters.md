# Styles and filters

## Contents
- [Styles](#styles)
- [Filters](#filters)
- [Add your own style](#add-your-own-style)
- [Fonts and licences](#fonts-and-licences)
- [Japanese / CJK text](#japanese--cjk-text)

## Styles

Defined in `scripts/styles.json`. List them with `python3 scripts/carousel.py --list-styles`.

| Style | Font | Look | Default filter |
|---|---|---|---|
| `dreamcore` | Fredoka SemiBold | big soft rounded white, glow shadow | `dreamcore` |
| `dreamcore-quiet` | Lora | smaller serif, calm | `bloom` |
| `editorial` | Inter Bold | left-aligned, top gradient, travel-magazine; pair with `kicker` | `golden` |
| `clean-bold` | Inter Black | heavy white with black outline | none |
| `impact-meme` | Anton | condensed all-caps feel, thick outline | none |
| `handwritten` | Caveat Bold | casual, personal | `warm` |
| `vhs-mono` | Space Mono Bold | monospace, retro | `vhs` |
| `serif-soft` | Lora Bold | soft editorial serif | `golden` |

## Filters

All are plain Pillow operations (tints, blur + screen blend for glow, noise for grain). Override per run with `--filter` or per slide with `"filter"`.

| Filter | Effect |
|---|---|
| `dreamcore` | desaturated, teal tint, glow, soft contrast, grain |
| `bloom` | brighter, glowy, lifted contrast, light grain (liminal daylight) |
| `golden` | warm tint, slight punch - sunsets and golden hour |
| `warm` | warm film fade |
| `vhs` | RGB channel split, scanlines, grain |
| `contrast` | more contrast and colour |
| `bw` | black and white |
| `none` | untouched |

## Add your own style

Copy an entry in `scripts/styles.json`:

```json
"my-style": {
  "font": "Inter.ttf", "variation": "Bold",
  "size_max": 110, "size_min": 56,
  "color": "#FFFFFF", "highlight": "#FFD84D", "secondary": "#F4F1EA",
  "stroke": 6, "stroke_color": "#000000",
  "shadow": [0, 4, 12, 140],
  "line_spacing": 1.08,
  "align": "center", "gradient": 0.3,
  "filter": "none"
}
```

- `font`: a file in `fonts/`, or an absolute path to any `.ttf`/`.otf`.
- `variation`: named instance of a variable font (`Bold`, `SemiBold`, `Black`...). Ignored for static fonts.
- `shadow`: `[dx, dy, blur, alpha 0-255]`, or `null`.
- `gradient`: strength 0-1 of a black top gradient (drops the automatic dark patch). Omit it for the automatic patch.
- `align`: `center` or `left`. `secondary` colours the kicker and sub line.

## Fonts and licences

Bundled in `fonts/`, all under the SIL Open Font License 1.1 (licence texts are alongside, `OFL-*.txt`): Inter, Fredoka, Lora, Anton, Caveat, Space Mono. Redistribution inside this skill is permitted by the OFL; if you fork and swap fonts, keep each font's licence file with it.

## Japanese / CJK text

Not bundled (the fonts are several MB). The renderer finds a system CJK font automatically (Yu Gothic/Meiryo on Windows, Hiragino/PingFang on macOS, Noto Sans CJK on Linux). Otherwise pass one: `--cjk-font /path/to/NotoSansJP-Bold.otf`. Free option: Noto Sans JP from Google Fonts.
