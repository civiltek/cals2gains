# FINANCES-OVERVIEW.md — Sistema financiero

> Vista de arquitectura del sistema financiero. Para estado actual y números → `_project-hub/FINANCES.md`. Para detalle de operaciones → agente `finance` y skills `update-dashboard` / `download-receipt`.

---

## Componentes

```
finances/
├── Cals2Gains_Finances.xlsx           ← fuente de verdad
├── Cals2Gains_Finances_pre_update.xlsx ← backup antes de cada modificación
├── Cals2Gains_Finances_backup.xlsx    ← backup histórico
├── dashboard.html                     ← vista visual generada desde el Excel
├── receipts/
│   ├── anthropic/
│   ├── openai/
│   ├── google/
│   ├── apple/
│   ├── meta/
│   ├── expo/
│   ├── hosting/
│   └── otros/
└── reports/                           ← reportes ad-hoc (trimestrales, anuales)

_project-hub/
├── FINANCES.md                        ← narrativa resumida (única fuente humana)
└── dashboard.html                     ← copia del dashboard financiero
```

## Flujo de datos

```
Proveedor → Email/Portal
           ↓
  Skill: download-receipt
           ↓
  PDF → finances/receipts/{proveedor}/  (con naming canónico)
           ↓
  Fila añadida a Cals2Gains_Finances.xlsx (backup previo)
           ↓
  Skill: update-dashboard
           ↓
  dashboard.html → finances/ y _project-hub/  (idénticos)
           ↓
  FINANCES.md actualizado (tabla + burn rate + anomalías)
           ↓
  CHANGELOG + notificación a Judith
```

## Hoja(s) del Excel
Estructura esperada (columnas mínimas):
- Fecha (DD/MM/YYYY)
- Proveedor
- Concepto
- Moneda original
- Importe original
- Importe EUR
- Tipo de cambio aplicado (si aplica)
- Nº de factura/recibo
- Archivo (ruta relativa al PDF)
- Categoría (sub/one-time)
- Notas

⚠️ Si el Excel vigente no tiene alguna de estas columnas, `finance` lo reporta antes de tocar nada.

## Métricas derivadas que calcula `update-dashboard`
- **Total all-time**.
- **Total mes en curso**.
- **Total por proveedor** (acumulado).
- **Burn rate recurrente** (suma de subs fijas activas).
- **Top 5 proveedores** por gasto.
- **Anomalías** (>2× media del proveedor, o proveedor nuevo, o importe >300 €).

## Integridad
- R2: backup antes de escribir en el Excel.
- R3: recibos originales jamás se borran.
- Doble copia del dashboard siempre.
- `finance` es quien puede tocar esto; ningún otro agente debe modificar el Excel.

## Reporting
- **Snapshot automático**: `receipt-collector` (lun/jue 8:00) → si hay cambios → regenera todo.
- **Snapshot manual**: comando `/receipts`.
- **Revisión mensual**: Judith revisa `FINANCES.md` final de mes y decide ajustes.

## Pendientes de sistema
- ⚠️ Confirmar que el Excel tiene la columna de tipo de cambio (para USD→EUR).
- ⚠️ Decidir política de archivado anual (al cerrar año, ¿se parte el Excel en histórico?).
