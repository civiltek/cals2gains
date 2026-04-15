# Cals2Gains - Estado de Seguridad
> Última actualización: 2026-04-14 — Auditoría completa + corrección de hallazgos

---

## Resumen ejecutivo

| Área | Estado | Última auditoría |
|------|--------|-----------------|
| Dependencias npm | 🟢 0 vulnerabilidades (override undici) | 2026-04-14 |
| Secretos en repo | 🟢 `.gitignore` corregido | 2026-04-14 |
| Firestore Rules | 🟢 Schema validation + waterLogs | 2026-04-14 |
| Storage Rules | 🟢 Límite 10 MB + solo imágenes | 2026-04-14 |
| Hosting Headers | 🟢 HSTS, CSP, X-Frame-Options, etc. | 2026-04-14 |
| API Keys en cliente | 🔴 OpenAI key + InBody secret en bundle JS | 2026-04-14 |
| Auth Configuration | 🟡 Firebase Auth por defecto, sin hardening adicional | 2026-04-14 |
| Almacenamiento local | 🟢 Tokens migrados a SecureStore | 2026-04-14 |
| Logs en producción | 🟢 Babel plugin strip en prod | 2026-04-14 |

**Leyenda:** 🟢 Seguro | 🟡 Aceptable con mejoras pendientes | 🟠 Riesgo medio | 🔴 Riesgo alto | ⚠️ Sin auditar

---

## Vulnerabilidades activas

### Altas

| ID | Área | Descripción | Archivos afectados | Plan de corrección |
|----|------|-------------|-------------------|-------------------|
| SEC-009 | App | **OpenAI API key en código cliente** (`EXPO_PUBLIC_OPENAI_API_KEY`). Se embebe en el bundle JS y es extraíble del APK. Permite uso no autorizado a costa de Judith. | `services/openai.ts`, `services/voiceLog.ts`, `services/macroCoach.ts`, `services/recipeService.ts`, `services/foodDatabase.ts`, `app/label-scanner.tsx` | Crear Firebase Cloud Function como proxy. La app llama al proxy (autenticada), el proxy llama a OpenAI con la key server-side. |
| SEC-010 | App | **InBody client_secret en código cliente** (`EXPO_PUBLIC_INBODY_CLIENT_SECRET`). El OAuth client_secret se usa en el token exchange desde el dispositivo. | `services/inBodyService.ts:148` | Mover token exchange a Cloud Function. El client_secret solo debe vivir en el servidor. |

### Info

| ID | Área | Descripción | Estado |
|----|------|-------------|--------|
| SEC-007 | Repo | GitHub Push Protection bloqueó gcloud tokens | Mitigada |

---

## Vulnerabilidades resueltas

| ID | Área | Descripción | Resolución | Fecha |
|----|------|-------------|-----------|-------|
| SEC-001 | Repo | `google-services.json` commiteado | Añadido a `.gitignore` | 2026-04-14 |
| SEC-002 | Repo | `GoogleService-Info.plist` commiteado | Añadido a `.gitignore` | 2026-04-14 |
| SEC-003 | Firestore | Sin validación de schema | Validación de campos, tipos, enums en `create` | 2026-04-14 |
| SEC-004 | Storage | Sin límite tamaño/MIME | 10 MB + `image/*` | 2026-04-14 |
| SEC-005 | Firestore | Regex frágil en dailyLogs | Regex `_YYYY-MM-DD` + doble check userId | 2026-04-14 |
| SEC-006 | Hosting | Sin headers seguridad | HSTS, X-Frame-Options, CSP, nosniff, Referrer-Policy, Permissions-Policy | 2026-04-14 |
| SEC-008 | Deps | undici 10 CVEs | Override `undici@^7.10.0` | 2026-04-14 |
| SEC-BUG | Firestore | waterLogs sin reglas | Reglas añadidas con auth + owner + schema | 2026-04-14 |
| SEC-011 | App | Tokens Terra/InBody en AsyncStorage sin cifrar | Migrados a `expo-secure-store` con fallback automático | 2026-04-14 |
| SEC-012 | App | 161 console.log sin guardia `__DEV__` | `babel-plugin-transform-remove-console` en producción | 2026-04-14 |
| SEC-013 | Hosting | Sin Content-Security-Policy | CSP configurada con whitelist de GA4, Google Fonts | 2026-04-14 |

---

## Detalle SEC-009: OpenAI API key en cliente

**Riesgo**: Alguien decompila el APK (Hermes bytecode reversible) → extrae `EXPO_PUBLIC_OPENAI_API_KEY` → usa el key para generar llamadas a OpenAI → Judith paga.

