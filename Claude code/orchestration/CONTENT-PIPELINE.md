# CONTENT-PIPELINE.md — Pipeline de producción de contenido IG (Cals2Gains)

> End-to-end desde una idea hasta la publicación. Los 8 subagentes de `agents/marketing/` cubren el pipeline. Judith aprueba en **un único punto** (paso 7).

---

## Diagrama resumido

```
┌──────────────────────────────────────────────────────────────┐
│ 0. INPUT DE TENDENCIAS (trend-scout, 2×/semana)              │
│    → actualiza context/TREND-INSIGHTS.md + MARKETING-BENCH   │
└──────────────────────────────────────────────────────────────┘
                         │ leído en cada paso
                         ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│ 1. DISPARO   │→ │ 2. STRATEGY  │→ │ 3. HOOK              │
│ (Judith o    │  │ viral-       │  │ hook-writer          │
│ calendario)  │  │ strategist   │  │                      │
└──────────────┘  └──────────────┘  └──────────────────────┘
                                              │
                                              ▼
                    ┌────────────────────────────────────────┐
                    │ 4. SCRIPT/SPEC                         │
                    │ reels-scriptwriter (si reel)           │
                    │ carousel-designer (si carrusel)        │
                    └────────────────────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────┐
                              │ 5. CAPTION + HASHTAGS    │
                              │ caption-hashtag          │
                              └──────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────┐
                              │ 6. BRAND REVIEW          │
                              │ brand-reviewer           │
                              │ (si rechaza → vuelve al  │
                              │  subagente responsable)  │
                              └──────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────┐
                              │ 7. APROBACIÓN JUDITH ★   │ ← ÚNICO punto humano
                              │ (preview + caption +     │
                              │  hashtags + mockup)      │
                              └──────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────┐
                              │ 8. SCHEDULING            │
                              │ (Meta Business Suite,    │
                              │  asistido por Chrome MCP)│
                              └──────────────────────────┘
                                              │
                                              ▼
                              ┌──────────────────────────┐
                              │ 9. PERFORMANCE (+48-72h) │
                              │ performance-analyzer     │
                              │ → alimenta trend-scout   │
                              │ → alimenta próx. brief   │
                              └──────────────────────────┘
```

---

## Detalle de cada paso

### 0. Input de tendencias (`trend-scout`)
- Ejecuta 2×/semana (lun/jue 09:30) — ver scheduled task `trend-scout-biweekly`.
- Output: `context/TREND-INSIGHTS.md` actualizado + (si aplica) `MARKETING-BENCHMARKS.md` refrescado.
- **Todos los subagentes deben leer `TREND-INSIGHTS.md` antes de producir.**

### 1. Disparo
- Judith dice: "hazme un reel sobre X" / "prepárame 3 carruseles para esta semana" / "cubre el hueco del jueves ES".
- O hueco detectado en `_project-hub/CONTENT_PLAN.md`.
- O `performance-analyzer` recomienda repetir un ángulo ganador.

### 2. Strategy (`viral-strategist`)
- Lee BRAND + BENCHMARKS + TREND-INSIGHTS + ACCOUNTS + RULES + FEATURES.
- Produce **Content Brief** (cuenta, idioma, formato, pilar, ángulo, insight aplicado, CTA objetivo).
- Valida que la feature (si hay) está activa.
- Handoff → `hook-writer`.

### 3. Hook (`hook-writer`)
- Genera **3 variantes** (A/B/C) — reel o slide 1 de carrusel.
- Recomienda una, con razón.
- Handoff → `reels-scriptwriter` o `carousel-designer`.

### 4. Script / Spec
**Si reel:** `reels-scriptwriter` produce script con shot list, timing, overlays, audio.
**Si carrusel:** `carousel-designer` produce spec slide-por-slide con copy + diseño.
- Ambos leen `TREND-INSIGHTS.md` para aplicar formatos/audio emergentes.
- Handoff → `caption-hashtag`.

### 5. Caption + Hashtags (`caption-hashtag`)
- Caption final + set de hashtags por cuenta (@cals2gains, @calstogains, @cals2gains_es).
- Variantes por cuenta respetando rol (`@calstogains` replica, `@cals2gains_es` nativo ES).
- Handoff → `brand-reviewer`.

