---
description: Snapshot del estado general del proyecto (app, web, finanzas, RRSS)
---

# /status

Lee los siguientes archivos y produce un resumen de una sección por área (≤5 líneas cada una):

- `_project-hub/PROJECT_STATUS.md` — app (build actual, bugs abiertos)
- `_project-hub/FINANCES.md` — finanzas (total mes, burn rate, anomalías)
- `_project-hub/METRICS.md` — RRSS (seguidores + Δ si hay)
- `_project-hub/FEATURES.md` — features activas recientes

Formato de salida:

```
📱 App: [build actual] — [estado] — [bugs abiertos destacados]
🌐 Web: [estado deploy] — [pendientes SEO]
💰 Finanzas: [total mes] € — burn rate [X] €/mes — [anomalías si hay]
📊 RRSS: IG [n] — FB [n] — Δ [desde último snapshot]
🎯 Próximo paso crítico: [acción #1 de PROJECT_STATUS.md]
```

Reglas:
- R1: si un dato no está disponible, escribir `—` y señalarlo.
- No ejecutar tareas pesadas; sólo compilar información ya existente.
- Agente responsable: `ops`.
