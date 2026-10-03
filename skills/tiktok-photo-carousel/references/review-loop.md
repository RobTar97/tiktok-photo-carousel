# The review loop

Two gates. The point of both is that the user reacts to something they can
see, instead of answering questions about design in the abstract.

---

## Gate 1 — concepts

Before building eight slides, build **slide 1 only, three ways**, and open it.

```bash
node scripts/build.js --deck work/concepts.json --out work/concepts.html
```

`concepts.json` is an ordinary deck whose three slides are the same hook on
three different directions. Vary the things that actually carry a direction:

| Vary | Do not vary |
|---|---|
| Template | The hook copy |
| Display face | The photo (unless the direction is about the photo) |
| Accent and background | Slide count |
| Texture strength | |

Three is the number. Two reads as a coin toss, four reads as a menu.

Then ask which one, and offer "mix" — people usually want one direction's type
with another's colour, and that is a one-line change.

---

## Gate 2 — the studio

Build the full deck and open `carousel.html`. Everything below is in the page;
none of it is in the export.

| Key | Button | What it does |
|---|---|---|
| `X` | Safe zones | Shades what TikTok's interface covers, in red |
| `C` | TikTok UI | Draws the real chrome — icon rail, caption, progress bar |
| `E` | Edit text | Makes every headline, sub, kicker and CTA editable in place |
| `V` | Check | Runs the safe-zone verifier and lists what it found |
| `Ctrl+S` | Export edits | Downloads `edits.json` |

The textarea in the corner goes into `edits.json` as `notes`, so per-slide
feedback travels with the copy changes.

**Tell the user to press `C`.** Seeing their own caption block sitting over
the bottom quarter of the frame explains the safe zones faster than any
description of them does.

### Applying what comes back

`edits.json` carries copy only, keyed by slide index. Merge it into
`deck.json`, rebuild, re-export. Layout is untouched, so a round of text edits
can never break the geometry — which is the whole reason copy and layout live
in separate places.

If the notes ask for a layout change, change `deck.json` directly: template,
`pos`, `focus`, `size`, or the photo.

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
