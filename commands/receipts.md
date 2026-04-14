---
description: Escaneo manual de recibos/facturas en curso. Ejecuta workflow W1.
---

# /receipts

Ejecuta el workflow W1 (`orchestration/WORKFLOWS.md`) en modo manual.

Pasos:

1. Invocar agente `finance`.
2. Revisar fuentes en paralelo:
   - IMAP/Gmail/Outlook: emails de facturación en los últimos 7 días (si ejecución semanal) o desde la última ejecución.
   - Portales web (si hay sesiones activas): Anthropic, OpenAI, Apple Developer, Meta.
   - Carpeta Downloads del usuario: PDFs sueltos tipo recibo.
3. Para cada recibo nuevo: skill `download-receipt`.
4. Al final: skill `update-dashboard`.
5. Reportar a Judith.

Reglas:
- R3: jamás borrar recibos.
- R2: backup del Excel antes de escribir.
- R1: si algo es ambiguo, preguntar.
- Agente responsable: `finance`.
