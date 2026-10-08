# deck.json

One file describes the whole carousel. The studio renders it, the exporter
shoots it, and the reviewer's edits merge back into it. Nothing else holds
state.

```jsonc
{
  "title": "ATC - this isn't a render",   // studio header, and the default seed
  "lang": "en",                            // "ja" turns on Japanese line breaking
  "handle": "atc_osaka",                   // shown in the mock TikTok interface
  "caption": "...",                        // same - a reminder of what covers the slide
  "photos": "./photos",                    // relative to THIS file
  "seed": "atc-oct",                       // optional - changes every code-drawn mark

  "theme":  { "preset": "contour", ... },  // see below
  "safe":   { "top": 0.085, "bottom": 0.15, "side": 0.07,
              "rail": 0.16, "railTop": 0.42 },   // optional override
  "board":  false,                         // true for a concept board, see presets.md
  "play":   { "seconds": 3.5 },            // play-mode dwell per slide

  "slides": [ { ... } ]
}
```

## theme

Every field is optional. `preset` loads a complete look; anything else here
overrides it. Layering, lowest first: **preset < brand kit < theme < slide**.

| Field | What it does |
|---|---|
| `preset` | One of the presets in `presets/` - see [presets.md](presets.md) |
| `display`, `text`, `hand`, `mono` | Font families. A Google Fonts name is enough. |
| `googleFonts` | Exact family specs, e.g. `"Fraunces:ital,wght@0,600;1,400"` |
| `displayWeight` | 400-900 |
| `palette` | `[dark ... light]` hex. Taken from slide 1's photo if unset. |
| `accent` | Highlights, kicker labels, rules, the end card |
| `onAccent` | Text on the accent. Computed for contrast if unset. |
| `bg`, `block`, `paper` | Grounds. Palette-derived ones are deepened until text holds. |
| `ink`, `inkDark`, `muted` | Text on photos, text on paper, secondary text |
| `highlight` | `plain` / `box` / `underline` / `marker` - how `*word*` renders |
| `grain`, `vignette` | 0..1 texture |
| `aberration`, `scanlines` | VHS treatments |
| `sizeMax`, `sizeMin` | Autofit bounds in px (default 132 / 48 - 48 is TikTok's floor) |
| `subRatio` | Sub size as a fraction of the headline (floor 32px regardless) |
| `seal`, `badge` | Words for presets that draw a seal or badge |
| `fontSource` | `local` or `none` to skip the Google Fonts request |

## slides[]

```jsonc
{
  "role": "cover",                // cover | build | payoff | cta
  "template": "cover",            // see templates.md
  "photo": "IMG_4472.jpeg",       // a file in the photos folder
  "photos": ["a.jpg", "b.jpg"],   // film-strip, polaroid-stack, compare, bento

  "text": "This isn't a *render*",
  "sub":  "it's a real building, and you can walk in",
  "kicker": "look up",
  "cta": "save",                  // end-card

  "pos": "upper",                 // top | upper | middle | lower
  "align": "left",                // left | center | right
  "secondFocus": [0.5, 0.5],      // diary-stack / routine pairs: lower photo crop
  "insetFocus": [0.5, 0.5],       // collage-right / collage-foot: secondary photo crop
  "focus": [0.38, 0.45],          // crop centre 0..1 - from analyze.py
  "size": 118,                    // cap the autofit
  "highlight": "marker",          // per-slide
  "vertical": true,               // vertical Japanese type
  "rail": false,                  // ignore the icon column on this slide
  "fit": "blur",                  // letterbox on a blurred copy of itself

  "preset": "atlas",              // this slide in a different preset (concept boards)
  "group": "A - Atlas",           // studio heading (concept boards)
  "art": [ { "type": "rough", "kind": "circle", "target": "mark" } ],  // see art.md
  "accent": "#E8A838",            // per-slide colour overrides
  "bg": "#0D2137",                // end-card ground
  "block": "#14181B",
  "fonts": { "display": "Bebas Neue", "weight": 400, "tracking": "0.01em" },

  "swipe": "swipe",               // cover - the feed-only cue
  "edgeLabel": "west side",       // index-card - the vertical tab
  "labels": ["before", "after"],  // compare, bento
  "noteLabel": "go at",           // notes-card
  "doodles": false,               // ribbon family - omit decorative edge linework
  "counter": false,               // caption-bar - drop the 03 / 08 counter
  "stickers": [{ "text": "here", "x": 0.6, "y": 0.5, "rot": -8 }],  // sticker-chaos
  "tilt": -3.5,                   // polaroid-stack
  "tear": 0.47,                   // torn-reveal - where the tear runs
  "quoteMark": "“"           // quote-pull
}
```

### Copy markup

- `*word*` renders as a highlight. **One per slide.**
- ` // ` (spaces both sides) forces a line break. Always use it in Japanese.
- Brush/collage templates use plain-text `sub` labels with ` // ` breaks; asterisks stay literal.
- Ribbon templates also support ` // ` in `kicker` for separate italic labels.
- Everything else is escaped, so `<`, `&` and emoji in copy are safe.

### Fields you normally leave out

`scrim`, `shadow`, `focus` and `duotone` are filled in by `build.js` from
`analysis.json`; `audit.py --fix` raises `scrim` where it has to.

| Field | Range | Meaning |
|---|---|---|
| `scrim` | 0..1 | Darkening under the copy |
| `scrimDir` | `top` `bottom` `full` `radial` `none` | Which way the ramp runs (follows the copy by default) |
| `shadow` | bool | Text shadow |
| `duotone` | `[dark, light]` | `duotone-poster` inks |

## What build.js checks

Errors fail `--strict`; warnings should be fixed before export.

| Check | Level |
|---|---|
| more than 35 slides (TikTok's limit) | error |
| hook over 12 words | error |
| a slide over ~18 words | error |
| fewer than 3 or more than 12 slides | warning |
| slide 1 not `cover` | warning |
| hook over 9 words; a slide over 14 words | warning |
| more than one highlight on a slide; more than one CTA | warning |
| the same template twice in a row; more than three loud templates | warning |
| filler words, and words the brand kit forbids | warning |
| superlatives and absolutes ("best", "only", "never") | note - fine if the user said it |

A concept board (`"board": true`) skips the checks about the deck as a whole.

`caption.md` beside the deck (or `--caption <file>`) is linted too - only the
caption itself, above the first `---`:

| Check | Level |
|---|---|
| over 4,000 characters (TikTok's limit) | error |
| first line over 100 characters - most people only see the first line | warning |
| opens with a hashtag instead of the hook | warning |
| fewer than 3 or more than 5 hashtags | warning |
| more than one call to action | warning |
| filler, or a word the brand forbids | warning |

## edits.json

What the studio's **Approve deck** (or **Save edits**, Ctrl+S) downloads:

```jsonc
{
  "approved": true,
  "slides": [
    { "index": 0, "text": "...", "sub": "...", "status": "keep" },
    { "index": 1, "text": "...", "status": "change",
      "note": "crop is cutting the yellow beam - show more of it" }
  ],
  "notes": "deck-wide notes"
}
```

Merge it with `scripts/apply-edits.js`. Copy fields are written into the deck;
`status` and `note` are reported for you to act on. Layout never comes back
through this file, which is why a round of edits cannot break the geometry.


### Positioned annotations

For annotated routines (or another layout that has room), add:

```json
"annotations": [
  { "text": "small // details", "x": 0.12, "y": 0.3, "w": 0.28, "surface": "glass" }
]
```

Coordinates and maximum width are fractions of the whole slide. Default
position is (0.12, 0.3), width 0.28; `surface` is `glass` or `plain`. Text is
40px, supports ` // ` breaks, and is escaped. Use 2–5 words per label.
Annotations participate in copy limits, safe-zone checks and the pixel audit.
The studio exports `annotations` as an array of edited strings in the same
order; apply-edits merges those strings into the existing objects while
retaining geometry. Empty strings hide labels after rebuild.
