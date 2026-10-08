# The review loop

Two gates. The point of both is that the user reacts to something they can
see, instead of answering questions about design in the abstract.

---

## Gate 1 - the concept board

Before building the deck, build its opening **three ways** and open it. One
board, three presets, the same cover and two slides in each:

```jsonc
{ "board": true, "slides": [
  { "group": "A - Contour", "preset": "contour", "template": "cover", ... },
  { "group": "A - Contour", "preset": "contour", "template": "editorial-split", ... },
  { "group": "B - Atlas",   "preset": "atlas",   "template": "cover", ... }, ... ] }
```

Keep the copy and photos identical across groups - the only thing being
compared is the look. Three is the number: two reads as a coin toss, four as
a menu. Ask which one, and offer "mix" - people often want one direction's
type with another's colour. ([presets.md](presets.md))

---

## Gate 2 - the studio

Build the deck and open `carousel.html`. Everything below lives in the page;
none of it reaches the export.

| Key | Button | What it does |
|---|---|---|
| `P` | Play | The deck as a viewer meets it: phone frame, TikTok interface, auto-advancing. Arrows move, space pauses, Esc closes. |
| `X` | Safe zones | Shades what TikTok covers, and the 1:1 crop the profile grid keeps |
| `C` | TikTok UI | Draws the interface over every slide in the grid |
| `E` | Edit text | Every headline, sub, kicker, CTA and annotation editable in place |
| `V` | Check | Runs the safe-zone verifier |
| `Ctrl+S` | Save edits | Downloads `edits.json`, not yet approved |
| | **Approve deck** | Downloads `edits.json` marked approved |

Under every slide: **Keep / Change** and a note box. A note marks the slide
Change on its own. The tally in the toolbar says how much is reviewed.

**Tell the user to press P first.** A slide they cannot read before it moves
on is a slide with too many words - nothing else shows that as plainly.

### Live reload

```bash
node scripts/build.js --deck work/deck.json --out work/carousel.html --watch
```

Serves the studio on `http://localhost:4173/...` and rebuilds whenever the
deck, a preset or the engine changes. The open page reloads itself and keeps
its scroll position, Keep/Change verdicts and notes - so you can edit
`deck.json` while the user reviews, without asking them to refresh or losing
what they marked. It serves read-only, on 127.0.0.1 only.

### Applying what comes back

```bash
node scripts/apply-edits.js --deck work/deck.json --edits ~/Downloads/edits.json
```

Copy edits are written into the deck (the old one is kept as `.bak`). Every
slide marked Change is listed with its note, for you to act on: a new crop
(`focus`), a different photo, a template, a word. Rebuild and send the studio
back. Repeat until it prints **APPROVED** with no requests - then export.

---

## The verifier

`export.js` runs it automatically and writes `_report.json`. It measures every
copy element against the three zones TikTok covers and reports real overlaps
in canvas pixels, plus any slide whose copy hit the minimum font size.

```
safe-zone issues (2):
  ! slide 2 headline overlaps the icon rail [86x92px]  "It starts at the water"
  ! slide 6 headline copy hit the minimum size and may still be cramped
```

What each one means:

| Report | Fix |
|---|---|
| overlaps the top bar | Move to `pos: "upper"` or lower |
| overlaps the caption area | The copy is too tall — shorten it or raise `pos` |
| overlaps the icon rail | Shorten the line, or set `"rail": false` if you are sure that slide's right edge is empty |
| overlaps the side margin | A long unbroken word; add ` // ` |
| hit the minimum size | The slide is carrying two ideas. Split it. |

Pass `--strict` to make the export exit non-zero when anything is flagged —
useful if this ever runs in CI.

Never ship a deck with issues outstanding. The verifier only reports things
that are genuinely covered on a real phone.

---

## The readability audit

The verifier answers *is the copy where TikTok will cover it*. The audit
answers *can anyone actually read it*:

```bash
python3 scripts/audit.py --out ./out --fix work/deck.json
```

It reads the exported slides, the measurements the browser recorded, and the
background plates `export.js` renders alongside them - the same slides with
the glyphs made transparent and every card, chip, band and scrim still
painted. For each line it computes real WCAG contrast against the pixels
behind it.

```
#   element     size    ratio  worst   text
 6  headline     123px  11.7    7.9   Checkerboard floor, red columns
X7  kicker        32px   2.1    1.0   look up
```

- **ratio** is against the mean background, **worst** against the 2nd
  percentile - the spot where the line actually gives out.
- Below **3.0:1** fails. Below **4.5:1** warns. Under 48px for a headline or
  32px for anything else fails.
- A highlighted word is measured on its own, on its glyph body, and cut out of
  its headline's sample - it has its own colour and its own band.
- Labels that paint their own ground (kicker tags, edge tabs, figcaptions) are
  measured inside that ground.

### --fix

`--fix` raises the scrim on every slide whose copy over a photo falls short
and writes the deck back (keeping `deck.json.bak`). Rebuild, export, audit
again; it converges in two or three rounds.

It remembers each round in `out/_fix.json`. When a slide's ratio did not move
after its scrim went up, it stops and says so: the scrim is not the problem -
something drawn above it (a highlight band, generated art) sits behind the
copy. Find it in the studio with `X`, then lower that art's opacity or move it.

It never changes copy, colour or layout. Those are design decisions; the
report tells you which to make.

### Why background plates

Measuring inside a finished slide does not work: antialiased glyph edges form
a continuous ramp between the text colour and the background, and every
headline measures about 1.1:1. The plates give the true ground.

### The cover

The audit also writes `_cover_grid.png` - the cover as the profile grid crops
it to 1:1 - and reports anything that falls outside that square.
