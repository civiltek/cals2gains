# scheduled-tasks-map.md — Mapa de tareas programadas

> Inventario vivo de tareas programadas vía `mcp__scheduled-tasks__*`. Actualizar cuando se cree, pause o borre una tarea.

Estado a: **14 de abril de 2026**.

---

## Tareas activas

| Nombre | Frecuencia | Agente dueño | Workflow | Dispara | Notas |
|--------|-----------|--------------|----------|---------|-------|
| `receipt-collector` | Lun y Jue · 08:00 | `finance` | W1 | `download-receipt` → `update-dashboard` | Revisa emails + portales; anota en FINANCES |
| `metrics-collector` | Semanal | `growth` | W4 parcial | Captura métricas básicas | Solapa con `c2g-weekly-metrics`; ⚠️ confirmar si se puede unificar |
| `c2g-weekly-metrics` | Lunes | `growth` | W4 | Skill `weekly-metrics` | Canal completo multi-plataforma |
| `seo-optimizer` | Variable | `web-dev` | — | Revisión de SEO en landing | Genera sugerencias a `_project-hub/SEO_REPORT.md` |
| `instagram-comment-replies` | 2×/día | `marketing` | W8 | Skill legado `skills/instagram-commenter/` | Autorizado por R6 excepción; flaggea comentarios sensibles |
| `instagram-layout-fix` | Variable | `marketing` | — | Fix automático de layout en IG | ⚠️ confirmar alcance actual con Judith |
| `fix-layout-errors` | Variable | `marketing` / `web-dev` | — | Corrige layout roto | ⚠️ confirmar diferencia con `instagram-layout-fix` |
| `limpieza-cowork-semanal` | Semanal | `ops` | W7 | Propone archivos a limpiar | **Nunca borra sin aprobación** |
| `c2g-monthly-finance-report` | 1-3 del mes · 09:00 | `finance` | W11 | Skills `reconciliation` + `financial-report` + `update-dashboard` | Genera reporte mensual completo; reconcilia antes de reportar |
| `c2g-legal-review` | Trimestral (1 ene/abr/jul/oct) | `legal` | W10 | Skill `legal-audit` | Auditoría legal periódica; antes de cada release en stores |

## Tareas desactivadas

| Nombre | Motivo | Dejar activa cuando |
|--------|--------|--------------------|
| `finance-tracker` | Duplicaba a `receipt-collector` | ⚠️ confirmar si se debe eliminar definitivamente |

---

## Coordinación entre tareas

- `receipt-collector` (lun 8:00) → si encuentra recibo → dispara `update-dashboard` inline (no como tarea separada).
- `c2g-weekly-metrics` (lun) → su salida alimenta recomendaciones que `marketing` usará esa semana.
- `limpieza-cowork-semanal` → **nunca** borra recibos (R3), **nunca** borra nada sin aprobación.
- `c2g-monthly-finance-report` (1-3 mes) → ejecuta reconciliación + reporte + dashboard. Informa a Judith con resumen ejecutivo.
- `c2g-legal-review` (trimestral) → auditoría legal completa. Informa a Judith con prioridades (🔴/🟡/🟢).

---

## Cómo añadir una tarea programada

1. Usar `mcp__scheduled-tasks__create_scheduled_task` con nombre descriptivo (`c2g-*` como prefijo por claridad).
2. Documentar aquí: nombre, frecuencia, agente, workflow, qué dispara, notas.
3. CHANGELOG.

## Cómo modificar o pausar

1. `mcp__scheduled-tasks__update_scheduled_task` o `list_scheduled_tasks` para estado actual.
2. Reflejar cambio en este archivo.
3. CHANGELOG.

---

## Pendientes

- ⚠️ Unificar `metrics-collector` y `c2g-weekly-metrics` si hacen lo mismo.
- ⚠️ Clarificar `instagram-layout-fix` vs `fix-layout-errors`.
- ⚠️ Decidir si borrar definitivamente `finance-tracker` deshabilitado.
- ⚠️ Confirmar con Judith frecuencia de `c2g-legal-review` (propuesta: trimestral + pre-release).
- ⚠️ Confirmar con Judith si `c2g-monthly-finance-report` debe correr automáticamente o solo bajo `/finance-report`.
