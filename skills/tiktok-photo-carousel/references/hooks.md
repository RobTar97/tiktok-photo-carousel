# Hooks

The hook is the copy on slide 1. It is read in under a second, in a feed,
next to a hundred other things - and then again on the profile grid, cropped
to a square. Its only job is to open a question that the viewer closes by
swiping.

Everything else in the deck is wasted if the hook loses them.

## The rules (the build linter checks these)

| Rule | Why |
|---|---|
| **5-9 words**, 7 or fewer is better | It has to land before the thumb moves |
| **One highlighted word**, the payload | The eye lands there first |
| **No place or brand name** | The name is the reveal - giving it away closes the question |
| **No throat-clearing** | "Hi guys", "So I went to", "In this post" spend the only second you have |
| **True** | Never invent a number, ranking, price or date. A hook that lies loses the comments |

Japanese: **16 characters or fewer**, break the line yourself with ` // `.

## Eight mechanisms

Write candidates across at least four of these. Different mechanisms fail
differently, and you want options that fail differently.

### 1. Contradiction - "This isn't X"
Deny the obvious reading of the photo.
- *This isn't a render*
- *This isn't Europe*
- *Not a film set. A Tuesday.*

**Use when** the cover photo looks unreal, foreign, or staged. **Fails when**
the photo looks exactly like what it is.

### 2. Withheld noun - the gap
Point at something without naming it.
- *Nobody films this part of the building*
- *The floor most people never reach*
- *Look at the ceiling*

**Use when** the payoff is a place or a detail. Pairs with a reveal slide.

### 3. Specific count
A real number of real things - specificity reads as credibility.
- *Seven floors, all in primary colours*
- *3 rooms you can rent by the hour*

**Only count what is true and verifiable.** "47 steps" needs someone to have
counted 47 steps.

### 4. POV
Put the viewer inside the photo.
- *POV: you took the wrong exit*
- *POV: the ferry leaves in 10 minutes*

**Use when** the sequence of photos is a walk or a story. **Fails** as a
label on a single static shot.

### 5. Correction - "you're doing it wrong"
- *You've been seeing this bay at the wrong time*
- *Everyone stops at the lobby*

**Use when** there is a genuinely better way, time or route. Needs a
concrete answer in the deck, not a vibe.

### 6. Stakes / warning
- *Don't come here before 4pm*
- *Bring a jacket. Trust me.*

**Use when** there is a real practical consequence. Strongest for saves.

### 7. Call-out
Name the viewer.
- *If you live in Osaka and haven't been here*
- *For anyone who misses 90s malls*

**Use when** the audience is narrow and knows it. Weak for broad reach.

### 8. Payoff promise
- *Wait for the last photo*
- *Slide 6 is the reason*

**Use sparingly** and only when the last slide genuinely earns it. Overused,
and viewers know it.

## Scoring

Score every candidate 0-2 on each, out of 10. Ship 8 or above.

| | 0 | 1 | 2 |
|---|---|---|---|
| **Gap** | answers itself | mild curiosity | the viewer has to swipe to know |
| **Specific** | generic adjectives | one concrete noun | concrete noun or real number |
| **Speed** | 10+ words | 8-9 words | 7 or fewer |
| **True** | invented claim | unverifiable | plainly true from the photos or the user |
| **Fit** | the cover photo contradicts it | neutral | the photo makes it believable |

"True" scoring 0 disqualifies the hook whatever the total.

## Bad to better

| Bad | Why | Better |
|---|---|---|
| Amazing hidden gem in Osaka! | filler, names the place, no gap | Nobody films this part of the building |
| Check out this beautiful building | asks for attention, gives no reason | This isn't a render |
| The best sunset spot in the city | unverifiable superlative | Come at 16:40 and face west |
| I went to ATC today and it was so cool | throat-clearing, names the brand | Seven floors in primary colours |
| 10 things you must do in Nanko | "must", a count with no content yet | 3 rooms you can rent by the hour |
| A really interesting place you should visit | no noun, no gap | The floor most people never reach |
| POV: beautiful views | POV with no situation | POV: you took the wrong exit |
| You won't believe this place | clickbait the viewer has learned to skip | Not a film set. A Tuesday. |

## The process

1. Read the photos first. The hook has to be believable *on the cover photo*.
2. Write **8-10 candidates** across at least four mechanisms. `/hook-generator`
   is useful for raw volume; you still score them.
3. Score each against the table. Drop anything under 8 and anything untrue.
4. Offer the **top three** with AskUserQuestion - label each with its
   mechanism and one line on why it works on this photo.
5. Put the chosen hook on the `cover` template with its payload word as the
   `*highlight*`.

## The hook and the rest of the deck

- **The last slide pays it off.** "This isn't a render" needs a reveal of what
  it is. A hook the deck never answers teaches the viewer not to swipe next
  time.
- **The caption restates it** with the searchable keyword first - see
  [captions.md](captions.md).
- **The pinned comment continues it** - a question the hook raised that the
  deck did not fully close.

## Japanese hooks

Short, concrete, and spoken. Patterns that work:

- 「ここ、本当に大阪？」 - doubt (contradiction)
- 「誰も撮らない場所」 - withheld noun
- 「16時40分に来て」 - stakes, with a real time
- 「知らない人が多い3つの部屋」 - count

Break the line yourself where a speaker would pause: `ここ、// 本当に大阪？`.
Never leave a particle (は・が・を・に) at the start of a line.
