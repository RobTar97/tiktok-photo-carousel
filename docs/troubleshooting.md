# Troubleshooting

Find the message or the symptom; the fix is next to it.

## Installing

| Problem | Fix |
|---|---|
| `Playwright is missing` | `npm install && npx playwright install chromium` in the skill folder |
| `Pillow is required` | `pip install -r requirements.txt` |
| `ffmpeg not found` | install ffmpeg - only needed for video ([how](getting-started.md#2-install)) |
| `python3: command not found` on Windows | use `python` |
| The self-test says a step was skipped | it names the missing tool - install it, or ignore the step if you do not need it |

## Photos and video

| Problem | Fix |
|---|---|
| A photo appears sideways | it carries EXIF rotation; run `analyze.py` with `--resize`, which writes upright copies |
| The studio is slow | you skipped `--resize`; full-size phone photos are 16 MP each |
| `photo not found` from `build.js` | the name in `deck.json` must match the file in the photos folder exactly |
| `"x.jpg" is not in analysis.json` | the photo was added after analysis - run `analyze.py` again |
| Video frames look grey and flat | the clip is HDR; `frames.py` tone-maps it - use it rather than a manual screen grab |
| `frames.py` keeps very few frames | the clip is mostly blurred, dark or one held shot; it keeps distinct, sharp frames only |

## Building

| Message | Fix |
|---|---|
| `hook is N words` | 5-9 words; see [Hooks](../skills/tiktok-photo-carousel/references/hooks.md) |
| `slide N: ~N words - nobody reads that before it advances` | the slide carries two ideas - split it |
| `slide 1 is "x" - ... use the cover template` | use `cover`, `cover-word`, `cover-split` or `cover-frame` |
| `same template as the slide before` | vary neighbouring layouts |
| `"best" is a claim` | fine if you said it; otherwise cut it |
| `unknown preset` | the message lists the available ones |
| `caption's first line is N characters` | most people only see the first line before "more" |
| Fonts fall back to system faces | the Google Fonts request was blocked; check the network, or set `theme.fontSource: "local"` |

## Exporting and the audit

| Message | Fix |
|---|---|
| `overlaps the icon rail` | shorten the line, or `"rail": false` if that slide's right edge is truly empty |
| `overlaps the caption area` | the copy is too tall - shorten it or raise `pos` |
| `overlaps the photo counter` | a long line at `pos: "top"` - move it down |
| `copy hit the minimum size` | too many words for the template - split the slide |
| `drops to N:1 against its background` | run `audit.py --fix`, rebuild and export |
| `stayed at N:1 after its scrim went up` | something drawn above the scrim (a highlight band, art) sits behind the copy - find it with **X** in the studio, then lower that art's opacity or move it |
| `is already at scrim 0.86` | the photo is too bright behind the copy - move the copy with `pos`, or use `cover-split`, `frosted-card` or `caption-bar` |
| `has no scrim behind its copy` | the copy sits on a block or paper - change the colours |
| `cover headline leaves the 1:1 grid crop` | slide 1 is not a cover template |

## The studio

| Problem | Fix |
|---|---|
| A key does nothing | you are typing in a note box - click outside it first |
| The note box is hidden | click **Change** on that slide |
| `edits.json` has fewer slides than the deck | the deck changed after the studio was built; `apply-edits.js` warns and applies by index |
| Live reload does not reload | open the `http://localhost` address `--watch` printed, not the file |

## On the phone

| Problem | Fix |
|---|---|
| Colours look different | TikTok recompresses; avoid very thin type and very low contrast |
| Slides in the wrong order | post `upload/` in filename order - 01 is the cover |
| Text looks smudged on a card | update to 3.1.1 or later |

Still stuck? [Open an issue](https://github.com/RobTar97/tiktok-photo-carousel/issues/new/choose).
