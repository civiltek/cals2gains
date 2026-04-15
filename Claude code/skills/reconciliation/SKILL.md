# Skill: reconciliation

> Reconciliación mensual: cruzar recibos archivados con filas del Excel y con portales de facturación para detectar discrepancias.

## Triggers
- Final de mes (1–3 del mes siguiente).
- Comando `/finance-report` (incluye reconciliación como paso previo).
- Judith pide: "¿me falta algún recibo?", "¿cuadran las cuentas?"

## Archivos involucrados
- **Excel**: `finances/Cals2Gains_Finances.xlsx` (hoja principal de gastos).
- **Recibos**: `finances/receipts/{proveedor}/`.
- **Narrativa**: `_project-hub/FINANCES.md`.

## Pasos

1. **Leer Excel** con `openpyxl`: extraer todas las filas del mes en curso (o del mes indicado).

2. **Inventariar recibos**: listar PDFs en `finances/receipts/` del mismo periodo (por fecha en nombre canónico `YYYY-MM-DD_*`).

3. **Cruzar**:
   - ¿Hay filas en Excel sin recibo correspondiente en `receipts/`? → **falta recibo**.
   - ¿Hay recibos en `receipts/` sin fila en Excel? → **falta registro**.
   - ¿El importe del Excel coincide con el del recibo (±0,02 € por redondeo)? → **discrepancia de importe**.

4. **Verificar suscripciones**: comparar lista de suscripciones activas en `FINANCES.md` con cobros del mes.
   - ¿Falta algún cobro esperado de una suscripción activa? → señalar.
   - ¿Hay cobro de un servicio no listado como suscripción? → señalar.

5. **Generar informe**:
   ```
   ## Reconciliación — [Mes YYYY]
   
   ✅ Coinciden: X registros
   ⚠️ Falta recibo: [lista]
   ⚠️ Falta registro en Excel: [lista]
   ⚠️ Discrepancias de importe: [lista con diferencia]
   ⚠️ Suscripciones sin cobro detectado: [lista]
   ⚠️ Cobros sin suscripción asociada: [lista]
   
   Total Excel: X,XX €
   Total recibos: X,XX €
   Diferencia: X,XX €
   ```

6. **Actualizar** `_project-hub/FINANCES.md` con resultado de reconciliación.

7. **CHANGELOG**: entrada con resultado resumido.

8. **Reportar a Judith**: diferencias encontradas (si hay), total verificado.

## Reglas
- R1: no inventar importes. Si un PDF no es legible, marcarlo como "importe no verificable".
- R2: nunca modificar el Excel durante reconciliación; solo leer. Correcciones van en un segundo paso tras aprobación.
- R3: nunca borrar recibos.

## Verificación
- [ ] Todas las filas del Excel del periodo revisadas.
- [ ] Todos los recibos del periodo inventariados.
- [ ] Discrepancias listadas con detalle.
- [ ] FINANCES.md actualizado con estado de reconciliación.
- [ ] Judith informada del resultado.
