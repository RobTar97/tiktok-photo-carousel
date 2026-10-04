# Getting started

From nothing to a carousel you can post, in about ten minutes.

## 1. Requirements

| | Version | For |
|---|---|---|
| An agent that runs skills | - | Claude Code, Cursor, Codex and others ([skills CLI](https://github.com/vercel-labs/skills)) |
| Node.js | 18+ | rendering and export |
| Python + Pillow | 3.9+ | photo analysis and the readability audit |
| ffmpeg | any recent | only if you use video clips |

A network connection is needed the first time a look is built, for its Google
Fonts. Everything else runs locally.

## 2. Install

```bash
npx skills add RobTar97/tiktok-photo-carousel
```

Useful flags: `--list` to see what is inside, `-a claude-code` for one agent,
`-g` to install globally. Without the CLI, copy `skills/tiktok-photo-carousel/`
into your agent's skills folder (`~/.claude/skills/` for Claude Code).

Then, from the installed skill folder:

```bash
npm install && npx playwright install chromium
pip install -r requirements.txt
```

For video, install ffmpeg:

| | |
|---|---|
| Windows | `winget install Gyan.FFmpeg` |
| macOS | `brew install ffmpeg` |
| Linux | `apt install ffmpeg` |

## 3. Check it works

```bash
node scripts/selftest.js
```

It renders every template, preset and drawing generator, audits their
contrast, drives the review studio like a reviewer, and - if ffmpeg is present
- pulls frames from a generated clip. It ends with:

```
OK - 65 slides, 24 template cases, 10 presets, 21 generators
```

## 4. Make a carousel

Put your photos (and any clips) in a folder, and ask your agent:

> Make a TikTok carousel from `./osaka-trip`. Travel guide, goal is saves.

What happens next, and what it will ask you, is in [The workflow](workflow.md).
The short version:

1. One round of questions: niche, goal, language, number of slides.
2. It picks the best frames and photos and shows you three scored hooks.
3. A **concept board** opens in your browser - the same opening slides in
   three styles. You pick one.
4. The **studio** opens with the full deck. Press **P** to watch it as a
   viewer would. Mark each slide **Keep** or **Change**, add notes, edit any
   text in place, then **Approve deck**.
5. It exports, audits readability, fixes what it can, and hands you
   `upload/`.

## 5. Post it

`upload/` holds the slides as numbered JPEGs. **Post them in that order** -
`01.jpg` is the cover. The caption is in `caption.md`.

Before a real post, consider one private test: post as **Only me**, look at it
on your phone, and delete it. See [Quality and testing](quality.md) for what
we measured doing exactly that.

## Without an agent

Every step is a script you can run yourself. From the skill folder:

```bash
python3 scripts/frames.py      --videos ./clips --out ./photos
python3 scripts/analyze.py     --photos ./photos --out work/analysis.json --resize work/photos
node    scripts/build.js       --deck work/deck.json --out work/carousel.html --watch
node    scripts/apply-edits.js --deck work/deck.json --edits ~/Downloads/edits.json
node    scripts/export.js      --html work/carousel.html --out ./out
python3 scripts/audit.py       --out ./out --fix work/deck.json
```

You write `deck.json` yourself - [the format](../skills/tiktok-photo-carousel/references/deck-format.md)
is short, and a preset makes it shorter:

```jsonc
{
  "photos": "./photos",
  "theme": { "preset": "contour" },
  "slides": [
    { "template": "cover", "photo": "a.jpg",
      "text": "This isn't a *render*", "sub": "it's a real building, and you can walk in" },
    { "template": "editorial-split", "photo": "b.jpg", "kicker": "look up",
      "text": "Seven floors in primary colours", "sub": "stacked to the roof" },
    { "template": "end-card", "text": "Save this for // your *Osaka* list", "cta": "save" }
  ]
}
```

## Next

- [Presets](../skills/tiktok-photo-carousel/references/presets.md) - pick a look
- [Hooks](../skills/tiktok-photo-carousel/references/hooks.md) - the copy that decides everything
- [Troubleshooting](troubleshooting.md) - if something did not work
