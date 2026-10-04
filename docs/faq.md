# FAQ

### Does it use AI to make images?

No. Every image is a photo you took, a frame from your own video, or a
drawing made by code from your photo - contour lines traced from its light,
halftone dots, ASCII characters, pixel tiles - or a decoration drawn by code
(pen marks, seals, grids). The agent writes copy and makes design decisions;
it never generates imagery, and it will not invent scenery.

### Then what does the agent actually do?

Judgment: which frames to keep, what order, the hook and the copy, which
look, which layout for each slide, and reading the checks. The measuring -
crop, contrast, type size, safe zones - is done by code.

### Does it post to TikTok for me?

No. It hands you `upload/` - the slides numbered in posting order - and a
caption. You post them.

### Why HTML instead of an image library?

Real layout, real typography, Japanese line breaking, SVG and blend modes,
then exact pixels via Playwright. The v1 image-library renderer could only
put text over a photo. See [How it works](how-it-works.md).

### Does it work offline?

After the first build of a look, mostly: fonts load from Google Fonts. Set
`theme.fontSource: "local"` and supply your own fonts to stay fully offline.
The legacy Pillow renderer (`scripts/carousel.py`) is offline by design.

### Japanese?

Yes, as a first-class path: Japanese fonts in the `washi` preset, looser
leading, line breaks only where you put them, vertical type, and Japanese hook
patterns in [Hooks](../skills/tiktok-photo-carousel/references/hooks.md).

### Instagram?

The HTML engine is built around TikTok's 9:16 frame and interface. The legacy
renderer has a `--preset instagram` (1080x1350). Instagram support in the
HTML engine is on the [roadmap](roadmap.md).

### Can I use my brand's fonts and colours?

Yes - a [brand kit](../skills/tiktok-photo-carousel/references/brand-kit.md)
layers over any preset: your fonts and colours, the preset's art.

### How many slides?

3 to 35 (TikTok's limit). Swipe-through drops off past about 10; the build
warns above 12.

### What if I do not like any of the three directions?

Say so. Ask for a mix ("A's type with C's colours"), a different preset, or
describe what you want - the concept board is cheap to rebuild.

### Can I edit the text myself?

Yes: press **E** in the studio and click any text. Your edits come back in
`edits.json` and are merged into the deck. Layout changes go in a note on the
slide.

### How do I know it is readable?

The audit measures it - contrast against the actual pixels, minimum sizes -
and fixes what it can. See [Quality and testing](quality.md).

### Is my data sent anywhere?

No. Scripts read only the files you point them at and write only where you
tell them. Originals are never modified. The one network request is the
Google Fonts stylesheet. See [SECURITY.md](../SECURITY.md).
