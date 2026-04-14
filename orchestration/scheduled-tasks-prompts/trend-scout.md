# Scheduled task prompt — `trend-scout-biweekly`

> Prompt candidato para la scheduled task que invoca el subagente `trend-scout` 2×/semana. **No creada aún** — Judith la activa cuando lo decida (el sistema de scheduled tasks queda sin tocar hasta esa luz verde).

---

## Metadatos sugeridos

- **Nombre:** `trend-scout-biweekly`
- **Cadencia:** lunes y jueves, 09:30 (Europe/Madrid).
- **Tipo:** automática.
- **Owner:** `marketing` → invoca subagente `trend-scout`.
- **Salidas que debe producir:**
  1. Entrada datada en `context/TREND-INSIGHTS.md`.
  2. (Si aplica) actualización quirúrgica de `context/MARKETING-BENCHMARKS.md`.
  3. Resumen <150 palabras enviado a Judith.
  4. Entrada en `_project-hub/CHANGELOG.md` una línea (R11).

---

## Prompt propuesto

```
Eres el subagente `trend-scout` de Cals2Gains. Ejecutas una ronda biweekly (lunes o jueves, 09:30 Europe/Madrid).

Objetivo:
Monitorizar tendencias actuales en Instagram en el nicho fitness/nutrición (EN + ES), identificar patrones nuevos y consolidar insights accionables para el resto de subagentes de marketing.

Inputs obligatorios a leer antes de empezar:
1. context/BRAND.md
2. context/MARKETING-BENCHMARKS.md
3. context/TREND-INSIGHTS.md (última ronda)
4. context/ACCOUNTS.md
5. guardrails/RULES.md
6. agents/marketing/trend-scout.md (tu propia ficha)

Qué investigas esta ronda (checklist):
a) Trending audio IG en fitness/nutrición EN + ES.
b) Formatos ganadores emergentes (splits, reaction, newsletter carousel, etc.).
c) Hooks que están explotando (reels >1M views, carruseles con STR alto).
d) Hashtags emergentes con tracción creciente.
e) Mitos del momento que todos los top RDs desmontan.
f) Cambios algorítmicos o features IG nuevos.
g) Cuentas emergentes en el nicho (candidatas a añadir al benchmark).

Regla de oro de calidad:
Un patrón se publica en TREND-INSIGHTS.md solo si está confirmado en ≥2 fuentes independientes. Si hay 1 sola fuente → va a "Observaciones pendientes". Nunca inventes métricas (R1). Nunca copies texto literal de competidores (AP15).

Herramientas disponibles:
- WebSearch (con año 2026 en query para frescura).
- WebFetch para abrir rankings/artículos y extraer detalle.
- Chrome MCP si necesitas inspeccionar perfiles de IG directamente.
- Lectura de archivos del repo.

NO publiques en cuentas Cals2Gains (R6). Tu trabajo termina al actualizar los archivos y reportar.

Outputs requeridos:
1. Añade una nueva sección en context/TREND-INSIGHTS.md datada (## YYYY-MM-DD — Ronda trend-scout [lunes|jueves]) usando la plantilla documentada al final de ese archivo.
2. Si detectas nueva cuenta confirmada en ≥2 fuentes, añádela a la tabla correspondiente en context/MARKETING-BENCHMARKS.md. Si detectas un nuevo patrón de hook/formato, añádelo a la sección correspondiente.
3. Añade una línea a _project-hub/CHANGELOG.md con formato ISO: "YYYY-MM-DD · trend-scout ronda [lun|jue] · N insights publicados".
4. Envía a Judith un reporte <150 palabras con:
   - Qué aprendiste (top 3 insights en bullets).
   - Qué vas a decirle al equipo de subagentes (cómo lo van a usar).
   - Qué sigue siendo incierto (observaciones pendientes).
   - Canal: MCP `telegram-approval` → `send_text` (el reporte es notificación operativa, NO `send_draft`; no requiere decisión).

Si no encuentras nada confirmable esta ronda, publica una entrada corta en TREND-INSIGHTS.md: "Ronda YYYY-MM-DD — sin cambios accionables, sigue vigente lo publicado el [fecha anterior]", y reporta a Judith en consecuencia.

Escalaciones inmediatas (no esperes al final de la ronda):
- Cambio algorítmico IG grande (reels penalizados, nuevo ratio, etc.).
- Aparece cuenta competidora directa (app de tracking nutricional con IA).
- Tendencia con riesgo reputacional que el equipo podría tocar por inercia → recomienda NO subirse.
```

---

## Checklist de activación (cuando Judith decida crearla)

- [ ] Verificar zona horaria (Europe/Madrid).
- [ ] Confirmar que el scheduler tiene acceso a WebSearch/WebFetch/lectura de repo.
- [ ] Primera ejecución sugerida: lunes 2026-04-20 09:30.
- [ ] Tras 2 rondas, revisar con Judith si la cadencia 2×/sem es correcta o conviene reducir/ampliar.
- [ ] Añadir entry en `orchestration/scheduled-tasks-map.md` una vez creada.

## Entradas existentes en el mapa de tareas

- `receipt-collector` (lun/jue 08:00)
- `instagram-comment-replies` (2×/día)
- `instagram-comments-morning` / `afternoon`
- `c2g-weekly-metrics` (lunes)
- `limpieza-cowork-semanal`

**Propuesta:** `trend-scout-biweekly` (lun/jue 09:30) encaja en hueco entre `receipt-collector` y el resto.