### 6. Brand Review (`brand-reviewer`)
- Audita checklist completo (brand voice, guardrails, features, idioma nativo, rol de cuenta, no-claims-inventados).
- **Rechaza con motivo específico** o **aprueba** y empaqueta para Judith.
- Si rechaza → vuelve al subagente responsable (una iteración; si 3ª iteración sin converger → escala).

### 7. Aprobación Judith ★ (PUNTO ÚNICO HUMANO)
Judith recibe un paquete compacto:
```
PIEZA [código]
Cuenta destino: @cals2gains | @cals2gains_es | @calstogains
Formato: reel | carrusel
Preview:
  - Mockup / storyboard o render (si ya existe)
  - Primeras 2 líneas del caption
  - Hashtags top
Hook propuesto: "[...]"
CTA: "[...]"
Hora sugerida de publicación: [...]
Apruebo: [ ] como está · [ ] con cambios: ___ · [ ] rechazar
```
- Judith responde en la misma conversación. No hay segunda revisión.
- Si pide cambios específicos → el brand-reviewer los redirige al subagente correspondiente, que entrega una v2 (y sólo esa v2 vuelve a Judith).

### 8. Scheduling
- Tras "apruebo": Judith programa en **Meta Business Suite** directamente, o pide al sistema que abra el flujo vía Chrome MCP para confirmar la publicación ella misma (R6 — nunca auto-publicar).
- `marketing` anota en `_project-hub/CONTENT_PLAN.md`.
- `ops` añade entrada en CHANGELOG (R11).

### 9. Performance (+48-72h) (`performance-analyzer`)
- Lee métricas (IG Insights, vía `growth`).
- Genera Performance Digest.
- Alimenta `trend-scout` con insights candidatos.
- Alimenta `viral-strategist` con recomendaciones para el siguiente ciclo.
- Si el digest detecta 3 piezas seguidas underperforming → escala a Judith.

---

## Canal de aprobación: Telegram

El paso 7 (aprobación de Judith) se ejecuta sobre Telegram, no en el chat de Cowork. El MCP local `telegram-approval` (ver `tools/telegram-mcp-server/`) expone cuatro tools: `send_draft`, `send_text`, `poll_replies`, `wait_for_reply`.

**Flujo obligatorio para `brand-reviewer`** (último paso antes de la entrega):

1. Cuando el brand-reviewer aprueba internamente la pieza, antes de dársela a Judith, llama a:
   ```
   send_draft(
     title        = "[código de pieza] — [cuenta] — [formato]",
     caption      = "[primeras 2 líneas del caption + hook propuesto]",
     hashtags     = [lista de hashtags top],
     draft_id     = "[código de pieza]",
     image_path   = "[ruta al mockup/render si ya existe, si no None]"
   )
   ```
   Telegram mostrará la imagen + caption + 3 botones inline: **✅ Aprobar · ✏️ Cambios · ❌ Descartar**.

2. Inmediatamente después llama a:
   ```
   wait_for_reply(draft_id="[código de pieza]", timeout_seconds=3600)
   ```
   Y procesa la respuesta:

   | `action` | Acción del pipeline |
   |---|---|
   | `approve` | Pasa al paso 8 (scheduling). Marca la pieza como aprobada en `_project-hub/CONTENT_PLAN.md`. |
   | `changes` | El campo `payload` contiene el feedback que Judith haya tecleado. Devuélvelo al subagente responsable (`caption-hashtag`, `carousel-designer`, etc.) con ese feedback literal. Cuando vuelva la v2, **re-envía un nuevo `send_draft` con un `draft_id` derivado** (p.ej. `"[código]-v2"`). Máx 3 iteraciones antes de escalar. |
   | `discard` | Archiva la pieza en `_project-hub/CONTENT_PLAN.md` con estado `descartada-judith` y motivo (si payload) y cierra el ciclo. |
   | `timeout` (status `expired`) | No hubo decisión en 1h. El reviewer **no publica nada**; envía `send_text` recordatorio al chat y deja la pieza en estado `pendiente-aprobacion` para el siguiente ciclo. |

