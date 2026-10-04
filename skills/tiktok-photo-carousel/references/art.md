# Code-drawn art

`html/art.js` draws imagery with code: SVG built by seeded JavaScript. No AI
image generation, no network, no pixel reads. The same deck draws the same
picture every time, in the studio and in the export.

Presets choose art for you. Use this page to override it on one slide, or to
build a preset.

```jsonc
{ "template": "full-bleed-hook", "photo": "a.jpg",
  "art": [ { "type": "contour", "levels": 9, "opacity": 0.55, "over": true } ] }
```

`"art": []` or `"art": false` turns art off for a slide.

## Two families

**Photo-derived** generators redraw the slide's own photograph from the
luminance and colour grids `analyze.py` exports. They follow the photo's crop,
focus point and mask, so the drawing lines up with the picture exactly.

| type | What it draws | Key options |
|---|---|---|
| `contour` | the photo's light as topographic lines; every 4th is heavier | `levels` 9, `cell` 12, `width` 2 |
| `halftone` | the photo re-screened as dots on a rotated screen | `cell` 15, `angle` 15, `size` 0.62, `gamma`, `invert`, `offset` |
| `ascii` | the photo as characters, rows pinned to exact width | `size` 22, `ramp`, `weight`, `invert` |
| `dither` | ordered (Bayer 8x8) 1-bit pixels | `px` 7, `bias`, `invert` |
| `mosaic` | colour tiles, with an optional sharp framed window | `cell` 54, `gap`, `radius`, `reveal: {at, w, h}`, `frame` |

`contour`, `halftone` and `dither` also take `"source": "noise"` to draw from
seeded terrain instead - for slides with no photo.

**Procedural** generators need no photo.

| type | What it draws | Key options |
|---|---|---|
| `flowfield` | streamlines through seeded noise | `count` 420, `steps`, `scale`, `turn` |
| `rings` | concentric circles from a point | `at`, `count`, `gap`, `dash` |
| `rays` | a sunburst | `at`, `count`, `rotate` |
| `grid` | engineering grid, optional registration crosses | `cell` 36, `major` 5, `crosses` |
| `dimension` | an architect's dimension line with a label | `from`, `to`, `label` |
| `rough` | hand-drawn pen marks | `kind`: circle / underline / arrow / box / cross |
| `route` | a hand-drawn path through numbered stops | `points`, `labels`, `dash` |
| `badge` | text running round a circle | `at`, `r`, `text`, `center` |
| `hanko` | a Japanese seal, roughened, slightly crooked | `at`, `text` (1-4 chars), `round` |
| `tape` | a strip of washi tape with torn ends | `at`, `rotate`, `w`, `h` |
| `sparkles` | four-point stars, kept off the copy | `count`, `size` |
| `lightleak` | warm film burns at the frame edge, kept off the copy | `count`, `colors` |
| `blobs` | soft fields of palette colour | `colors`, `blur` |
| `fibres` | the long fibres of handmade paper | `count`, `opacity` |

`torn-reveal` also gets a fresh torn edge per slide, from the seed.

## Placement

| Option | Effect |
|---|---|
| `"on": "photo"` | draw on the photo layer's box (default for photo-derived) |
| `"on": "slide"` | draw on the whole 1080x1920 slide (default for procedural) |
| `"over": true` | photo art sits **above** the scrim instead of inside the photo |
| `"replace": true` | the drawing becomes the image; the photo is hidden and `ground` fills behind |
| `"opacity"`, `"blend"` | opacity and `mix-blend-mode` of the whole drawing |

Inside the photo layer, art follows the layer's crop and mask - an arch window
keeps its arch. `over` art is positioned on the photo's box but is not masked.

## Positions

`at`, `from`, `to` and `points` take fractions of the area (`[0.5, 0.3]`) or
canvas pixels (`[540, 576]`). A missing `at` means the photo's focus point -
the subject - because that is where `object-position` puts it.

### Aiming at the copy

Art is drawn after the type has been fitted, so pen marks can aim at words:

| Option | Effect |
|---|---|
| `"target": "mark"` | centre on the highlighted word |
| `"target": "headline"` / `"sub"` / `"kicker"` | centre on that element |
| `"target": "mark\|headline"` | the first one that exists |
| `"fromTarget": "sub"` | start an arrow just below that element |
| `"pad": 1.3` | how far a circle reaches past the word |

```jsonc
{ "type": "rough", "kind": "circle", "target": "mark", "width": 9 }
{ "type": "rough", "kind": "underline", "target": "headline" }
{ "type": "rough", "kind": "arrow", "fromTarget": "sub" }      // to the subject
```

A target that does not exist on the slide drops that mark rather than drawing
it somewhere arbitrary.

## Colour

`color`, `ground`, `stripe`, `ink` take a token or a hex:
`accent`, `ink`, `paper`, `bg`, `block`, `on-accent`, `muted`. Tokens follow
the slide's theme, so a brand kit recolours a preset's art for free.

## Words in art must be true

`badge`, `hanko`, `route` labels and `dimension` labels print text. Never fill
them with invented facts - a measurement nobody took, a name that is not the
place. Presets read their words from the theme with `"@key"` or
`"@key|fallback"`, and drop the element when there is no value:

```jsonc
{ "type": "hanko", "text": "@seal" }             // theme.seal, or nothing
{ "type": "badge", "text": "@badge|SAVE THIS" }  // theme.badge, or SAVE THIS
```

## Readability

Art that sits behind copy costs contrast. `sparkles` and `lightleak` keep off
the copy on their own; for everything else, run the audit. If a line fails
and `audit.py --fix` reports that raising the scrim did not help, the art is
in the way - lower its `opacity`, or move it.

## Weight

`dither` and `halftone` produce thousands of shapes. They are merged into
single paths and render in well under a second, but a deck with ten `dither`
slides makes a heavy page. Use them where they are the point.
