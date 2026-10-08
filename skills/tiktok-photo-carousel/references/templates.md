# Templates

Thirty-seven composition archetypes. A template decides the **layout** of a slide,
not its font. Fonts, colour and code-drawn art come from the preset and theme, so every template in a
deck still looks like one deck.

Pick by the job the slide does, not by what looks nice on its own. A carousel
that uses one template eight times reads as eight identical frames and loses
people by slide 3.

## Choosing

| Slide | Job | Reach for |
|---|---|---|
| 1 | Stop the thumb, and survive the grid crop | **`cover`**, **`cover-word`**, **`cover-split`**, **`cover-frame`**, **`cover-ribbon`**, **`cover-italic`**, **`cover-brush`**, **`cover-diary`**, **`cover-routine`** |
| 2..n-1 | Carry one idea each | `editorial-split`, `index-card`, `caption-bar`, `arch-window`, `frosted-card`, `diagonal-split`, `notes-card`, `film-strip` |
| any | A line worth hearing | `quote-pull` |
| any | A real pairing | `compare` |
| any | Several moments at once | `bento` |
| n-1 | The payoff | `polaroid-stack`, `full-bleed-hook`, `sticker-chaos` |
| n | One call to action | `end-card` |

**Slide 1 should normally use a `cover*` template.** On a photo post the first image is the
cover, and the profile grid crops it to 1:1 - every other template puts the
headline where that crop cuts.

A good default shape for 8 slides:

```
cover -> editorial-split -> caption-bar -> arch-window
-> frosted-card -> index-card -> polaroid-stack -> end-card
```

Vary, but keep two rules: **avoid identical compositions back to back unless following a coordinated reference family**, and
**never more than three "loud" templates** (duotone, sticker, dreamcore) in
one deck.

---

## 1. `full-bleed-hook`

Photo edge to edge, display type as large as the safe box allows. The default
opener and the most reliable one.

Fields: `photo`, `text`, `sub?`, `pos`, `highlight?`
Best photo: one clear subject, strong diagonal or vertical geometry, a region
of calm sky or wall where the type can land.

---

## 2. `duotone-poster`

The photo is crushed to two colours and a halftone screen is laid over it;
type is uppercase and condensed. Reads as a gig poster.

Fields: `photo`, `text`, `duotone?` (`[dark, light]` — derived from the photo
if omitted), `pos`
Best photo: hard shapes, strong structure. Terrible on faces and on anything
whose colour is the point.

---

## 3. `torn-reveal`

The photo shows through a torn-paper tear; the headline sits on the paper
above it. Zine energy, works well for a reveal or a secret.

Fields: `photo`, `text`, `sub?`, `tear?` (where it runs, default 0.47)
The tear is generated from the seed for every slide, so no two in a deck match.

---

## 4. `editorial-split`

Photo on top, a flat colour block beneath carrying a kicker number, the
headline and a rule. Travel-magazine. **The workhorse for informational
slides** — facility guides, numbered lists, anything with a sub line.

Fields: `photo`, `kicker` (use `01`, `02`…), `text`, `sub?`, `block?`
The block is `theme.block`, or set `block` per slide to pull a colour out of
the photo.

---

## 5. `arch-window`

The photo is masked into an arch with a hairline border on a paper ground,
copy below in the text face. Calm, premium, unhurried.

Fields: `photo`, `text`, `sub?`
Best photo: landscape, horizon, architecture. The crop is tall, so a wide
photo loses its sides — check `focus`.

---

## 6. `frosted-card`

A dark glass card over the blurred photo, the full width of the frame - only
its copy keeps clear of the icon column. The list / tips slide: the photo
becomes atmosphere rather than subject.

Fields: `photo`, `kicker?`, `text`, `sub?`
Use when the copy is longer than one line and the photo is not carrying
information.

---

## 7. `film-strip`

Two or three frames stacked with sprocket holes. Good for a before/after, a
sequence, or three variations of one thing.

Fields: `photos` (2–3), `text`, `sub?`
Note: `photos`, not `photo`. Frames are evenly split.

---

## 8. `notes-card`

The photo full bleed, an iOS-notes style card over its lower half holding the
line. The most native-feeling format on the app — it reads as something
someone typed, not something a brand designed.

Fields: `photo`, `noteLabel?` (small caps tag, e.g. `go at`), `text`, `sub?`
Best for a single concrete fact: a time, a price, an address, a warning.

---

## 9. `polaroid-stack`

A tilted print on linen with tape and a handwritten caption. Warm, personal,
a good second-to-last slide.

Fields: `photo`, `photos?` (second one peeks out behind), `text`, `tilt?`
(degrees, default `-3`)
The handwriting face is `theme.hand` — keep the line short, handwriting eats
width fast.

---

## 10. `sticker-chaos`

Hand-drawn pen marks over the photo, plus optional stickers. Meme-adjacent,
high energy, use once per deck at most.

Fields: `photo`, `text`, `circle?` (`false` to drop it), `arrow?`,
`stickers?` - `[{text, x, y, rot}]` with `x`/`y` as 0..1 fractions.
The circle lands on the photo's focus point - the subject - and the arrow
points at it, drawn fresh from the seed on every slide. Set `focus` to move
them. For marks that circle a *word*, use `art` with a `target` ([art.md](art.md)).

