# Frames from video

Most phone camera rolls are half video. `scripts/frames.py` pulls the best
stills out of clips - no AI, just ffmpeg and a scoring pass - so a clip is as
usable as a photo.

```bash
python3 scripts/frames.py --video IMG_2231.MOV --out ./photos
python3 scripts/frames.py --videos ./clips --out ./photos --count 8
```

Then analyse the folder like any other:

```bash
python3 scripts/analyze.py --photos ./photos --out work/analysis.json --resize work/photos
```

## What it does

1. Samples a few frames a second at low resolution (capped, so a long clip
   stays quick).
2. Scores each for **sharpness** (Laplacian spread - motion blur and missed
   focus score low) and **exposure** (crushed shadows, blown highlights and
   flat frames are penalised).
3. Drops near-duplicates by perceptual hash, so a held shot gives one frame,
   not eight.
4. Spreads the picks across the clip with a minimum gap, and never keeps a
   frame scoring under a quarter of the clip's best.
5. Extracts the winners at full resolution (long edge `--max`, default 2160).

Frames are named `<clip>_t<seconds>.jpg` so you can find the moment again.
`_frames.json` records every pick with its scores; `_frames.png` is a contact
sheet.

## HDR

iPhones and most recent Android phones shoot HDR video (HLG or PQ) by default.
A naive frame grab from HDR comes out flat and grey, because a JPEG cannot say
"this is HDR". `frames.py` reads the transfer function with ffprobe and
tone-maps HDR to SDR (BT.709) before extracting. The log line says
`HDR->SDR` when it did.

## Options

| | Default | |
|---|---|---|
| `--count` | 8 | frames to keep per clip |
| `--min-gap` | spread evenly | minimum seconds between picks |
| `--max` | 2160 | long edge in pixels |
| `--format` | jpg | or png |

## Installing ffmpeg

| | |
|---|---|
| Windows | `winget install Gyan.FFmpeg` |
| macOS | `brew install ffmpeg` |
| Linux | `apt install ffmpeg` |

## Choosing among frames

The script picks sharp, well-exposed, distinct frames. It cannot tell you
which one is the *moment*. Look at `_frames.png` and judge as you would any
photo: one clear subject, a frame that makes the hook believable for the
cover, and variety across the deck. A frame of something moving often makes
a stronger cover than any still, because it looks caught rather than posed.
