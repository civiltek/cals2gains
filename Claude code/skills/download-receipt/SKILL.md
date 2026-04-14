# Skill: download-receipt

> Flujo estándar para procesar un recibo/factura: clasificar, renombrar, archivar, registrar.

## Triggers
- Email con factura adjunta detectado por MCPs IMAP/Gmail/Outlook.
- PDF suelto en Downloads con nombre tipo recibo.
- Comando `/receipts`.
- Tarea programada `receipt-collector` (diario 8:00).

## Cuentas a escanear
- `info@civiltek.es` (Outlook MCP)
- `cals2gains@gmail.com` (IMAP Gmail)
- `judith.cordobes@gmail.com` (IMAP Gmail)
- `info@cals2gains.com` (IMAP)

## Naming convention
`YYYY-MM-DD_proveedor_descripcion-corta_importeXXX.ext`

Ejemplos:
- `2026-04-13_anthropic_receipt-2466-5491-6579_595eur.pdf`
- `2026-04-10_openai_invoice-872130F5-0003_121usd.txt`
- `2026-04-09_google_play-developer-registration_25usd.pdf`

## Carpetas de destino
`C:\Users\Judit\Documents\Cals2Gains\finances\receipts\{proveedor}\`

Proveedores válidos: `anthropic`, `openai`, `google`, `apple`, `meta`, `expo`, `hosting`, `otros`.

## Pasos

1. **Identificar proveedor**. Mirar remitente, contenido del PDF, montante, fecha. Si no se puede clasificar con certeza → `otros/` y pedir confirmación a Judith.

2. **Extraer datos** del PDF/email:
   - Fecha de emisión.
   - Importe (con moneda original).
   - Concepto / descripción breve.
   - Número de factura/recibo.

3. **Renombrar** siguiendo la convención.

4. **Mover/copiar** a la carpeta correspondiente. Si ya existe un archivo con nombre idéntico → **no sobrescribir**, renombrar con sufijo `_dup2` y flaggear.

5. **Convertir moneda si necesario**. EUR es la base del Excel. Tipo de cambio del día del cargo. Si no se puede obtener de fuente fiable, marcar `⚠️ tipo estimado` y pedir confirmación.

6. **Llamar a `update-dashboard`** para:
   - Añadir fila al Excel (con backup previo).
   - Regenerar HTML.
   - Actualizar `FINANCES.md`.

7. **Detectar anomalía**: importe >2× media mensual del proveedor, proveedor nuevo, importe >300 €. Señalar con ⚠️.

8. **CHANGELOG**: una línea con fecha, proveedor, importe.

9. **Reportar a Judith**: "Procesada factura de [proveedor] — [importe] €. Total abril: X €. [⚠️ si anomalía]".

## Reglas
- R3: jamás borrar recibos originales. Si hay que descartar algo, se renombra con prefijo `_DISCARD_` y se deja en carpeta `otros/_review/` (⚠️ crear si no existe).
- R1: si no hay certeza sobre importe o fecha, no asumir.
- R9: esto NO dispara pagos ni renovaciones. Sólo registra.

## Casos especiales
- **OpenAI**: PDF no descargable automáticamente (Stripe JS). Guardar `.txt` con resumen del invoice + URL para descarga manual.
- **Apple Developer enrollment**: el cargo llega como "Apple Inc." en tarjeta; el recibo útil está en email de Apple Developer.
- **Cargos Anthropic >€200**: siempre revisar si es "prepaid extra usage" (pago puntual) o cambio de plan (recurrente).

## Verificación
- [ ] PDF archivado en carpeta correcta con nombre canónico.
- [ ] Excel actualizado con fila nueva (y backup previo).
- [ ] Dashboard regenerado en ambas ubicaciones.
- [ ] FINANCES.md actualizado.
- [ ] Anomalía señalada si aplica.
- [ ] Judith informada.
