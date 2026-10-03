# Brand kits

A brand kit is a `theme` plus a set of copy rules, kept outside the deck so
one account's look can be reused across every carousel.

```bash
node scripts/build.js --deck work/deck.json --brand brand/mybrand.json \
                      --out work/carousel.html
```

The merge order is **brand under deck**: anything the deck sets wins, so a
one-off slide can break the brand without editing the kit.

## Shape

See `brand/example-brand.json`. Two top-level keys:

- `theme` — exactly the fields documented in `references/deck-format.md`.
- `rules` — copy constraints. These are not read by any script; they are read
  by you, before writing a word.

| Rule | Use |
|---|---|
| `tone` | One sentence. Specific enough to reject a draft. |
| `never` | Words the brand does not use. Check every slide and the caption. |
| `always` | Standing instructions, e.g. where the brand name may appear. |
| `cta` | The approved calls to action. Pick one, not two. |
| `logo` | Path to a logo file, or `null`. |

## Making one

If the user already has brand guidelines — a document, a notes app, an
existing design system file — read those first and build the kit from them.
Their rules beat every default in this skill.

If they do not, build the kit from their photos: run `analyze.py` over a
representative set, look at the palettes it returns, and propose a theme from
what is actually there. Then show it as a Gate 1 concept rather than asking
them to approve hex codes.

## Logos

There is no logo template. If a deck needs a lockup, put it on the `end-card`
and nowhere else — a logo on every slide is a brand's instinct and a viewer's
cue to swipe past.
