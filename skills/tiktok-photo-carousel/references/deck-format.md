# deck.json

One file describes the whole carousel. The studio renders it, the exporter
shoots it, and browser edits merge back into it. Nothing else holds state.

```jsonc
{
  "title": "ATC Osaka - hidden spot",   // studio header only
  "lang": "en",                          // "ja" sets the page language
  "handle": "atc.osaka",                 // shown in the fake TikTok chrome
  "caption": "...",                      // same, and a reminder of the caption
  "photos": "./photos",                  // relative to THIS file

  "theme":  { ... },                     // see below
  "safe":   { "top": 0.12, "bottom": 0.25, "side": 0.08,
              "rail": 0.16, "railTop": 0.42 },   // optional override

  "slides": [ { ... } ]
}
```

## theme

Every field is optional. Anything missing falls back to a sane default, and
`palette` is taken from slide 1's photo if you do not set it.

| Field | What it does |
|---|---|
| `display` | Headline family. A Google Fonts name is enough — `build.js` writes the `<link>`. |
| `text` | Secondary family. Use a JP-capable face for Japanese decks. |
| `hand` | Handwriting, for `polaroid-stack` and `sticker-chaos`. |
| `mono` | Kickers and small caps. |
| `displayWeight` | 400–900. |
| `palette` | `[dark … light]` hex. Normally comes from the photos. |
| `accent` | Highlights, kickers, rules, the end card. |
| `bg`, `block`, `paper`, `muted` | Backgrounds and secondary ink. |
| `highlight` | `plain` \| `box` \| `underline` \| `marker` — how `*word*` renders. |
| `grain`, `vignette` | 0..1 texture strength. |
| `sizeMax`, `sizeMin` | Autofit bounds in canvas px (defaults 132 / 48). |
| `subRatio` | Sub size as a fraction of the headline (default 0.38). |
| `aberration`, `scanlines` | Deck-wide VHS treatments. |
| `fontSource` | `local` or `none` to skip the Google Fonts request. |

## slides[]

```jsonc
{
  "role": "hook",                 // hook | build | payoff | cta - documentation
  "template": "full-bleed-hook",  // see references/templates.md
  "photo": "_MG_5485.JPG",        // filename inside the photos folder
  "photos": ["a.jpg", "b.jpg"],   // film-strip and polaroid-stack only

  "text": "Osaka built a *rainbow* machine in 1994",
  "sub":  "and almost nobody films it",
  "kicker": "01",
  "cta": "part 2?",               // end-card

  "pos": "upper",                 // top | upper | middle | lower
  "align": "left",                // left | center | right
  "focus": [0.38, 0.45],          // crop centre, 0..1 - from analyze.py
  "size": 118,                    // cap the autofit for this slide
  "highlight": "marker",          // per-slide override
  "vertical": true,               // vertical Japanese type
  "rail": false,                  // this slide ignores the icon rail
  "fit": "blur"                   // letterbox on a blurred copy of itself
}
```

### Copy markup

- `*word*` renders as a highlight. **One per slide, never more.**
- ` // ` (spaces both sides) forces a line break.
- Everything else is escaped, so `<`, `&` and emoji in copy are safe.

### Fields you normally leave out

`scrim`, `shadow`, `focus` and `duotone` are filled in by `build.js` from
`analysis.json`. Set them by hand only to override what the analysis chose:

| Field | Range | Meaning |
|---|---|---|
| `scrim` | 0..1 | Darkening under the copy. Higher on bright photos. |
| `scrimDir` | `top` `bottom` `full` `radial` `none` | Which way the ramp runs. |
| `shadow` | bool | Text shadow. Off looks cleaner when the photo is dark. |
| `duotone` | `[dark, light]` | `duotone-poster` ink pair. |

## edits.json

What the studio downloads when you press Ctrl+S. Merge it into the deck by
index and rebuild:

```jsonc
{
  "slides": [ { "index": 0, "text": "...", "sub": "...", "kicker": "..." } ],
  "notes": "slide 4 crop is cutting the ship - move it left"
}
```

Only the copy fields come back. Layout stays in `deck.json`, which is why a
round of text edits can never break the geometry.