---

## 11. `dreamcore-glow`

Bloom, haze, sparkles, soft rounded type. Liminal-space content, 90s-mall
nostalgia, empty interiors.

Fields: `photo`, `text`, `sub?`. The sparkles are seeded and keep off the
copy. The haze lightens the photo, so this template carries a higher scrim
floor than the others.

---

## 12. `end-card`

Flat accent colour, oversized type, one call to action. No photo.

Fields: `text`, `sub?`, `cta?`
Text colour is computed against the accent, so a light accent gets dark type
automatically. Keep the CTA to one action — save, send, follow, or "part 2?".

---

## 13. `cover`

The thumbnail, and on a photo post the first slide as well. Centred lockup
inside the 1080x1080 band the profile grid keeps, with the swipe cue in the
band below that only the feed ever shows.

Fields: `photo`, `text`, `sub?`, `kicker?`, `swipe?` (default `swipe`)
This is the one template where centring is right: the crop is centred, so the
title has to be. Its scrim has a floor, because the cover is read in a
fraction of a second in a crowded feed.

---

## 14. `index-card`

Asymmetric editorial. A rule runs the height of the safe area with the section
label set vertically along it; the headline hangs to its right.

Fields: `photo`, `edgeLabel`, `text`, `sub?`
The edge label should name something real - a place, a floor, a section. If it
would only be decoration, use `full-bleed-hook` instead.

---

## 15. `quote-pull`

The line is the subject and the photograph is only a ground, so the photo is
desaturated and pushed back behind an oversized quotation mark.

Fields: `photo`, `text`, `sub?` (set in mono as an attribution), `quoteMark?`
Best for POV and storytime, or one line of someone else's words. The headline
is set in the text face, not the display face - this is a quote, not a shout.

---

## 16. `diagonal-split`

The photo is cut on a rising diagonal with the copy in the solid wedge below.
Signature: a hairline accent stroke along the cut.

Fields: `photo`, `text`, `sub?`
The cut rises left to right, so put the subject low-left in the frame.

---

## 17. `caption-bar`

A lower third over a full-bleed photo, the way a subtitle sits on film, with a
position counter at its right edge.

Fields: `photo`, `text`, `sub?`, `counter?` (`false` to drop it)
The counter tells the viewer how much is left, which is the single best lever
there is on swipe-through. Keep it unless you have a reason.

---

## 18. `compare`

Two frames, hard split, full height, one label each; the headline sits on a
gradient over the tops of both.

Fields: `photos` (2), `labels` (2), `text`, `sub?`
Only reach for it when the pairing is real - a before and an after, two sides
of the same place. A split with nothing to compare is just a smaller photo.

---

## 19. `bento`

A photo dump: three to five frames in an asymmetric grid, headline above. The
format people already use for "my week in", made tidy.

Fields: `photos` (3-5, strongest first - it takes the big cell), `text`,
`sub?`, `labels?` (one per frame)
The grid changes shape with the count. Use it once per deck: it is a change
of pace, and five small photos read slower than one big one.

---

## Covers

Slide 1 is the cover, and the profile grid crops it to the centre 1080x1080.
Every cover keeps its title inside that square. There are nine cover layouts;
rotate compositions as well as presets to give a feed variety.

| Cover | Reach for it when | Watch for |
|---|---|---|
| `cover` | the photo is the subject and the hook is a sentence | - |
| `cover-word` | the hook is 2-5 short words and you want a poster | long words share the width and come out smaller; busy photos need a dark scrim |
| `cover-split` | the photo is busy, or you want the title to own half the frame | the subject has to be in the photo's top half |
| `cover-frame` | quiet, premium, editorial - hotels, food, architecture | the photo is small; it needs one clear subject |
| `cover-ribbon` | warm travel opener | leave room for the yellow kicker and edge linework |
| `cover-italic` | intimate activity or date list | keep the italic title short |
| `cover-brush` | market or maker story | use a short brush-lettered hook |
| `cover-diary` | candid photo diary | small mono copy needs a quiet patch of photo |
| `cover-routine` | a routine introduced with two photos | keep the title at the seam and labels clear of the interface |

All four take `photo`, `text`, `sub?`, `kicker?` and `swipe?`.

## 20. `cover-word`

The poster stack: each line set to the full width of the copy area on its own,
so short words get enormous, then the stack scaled to fit the square.

Break lines yourself with ` // ` - `This isn't // a *render*`. Without breaks,
words are paired two to a line. Two to four lines is the range that works.

## 21. `cover-split`

Half photograph, half solid block, the title on the block under an accent
rule. The grid's square keeps exactly both halves. Most robust of the four on
busy photos, because the copy never sits on the photograph.

## 22. `cover-frame`

The photograph as a framed print on the paper, with the title set beneath it
in ink. Reads as a magazine cover in the grid.

---

## Adding a template

1. Add a block to `html/templates.css` keyed on
   `.slide[data-template="your-name"]`.
