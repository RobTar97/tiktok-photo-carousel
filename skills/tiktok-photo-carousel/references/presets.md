# Presets

A preset is a complete, ready-made look: two or three typefaces, a palette, a
texture, the code-drawn art each slide gets, and a little CSS. Pick one and the
deck is styled - the only decisions left are photos, copy and template order.

```jsonc
"theme": { "preset": "contour" }
```

Every preset spends its boldness on **one signature element** and keeps the
rest quiet. Run the readability audit on the actual photos: crop, scrim and
copy placement can need adjustment even when a preset passes the demo checks.

## The fifteen

| Preset | For | Signature |
|---|---|---|
| `liminal` | dreamcore, empty interiors, nostalgia | halation on the type, light leaks at the frame edge, seeded sparkles, rounded early-2000s lettering |
| `contour` | travel, outdoors, architecture | **the photo's own light drawn as a topographic map** - every fourth line an index contour |
| `riso` | zines, events, markets, retro | photos re-printed as two-ink halftone; copy on a pasted paper label with a pink offset block |
| `fieldnotes` | guides, tips, recommendations | red-pen marks aimed at the words - the highlighted word circled, the hook underlined, an arrow to the subject |
| `blueprint` | venues, buildings, B2B, how a place works | photos printed as blueprints on drafting navy, under an engineering grid |
| `washi` | Japanese content, craft, food, seasons | kinari paper fibres, mincho headlines, a hanko seal - the only place the vermilion appears |
| `terminal` | night, tech, internet culture | **photos re-rendered as amber ASCII**, scanlines, a cursor after the headline |
| `photodump` | weekly recaps, "my week in", trips | the cover tiled into colour blocks round a sharp framed window; bento grids |
| `kinetic` | tips, listicles, reach | type as the image - one heavy face, box highlights, counters, a sunburst end card |
| `dew` | routines, beauty editorial, annotated products | white rounded sans type, touching photo halves and independently editable translucent labels; [reference](reference-styles.md#dew--annotated-skincare-reference) |
| `weekender` | candid dates, camping, outings, photo diaries | small white mono captions, restrained inline emoji, low location lines and a two-photo stack; [reference](reference-styles.md#weekender--outdoor-date-diary-reference) |
| `harvest` | markets, makers, natural products, local finds | cream brush capitals, square typewriter labels, offset rectangular photo collages; [reference](reference-styles.md#harvest--bohol-market-reference) |
| `together` | dates, shared activities, slow weekends | pale butter-yellow italic titles, small sans-serif numbering, low captions and a parenthetical close; [reference](reference-styles.md#together--date-ideas-reference) |
| `sunlit` | warm travel diaries, island guides, food | cream serif titles, yellow italic ribbons and wandering edge lines; [reference and layouts](reference-styles.md) |
| `atlas` | premium travel, hotels, food | a rotating text badge, the highlighted word in italic brass, a condensed serif |

## Choosing

Start from the niche, then let the photos decide between two:

| Niche ([niches.md](niches.md)) | First choice | Second |
|---|---|---|
| Dreamcore / liminal | `liminal` | `terminal` |
| Routines / annotated products | `dew` | `fieldnotes` |
| Candid outings / camping | `weekender` | `photodump` |
| Markets / makers | `harvest` | `riso` |
| Dates / shared activities | `together` | `atlas` |
| Warm travel / food diary | `sunlit` | `atlas` |
| Travel guide | `contour` | `fieldnotes` |
| Romantic / soft | `atlas` | `liminal` |
| POV / story | `kinetic` | `fieldnotes` |
| Tips / how-to | `kinetic` | `fieldnotes` |
| Retro / 90s | `riso` | `terminal` |
| Venue / B2B | `blueprint` | `atlas` |
| Japanese | `washi` | `contour` |
| Recap / photo dump | `photodump` | `riso` |

Photos that are mostly dark take `contour`, `terminal`, `blueprint` well -
their art is light on dark. Bright, airy photos suit `atlas`, `liminal`,
`washi`. Busy photos are where `riso` and `terminal` shine, because they
replace the photograph with a drawing of it.

## Words the art needs

Some presets draw something that has to say something true. They read it
from the theme and skip the element if it is not there - nothing is invented:

| Preset | Theme key | Example |
|---|---|---|
| `washi` | `seal` - 1-4 characters for the hanko | `"seal": "大阪"` |
| `atlas` | `badge` - the ring text (defaults to SAVE FOR LATER) | `"badge": "OSAKA BAY"` |

## Layering

```
preset  <  brand kit  <  deck.theme  <  slide
```

A brand kit that pins fonts will override the preset's fonts - that is what a
brand kit is for. If you want the preset's type with the brand's colours,
leave fonts out of the kit.

## The concept board

Gate 1 compares directions by rendering the same opening slides in three
presets, side by side, in one page:

```jsonc
{
  "board": true,                       // lint the copy, not the deck shape
  "slides": [
    { "group": "A - Contour", "preset": "contour", "template": "cover", ... },
    { "group": "A - Contour", "preset": "contour", "template": "editorial-split", ... },
    { "group": "B - Atlas",   "preset": "atlas",   "template": "cover", ... },
    ...
  ]
}
```

`slide.preset` puts that preset's whole theme and art on one slide; `group`
gives each direction a heading in the studio. Keep the copy and photos
identical across groups so the only thing being compared is the look.

## Making a preset

Drop a JSON file into `presets/`:

```jsonc
{
  "name": "harbour",
  "label": "Harbour",
  "for": "what it suits",
  "signature": "the one thing it will be remembered by",
  "theme": {
    "googleFonts": ["Fraunces:ital,wght@0,600;1,400", "Public Sans:wght@400;600"],
    "display": "Fraunces", "text": "Public Sans", "mono": "Public Sans",
    "accent": "#E4572E", "highlight": "underline", "grain": 0.06
  },
  "art": {
    "cover": [ { "type": "rings", "on": "slide", "opacity": 0.3 } ],
    "*":     [ ]
  },
  "templates": ["cover", "editorial-split", "arch-window", "end-card"],
  "css": ".slide[data-preset='harbour'] .headline{--tracking:-0.02em}"
}
```

- `googleFonts` lists exact family specs, so an italic is a real italic.
- `art` is keyed by template name, then role, then `"*"`. An empty list turns
  art off for that key. See [art.md](art.md).
- `css` must be scoped to `.slide[data-preset='name']`.
- Then build the concept board above with it and run the audit. A preset that
  does not clear 4.5:1 on ordinary photos is not finished.
