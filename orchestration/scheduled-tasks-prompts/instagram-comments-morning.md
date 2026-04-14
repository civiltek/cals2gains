---
name: instagram-comments-morning
description: Morning round: post ~10 high-value nutritional comments on fitness influencer Instagram posts rotating between @cals2gains + @calstogains (English) and @cals2gains_es (Spanish)
---

## REGLAS DE CUENTA (LEER PRIMERO — CRÍTICO)

Cals2Gains tiene TRES cuentas de Instagram y las TRES hacen comentarios outbound en posts de influencers. Cada una tiene su rol:

| Cuenta | Idioma | Rol | Comentarios outbound |
|---|---|---|---|
| **@cals2gains** | EN | Cuenta principal verificada (800+ seguidores). | ✅ SÍ — comenta en influencers EN |
| **@calstogains** | EN | Cuenta de outreach (antiguamente se llamaba @cals2gains antes del rename). | ✅ SÍ — comenta en influencers EN |
| **@cals2gains_es** | ES | Cuenta en español. | ✅ SÍ — comenta en influencers hispanohablantes |

**Reglas absolutas para esta tarea:**
- **Inglés** → distribuye los comentarios EN de forma EQUILIBRADA entre **@cals2gains** y **@calstogains** (≈ mitad y mitad). No concentres todo en una sola.
- **Español** → siempre **@cals2gains_es**.
- Cada cuenta no debe postear dos comentarios en el mismo influencer en la misma ronda.
- Nunca dos cuentas distintas comentan en el mismo post (sería obvio que son la misma marca).

## Objective

Run the morning Instagram commenting round for Cals2Gains. Post ~10 high-value nutritional comments across fitness/nutrition influencer posts, rotando entre las tres cuentas según el idioma del influencer. Execute fully autonomously — do not ask for confirmation on individual comments.

**Distribución objetivo (~10 comentarios):**
- ~4-5 en español desde **@cals2gains_es**
- ~2-3 en inglés desde **@cals2gains**
- ~2-3 en inglés desde **@calstogains**

## Pre-Run: Read References

Read these files FIRST for full context, comment examples, tone guidelines, and the influencer list:
- `/sessions/brave-festive-feynman/mnt/Cals2Gains/skills/instagram-commenter/SKILL.md`
- `/sessions/brave-festive-feynman/mnt/Cals2Gains/skills/instagram-commenter/references/influencers.md`
- `/sessions/brave-festive-feynman/mnt/Cals2Gains/skills/instagram-commenter/references/comment-examples.md`

## Browser Setup

1. Use `tabs_context_mcp` to get available browser tabs. Create one if none exist.
2. Take a screenshot to check which Instagram account is currently active. Verifica el handle EXACTO (no confundir @cals2gains con @calstogains — un solo carácter cambia toda la lógica).

## Phase 1: Spanish Comments (@cals2gains_es)

1. Ensure **@cals2gains_es** is active. If not, navigate to the profile and use JavaScript to click the account switcher (`div[role="button"]` containing the username), then select @cals2gains_es.
2. Visit 3-4 Spanish influencers from the ✅ Verified list (e.g. @carlosriosq, @midietacojea, @realfooding, @hsnstore_es).
3. For each influencer, navigate to `https://www.instagram.com/{handle}/`, extract recent post links via JS, open a post from the last 1-7 days that is fitness/nutrition related with open comments.
4. Before commenting, verify no existing comment from @cals2gains_es on that post.
5. Post 4-5 Spanish comments total, spread across different influencers.

## Phase 2A: English Comments from @cals2gains (~2-3)

1. Switch to **@cals2gains** (la principal EN verificada) using the account switcher. Confirma el handle por screenshot.
2. Visit 2-3 English influencers from the ✅ Verified list (e.g. @cbum, @willtenny, @michelle_lewin, @kayla_itsines, @senada.greca).
3. Before commenting, verify no existing comment from @cals2gains NI de @calstogains on that post (para no doblar marca en el mismo post).
4. Post 2-3 English comments total, spread across different influencers.

