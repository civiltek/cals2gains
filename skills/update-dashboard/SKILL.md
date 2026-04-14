# Skill: update-dashboard

> Regenera `dashboard.html` financiero desde `Cals2Gains_Finances.xlsx` y copia a ambas ubicaciones.

## Triggers
- "Actualiza el dashboard"
- Tras añadir fila al Excel financiero (skill `download-receipt` termina llamando a éste).
- Workflow W1 paso 3.

## Archivos relacionados
- Fuente: `C:\Users\Judit\Documents\Cals2Gains\finances\Cals2Gains_Finances.xlsx`
- Salida 1: `C:\Users\Judit\Documents\Cals2Gains\finances\dashboard.html`
- Salida 2: `C:\Users\Judit\Documents\Cals2Gains\_project-hub\dashboard.html`
- Narrativa: `C:\Users\Judit\Documents\Cals2Gains\_project-hub\FINANCES.md`

## Pasos

1. **Backup** (si se va a modificar también el Excel en la misma sesión):
   - Copia `Cals2Gains_Finances.xlsx` → `Cals2Gains_Finances_pre_update.xlsx`.

2. **Leer Excel** con `openpyxl` (Python). Hoja principal de gastos: fecha, proveedor, concepto, importe EUR, archivo.

3. **Calcular**:
   - Total all-time.
   - Total mes en curso.
   - Burn rate recurrente (suma de subs fijas activas).
   - Top 5 proveedores por gasto.
   - Anomalías (>2× media del proveedor).

4. **Generar HTML** (single file, Tailwind CDN OK, colores de marca: `#FF6A4D`, `#9C8CFF`, `#17121D`, `#F7F2EA`). Tipografía Outfit (`@import` de Google Fonts).

5. **Copiar** salida a las dos rutas. Verificar que ambos archivos existen y tienen el mismo tamaño.

6. **Actualizar** `_project-hub/FINANCES.md`: tabla de gastos, burn rate, anomalías.

7. **CHANGELOG**: una línea tipo `2026-04-14 — Dashboard financiero regenerado (total MM: XYZ €)`.

## Reglas
- R1: no inventar números. Si el Excel no tiene una columna esperada, lo reporta y no genera el HTML.
- R2: backup del Excel obligatorio si se va a modificar.
- Doble copia del HTML obligatoria.

## Verificación
- [ ] `dashboard.html` en `finances/` existe y tiene el total mensual correcto.
- [ ] `dashboard.html` en `_project-hub/` es idéntico.
- [ ] `FINANCES.md` refleja el mismo total.
- [ ] Anomalías señaladas si las hay.
