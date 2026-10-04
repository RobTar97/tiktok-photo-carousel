# Roadmap

What is verified, what is not yet, and what might come next. Ideas and
evidence welcome - [open an issue](https://github.com/RobTar97/tiktok-photo-carousel/issues/new/choose).

## Verified

- Safe zones on a real phone (iPhone 16e) - every reservation clears what
  TikTok draws. → [Quality and testing](quality.md)
- Every template, preset and generator renders, fits and clears contrast on
  CI across Linux, macOS and Windows.
- Frame extraction from SDR and HDR (HLG) clips.

## Not yet measured

| | Why it matters | How to settle it |
|---|---|---|
| **Profile grid crop** | Published sources disagree between 1:1 and 3:4; the covers assume 1:1 | A screenshot of a profile grid with a published post |
| **Caption collapse** | How much of the first line shows before "more" | A screenshot of a post with a long caption |
| **Other phones** | Interface placement varies with screen shape | Screenshots from an Android phone and an older iPhone |
| **Compression of fine art** | Riso halftone, ASCII and contour lines are the most fragile under TikTok's recompression | One private post of a stress-test deck |
| **Real phone clips** | Tested on generated SDR and HDR clips only | A handheld, portrait, HDR clip from a phone |

If you can provide any of these, please open an issue with the screenshots.

## Ideas

| Idea | Notes |
|---|---|
| Instagram carousels in the HTML engine | 1080x1350, Instagram's own interface and safe zones |
| A stress-test deck | the most compression-sensitive presets and the tightest positions, ready to post privately |
| More presets | each needs one signature element and must pass the audit on ordinary photos |
| Per-slide crop editing in the studio | today a crop change goes in a note |
| A narrated video export | out of scope for photo mode, but the decks already describe a sequence |

## Out of scope

- Generating or extending images with AI.
- Posting on the user's behalf.
- Stock imagery.