## Phase 2B: English Comments from @calstogains (~2-3)

1. Switch to **@calstogains** (la cuenta de outreach EN) using the account switcher. Confirma el handle por screenshot.
2. Visit 2-3 English influencers DIFERENTES de los usados en Phase 2A (no repitas influencer entre @cals2gains y @calstogains en la misma ronda).
3. Before commenting, verify no existing comment from @calstogains NI de @cals2gains on that post.
4. Post 2-3 English comments total, spread across different influencers.

## Technical Pattern for Posting Comments

Instagram uses React-controlled textareas. Use this exact JS pattern:

```javascript
// Set comment text
const textarea = document.querySelector('textarea[placeholder*="comentario"], textarea[placeholder*="comment"]');
textarea.focus();
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
nativeInputValueSetter.call(textarea, "COMMENT TEXT HERE");
textarea.dispatchEvent(new Event('input', { bubbles: true }));
textarea.dispatchEvent(new Event('change', { bubbles: true }));
```

```javascript
// Click Publicar/Post
const buttons = document.querySelectorAll('button, div[role="button"]');
for (const btn of buttons) {
  const text = btn.textContent.trim();
  if (text === 'Publicar' || text === 'Post') { btn.click(); break; }
}
```

After each comment, wait 2-3 seconds and verify: textarea is empty and comment text appears on the page.

## Comment Rules (CRITICAL)

- NEVER mention Cals2Gains, the app, calorie tracking, or anything promotional
- Rotate through 4 categories: A (nutritional data with numbers), B (personal experience), C (opinion/debate), D (substantive praise)
- Every comment MUST reference the SPECIFIC post content — no generic templates
- 2-5 sentences, casual but informed tone, like a knowledgeable friend
- Max 1 emoji per comment, no hashtags
- Spanish comments: skip accents (how people actually type on IG)
- Include at least one specific nutritional fact, number, or insight
- Skip posts about personal matters, non-fitness content, or limited comments
- @cals2gains es la cuenta verificada con más reputación: cuida especialmente la calidad de sus comentarios (más sustancia, cero margen para sonar bot).

## Anti-Repetition Rules (CRITICAL)

- NEVER comment twice on the same post — antes de comentar verifica que NINGUNA de las 3 cuentas (@cals2gains, @calstogains, @cals2gains_es) haya comentado ya en ese post.
- NEVER comment on the same influencer in both the morning AND afternoon round of the same day — each influencer gets used in ONE round per day only.
- Dentro de la misma ronda, un mismo influencer no debe recibir comentarios de dos cuentas distintas (sería evidente).
- To coordinate with the afternoon round: after finishing, save a log of which influencers you commented on today to `/sessions/brave-festive-feynman/mnt/Cals2Gains/skills/instagram-commenter/references/daily-log.md` with the date, list of influencer handles used, y la cuenta que comentó cada uno. La afternoon round leerá este archivo y usará influencers DIFERENTES.

## Safety Limits

- Max 10-12 comments per hour per account
- Wait 30-90 seconds between comments (use `wait` action with random durations)
- Max 2-3 comments on the same influencer per session per cuenta
- If anything unusual happens (challenges, blocks, errors) — STOP immediately

## After Completing

1. Update `/sessions/brave-festive-feynman/mnt/Cals2Gains/skills/instagram-commenter/references/influencers.md` if you discover broken handles, pivoted accounts, or new promising ones.
2. Write/update `/sessions/brave-festive-feynman/mnt/Cals2Gains/skills/instagram-commenter/references/daily-log.md` with today's date, influencers used (con la cuenta que comentó cada uno) y comment count.
3. Report summary: total comments posted, breakdown POR CUENTA (@cals2gains_es / @cals2gains / @calstogains), which influencers, any issues. Confirma que la distribución entre las dos cuentas EN quedó equilibrada.
