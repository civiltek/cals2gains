# Cals2Gains - Estado de Seguridad
> Última actualización: 2026-04-14 — Corrección de hallazgos de seguridad

---

## Resumen ejecutivo

| Área | Estado | Última auditoría |
|------|--------|-----------------|
| Dependencias npm | 🟢 0 vulnerabilidades (override undici → 7.10+) | 2026-04-14 |
| Secretos en repo | 🟢 Corregido (.gitignore actualizado) | 2026-04-14 |
| Firestore Rules | 🟢 Schema validation + waterLogs añadido | 2026-04-14 |
| Storage Rules | 🟢 Límite 10 MB + solo imágenes | 2026-04-14 |
| Hosting Headers | 🟢 HSTS, X-Frame-Options, nosniff, etc. | 2026-04-14 |
| Auth Configuration | ⚠️ Pendiente de auditar | — |
| App Security (RN) | 🟡 Escaneo parcial — sin API keys en código | 2026-04-14 |
| API Keys (client) | 🟢 No se encontraron API keys embebidas en código | 2026-04-14 |

**Leyenda:** 🟢 Seguro | 🟡 Aceptable con mejoras pendientes | 🟠 Riesgo medio | 🔴 Riesgo alto | ⚠️ Sin auditar

---

## Vulnerabilidades activas

### Críticas
_Ninguna._

### Altas
_Ninguna._

### Medias
_Ninguna._

### Bajas
_Ninguna._

### Info

| ID | Área | Descripción | Estado | Agente |
|----|------|-------------|--------|--------|
| SEC-007 | Repo | GitHub Push Protection bloqueó `gcloud-token.txt` y `CREDENTIALS.md` | Mitigada | security |

---

## Vulnerabilidades resueltas

| ID | Área | Descripción | Resolución | Fecha |
|----|------|-------------|-----------|-------|
| SEC-001 | Repo | `google-services.json` commiteado | Añadido a `.gitignore` | 2026-04-14 |
| SEC-002 | Repo | `GoogleService-Info.plist` commiteado | Añadido a `.gitignore` | 2026-04-14 |
| SEC-003 | Firestore | Sin validación de schema | Añadida validación de campos requeridos, tipos y enums en `create` para todas las colecciones | 2026-04-14 |
| SEC-004 | Storage | Sin límite de tamaño ni filtro MIME | Límite 10 MB + `contentType.matches('image/.*')` en ambos paths | 2026-04-14 |
| SEC-005 | Firestore | `dailyLogs` regex frágil `_.*` | Regex mejorado a `_[0-9]{4}-[0-9]{2}-[0-9]{2}` + validación de campo `userId` | 2026-04-14 |
| SEC-006 | Hosting | Headers de seguridad no configurados | Añadidos: HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, X-XSS-Protection | 2026-04-14 |
| SEC-008 | Deps | `undici@6.19.7` con 10 CVEs (1 high, 9 moderate) via Firebase | Override a `undici@^7.10.0` en package.json; `npm audit`: 0 vulnerabilidades | 2026-04-14 |
| SEC-BUG | Firestore | `waterLogs` sin reglas → "Missing or insufficient permissions" | Reglas añadidas con auth + owner + schema validation | 2026-04-14 |

---

## Historial de auditorías

| Fecha | Tipo | Alcance | Hallazgos | Resueltos | Informe |
|-------|------|---------|-----------|-----------|---------|
| 2026-04-14 | Inicial + corrección | deps + secrets + rules + headers + code scan | 8 (0 crít, 1 alto, 5 medios, 1 bajo, 1 info) | 8/8 | Este documento |

---

## Secretos y credenciales

