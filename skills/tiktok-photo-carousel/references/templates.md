# Templates

Eighteen composition archetypes. A template decides the **layout** of a slide,
not its font. Fonts and colour come from the theme, so every template in a
deck still looks like one deck.

Pick by the job the slide does, not by what looks nice on its own. A carousel
that uses one template eight times reads as eight identical frames and loses
people by slide 3.

## Choosing

| Slide | Job | Reach for |
|---|---|---|
| 1 | Stop the thumb, and survive the grid crop | **`cover`**, `full-bleed-hook`, `duotone-poster`, `torn-reveal` |
| 2..n-1 | Carry one idea each | `editorial-split`, `index-card`, `caption-bar`, `arch-window`, `frosted-card`, `diagonal-split`, `notes-card`, `film-strip` |
| any | A line worth hearing | `quote-pull` |
| any | A real pairing | `compare` |
| n-1 | The payoff | `polaroid-stack`, `full-bleed-hook`, `sticker-chaos` |
| n | One call to action | `end-card` |

**Slide 1 should normally be `cover`.** On a photo post the first image is the
cover, and the profile grid crops it to 1:1 - every other template puts the
headline where that crop cuts.

A good default shape for 8 slides:

```
cover -> editorial-split -> caption-bar -> arch-window
-> frosted-card -> index-card -> polaroid-stack -> end-card
```

Vary, but keep two rules: **never two of the same template back to back**, and
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

Fields: `photo`, `text`, `sub?`
Note: the tear is an SVG `clipPath` in the page, so it is crisp at any size.

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

A dark glass card over the blurred photo. The list / tips slide: the photo
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

Photo on top, an iOS-notes style card below holding the line. The most
native-feeling format on the app — it reads as something someone typed, not
something a brand designed.

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

Hand-drawn SVG circle and arrow over the photo, plus optional stickers.
Meme-adjacent, high energy, use once per deck at most.

Fields: `photo`, `text`, `circle?` (`false` to drop it), `arrow?`,
`stickers?` — `[{text, x, y, rot}]` with `x`/`y` as 0..1 fractions.

---

## 11. `dreamcore-glow`

Bloom, haze, sparkles, soft rounded type. The v1 `dreamcore` style rebuilt as
a layout. Liminal-space content, 90s-mall nostalgia, empty interiors.

Fields: `photo`, `text`, `sub?`; pairs with `aberration: true` and
`scanlines: true` on the theme for a harder VHS read.

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

Two frames, hard split, one label each.

Fields: `photos` (2), `labels` (2), `text`, `sub?`
Only reach for it when the pairing is real - a before and an after, two sides
of the same place. A split with nothing to compare is just a smaller photo.

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
5. Rebuild and run the export — the verifier will tell you if the geometry
   collides with TikTok's interface.
