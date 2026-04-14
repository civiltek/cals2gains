---
description: Snapshot de métricas del día (o de la semana) multi-canal.
---

# /metrics

Invoca skill `weekly-metrics` en modo ad-hoc (no esperar a lunes).

Pasos:

1. Agente `growth` ejecuta skill `weekly-metrics`.
2. Canales: GA4, IG (3 cuentas), FB (2 páginas), Play/App Store.
3. Al final: snapshot fechado añadido a `_project-hub/METRICS.md`.
4. Resumen a Judith en 5 líneas máximo con Δ vs último snapshot.

Reglas:
- R1: si un canal no está accesible, decirlo con el motivo.
- Máximo 3 recomendaciones accionables.
- Agente responsable: `growth`.
