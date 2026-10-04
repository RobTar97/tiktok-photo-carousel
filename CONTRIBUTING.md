# Contributing

Thank you for considering it. Most contributions here are small and
self-contained - a preset, a template, a drawing generator, a niche playbook -
and the self-test renders and audits them for you, so you find out quickly
whether they work.

## Ground rules

1. **No AI image generation, no stock.** Imagery comes from the user's photos,
   their video, or code. A contribution that generates or fetches images will
   not be merged.
2. **Readable by measurement.** Anything that puts text on a slide must pass
   the readability audit on ordinary photos, not just the one you tried.
3. **Never invent facts.** Art that prints words - seals, badges, labels -
   reads them from the theme or drops the element; it never makes one up.
4. **Self-contained skill.** Everything the agent needs at runtime lives in
   `skills/tiktok-photo-carousel/`. Human docs go in `docs/`.

## Setup

```bash
git clone https://github.com/RobTar97/tiktok-photo-carousel.git
cd tiktok-photo-carousel
npm install && npx playwright install chromium
pip install -r skills/tiktok-photo-carousel/requirements.txt
npm test                       # the full self-test - must print OK
```

ffmpeg is optional; without it the self-test skips the video step and says so.

## Before you open a pull request

```bash
npm test                       # renders, audits, drives the studio
npm run examples               # if you changed anything visual
```

`npm run examples` rebuilds every demo deck, audits it, and regenerates
`examples/renders/templates.png` and `presets.png`. Commit the updated
renders with your change so the README stays truthful.

## Adding a preset

1. Copy a file in `skills/tiktok-photo-carousel/presets/` and rename it.
2. Give it **one signature element** and keep the rest quiet. Check it is not
   one of the three looks AI design defaults to: cream with a serif and a
   terracotta accent; near-black with one acid accent; hairline broadsheet.
3. List exact `googleFonts` specs, so italics are real italics.
4. Scope its `css` to `.slide[data-preset='your-name']`.
5. Put it on a concept board with several photos - bright, dark, busy - and
   run the audit. It must clear without hand-tuned scrims.
6. Add a row to `references/presets.md`.

Full guide: [presets.md](skills/tiktok-photo-carousel/references/presets.md#making-a-preset).

## Adding a template

1. Add a block to `html/templates.css` keyed on `.slide[data-template="name"]`.
2. Set padding on `.layer-type` in terms of `--safe-t` / `--safe-b`, never on
   `.type-box` - that is how autofit knows where copy may live.
3. Extra DOM goes in `ART` in `html/engine.js`; generated art in
   `TEMPLATE_ART`.
4. Add a case to `TEMPLATES` in `scripts/selftest.js`.
5. Run it in every preset. A template that only reads in one look is not
   finished.

Full guide: [templates.md](skills/tiktok-photo-carousel/references/templates.md#adding-a-template).

## Adding a generator

Generators live in `html/art.js` as `GEN.name = function (ctx, o) { ... }` and
return SVG markup. They must be **seeded** (use `ctx.rand` and `ctx.noise`,
never `Math.random`), so the studio and the export draw the same picture.
Photo-derived generators read `ctx.photo`, never pixels. Add a case to `ART`
in the self-test and a row to [art.md](skills/tiktok-photo-carousel/references/art.md).

## Code style

Match what is there. Plain JavaScript with no build step and no dependencies
in the page; Python standard library plus Pillow. Comments explain *why* - a
measured failure, a browser quirk - not what the next line does. `.editorconfig`
sets indentation.

## Commits and pull requests

- One change per pull request.
- Say what you measured: audit output, a before/after render, a phone
  screenshot.
- If you fix a bug, add a line to `CHANGELOG.md` under an unreleased heading,
  with the reason - the changelog explains decisions, not just changes.

## Reporting bugs and ideas

Use the [issue templates](https://github.com/RobTar97/tiktok-photo-carousel/issues/new/choose).
Screenshots from a real phone are the most useful evidence there is - see
the gaps listed in the [roadmap](docs/roadmap.md).

By contributing you agree that your contribution is licensed under the
[MIT License](LICENSE), and to follow the [code of conduct](CODE_OF_CONDUCT.md).