3. Para notificaciones operativas (scheduler arrancado, post programado, performance digest listo) usa `send_text`, nunca `send_draft`. Los drafts son solo para piezas que requieren decisión.

**Reglas**:
- El `draft_id` debe ser el código de pieza existente en `CONTENT_PLAN.md`, para trazabilidad cruzada con `drafts.json`.
- Si Judith manda un texto con el prefijo `<draft_id>: <comentario>` en cualquier momento, el MCP lo registra como `feedback` en ese draft — útil para comentarios adicionales después de aprobar.
- El canal Telegram es el **único** canal humano para el paso 7. No pedir aprobaciones por el chat de Cowork en paralelo.

---

## Excepciones y casos especiales

- **Pieza urgente / newsjack**: se puede saltar el paso 0 si hay algo rompiendo que exige pieza el mismo día. En ese caso `viral-strategist` justifica en el brief por qué no hay input de trend-scout y Judith evalúa en el paso 7.
- **Campaña batch** ("prepárame 3 carruseles"): el ciclo 2→6 se hace 3 veces, y Judith recibe **un solo paquete con las 3 piezas** para aprobar.
- **Feedback loop de performance**: una pieza que rinde >1.5× media de cuenta se marca para "repetir ángulo" en el siguiente brief del mismo pilar.
- **Tema sensible** (salud mental, trastornos alimentarios): `brand-reviewer` obliga revisión humana aunque pase checklist.

---

## Archivos tocados por el pipeline

| Archivo | Quién lo escribe | Cuándo |
|---------|-----------------|--------|
| `context/TREND-INSIGHTS.md` | trend-scout | 2×/sem |
| `context/MARKETING-BENCHMARKS.md` | trend-scout (quirúrgicamente) | cuando haya novedad confirmada |
| `_project-hub/CONTENT_PLAN.md` | marketing tras publicación | paso 8 |
| `_project-hub/CHANGELOG.md` | ops | paso 8 |
| `_project-hub/METRICS.md` | growth (consolida con performance-analyzer) | W4 semanal |

---

## Cómo dispara Judith el ciclo

- **"Hazme un reel sobre [tema]"** → pipeline 1→7.
- **"Prepárame 3 carruseles para esta semana"** → 3× pipeline 1→6, entrega batch en paso 7.
- **"Cubre el hueco del [día] en [cuenta]"** → viral-strategist elige tema según pilares y TREND-INSIGHTS.
- **"/trend-scout"** → ejecuta ronda extra de trend-scout manualmente.
- **"Analiza la pieza [código]"** → performance-analyzer on-demand.
- **"¿Qué funcionó esta semana?"** → performance-analyzer + growth consolidan.

Todos estos disparos los interpreta el agente generalista `agents/marketing.md`, que enruta al subagente correspondiente.


---

## Modelos OpenAI por paso del pipeline (actualizado abril 2026)

> Plan OpenAI Business · Modelos: GPT-5.4 y GPT-5.4-pro · API key en `.env`

| Paso | Subagente | Modelo |
|------|-----------|--------|
| 0. Tendencias | `trend-scout` | GPT-5.4 |
| 2. Strategy | `viral-strategist` | **GPT-5.4-pro** |
| 3. Hook | `hook-writer` | GPT-5.4 |
| 4. Script (reel) | `reels-scriptwriter` | GPT-5.4 |
| 4. Spec (carrusel) | `carousel-designer` | GPT-5.4 |
| 5. Caption + Hashtags | `caption-hashtag` | GPT-5.4 |
| 6. Brand Review | `brand-reviewer` | **GPT-5.4-pro** |
| 9. Performance | `performance-analyzer` | **GPT-5.4-pro** |

**Criterio de asignación:** GPT-5.4-pro para subagentes cuyas decisiones tienen impacto multiplicador (estrategia, auditoría final, análisis de rendimiento). GPT-5.4 estándar para producción de contenido donde la calidad viene pautada por el brief y se valida downstream.

> Migración desde GPT-4o completada en abril 2026. Ver `META-API-SETUP.md § 13` para detalle.
