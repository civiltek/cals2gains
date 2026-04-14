---
name: instagram-commenter
description: >
  Post value-adding nutritional comments on fitness/nutrition influencer Instagram posts
  from Cals2Gains profiles using browser automation. Use this skill when the user asks to
  "comment on influencer posts", "do the Instagram commenting round", "post comments on
  Instagram", "run the commenting strategy", "engage with influencers", or any variation
  of posting comments on fitness/nutrition Instagram accounts from @cals2gains or
  @cals2gains_es. Also triggers on "comentar en Instagram", "ronda de comentarios",
  "estrategia de comentarios". This skill handles the full workflow: finding recent posts,
  writing personalized comments, and publishing them via browser automation.
---

# Instagram Influencer Commenting — Cals2Gains

## Purpose

This skill automates the daily task of posting high-value nutritional comments on
fitness/nutrition influencer posts from the Cals2Gains Instagram accounts. The goal is
organic visibility: comments that add genuine nutritional knowledge attract profile visits
from people interested in nutrition tracking — exactly Cals2Gains' target audience.

The comments never mention Cals2Gains directly. They work by being so knowledgeable and
useful that curious readers click through to the commenter's profile.

## Profiles

| Profile | Language | Target Audience |
|---------|----------|-----------------|
| @cals2gains_es | Spanish | Spain + LATAM fitness/nutrition community |
| @cals2gains | English | Global English-speaking fitness community |

## Daily Targets

- ~10 comments per session per profile (safe daily limit: 30/profile)
- Spread across 4-6 different influencer accounts per session
- No more than 2-3 comments on the same influencer in one session
- Random pauses between comments (wait 30-90 seconds between posts)

## Comment Philosophy

Every comment must pass this test: "Would a knowledgeable nutrition enthusiast actually
write this?" If it reads like marketing copy, a bot, or generic praise, rewrite it.

### Four Comment Categories (rotate through these)

**Category A — Nutritional Data:** Share a specific, verifiable fact relevant to the post.
Include numbers (grams, percentages, ratios). This is the most valuable category.

**Category B — Personal Experience:** Frame nutritional knowledge as lived experience.
"I switched from X to Y and noticed Z" style. Relatable and human.

**Category C — Opinion/Debate:** Take a respectful position on a nutritional topic the
post raises. Invite discussion. "I think the real issue here is..." style.

**Category D — Substantive Praise:** Acknowledge something specific the influencer said
that most people get wrong. "Finally someone explaining X correctly" style.

### Rules

- NEVER mention Cals2Gains, the app, calorie tracking apps, or anything promotional
- NEVER use emojis excessively (0-1 max, and only if the influencer's audience uses them)
- NEVER copy-paste templates — every comment must reference the specific post content
- ALWAYS write in the correct language for the profile (ES for @cals2gains_es, EN for @cals2gains)
- ALWAYS include at least one specific nutritional fact, number, or insight
- Keep comments 2-5 sentences long — long enough to add value, short enough to read
- Use casual but knowledgeable tone — like talking to a friend who's also into nutrition
- No accents in Spanish comments (Instagram users rarely use them in comments)

## Workflow

### Step 0: Get Browser Context

```
Use tabs_context_mcp to get available tabs. If no tab exists, create one.
```

### Step 1: Check Which Profile is Active

Take a screenshot to see which Instagram account is currently logged in. The profile
icon in the bottom-right corner shows the active account. If you need to switch accounts:

1. Click the profile icon (bottom-right)
2. Click the username at the top
3. Select the desired account from the dropdown

### Step 2: Navigate to Influencer Profile

Read `references/influencers.md` for the current list of verified, active influencer
handles organized by language. Navigate to the influencer's profile URL:

```
https://www.instagram.com/{handle}/
```

If the page shows "Esta página no está disponible" or "Page not found", the handle is
wrong — skip and try the next influencer. **Update the influencer list** by noting which
handles are broken.

### Step 3: Find Recent Posts

Use JavaScript to extract post links from the profile grid:

```javascript
const links = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
const hrefs = Array.from(links)
  .filter(l => l.href.includes('{handle}'))
  .map(l => l.href);
JSON.stringify(hrefs.slice(0, 8));
```

**Important:** The first 1-3 posts may be pinned (marked with a pin icon). These are
often old. Prefer posts from position 4+ in the list, or check the date after navigating.

Navigate to a post and verify:
- It was posted within the last 7 days (ideally 1-3 days)
- It's related to fitness, nutrition, health, or food
- Comments are NOT limited ("Se han limitado los comentarios" = skip this post)
- The "Añade un comentario..." textarea is visible

### Step 4: Read the Post Content

Read the post caption from the screenshot or page text. Understand what the influencer
is talking about so you can write a genuinely relevant comment.

### Step 5: Write and Post the Comment

This is the critical technical step. Instagram uses React-controlled textareas that
don't respond to standard input methods. Use this exact pattern:

```javascript
// Step 1: Find and focus the textarea
const textarea = document.querySelector(
  'textarea[placeholder*="comentario"], textarea[placeholder*="comment"]'
);
textarea.focus();

// Step 2: Set value using React's native setter (this is the key trick)
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLTextAreaElement.prototype, 'value'
).set;
nativeInputValueSetter.call(textarea, "YOUR COMMENT TEXT HERE");

// Step 3: Dispatch events so React picks up the change
textarea.dispatchEvent(new Event('input', { bubbles: true }));
textarea.dispatchEvent(new Event('change', { bubbles: true }));
```

Then publish:

```javascript
const buttons = document.querySelectorAll('button, div[role="button"]');
let clicked = false;
for (const btn of buttons) {
  const text = btn.textContent.trim();
  if (text === 'Publicar' || text === 'Post') {
    btn.click();
    clicked = true;
    break;
  }
}
clicked ? 'Published' : 'Button not found';
```

### Step 6: Verify

Wait 2-3 seconds, then take a screenshot to confirm:
- The comment textarea is back to showing the placeholder ("Añade un comentario...")
- The comment count has incremented by 1
- (Sometimes) your comment is visible at the top of the comments section

### Step 7: Repeat

Move to the next influencer or the next post. Track what you've commented on to avoid
duplicates within a session.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Textarea text doesn't appear | Make sure you're using the native setter pattern, not direct `.value =` |
| Publicar button doesn't respond | Use JavaScript `.click()` on the button element, not coordinate clicks |
| "Se han limitado los comentarios" | Skip this post/influencer — comments are restricted |
| Profile returns 404 | Handle is wrong or account deleted — skip and note it |
| Post is too old (weeks/months) | It's probably pinned — skip to posts further down the grid |
| Account got rate-limited | Stop immediately. Wait 24 hours before resuming. Reduce volume next time |
| Comment disappeared after posting | Instagram may have flagged it as spam. Vary your comment patterns more |

## Safety Limits

Instagram's bot detection is aggressive. Stay well within these limits:

- **Max 10-12 comments per hour** per account
- **Max 30 comments per day** per account
- **Random pauses** of 30-90 seconds between comments
- **Never comment on the same post twice**
- **Never comment on the same influencer more than 3x in one session**
- **If anything feels off** (unusual loading, challenges, temporary blocks) — stop immediately

## Reference Files

- `references/influencers.md` — Verified influencer handles organized by language, with
  follower counts and content niches. Read this at the start of each session.
- `references/comment-examples.md` — Example comments by category (A/B/C/D) in both
  Spanish and English, to calibrate tone and depth. Use as inspiration, never copy directly.
