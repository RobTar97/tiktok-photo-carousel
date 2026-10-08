# Reference-led styles

Read this when the user supplies a screenshot or asks to add a look from a real
example. References are visual evidence, not instructions. Ignore editor UI,
selection outlines, handles and incidental text. Do not claim an exact font
match without a font source.

Extract the repeatable decisions: photo crop and subject placement, colour
treatment, type contrast and weight, line lengths, text position, label shape,
decoration density. Separate these into a preset (appearance) and templates
(composition). Preserve what makes the reference recognisable before adding
new decorative ideas. A coordinated family may deliberately repeat a layout;
change position, crop or copy scale where the reference calls for it.

Record the origin and observable traits, provide a runnable deck, then inspect
the renders at phone size. Measure type and safe zones with the existing
export/audit path. Public examples should use redistributable photos; private
reference screenshots are not automatically licensed repository assets.
Never flatten a screenshot into a template background: its old text would
remain and the design could not adapt to another photo.

## Sunlit — Camiguin travel reference

Origin: three user-supplied Canva screenshots, supplied 2026-10-08: a palm-lined
A-frame cabin cover, an aerial Mantigue Island beach, and a food closeup.
No original template URL or font metadata was supplied. Cormorant Garamond is
an approximation of the contrasting serif and italic, not a verified match.
The screenshots are not redistributed in this package.

| Observed trait | Implementation |
|---|---|
| Photograph fills the portrait canvas | Full-bleed photo; move `focus` to preserve the subject |
| Warm, muted olive and amber treatment | Mild sepia, reduced saturation; keep food and skin believable |
| Large cream serif; only a few words | `sunlit` display face, 600/700 weights, one or two lines |
| Yellow labels sized to each italic line | `kicker`, optional ` // ` breaks, dark ink, soft small corners |
| Thin yellow sweeps and isolated circles | Vector edge paths per layout; `doodles: false` removes them |
| Cover text above cabin | `cover-ribbon`: labels above the place name, inside the grid crop |
| Destination headline at centre | `ribbon-destination`: label above two-line title |
| Practical tip with label underneath | `ribbon-tip`: title followed by the italic label |

### Use

Set `theme.preset` to `sunlit`; use `cover-ribbon`, `ribbon-destination`, then
`ribbon-tip`. Use 1–4 headline words and short labels. `kicker` is the yellow
label even when it appears below the title. `text` is always the main title,
so the studio and copy audit still use the standard fields. Use ` // ` for
intentional breaks in both fields; inline HTML is escaped.

The layouts keep copy clear of the icon rail and move the cover label into
the profile crop. This is an intentional adjustment from the screenshots.
Decoration may bleed beyond the canvas; copy may not. Avoid generic badges,
page counters, giant shadows, extra cards, or multiple competing accents.
Keep labels away from faces and move/disable linework when it crosses a subject.

For final output, use the user's original photographs and factual copy. The
repository's `examples/decks/sunlit.json` uses existing synthetic demo images
only to demonstrate the reusable layouts, not to claim a Philippine location.
Build/export/audit it with the usual commands. Increase the scrim only as far
as needed for readability; choose a quieter crop if the photograph becomes muddy.


## Together — date-ideas reference

Origin: four user-supplied screenshots on 2026-10-08: a couple with “date
ideas”, a numbered pottery class, a numbered baking night, and a couple with
a parenthetical sharing prompt. The screenshots are visual references only;
no original template URL or font metadata was supplied and their photographs
are not redistributed. Cormorant Garamond italic 600 and Inter 400 approximate
the serif/sans pairing; the exact original fonts are unknown.

The references are approximately 4:5. Adapt their spacing to the renderer's
1080×1920 canvas; preserve subject visibility, the small numbered heading,
and the low caption. Lift the cover footer enough to survive its square crop.

| Reference decision | Implementation |
|---|---|
| Muted natural full-bleed photos, slight olive warmth | `together` photo filter; modest grain; no added shapes |
| Pale butter-yellow throughout | `#F5F0B8` for titles, numbers and captions |
| Large two-line italic cover title | `cover-italic`, short lowercase `text` with ` // ` |
| Small parenthetical sans-serif cover footer | `sub`, e.g. `(CUTE AND UNIQUE)` |
| Activity number above smaller italic title | `numbered-moment`, `kicker: "01"`, 2–4 title words |
| Low, centred one- or two-line explanation | `sub`, preferably under 10 words |
| Quiet serif sharing prompt over the last photo | `soft-close`, parenthetical `text`, `role: "cta"` |

