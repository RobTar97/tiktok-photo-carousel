# Carousel niches

Ask which niche the carousel is for, then use that row's templates, treatment,
photo rules and hook formulas. A niche is a starting point; combine them when
it fits.

Every niche starts with `cover` on slide 1 and ends with `end-card`. What
changes is the middle, the type, and the colour.

## Contents
- [Dreamcore / liminal space](#dreamcore--liminal-space)
- [Travel guide / hidden gems](#travel-guide--hidden-gems)
- [Romantic / soft aesthetic](#romantic--soft-aesthetic)
- [POV / storytime](#pov--storytime)
- [Tips / how-to list](#tips--how-to-list)
- [Retro / VHS / 90s](#retro--vhs--90s)
- [Goals](#goals)
- [Legacy engine](#legacy-engine)

## Dreamcore / liminal space

- **For:** bright, empty, nostalgic places that feel like a dream (atriums, corridors, escalators, empty plazas).
- **Templates:** `dreamcore-glow` for the mood slides, `notes-card` or `caption-bar` for a fact, `arch-window` to breathe. Reveal on `editorial-split`.
- **Treatment:** `grain` 0.08-0.12, `vignette` 0.4, `pos: "upper"`. Add `aberration` and `scanlines` for a harder read.
- **Type:** a soft rounded or geometric display. Avoid anything with sharp spurs - it fights the softness.
- **Photos:** wide or "too perfect"; one-point perspective; ceiling visible; zero or one distant person; bright. Dark or cramped corridors read as horror, not dreamcore.
- **Arc:** hook -> 3-5 slides with one feeling or fact each -> reveal where it is -> soft CTA.
- **Hooks:** "Accidentally found Level 1994 in {city}..." / "This isn't a render. It's a real building" / "POV: you walk into a dream in {city}".
- **Hashtags:** #dreamcore #liminalspace #{city} #nostalgia
- **Avoid:** horror words (abandoned, creepy, ghost). Use quiet, still, nostalgic - especially for places that are open businesses.

## Travel guide / hidden gems

- **For:** saveable "best X in {city}" lists. Usually the highest save rate.
- **Templates:** `editorial-split` with `kicker` numbers as the spine, `arch-window` and `index-card` to vary it, `polaroid-stack` for the payoff.
- **Treatment:** `pos: "top"` or the split block, warm accent, `grain` 0.05.
- **Photos:** bright, scenic, one subject per slide, varied angles.
- **Arc:** hook -> numbered slides (`"kicker": "01"`) with one concrete line each -> "Save this for your trip".
- **Hooks:** "Best sunset spots in {city}" / "{N} places in {city} tourists never find" / "I didn't know this existed in {city}".
- **Hashtags:** #{city}travel #hiddengems #traveltok
- **Avoid:** vague superlatives, unverifiable rankings.

## Romantic / soft aesthetic

- **For:** golden hour, sea, couples, warm light. Drives sends and saves ("take me here").
- **Templates:** `arch-window`, `quote-pull`, `polaroid-stack`. One `full-bleed-hook` at most.
- **Treatment:** a serif text face, low `vignette`, no stroke, `pos: "upper"` or `"lower"`.
- **Photos:** sunsets, water, silhouettes, people seen from behind.
- **Arc:** gentle hook -> 2-4 mood slides with one soft line -> "send this to someone".
- **Hooks:** "Take me here at sunset" / "A date idea in {city} nobody talks about".
- **Avoid:** pushy calls to action, heavy treatments, more than two lines of text.

## POV / storytime

- **For:** first-person mini story with a twist. Strong comments and completion.
- **Templates:** `caption-bar` carries a story well - the counter tells people how far they are. `quote-pull` for the turn, `full-bleed-hook` for the twist.
- **Treatment:** plain `highlight`, no texture tricks; the story is the thing.
- **Photos:** sequential, each advances the story, a reveal last.
- **Arc:** situation with a gap -> escalation -> twist on the last slide -> question to the viewer.
- **Hooks:** "POV: you took the wrong exit in {city}" / "Wait for the last slide".
- **Avoid:** spoiling the twist in slide 1 or the caption.

## Tips / how-to list

- **For:** practical numbered advice. Saves and shares.
- **Templates:** `frosted-card` and `notes-card` when the copy is longer than a line, `editorial-split` with `kicker` numbers when it is not.
- **Treatment:** one accent, `highlight: "box"` or `"marker"` on the one word that matters per slide.
- **Arc:** "{N} things to know before X" -> one tip per slide (max ~10 words) -> save.
- **Avoid:** tips that need a paragraph. If a tip needs a comma, it needs two slides.

## Retro / VHS / 90s

- **For:** 90s/Y2K nostalgia, bubble-era buildings, arcades.
- **Templates:** `duotone-poster`, `film-strip`, `caption-bar`. `compare` if you genuinely have a then and a now.
- **Treatment:** `scanlines: true`, `aberration: true`, `grain` 0.12, a mono face for kickers.
- **Hooks:** "Rewind to 1994 in {city}" / "This place never left the 90s".
- **Avoid:** implying a live business is old or closing.

## Goals

| Goal | Lean on |
|---|---|
| Saves | numbered lists, concrete facts, "save this" last slide |
| Shares | relatable or romantic lines, "send this to someone" |
| Comments | POV with a twist, a question on the last slide |
| Clicks | one soft call to action to the link in bio, brand named only at the end |
| Reach | strongest photo on the cover, shortest hook, 6-8 slides, `caption-bar` counters |

## Legacy engine

The Pillow renderer has styles and filters rather than templates. If you are
running `scripts/carousel.py`, map a niche like this:

| Niche | `--style` | `--filter` | `--pos` |
|---|---|---|---|
| Dreamcore | `dreamcore` or `dreamcore-quiet` | `dreamcore` or `bloom` | `upper` |
| Travel guide | `editorial` | `golden` | `top` |
| Romantic | `serif-soft` or `dreamcore-quiet` | `golden` | `upper` |
| POV | `clean-bold` or `handwritten` | `none` | `upper` |
| Tips | `clean-bold` or `editorial` | `contrast` | `upper` |
| Retro | `vhs-mono` | `vhs` | `upper`, with `"stamp": "1994 07 31"` |

Details: [styles-and-filters.md](styles-and-filters.md).
