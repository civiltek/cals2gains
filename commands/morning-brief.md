---
description: Briefing del día con estado, pendientes y alertas.
---

# /morning-brief

Ejecuta workflow W6.

Compila en paralelo desde el hub (sin lanzar tareas pesadas):

1. **App** (desde `PROJECT_STATUS.md`):
   - Último build + estado.
   - Bug crítico abierto (si hay).
2. **Web**:
   - Último deploy.
   - Pendientes SEO.
3. **Finanzas** (desde `FINANCES.md`):
   - Total mes en curso.
   - Burn rate.
   - Próxima fecha de cobro.
   - Anomalías.
4. **RRSS** (desde `METRICS.md`):
   - Seguidores IG (EN + ES) + Δ 24h si disponible.
   - Post programado para hoy (desde `CONTENT_PLAN.md`).
5. **Pendientes del día**:
   - Tareas programadas que corren hoy.
   - Marcas `⚠️` abiertas en el hub.

Formato: una sección por área, máx. 5 líneas. Al final, sugerir el **próximo paso crítico** de `PROJECT_STATUS.md`.

Reglas:
- No lanzar tareas pesadas (es un resumen).
- R1: si un área no tiene data, decirlo.
- Agente responsable: `ops`.