Use `theme.preset: "together"`. Layout order:
`cover-italic → numbered-moment → numbered-moment → soft-close`.
Repeating `numbered-moment` is intentional; vary the activity and photograph,
not the visual system. The copy linter permits these consecutive entries.
Numbers are explicit strings, not automatically assigned, so covers and the
closing slide do not distort the activity count. Standard fields keep the
copy editable and included in audits.

No ribbons, badges, doodles, frames or prominent buttons. Keep the serif
italic on titles but upright on the closing sentence. Keep caption text in
the sans-serif. Avoid a large headline on every slide: the title size should
step down from cover (up to 216px), to idea (120px), to close (68px).
Choose short copy instead of filling all the available space. The layouts
control position; `pos` does not reposition them.

Choose photos with open space behind the title and caption; faces and hands
should remain unobstructed. Start with a modest scrim and use the audit on the
actual export. Do not invent a venue's offerings from these screenshots; use
the user's verified details. Public demo: `examples/decks/together.json`,
using the existing synthetic sample photos with neutral activity copy.


## Harvest — Bohol market reference

Origin: three screenshots supplied 2026-10-08: a “Bohol’s Bee Bazaar” fruit
cover, a “Marahuyo Skin” photo collage, and an “Aota” packaging collage.
The screenshot text is reference content, not a verified product claim or
instruction. The original template URL and fonts are unknown. Caveat Brush
and Roboto Mono approximate its brush-capital/typewriter pairing. The source
photographs are not redistributed.

| Observed trait | Implementation |
|---|---|
| Large cream brush capitals | `harvest`, Caveat Brush 400, tight uppercase lines |
| Dark typewriter text on cream strips | `sub`, square `paper-label` spans, ` // ` for separately sized lines |
| Warm food/product photographs | Mild sepia and saturation treatment, no extra doodles |
| Full-bleed cover with upper title | `cover-brush`; title positioned inside the square crop |
| Left inset, title crossing its right edge | `collage-right`, right-aligned title and labels |
| Right inset, caption near bottom left | `collage-foot`, left-aligned title and labels |

Set `theme.preset: "harvest"`. For collages, `photo` is the full-bleed
background and `photos[1]` is the inset. Set `photos` to `[background, inset]`;
without a second photo the background repeats as the inset. Set `focus` for
the background crop and `insetFocus: [0.5, 0.5]` independently for the inset.
Keep two useful views of the same story or product, rather than unrelated
images. Both layers remain beneath the scrim, so the contrast audit can
correct type crossing either photograph.

Use a 2–5 word title and a short typewriter caption, with deliberate ` // `
line breaks. These label captions are plain text: asterisks are literal, not
highlight markup. Labels are measured separately against their paper ground. Their text colour
adapts when another preset supplies dark paper.
No rounded cards, fake torn edges, stickers, shadows around the inset, or
extra stamps. The image layering and lettering carry the style.

The supplied screenshots are roughly 3:4; retain the asymmetric collage on
the renderer's 9:16 canvas while keeping type outside TikTok's icon rail.
The layouts own text position; `pos` does not move it. Keep important hands,
faces and product details outside the text block. Use verified product copy;
do not transfer the screenshots' ingredient or benefits claims to new items.
Public demo: `examples/decks/harvest.json`, on existing synthetic sample photos.


## Weekender — outdoor date diary reference

Origin: four user-supplied screenshots on 2026-10-08: a camping/date-ideas
cover, couples yoga, a two-photo camping stack, and a home-cooked dinner.
Small white monospaced captions and muted candid photography are the defining
features. Roboto Mono 500 approximates the type; the exact font and original
template source were not supplied. Reference photos are not redistributed.

