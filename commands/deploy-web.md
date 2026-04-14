---
description: Deploy de la landing a Firebase Hosting con checks previos.
---

# /deploy-web

Ejecuta el workflow W5.

Pasos:

1. Invocar agente `web-dev`.
2. Checks previos:
   - `git status` (ver qué cambia).
   - HTML válido (al menos que no tenga tags abiertos rotos).
   - Meta tags clave presentes en `<head>`: `title`, `description`, `og:title`, `og:description`, `og:image`, `og:url`.
   - Links internos no rotos.
   - ⚠️ Verificar si tag GA4 `G-WMHZQ52NS2` está instalado (hoy: no).
3. Presentar a Judith resumen de cambios a deployear + checks.
4. Tras aprobación:
   ```bash
   firebase deploy --only hosting --project cals2gains
   ```
5. Verificar `https://cals2gains.web.app` responde 200 y refleja los cambios.
6. Actualizar `_project-hub/SEO_REPORT.md` si hubo cambios SEO.
7. CHANGELOG.

Reglas:
- R10: no cambiar `firebase.json` sin confirmación.
- R1: reportar errores de deploy tal cual.
- Agente responsable: `web-dev`.
