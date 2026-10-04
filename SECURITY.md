# Security

## What the skill touches

Everything runs on your machine.

| | |
|---|---|
| **Reads** | only the photos, clips, decks and brand kits you point it at |
| **Writes** | only the output folders you name; originals are never modified (`analyze.py --resize` writes copies) |
| **Network** | one request: the Google Fonts stylesheet in the built page. `theme.fontSource: "local"` removes it |
| **Live reload** | `build.js --watch` serves read-only, on `127.0.0.1` only, and only the folder that holds the page and its photos |
| **Subprocesses** | `ffmpeg` / `ffprobe` (video frames), and the skill's own scripts |
| **Posting** | never - it does not log in to or post to TikTok |

Copy in a deck is escaped before it reaches the page, so text cannot become
markup, and a `</script>` in copy cannot end the page's script block.

## Supported versions

Security fixes go into the latest release on `main`.

## Reporting a vulnerability

Please report privately through
[GitHub's private vulnerability reporting](https://github.com/RobTar97/tiktok-photo-carousel/security/advisories/new),
not in a public issue. Include what you found, how to reproduce it, and what
an attacker could do with it.

You can expect an acknowledgement within a few days, and credit in the
changelog for the fix unless you would rather not.
