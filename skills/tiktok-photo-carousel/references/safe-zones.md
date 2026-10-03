# Safe zones

TikTok draws its interface over your slides. Copy under it is hidden.

## The numbers

On the 1080x1920 canvas, from TikTok's published media specs:

| Area | Covered by | Default here | Pixels |
|---|---|---|---|
| Top | username row, tabs | `top: 0.085` | 163 |
| Bottom | caption, music, buttons, progress | `bottom: 0.15` | 288 |
| Sides | margin | `side: 0.07` | 76 each |
| Lower right | like / comment / share column | `rail: 0.16` from `railTop: 0.42` | 173 wide |

That leaves roughly the centre 1080x1470 fully visible, and the icon column
only matters below 42% of the height.

Earlier versions of this skill reserved 12% and 25%. That is safe but throws
away about 300px of usable canvas, and on a 9:16 frame that is the difference
between a headline at 96px and one at 132px.

## One source of truth

`deck.safe` drives both the CSS clearances and the verifier, so the layout and
the check can never disagree:

```json
"safe": { "top": 0.085, "bottom": 0.15, "side": 0.07,
          "rail": 0.16, "railTop": 0.42 }
```

Every template derives its padding from these. Adding a template means setting
padding on `.layer-type` in terms of `--safe-t` / `--safe-b`, never a
hard-coded fraction.

## Seeing it

In the studio, `X` shades the covered areas in red and `C` draws a mock of the
real interface over the slide. Press `C` - watching your own caption block eat
the bottom of the frame explains the zones faster than this page does.

## The cover is different

On a photo post the first image **is** the cover, and the profile grid
centre-crops it to 1:1. The top and bottom 420px vanish there, so only the
centre 1080x1080 survives.

The `cover` template is built around that: the title sits inside the square,
and the swipe cue goes in the band below it, which the feed shows and the grid
crops away. `scripts/audit.py` writes `_cover_grid.png` so you can see the
cropped version, and reports anything that falls outside the square.

## Minimum sizes

TikTok's own floor is 48px for a headline and 32px for body text on this
canvas. The stylesheet enforces the body floor absolutely - `.sub`, `.kicker`,
`.cta` and the small labels never scale below 32px however far the headline
shrinks - and `audit.py` fails anything under either number.

## Checking

`scripts/export.js` measures every piece of copy against these zones and
reports real overlaps in pixels. It does not judge whether text sits on a
face; look at the contact sheet for that.

For whether the copy is *readable* rather than merely *visible*, run
`scripts/audit.py`. See [review-loop.md](review-loop.md).
