# SECURITY-BASELINE.md — Línea base de seguridad de Cals2Gains

> Estándares mínimos de seguridad que deben cumplirse en todo momento. Complementa `RULES.md` con criterios técnicos específicos. Los agentes `security`, `appsec` e `infrasec` verifican su cumplimiento.

---

## SB1. Gestión de secretos

- **Nunca** commitear API keys, tokens, contraseñas, certificados ni service accounts (R4).
- Archivos de configuración con secretos (`.env`, `google-services.json`, `GoogleService-Info.plist`, `service-account.json`) deben estar en `.gitignore`.
- Si un secreto se commitea por error: avisar a Judith, rotar el secreto, limpiar el historial de git (o aceptar el riesgo si es solo un project ID público).
- API keys de servicios de IA (OpenAI, Anthropic) y de pago (RevenueCat) **nunca** en código cliente RN — solo en backend/cloud functions.

## SB2. Autenticación y autorización

- Toda operación de lectura/escritura en Firestore y Storage requiere `request.auth != null`.
- Cada documento solo es accesible por su propietario (`request.auth.uid == userId` o equivalente).
- Las suscripciones (RevenueCat) se validan server-side, no solo client-side.
- Firebase Auth: contraseñas de mínimo 8 caracteres (política por defecto de Firebase).
- Tokens de sesión no se almacenan en AsyncStorage sin cifrado — usar `expo-secure-store`.

## SB3. Validación de datos

- Firestore rules deben validar schema de escritura: tipos de datos, campos permitidos, límites de tamaño.
- Storage rules deben imponer límites de tamaño (máx. 10 MB por archivo) y filtro de tipo MIME (solo `image/*` para fotos).
- Inputs del usuario en la app se validan client-side Y se protegen con rules server-side (defensa en profundidad).

## SB4. Comunicaciones seguras

- Toda comunicación app ↔ backend via HTTPS. Sin excepciones.
- `android:usesCleartextTraffic="false"` en configuración Android.
- Considerar certificate pinning para APIs críticas (Firebase, RevenueCat).

## SB5. Protección de la app

- Builds de producción con `__DEV__ = false` y minificación activa.
- Hermes engine habilitado (compilación a bytecode — protección parcial).
- No incluir logs sensibles (`console.log` con tokens, PII) en producción.
- ProGuard/R8 habilitado para builds Android de producción.

## SB6. Datos personales y PII

- Cals2Gains maneja datos de salud: peso, medidas corporales, fotos de progreso, hábitos alimenticios, planes nutricionales.
- Estos datos son PII sensible y requieren protección adicional.
- Almacenamiento en Firebase con reglas de acceso estrictas (solo el propietario).
- No se comparten datos entre usuarios (excepto Coach Share, que requiere consentimiento explícito).
- Fotos de progreso: almacenadas en Firebase Storage bajo path del usuario, no accesibles públicamente.

## SB7. Headers de seguridad web

La landing `cals2gains.com` / `cals2gains.web.app` debe servirse con estos headers:

| Header | Valor mínimo |
|--------|-------------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | Adaptar a los recursos usados (GA4, fonts, etc.) |

## SB8. Dependencias

- `npm audit` sin vulnerabilidades de severidad `critical` o `high` antes de cada build de producción.
- Dependencias con CVE de severidad alta → actualizar o sustituir en 48h.
- Dependencias abandonadas (sin actualización >12 meses + CVE abierto) → buscar alternativa.
- Lock file (`package-lock.json`) siempre commiteado para reproducibilidad.

## SB9. Builds y CI/CD

- Builds EAS se hacen en la nube (Expo) — no se firman localmente.
- Keystores y certificados de firma **nunca** en el repositorio.
- Builds de debug no se distribuyen fuera del equipo.
- Verificar que las variables de entorno del build no filtran secretos al bundle JS.

## SB10. Accesos y roles

- Acceso a Firebase Console: solo Judith (propietaria).
- Acceso a Google Cloud Console: solo Judith.
- Acceso a EAS/Expo: owner `civiltek`.
- Acceso a RevenueCat: solo Judith.
- Acceso a cuentas de RRSS: solo Judith (automatismos aprobados en R6 como excepción).
- No crear cuentas de servicio ni roles IAM adicionales sin aprobación.

## SB11. Monitorización

- Monitorizar alertas de GitHub (Dependabot, secret scanning, code scanning si está activo).
- Monitorizar logs de Firebase Auth para intentos de acceso anómalos (cuando haya volumen de usuarios).
- Registrar toda incidencia de seguridad en `_project-hub/SECURITY_STATUS.md`.

## SB12. Respuesta a incidentes

Ante un incidente de seguridad:
1. **Contener**: desactivar el vector si es posible (revocar key, desactivar endpoint).
2. **Avisar**: notificar a Judith inmediatamente.
3. **Documentar**: registrar en `SECURITY_STATUS.md` con fecha, impacto y acciones.
4. **Remediar**: corregir la causa raíz.
5. **Verificar**: confirmar que la remediación es efectiva.
6. **Prevenir**: añadir check o rule que prevenga recurrencia.

---

## Cumplimiento actual (14/04/2026)

| Baseline | Estado | Notas |
|----------|--------|-------|
| SB1 Secretos | 🟡 | `google-services.json` y `GoogleService-Info.plist` en repo |
| SB2 Auth/Authz | 🟡 | Auth OK, schema validation pendiente |
| SB3 Validación | 🟠 | Sin validación de schema en Firestore |
| SB4 Comunicaciones | ⚠️ | Pendiente de verificar |
| SB5 Protección app | ⚠️ | Pendiente de verificar builds producción |
| SB6 PII | 🟡 | Datos aislados por usuario, pero sin cifrado adicional |
| SB7 Headers web | ⚠️ | Pendiente de configurar |
| SB8 Dependencias | ⚠️ | Pendiente de primer `npm audit` |
| SB9 Builds | 🟢 | EAS cloud builds, no signing local |
| SB10 Accesos | 🟢 | Solo Judith tiene acceso |
| SB11 Monitorización | ⚠️ | GitHub Push Protection activo, resto pendiente |
| SB12 Incidentes | 🟢 | Proceso definido, sin incidentes registrados |
