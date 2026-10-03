# Design system

What separates a carousel that looks designed from one that looks generated.
Read this before choosing a theme.

## 1. Colour comes from the photographs

Do not open with a palette in mind. `analyze.py` pulls five dominant colours
per photo, dark to light, and `build.js` seeds `theme.palette` from slide 1.
Build the accent out of that set, or out of something genuinely present in the
photos, and the deck sits in the same world as the images.

A yellow highlight on a red building is a decision. A yellow highlight because
yellow was the default is not.

Rules:

- **`palette[0]` is the background.** It is the darkest swatch, so flat slides
  and colour blocks sit in the photos' shadow colour.
- **Accent is for one job per slide** — a highlighted word, a kicker, a rule,
  or the end card. Not all four at once.
- **Check the accent against what sits on it.** The engine computes
  `--on-accent` from the accent's luminance, so an end card on a pale accent
  gets dark type automatically. Do not hand-set that colour.
- Dominant colour plus one sharp accent beats four colours sharing the frame.

## 2. Type

Two faces, three at most: a display for headlines, a text face for sub lines
and quiet templates, plus mono for kickers. Handwriting is a fourth, used by
exactly two templates.

**Avoid**: Inter, Roboto, Arial, Open Sans, Montserrat, Poppins, and system
stacks. Also avoid Space Grotesk — it is the font every generator reaches for.

Pairings that hold up at 130px over a photo:

| Direction | Display | Text | Mono |
|---|---|---|---|
| Modern editorial | Bricolage Grotesque | Instrument Sans | Space Mono |
| Travel magazine | Fraunces | Public Sans | IBM Plex Mono |
| Loud / poster | Anton, Archivo Expanded | Archivo | JetBrains Mono |
| Soft / dreamcore | Fredoka, Outfit | Lora | Space Mono |
| Zine / raw | Redaction, Syne | Work Sans | Courier Prime |

### Japanese

JP is a first-class path here, not a fallback font flag.

| Use | Face |
|---|---|
| Display, modern | Zen Kaku Gothic New (700/900) |
| Display, editorial | Shippori Mincho B1 |
| Text | Zen Kaku Gothic New, Noto Sans JP |
| Warm / rounded | Zen Maru Gothic, M PLUS Rounded 1c |

- Set `theme.text` to a JP face even on a bilingual deck — Latin inside a JP
  face is better than JP falling back mid-sentence.
- JP needs looser leading than Latin: `1.3`–`1.5`, not `1.06`.
- Break lines yourself with ` // `. Browsers break CJK anywhere, which puts
  particles at the start of a line and reads badly.
- `"vertical": true` turns on vertical type (`writing-mode: vertical-rl`).
  Use it on one slide for effect, not on a whole deck, and only with a short
  line.

## 3. Texture

Flatness is what makes a render look machine-made. Every slide gets three
cheap layers:

| Layer | Default | Raise it when |
|---|---|---|
| `grain` | 0.06 | Film or nostalgia direction (0.10–0.14) |
| `vignette` | 0.35 | The subject is central and the edges are busy |
| `aberration` | off | VHS / dreamcore / liminal |
| `scanlines` | off | Same, for a harder read |

Grain at 0.06 is invisible if you look for it and obvious if you remove it.
That is the right amount.

## 4. Contrast is measured, not guessed

The old renderer picked a shadow and hoped. This one measures:

- `analyze.py` reads the mean luminance and the busyness of the strip each
  text position actually sits on, and sets the scrim from both.
- `fitScrim()` in the engine points the gradient's end past the last line of
  copy, whatever size the autofit settled on.
- The sub line gets a tighter, denser shadow than the headline, because it is
  smaller and thinner and goes unreadable first.

If a slide still reads badly, the fix is the photo or the position, not more
black. A scrim above about 0.7 means the photo is fighting the copy — move the
text with `pos`, or use `frosted-card` and let the photo be atmosphere.

## 5. Hierarchy per slide

One idea. One emphasis. The sizes are already proportional (`sub` is 0.38 of
the headline, `kicker` is 0.20), so hierarchy is about **what you leave out**.

- A kicker and a sub and a highlight on the same slide is two too many.
- If the headline needs a comma, it probably needs to be two slides.
- The hook slide carries no kicker and no CTA. Only the hook.

## 6. Motion

The export is still images, so motion is not part of the output. The studio
animates nothing on purpose: you are judging what a viewer sees in one second,
and an entrance animation flatters a slide that will not earn that second.