**Archivos afectados (6)**:
- `services/openai.ts` — Análisis de fotos + sugerencias de comida
- `services/voiceLog.ts` — Transcripción de voz
- `services/macroCoach.ts` — Coaching semanal IA
- `services/recipeService.ts` — Generación de recetas
- `services/foodDatabase.ts` — Búsqueda en base de datos
- `app/label-scanner.tsx` — Escáner de etiquetas

**Fix propuesto** — Firebase Cloud Function proxy:
1. Crear `functions/src/openaiProxy.ts` con endpoint HTTPS callable.
2. La función verifica `context.auth` (solo usuarios autenticados).
3. La función lee `OPENAI_API_KEY` de `functions.config()` (server-side).
4. La función hace la llamada a OpenAI y devuelve la respuesta.
5. Rate limiting: máx. 50 llamadas/día por usuario.
6. Los 6 archivos de la app se refactorizan para llamar al proxy en vez de a OpenAI directamente.

**Coste**: Firebase Cloud Functions requiere plan Blaze (pay-as-you-go). Verificar con Judith.

**Mitigación temporal**: El APK usa Hermes bytecode (no JS plano), lo que dificulta la extracción. Pero no es protección suficiente.

---

## Detalle SEC-010: InBody client_secret en cliente

**Riesgo**: El `client_secret` de InBody OAuth se envía desde el dispositivo en el token exchange. Si alguien intercepta el tráfico o decompila el APK, obtiene el secret.

**Fix**: Mover el token exchange a una Cloud Function. El dispositivo envía el auth code al proxy, el proxy hace el exchange con client_secret server-side.

---

## Historial de auditorías

| Fecha | Tipo | Alcance | Hallazgos | Resueltos | Abiertos |
|-------|------|---------|-----------|-----------|----------|
| 2026-04-14 | Completa | deps + secrets + rules + headers + code + auth + storage local | 13 + 2 altas | 11/13 | 2 altas (SEC-009, SEC-010) |

---

## Firestore Rules — Estado

| Colección | Auth | Owner | Schema | Estado |
|-----------|------|-------|--------|--------|
| `users/{userId}` | ✅ | ✅ | ✅ create | 🟢 |
| `meals/{mealId}` | ✅ | ✅ | ✅ create | 🟢 |
| `mealTemplates/{templateId}` | ✅ | ✅ | ✅ create | 🟢 |
| `weightEntries/{entryId}` | ✅ | ✅ | ✅ create | 🟢 |
| `progressPhotos/{photoId}` | ✅ | ✅ | ✅ create | 🟢 |
| `recipes/{recipeId}` | ✅ | ✅ | ✅ create | 🟢 |
| `shoppingList` (sub) | ✅ | ✅ | ✅ create | 🟢 |
| `dailyLogs/{logId}` | ✅ | ✅ (regex + userId) | ✅ create | 🟢 |
| `waterLogs/{logId}` | ✅ | ✅ (regex + userId) | ✅ create | 🟢 |

## Storage Rules — Estado

| Path | Auth | Owner | Max size | MIME | Estado |
|------|------|-------|----------|------|--------|
| `users/{userId}/**` | ✅ | ✅ | 10 MB | `image/*` | 🟢 |
| `progressPhotos/{userId}/**` | ✅ | ✅ | 10 MB | `image/*` | 🟢 |

## Hosting Headers — Estado

| Header | Estado |
|--------|--------|
| Strict-Transport-Security | 🟢 |
| X-Content-Type-Options: nosniff | 🟢 |
| X-Frame-Options: DENY | 🟢 |
| Referrer-Policy | 🟢 |
| Permissions-Policy | 🟢 |
| X-XSS-Protection | 🟢 |
| Content-Security-Policy | 🟢 |

## Almacenamiento local — Estado

| Dato | Storage | Estado |
|------|---------|--------|
| Firebase Auth tokens | AsyncStorage (Firebase SDK default) | 🟡 Gestionado por Firebase SDK |
| Terra API token | SecureStore | 🟢 Migrado |
| InBody token + userId | SecureStore | 🟢 Migrado |
| InBody measurements | AsyncStorage | 🟡 Datos salud, cifrado recomendable |
| Theme / Language / ShoppingList | AsyncStorage | 🟢 No sensible |

---

## Próximos pasos

1. **[Alta prioridad]** Crear Firebase Cloud Function proxy para OpenAI API calls (SEC-009).
2. **[Alta prioridad]** Mover InBody OAuth token exchange a Cloud Function (SEC-010).
3. **[Recomendable]** Rotar OpenAI API key tras implementar el proxy.
4. **[Recomendable]** Rotar InBody client_secret tras mover a servidor.
5. **[Recomendable]** Rotar Firebase API keys si el repo fue público.
6. **[Futuro]** Firebase App Check para proteger endpoints.
7. **[Futuro]** Cifrar datos de salud en AsyncStorage (InBody measurements).
