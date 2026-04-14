# Cals2Gains - Estado de Seguridad
> Última actualización: 2026-04-14 — Inicialización del sistema de ciberseguridad

---

## Resumen ejecutivo

| Área | Estado | Última auditoría |
|------|--------|-----------------|
| Dependencias npm | ⚠️ Pendiente de primer escaneo | — |
| Secretos en repo | ⚠️ Hallazgos conocidos | 2026-04-14 |
| Firestore Rules | 🟡 Funcional, mejoras pendientes | 2026-04-14 |
| Storage Rules | 🟡 Funcional, mejoras pendientes | 2026-04-14 |
| Hosting Headers | ⚠️ Pendiente de auditar | — |
| Auth Configuration | ⚠️ Pendiente de auditar | — |
| App Security (RN) | ⚠️ Pendiente de primer escaneo | — |
| API Keys (client) | ⚠️ Pendiente de verificar | — |

**Leyenda:** 🟢 Seguro | 🟡 Aceptable con mejoras pendientes | 🟠 Riesgo medio | 🔴 Riesgo alto | ⚠️ Sin auditar

---

## Vulnerabilidades activas

### Críticas
_Ninguna conocida._

### Altas
_Pendiente de primer escaneo completo._

### Medias

| ID | Área | Descripción | Estado | Agente |
|----|------|-------------|--------|--------|
| SEC-001 | Repo | `google-services.json` commiteado (contiene Firebase API key + project ID) | Abierta | security |
| SEC-002 | Repo | `GoogleService-Info.plist` commiteado (contiene Firebase config iOS) | Abierta | security |
| SEC-003 | Firestore | Sin validación de schema en ninguna colección — campos arbitrarios aceptados | Abierta | infrasec |
| SEC-004 | Storage | Sin límite de tamaño ni filtro MIME — riesgo de abuso de almacenamiento | Abierta | infrasec |
| SEC-005 | Firestore | `dailyLogs` usa regex match en ID — verificar resistencia a bypass | Abierta | infrasec |

### Bajas

| ID | Área | Descripción | Estado | Agente |
|----|------|-------------|--------|--------|
| SEC-006 | Hosting | Headers de seguridad HTTP no configurados (CSP, HSTS, etc.) | Abierta | infrasec |

### Info

| ID | Área | Descripción | Estado | Agente |
|----|------|-------------|--------|--------|
| SEC-007 | Repo | GitHub Push Protection bloqueó `gcloud-token.txt` y `CREDENTIALS.md` | Mitigada | security |

---

## Historial de auditorías

| Fecha | Tipo | Alcance | Hallazgos | Informe |
|-------|------|---------|-----------|---------|
| 2026-04-14 | Inicial | Firestore/Storage rules + repo secrets | 7 hallazgos (0 críticos, 0 altos, 5 medios, 1 bajo, 1 info) | Este documento |

---

## Secretos y credenciales

### Archivos sensibles en el repositorio
| Archivo | En `.gitignore` | Riesgo | Acción recomendada |
|---------|----------------|--------|-------------------|
| `google-services.json` | ❌ NO | Medio | Añadir a `.gitignore`, rotar API key si fue pública |
| `GoogleService-Info.plist` | ❌ NO | Medio | Añadir a `.gitignore` |
| `.env` | ✅ Sí | — | Correcto |
| `google-play-service-account.json` | ✅ Sí | — | Correcto |
| `*.jks` / `*.keystore` | ✅ Sí | — | Correcto |
| `docs/build-logs/gcloud-token.txt` | ✅ Sí (post Push Protection) | — | Mitigado |
| `tools/outlook-mcp-server/CREDENTIALS.md` | ✅ Sí (post Push Protection) | — | Mitigado |

### Rotación de secretos
| Secreto | Última rotación | Próxima recomendada |
|---------|----------------|-------------------|
| Firebase API keys | Desconocida | Tras limpiar `google-services.json` del historial |
| EAS tokens | Desconocida | Pendiente de verificar |
| RevenueCat API key | Desconocida | Pendiente de verificar |

---

## Firestore Rules — Estado detallado

| Colección | Auth | Owner | Schema | Observaciones |
|-----------|------|-------|--------|---------------|
| `users/{userId}` | ✅ | ✅ | ❌ | Aceptar solo campos conocidos |
| `meals/{mealId}` | ✅ | ✅ | ❌ | Validar tipos numéricos de macros |
| `mealTemplates/{templateId}` | ✅ | ✅ | ❌ | — |
| `weightEntries/{entryId}` | ✅ | ✅ | ❌ | Dato de salud — asegurar PII |
| `progressPhotos/{photoId}` | ✅ | ✅ | ❌ | Dato sensible — foto corporal |
| `recipes/{recipeId}` | ✅ | ✅ | ❌ | — |
| `shoppingList` (subcolección) | ✅ | ✅ | ❌ | — |
| `dailyLogs/{logId}` | ✅ | ✅ (regex) | ❌ | Regex `uid + '_.*'` — verificar |

---

## Storage Rules — Estado detallado

| Path | Auth | Owner | Max size | MIME filter |
|------|------|-------|----------|-------------|
| `users/{userId}/**` | ✅ | ✅ | ❌ Ilimitado | ❌ Cualquiera |
| `progressPhotos/{userId}/**` | ✅ | ✅ | ❌ Ilimitado | ❌ Cualquiera |

**Recomendación**: limitar a 10 MB y `image/*`.

---

## Próximos pasos

1. **[Pendiente]** Ejecutar primer `npm audit` completo y clasificar hallazgos.
2. **[Pendiente]** Escanear código fuente de la app por API keys embebidas.
3. **[Requiere Judith]** Añadir `google-services.json` y `GoogleService-Info.plist` a `.gitignore`.
4. **[Requiere Judith]** Proponer mejoras a Firestore rules (validación de schema).
5. **[Requiere Judith]** Proponer mejoras a Storage rules (límites de tamaño + MIME).
6. **[Requiere Judith]** Configurar headers de seguridad en `firebase.json`.
7. **[Pendiente]** Auditar configuración de Firebase Auth.
8. **[Pendiente]** Verificar que API keys de servicios externos no están en código cliente.
9. **[Pendiente]** Configurar tareas programadas de escaneo de seguridad.
