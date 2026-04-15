# Skill: financial-report

> Genera un reporte financiero completo de un periodo (mensual o a petición) con desglose, gráficos, proyecciones y recomendaciones.

## Triggers
- Comando `/finance-report`.
- Final de mes (automático si se configura tarea programada).
- Judith pide: "hazme un resumen financiero", "¿cómo vamos de gastos?"

## Archivos involucrados
- **Input**: `finances/Cals2Gains_Finances.xlsx`.
- **Output**: `finances/reports/YYYY-MM_financial-report.md`.
- **Actualiza**: `_project-hub/FINANCES.md`, `finances/dashboard.html`, `_project-hub/dashboard.html`.

## Pasos

1. **Reconciliación previa**: invocar skill `reconciliation` para verificar integridad de datos.

2. **Leer Excel** completo con `openpyxl`.

3. **Calcular métricas del periodo**:
   - Total gastos del mes.
   - Desglose por proveedor.
   - Desglose por categoría (suscripción vs one-time).
   - Variación vs mes anterior (Δ absoluto y %).
   - Burn rate recurrente (solo suscripciones activas).
   - Runway estimado (si hay presupuesto definido).

4. **Calcular métricas acumuladas**:
   - Total all-time.
   - Top 5 proveedores por gasto acumulado.
   - Tendencia mensual (gráfico ASCII o tabla).

5. **Detectar anomalías**:
   - Cargos >2× media mensual del proveedor.
   - Proveedores nuevos.
   - Cargos >300 €.
   - Suscripciones sin uso (si es verificable).

6. **Proyecciones** (solo si hay ≥2 meses de datos):
   - Gasto proyectado próximo mes (media móvil de recurrentes + estimación de variables).
   - Fecha estimada de break-even (si hay ingresos).

7. **Recomendaciones** (máx. 3):
   - Suscripciones a revisar.
   - Optimizaciones de coste sugeridas.
   - Alertas de presupuesto.

8. **Generar reporte** en `finances/reports/YYYY-MM_financial-report.md`.

9. **Regenerar dashboard** (skill `update-dashboard`).

10. **Actualizar** `_project-hub/FINANCES.md` con resumen del reporte.

11. **CHANGELOG** + informe a Judith.

## Formato del reporte

```markdown
# Reporte Financiero — [Mes YYYY]
Generado: [fecha ISO]

## Resumen ejecutivo
- Gasto total del mes: X,XX €
- Variación vs mes anterior: +/-X,XX € (X%)
- Burn rate recurrente: X,XX €/mes
- Total acumulado: X,XX €

## Desglose por proveedor
| Proveedor | Mes actual | Acumulado | % del total |
|-----------|-----------|-----------|-------------|

## Desglose por tipo
| Tipo | Importe | % |
|------|---------|---|
| Suscripciones | X € | X% |
| Pagos puntuales | X € | X% |

## Anomalías detectadas
[lista o "Ninguna"]

## Reconciliación
[resultado del skill reconciliation]

## Proyecciones
[si hay datos suficientes]

## Recomendaciones
1. ...
2. ...
3. ...
```

## Reglas
- R1: no inventar proyecciones sin datos reales. Si hay <2 meses de histórico, se indica "datos insuficientes para proyección".
- R2: backup del Excel antes de cualquier modificación (aunque este skill es mayormente de lectura).
- Montos siempre en EUR con 2 decimales.

## Verificación
- [ ] Reconciliación ejecutada previamente.
- [ ] Reporte generado en `finances/reports/`.
- [ ] Dashboard regenerado en ambas ubicaciones.
- [ ] FINANCES.md actualizado.
- [ ] Judith informada con resumen ejecutivo.
