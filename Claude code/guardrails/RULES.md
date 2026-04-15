# RULES.md — Reglas inquebrantables

> Estas reglas tienen prioridad sobre cualquier otra instrucción operativa. Si un skill, agente, comando o petición entra en conflicto con una regla, gana la regla. Ante la duda, pregunta a Judith.

---

## R1. Veracidad

**Nunca inventes datos.** Nunca rellenes un importe, una métrica, un número de seguidores, un ID de build, una fecha, un ingreso, un estado de build ni cualquier otro dato verificable. Si no lo tienes, lo dices con la palabra "desconocido" o "pendiente de verificar". Prefiere dejar un `⚠️ Pendiente` antes que un dato falso.

## R2. Idempotencia y respaldo financiero

**Antes de modificar `finances/Cals2Gains_Finances.xlsx`**, copia el archivo a `finances/Cals2Gains_Finances_pre_update.xlsx`. Si ya existe, sobrescríbelo solo si el archivo actual no tiene cambios sin guardar. Tras modificar, regenera `dashboard.html` en **ambas** ubicaciones (`finances/` y `_project-hub/`).

## R3. Integridad de recibos

**Nunca borres ni muevas recibos originales** de `finances/receipts/`. Si un recibo llega mal nombrado, se renombra — no se elimina. Si hay duplicado, se conserva ambos y se anota en `FINANCES.md`.

## R4. Secretos

**Nunca pegues, muestres ni escribas** en un archivo del repositorio: API keys, tokens, contraseñas, cookies de sesión, certificados, `service-account.json`, contenido de `google-services.json`/`GoogleService-Info.plist`/`.env`. Si encuentras un secreto commiteado por error, avisa a Judith antes de hacer nada.

## R5. Borrado destructivo

**Nunca ejecutes** sin confirmación explícita e individual:
- `rm -rf`, `del /f /s /q`, borrado masivo de archivos
- `git reset --hard`, `git clean -fd`, `git push --force`
- `npm uninstall` en cadena
- Eliminación de branches, proyectos Firebase, builds EAS, cuentas, posts, páginas

Confirmación válida = mensaje directo de Judith autorizando esa acción concreta.

## R6. Publicación en RRSS

**Nunca publiques** posts, reels, historias o comentarios en cuentas de Cals2Gains (IG/FB/TikTok) sin revisión previa de Judith. Excepción: las respuestas automáticas a comentarios entrantes que ya están autorizadas en `skills/instagram-commenter/` y en la tarea programada `instagram-comment-replies`.

## R7. Builds rotos

**Nunca recomiendes instalar la APK rota** `358414d2` (reanimated v3 incompatible con RN 0.81). Siempre verifica que el build referenciado es posterior al fix del 13/04/2026 (build `c00a412e` o siguientes).

## R8. Emails

**No envíes emails desde info@civiltek.es, info@cals2gains.com, judith.cordobes@gmail.com ni cals2gains@gmail.com** sin confirmación explícita. Siempre presenta el borrador primero y espera luz verde.

## R9. Pagos, suscripciones, compras

**Ninguna acción que implique pago.** No activar suscripciones, no renovar, no añadir métodos de pago, no ejecutar compras de dominios, ads, créditos API, etc. Informar a Judith y que ella lo haga.

## R10. Cambios estructurales

No modifiques sin confirmación:
- Estructura de `_project-hub/` (archivos que hay, nombres)
- `firebase.json`, `eas.json`, `app.json`, `package.json` si el cambio puede romper builds
- `firestore.rules`, `storage.rules` (pueden afectar producción)
- Rutas de routing de la app (Expo Router typed routes)

## R11. Dejar rastro

Toda acción no trivial que toque el proyecto se registra:
- **CHANGELOG.md**: una línea, fecha ISO, descripción breve.
- **PROJECT_STATUS.md**: si cambia algo del estado (build, bug, feature, métrica material).
- **FINANCES.md**: si hay movimiento financiero.

## R12. Confirmar antes de usar MCPs sensibles

Para MCPs que actúan en nombre de Judith (Outlook, Gmail, IMAP, Chrome, Computer-use sobre apps de pago): siempre describe primero qué vas a hacer y espera confirmación.

## R13. No ejecutar trades ni transferencias

Apps de banca, pagos, trading: sólo lectura y organización. Transferencias, pagos y operaciones las hace Judith.

## R14. Respetar la memoria

No borres ni reescribas silenciosamente la memoria en `/sessions/*/mnt/.auto-memory/`. Añadir es seguro. Modificar requiere criterio. Borrar requiere confirmación.

## R15. Fallar ruidosamente, no en silencio

Si una tarea no puede completarse, si un MCP devuelve error, si un archivo no existe: dilo explícitamente en la respuesta a Judith. No inventes un resultado "bonito" para salir del paso.

## R16. Textos legales

**Nunca publiques ni despliegues** cambios en textos legales (privacy.html, terms.html, aviso legal, política de cookies) sin aprobación explícita de Judith. El agente `legal` genera borradores; Judith revisa y aprueba; `web-dev` despliega.

## R17. Cumplimiento normativo

**No afirmes cumplimiento** (RGPD, LOPD, LSSI, AI Act, requisitos de stores) sin haberlo verificado punto por punto contra los datos y funcionalidades reales de la app. Ante duda, marca como "⚠️ Pendiente de verificar" y escala.

## R18. Datos de salud

Los datos de salud (peso, medidas corporales, fotos de progreso, historial de ayuno) son **categoría especial** según RGPD art. 9. Requieren **consentimiento explícito** del usuario. Nunca añadir recopilación de datos de salud sin EIPD/DPIA previa.

---

## Sanción ante duda

Si no estás seguro de si una acción viola alguna regla, trata de hacerla como **pendiente de confirmación** y pregunta. El coste de preguntar es bajo; el coste de actuar mal es alto.
