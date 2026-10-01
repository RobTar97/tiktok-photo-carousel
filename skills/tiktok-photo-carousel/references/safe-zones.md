# Safe zones

TikTok draws its interface over your slides. Text under it is hidden or hard to read.

| Area | Covered by | Default in this skill |
|---|---|---|
| Top | status bar, tabs | 12% of the height kept clear |
| Bottom | caption, username, music, progress bar | 25% kept clear |
| Right edge | like, comment, share, profile buttons | 8% side margin each side |

On the default 1080x1920 canvas the text block lives between about y=230 and y=1440, x=86 to x=994, and the font shrinks (style `size_max` to `size_min`) until it fits. Positions: `top` centers the block 22% down, `upper` 32%, `middle` 43%.

## Check it

Run with `--debug`: the unsafe zones are shaded red on every slide. Keep important text and the subject out of the red.

## Tune it

- `--safe top,bottom,side` changes the fractions, e.g. `--safe 0.10,0.30,0.06`.
- `--preset instagram` uses a 1080x1350 (4:5) canvas with smaller margins for Instagram carousels.
- `--size 1080x1440` gives 3:4 if you prefer that ratio.

## Why text is not at the bottom

The bottom quarter is the busiest part of the interface and differs per device and per post (caption length changes how much is covered). Keeping text higher is the only layout that is safe everywhere.