### Archivos sensibles en el repositorio
| Archivo | En `.gitignore` | Riesgo | Estado |
|---------|----------------|--------|--------|
| `google-services.json` | ✅ Sí (añadido 14/04) | — | Corregido |
| `GoogleService-Info.plist` | ✅ Sí (añadido 14/04) | — | Corregido |
| `.env` | ✅ Sí | — | Correcto |
| `google-play-service-account.json` | ✅ Sí | — | Correcto |
| `*.jks` / `*.keystore` | ✅ Sí | — | Correcto |
| `docs/build-logs/gcloud-token.txt` | ✅ Sí (Push Protection) | — | Mitigado |
| `tools/outlook-mcp-server/CREDENTIALS.md` | ✅ Sí (Push Protection) | — | Mitigado |

### Escaneo de código fuente
- Grep de patrones `sk-`, `AIza`, `AKIA`, `ghp_` en archivos `.ts`, `.tsx`, `.js`, `.jsx`, `.json`.
- Único hallazgo: `AIzaSy...` en `google-services.json` (esperado, ahora en `.gitignore`).
- **No se encontraron API keys embebidas en código de la app.**

### Rotación de secretos
| Secreto | Última rotación | Próxima recomendada |
|---------|----------------|-------------------|
| Firebase API keys | Desconocida | Recomendable si el repo fue público en algún momento |
| EAS tokens | Desconocida | Pendiente de verificar |
| RevenueCat API key | Desconocida | Pendiente de verificar |

---

## Firestore Rules — Estado detallado

| Colección | Auth | Owner | Schema | Observaciones |
|-----------|------|-------|--------|---------------|
| `users/{userId}` | ✅ | ✅ | ✅ create | `email`, `createdAt`, `goals` (map), `profile` (map) requeridos |
| `meals/{mealId}` | ✅ | ✅ | ✅ create | `dishName` ≤500 chars, `mealType` enum, nutrition validada |
| `mealTemplates/{templateId}` | ✅ | ✅ | ✅ create | `name` ≤500 chars, `mealType` enum, nutrition validada |
| `weightEntries/{entryId}` | ✅ | ✅ | ✅ create | `weight` > 0 y < 700 kg |
| `progressPhotos/{photoId}` | ✅ | ✅ | ✅ create | `angle` enum (front/side/back) |
| `recipes/{recipeId}` | ✅ | ✅ | ✅ create | `source` enum, `servings` > 0, `ingredients` list |
| `shoppingList` (subcolección) | ✅ | ✅ | ✅ create | `name` 1-500 chars, `checked` bool |
| `dailyLogs/{logId}` | ✅ | ✅ (regex mejorado + userId) | ✅ create | Regex `uid_YYYY-MM-DD`, userId doble check |
| `waterLogs/{logId}` | ✅ | ✅ (regex + userId) | ✅ create | **NUEVO** — glasses ≥ 0, goal > 0 |

---

## Storage Rules — Estado detallado

| Path | Auth | Owner | Max size | MIME filter |
|------|------|-------|----------|-------------|
| `users/{userId}/**` | ✅ | ✅ | ✅ 10 MB | ✅ `image/*` |
| `progressPhotos/{userId}/**` | ✅ | ✅ | ✅ 10 MB | ✅ `image/*` |

---

## Hosting Headers

| Header | Valor | Estado |
|--------|-------|--------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | ✅ |
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `X-Frame-Options` | `DENY` | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ✅ |
| `X-XSS-Protection` | `1; mode=block` | ✅ |

---

## Próximos pasos

1. **[Pendiente]** Auditar configuración de Firebase Auth (proveedores, rate limiting, políticas de contraseña).
2. **[Pendiente]** Verificar que `__DEV__` está deshabilitado en builds de producción.
3. **[Pendiente]** Revisar uso de AsyncStorage vs SecureStore para tokens.
4. **[Recomendable]** Rotar Firebase API keys si el repositorio fue público en algún momento.
5. **[Recomendable]** Limpiar `google-services.json` y `GoogleService-Info.plist` del historial de git (si el repo fue público).
6. **[Futuro]** Configurar Content-Security-Policy específica para la landing.
7. **[Futuro]** Activar Firebase App Check para proteger APIs backend.
