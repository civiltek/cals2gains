# /finance-report — Reporte financiero del periodo

> Genera un reporte financiero completo con reconciliación, desglose, anomalías y proyecciones.

## Uso
```
/finance-report              → mes en curso
/finance-report 2026-03      → mes específico
/finance-report all          → acumulado completo
```

## Qué hace

1. Activa el agente `finance`.
2. Ejecuta skill `reconciliation` para verificar integridad.
3. Ejecuta skill `financial-report` para generar el reporte.
4. Regenera `dashboard.html` (skill `update-dashboard`).
5. Actualiza `_project-hub/FINANCES.md`.
6. Añade entrada a CHANGELOG.
7. Entrega resumen ejecutivo a Judith.

## Output esperado

- Reporte en `finances/reports/YYYY-MM_financial-report.md`.
- Dashboard actualizado en ambas ubicaciones.
- FINANCES.md actualizado.
- Resumen ejecutivo en chat:
  ```
  📊 Reporte financiero — Abril 2026
  • Gasto total: X,XX €
  • Burn rate recurrente: X,XX €/mes
  • Anomalías: [N] detectadas
  • Reconciliación: [OK / X discrepancias]
  • Reporte completo: finances/reports/2026-04_financial-report.md
  ```

## Reglas
- No modifica el Excel (solo lectura para reportar).
- Si detecta discrepancias en reconciliación, las lista pero no corrige sin aprobación.
- R1: no inventa datos faltantes.
