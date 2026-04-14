# agents/marketing/ — Subagentes especializados de marketing

> El agente generalista `agents/marketing.md` sigue siendo la puerta de entrada, pero delega el trabajo de producción a los 8 subagentes de esta carpeta. Cada uno tiene una responsabilidad única en el pipeline.

## Subagentes

| # | Subagente | Misión corta |
|---|-----------|--------------|
| 1 | [viral-strategist](./viral-strategist.md) | Decide formato, ángulo, cuenta y pilar según trend + objetivo |
| 2 | [hook-writer](./hook-writer.md) | Genera hooks de 3 s (reel) y slide 1 (carrusel) |
| 3 | [reels-scriptwriter](./reels-scriptwriter.md) | Script de reel: shot list + timing + overlays + audio |
| 4 | [carousel-designer](./carousel-designer.md) | Estructura carruseles 7-10 slides con diseño + copy |
| 5 | [caption-hashtag](./caption-hashtag.md) | Caption final + estrategia de hashtags por cuenta |
| 6 | [brand-reviewer](./brand-reviewer.md) | Valida brand voice, guardrails y reglas de cuenta antes de presentar |
| 7 | [performance-analyzer](./performance-analyzer.md) | Post-publicación, aprende y alimenta el siguiente ciclo |
| 8 | [trend-scout](./trend-scout.md) | Investigación continua 2×/semana, actualiza TREND-INSIGHTS.md |

## Lecturas obligatorias antes de producir (todos los subagentes)

1. `context/BRAND.md` — voz de marca, paleta, tipografía.
2. `context/MARKETING-BENCHMARKS.md` — referencias virales confirmadas.
3. `context/TREND-INSIGHTS.md` — insights frescos de `trend-scout`.
4. `context/ACCOUNTS.md` — qué cuenta sirve para qué, idioma, estado.
5. `guardrails/RULES.md` (especialmente R1, R6, R8) y `guardrails/ANTI-PATTERNS.md` (AP5, AP9, AP10, AP15).
6. `context/PROJECT-OVERVIEW.md` y (si se nombra una feature) `FEATURES.md` para no promocionar algo que no existe (AP9).

## Orquestación

El flujo end-to-end está en [`orchestration/CONTENT-PIPELINE.md`](../../orchestration/CONTENT-PIPELINE.md). El workflow numerado (W9) está en `orchestration/WORKFLOWS.md`.
