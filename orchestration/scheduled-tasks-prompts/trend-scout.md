# Scheduled task prompt — `trend-scout-biweekly`

> Prompt candidato. **No creada aún** — Judith la activa cuando lo decida.

---

## Metadatos

- **Nombre:** `trend-scout-biweekly`
- **Cadencia:** lunes y jueves, 09:30 (Europe/Madrid)
- **Model:** sonnet
- **Owner:** `marketing` → subagente `trend-scout`
- **Salidas:** entrada en `context/TREND-INSIGHTS.md`, posible update en `MARKETING-BENCHMARKS.md`, resumen a Judith via Telegram, linea en CHANGELOG.

---

## Prompt

```
Subagente trend-scout de Cals2Gains. Ronda biweekly (lun/jue 09:30 Europe/Madrid).

Objetivo: monitorizar tendencias IG en fitness/nutricion (EN+ES), identificar patrones, consolidar insights accionables.

Leer antes de empezar: context/BRAND.md, context/MARKETING-BENCHMARKS.md, context/TREND-INSIGHTS.md, context/ACCOUNTS.md, guardrails/RULES.md.

Investigar:
a) Trending audio IG fitness/nutricion EN+ES
b) Formatos ganadores emergentes
c) Hooks explotando (reels >1M views, carruseles alto STR)
d) Hashtags emergentes con traccion
e) Mitos del momento que top RDs desmontan
f) Cambios algoritmicos/features IG nuevos
g) Cuentas emergentes en el nicho

Calidad: publicar en TREND-INSIGHTS.md solo si confirmado en ≥2 fuentes. 1 fuente → "Observaciones pendientes". No inventar metricas. No copiar texto de competidores.

Herramientas: WebSearch (añadir año 2026), WebFetch, Chrome MCP, lectura de archivos. NO publicar en cuentas Cals2Gains.

Outputs:
1. Nueva seccion datada en context/TREND-INSIGHTS.md (## YYYY-MM-DD — Ronda trend-scout [lun|jue])
2. Si cuenta nueva confirmada → añadir a MARKETING-BENCHMARKS.md
3. Linea en _project-hub/CHANGELOG.md: "YYYY-MM-DD · trend-scout ronda [lun|jue] · N insights"
4. Reporte <150 palabras a Judith via telegram-approval send_text: top 3 insights, como los usara el equipo, observaciones pendientes

Si nada confirmable: entrada corta "sin cambios accionables" y reportar.

Escalaciones inmediatas: cambio algoritmico IG grande, competidor directo nuevo, tendencia con riesgo reputacional.
```

---

## Activacion

- [ ] Verificar timezone Europe/Madrid
- [ ] Confirmar acceso a WebSearch/WebFetch/repo
- [ ] Primera ejecucion sugerida: lunes 2026-04-20 09:30
- [ ] Tras 2 rondas, revisar cadencia con Judith

## Mapa de tareas existentes

- `receipt-collector` (lun/jue 08:00) — model: haiku
- `instagram-comment-replies` (3x/dia) — model: sonnet
- `instagram-comments-outbound` (2x/dia) — model: sonnet
- `c2g-weekly-metrics` (lunes) — model: sonnet
- `limpieza-cowork-semanal` — model: haiku
- **`trend-scout-biweekly` (lun/jue 09:30) — model: sonnet** ← ESTA