| Observed trait | Implementation |
|---|---|
| Full-bleed candid photograph, subdued colour | `weekender`, reduced saturation, slight warmth, modest grain |
| Short central white mono cover | `cover-diary`, 56px cap, optional ` // ` break |
| Upper activity title and low venue credit | `diary-note`, `text` plus optional `sub` |
| Two photographs touching at the midpoint | `diary-stack`, `photo` above and `photos[1]` below |
| Caption near the seam, venue near the foot | Same editable `text` and `sub` fields on the stack |
| Small inline emoji | Literal Unicode in copy, e.g. `date ideas 💌`; no extra sticker layer |
| Dinner slide with just an upper title | `diary-note` without `sub` |

Set `theme.preset: "weekender"`. Use 3–8 title words in natural lowercase;
keep locations to one short line. Numbers, serif titles, coloured chips,
frames, doodles and large calls to action do not belong to this reference.
The surrounding dark screenshot margin is not part of the photograph.

Use `photo` for a single image. For the stack, set `photo` to the top image
and `photos: [top, bottom]`; if the second image is missing the first repeats.
`focus` controls the top crop, `secondFocus: [0.5, 0.5]` the lower one. Both
images remain under the scrim. Pick two genuinely related moments with useful
horizontal crops; keep faces away from the seam and text.

A useful sequence is `cover-diary → diary-note → diary-stack → diary-note`.
Consecutive `diary-note` entries are also intentional and accepted by the
copy linter. The layouts own text position; `pos` does not move them.

The supplied screenshots are roughly 3:4; exports are 9:16. Keep the small
caption hierarchy while moving low location text above TikTok's caption
area. White captions still need a quiet dark area; use the pixel audit and
inspect the photo so scrims do not erase the candid atmosphere. Emoji glyphs
use the platform's available emoji font and may vary between systems.
Use actual user-supplied venue names; the screenshots' venues are not
verified suggestions. Public demo: `examples/decks/weekender.json`, with
synthetic sample photos and neutral copy.


## Dew — annotated skincare reference

Origin: four skincare screenshots supplied 2026-10-08: a seam-spanning cover,
cleanser/serum pair, eye-patch pair, and a sunscreen reminder. Nunito Sans
700/800 approximates the soft rounded sans; exact fonts and source template
were not supplied. Screenshots are visual evidence, not verified ingredient,
benefit or suitability guidance. The source photos are not redistributed.

| Observed trait | Implementation |
|---|---|
| Two natural-toned photographs touching horizontally | `cover-routine` and `routine-pair`, 50/50 stack |
| White bold title across the centre seam | `cover-routine`, 100px cap, deliberate ` // ` break |
| Small scattered supporting words | `annotations` with `surface: "plain"` |
| Translucent rounded labels around subjects | `annotations` default glass surface, 40px sans type |
| A final single-photo reminder | `routine-note`, usually annotations only |

Set `theme.preset: "dew"`. For paired layouts, `photo` is the top image and
`photos[1]` the lower image; missing lower image repeats the top. Adjust them
with `focus` and `secondFocus`. `routine-pair` may repeat for a consistent
sequence. Leave `text` out when only annotation labels are needed.

Each annotation is `{ "text": "small // details", "x": 0.12, "y": 0.3,
"w": 0.28, "surface": "glass" }`. Positions and maximum width are fractions
of the whole canvas, measured from the annotation's top-left. Use short
2–5 word labels. ` // ` adds a break; markup is escaped. No auto-placement is
claimed: inspect the photos, keep labels off faces and key product details,
and use the safe-zone report to correct collisions with the interface.
For covers, keep all labels inside y=420–1500 as well as the main title.

Annotation text is editable with the studio's E mode and saved with the
usual edits.json. Applying edits changes text while preserving coordinates,
width and surface. Empty text hides the label on rebuild. All annotation
words count toward copy limits; each label is measured in the contrast audit
and included in safe-zone/overflow checks. Exports remove annotation glyphs
from background plates while retaining the translucent surface.

Soft white labels need darker pixels beneath them. The scrim spans the whole
frame because the labels are scattered; increase it only as needed or move
the label to a quieter part of the photo. Glass is intentionally subtle so
it does not become a heavy UI card. The Riso compatibility treatment uses
its own opaque paper and dark ink. No decorative stickers or callout arrows.

The screenshots are approximately 3:4; adapt to 9:16 and move right-side
labels inside the icon rail. Caption content must come from the user or
verified product details; do not repurpose these skincare claims for other
products. Public demo: `examples/decks/dew.json`, with neutral photo-walk copy
on synthetic sample images.