2. Set padding on `.layer-type`, never on `.type-box` — the autofit pass
   measures the box against the layer's padding box, so padding is how you
   tell it where the copy may live.
3. Express clearances as `var(--safe-t)` / `var(--safe-b)` so the template
   follows `deck.safe` instead of a hard-coded fraction, and leave the
   lower right clear of the icon rail.
4. If it needs extra DOM, add an entry to `ART` in `html/engine.js`.
5. If it needs art of its own, add a `TEMPLATE_ART` entry in `html/engine.js`
   rather than drawing fixed shapes - art from `html/art.js` is seeded per
   slide and can aim at the photo's subject or at the copy.
6. Rebuild and export - the verifier tells you if the geometry collides with
   TikTok's interface - then run `scripts/audit.py`.
7. Add it to `scripts/selftest.js`, and put it on a concept board in every
   preset. A template that only reads in one look is not finished.


## 23–25. Reference-led ribbon family

Pair with `sunlit` for the supplied Camiguin-inspired look. Other presets can
supply their own fonts and colours to the same geometry.

| Template | Composition | Fields |
|---|---|---|
| `cover-ribbon` | Stacked italic labels above a short title in the grid-safe upper band | `photo`, `kicker`, `text` |
| `ribbon-destination` | Label above a centred two-line place or destination title | `photo`, `kicker`, `text` |
| `ribbon-tip` | Short headline with the italic yellow label below | `photo`, `text`, `kicker` |

Use ` // ` in `kicker` for individually sized labels, and in `text` for title
breaks. `doodles: false` removes the decorative paths and circles. Optional
`sub` works, but a short headline and label most closely match the reference.
The layout owns the copy position; `pos` does not move these compositions.
See [reference-styles.md](reference-styles.md) for provenance, photo selection,
reference-specific details and the distinction between a label and a subtitle.


## 26–28. Quiet editorial family

Pair with `together` for the date-ideas reference. No decorative art is added
by these templates. Fonts and palette still come from the chosen preset.

| Template | Composition | Fields |
|---|---|---|
| `cover-italic` | Large centred title; small footer within the square crop | `photo`, `text`, `sub?` |
| `numbered-moment` | Small number above the title; explanation near the foot | `photo`, `kicker`, `text`, `sub` |
| `soft-close` | Small centred sharing sentence | `photo`, `text`, `role: "cta"` |

`numbered-moment` can repeat consecutively for a consistent list. Use explicit
`kicker` strings (`"01"`, `"02"`) and ` // ` breaks in `text` and `sub`.
Keep titles short. The preset supplies italics for titles and upright serif
for the close. See [reference-styles.md](reference-styles.md#together--date-ideas-reference).


## 29–31. Brush market family

Pair with `harvest` for cream brush capitals and typewriter paper labels.

| Template | Composition | Fields |
|---|---|---|
| `cover-brush` | Upper centred title and label on a full-bleed photo | `photo`, `text`, `sub` |
| `collage-right` | Left inset photo, right-aligned title across its edge | `photo`, `photos`, `text`, `sub` |
| `collage-foot` | Right inset photo, lower-left title and label | `photo`, `photos`, `text`, `sub` |

`photo` is the background; `photos[1]` is the inset, falling back to `photo`.
Use `insetFocus` to adjust the inset independently of `focus`. `sub` uses plain
text with ` // ` for separately sized paper strips. Read the
[Harvest reference](reference-styles.md#harvest--bohol-market-reference) for
crop, typography and photo-pairing guidance.


## 32–34. Candid photo diary family

Pair with `weekender`: small white mono captions, optional inline emoji,
muted photos, no decorative art.

| Template | Composition | Fields |
|---|---|---|
| `cover-diary` | Short centred caption within the square profile crop | `photo`, `text` |
| `diary-note` | Upper title and optional low location line | `photo`, `text`, `sub?` |
| `diary-stack` | Two edge-to-edge photo halves; title above seam, location below | `photo`, `photos`, `text`, `sub?` |

For `diary-stack`, `photo` is the top image and `photos[1]` the bottom; missing
second photo repeats the first. `focus` and `secondFocus` adjust crops
independently. `diary-note` may repeat consecutively. See the
[Weekender reference](reference-styles.md#weekender--outdoor-date-diary-reference).


## 35–37. Annotated routine family

Pair with `dew` for rounded white sans type and small translucent labels.

| Template | Composition | Fields |
|---|---|---|
| `cover-routine` | Two photo halves, main title across seam, supporting labels | `photo`, `photos`, `text`, `annotations?` |
| `routine-pair` | Two photo halves with independently positioned labels | `photo`, `photos`, `annotations` |
| `routine-note` | Single full-bleed photo and a quiet reminder label | `photo`, `annotations` |

Use `focus` for the top photo and `secondFocus` for the lower one. `text` is
optional on supporting slides. Labels use canvas-relative `x`, `y`, `w` and
`surface: "plain"` or `"glass"`. Repeated `routine-pair` entries are intentional.
See [Dew](reference-styles.md#dew--annotated-skincare-reference) for placement,
editing, audit behaviour and source interpretation.
