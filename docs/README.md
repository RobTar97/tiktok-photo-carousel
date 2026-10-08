# Documentation

Everything about tiktok-photo-carousel, by what you are trying to do.

Two kinds of document live in this repo:

- **Guides** in `docs/` are written for people - using the skill, understanding
  it, contributing to it.
- **References** in `skills/tiktok-photo-carousel/references/` are written for
  the agent, and read on demand while it works. They ship inside the skill, so
  an installed copy is self-contained. They are precise and complete, so
  people use them as the specification too.

---

## Start here

| | |
|---|---|
| [Getting started](getting-started.md) | Install, run the self-test, make a first carousel |
| [The workflow](workflow.md) | What happens at each step, and what you decide at each gate |
| [FAQ](faq.md) | No AI images? Why HTML? Does it post for me? |

## Use it

| | |
|---|---|
| [The workflow](workflow.md) | Brief, source, hook, concept board, studio, export |
| [Video frames](../skills/tiktok-photo-carousel/references/video.md) | Pulling the best stills from clips, HDR included |
| [The review loop](../skills/tiktok-photo-carousel/references/review-loop.md) | The studio's keys, play mode, approving, live reload, the audit |
| [Troubleshooting](troubleshooting.md) | Every error message and what to do about it |

## Style

The library includes **15 presets and 37 layouts**, with five reference-led
families: **Sunlit, Together, Harvest, Weekender and Dew**. Browse the
[visual gallery](../README.md#templates) or start from a
[demo deck](../examples/README.md).

| | |
|---|---|
| [Presets](../skills/tiktok-photo-carousel/references/presets.md) | The fifteen ready-made looks, how to choose, how to make one |
| [Reference-led styles](../skills/tiktok-photo-carousel/references/reference-styles.md) | Sunlit, Together, Harvest, Weekender and Dew: references, typography and layout rules |
| [Templates](../skills/tiktok-photo-carousel/references/templates.md) | All 37 layouts, the nine covers, how to add one |
| [Code-drawn art](../skills/tiktok-photo-carousel/references/art.md) | The 21 generators, placement, aiming art at the copy |
| [Design system](../skills/tiktok-photo-carousel/references/design-system.md) | Colour, type, texture, legibility - the rules behind every preset |
| [Brand kits](../skills/tiktok-photo-carousel/references/brand-kit.md) | Your fonts, colours and copy rules over any preset |

## Write

| | |
|---|---|
| [Hooks](../skills/tiktok-photo-carousel/references/hooks.md) | Eight mechanisms, a scoring rubric, rewrites, Japanese patterns |
| [Captions](../skills/tiktok-photo-carousel/references/captions.md) | Slide copy, caption structure, hashtags |
| [Niches](../skills/tiktok-photo-carousel/references/niches.md) | Dreamcore, travel, romantic, POV, tips, retro - what each needs |

## Under the hood

| | |
|---|---|
| [How it works](how-it-works.md) | The pipeline, the engine's layers, why HTML, why no pixel reads |
| [deck.json](../skills/tiktok-photo-carousel/references/deck-format.md) | The one file that describes a carousel; what the build checks |
| [Safe zones](../skills/tiktok-photo-carousel/references/safe-zones.md) | What TikTok covers, measured on a real phone |
| [Quality and testing](quality.md) | Self-test, verifier, audit, CI, the real-phone test |
| [SKILL.md](../skills/tiktok-photo-carousel/SKILL.md) | The procedure the agent follows, phase by phase |

## Legacy engine

| | |
|---|---|
| [Styles and filters](../skills/tiktok-photo-carousel/references/styles-and-filters.md) | The v1 Pillow renderer's eight styles and seven filters |
| [Script format](../skills/tiktok-photo-carousel/references/script-format.md) | The v1 renderer's input |

## Project

| | |
|---|---|
| [Contributing](../CONTRIBUTING.md) | Adding presets, templates and generators; running the checks |
| [Roadmap](roadmap.md) | What is measured, what is not yet, what is next |
| [Changelog](../CHANGELOG.md) | Every release, with the reasoning |
| [Examples](../examples/README.md) | Demo photos, decks and how the renders are made |
| [Code of conduct](../CODE_OF_CONDUCT.md) · [Security](../SECURITY.md) · [License](../LICENSE) | |
