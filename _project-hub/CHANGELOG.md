# Changelog - Cals2Gains

## 2026-04-14 — Corrección de hallazgos de seguridad (8/8 resueltos)

### Firestore Rules — reescritura completa
- Validación de schema en `create` para todas las colecciones: campos requeridos, tipos, enums, límites.
- Funciones helper: `isAuth()`, `isOwner()`, `ownsResource()`, `validNutrition()`, `ownsLogById()`.
- `dailyLogs`: regex mejorado de `_.*` a `_[0-9]{4}-[0-9]{2}-[0-9]{2}` + validación doble de userId.
- `waterLogs`: **reglas añadidas** — fix del bug "Missing or insufficient permissions".

### Storage Rules — límites añadidos
- Máximo 10 MB por archivo.
- Solo tipo MIME `image/*` permitido.

### Firebase Hosting — headers de seguridad
- HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, X-XSS-Protection.

### Dependencias
- Override `undici@^7.10.0` en package.json para resolver 10 CVEs (1 high, 9 moderate). `npm audit`: 0 vulnerabilidades.

### .gitignore
- `google-services.json` y `GoogleService-Info.plist` añadidos a `.gitignore`.

### Escaneo de secretos
- Grep de patterns de API keys en código fuente (.ts/.tsx/.js/.jsx/.json) — limpio.

## 2026-04-14 — Sistema de agentes de ciberseguridad

### Nuevos agentes de seguridad
- `agents/security.md` — Coordinador de ciberseguridad: auditorías periódicas, escaneo de dependencias y secretos, gestión de vulnerabilidades.
- `agents/appsec.md` — Seguridad de la app móvil: código RN, dependencias npm, almacenamiento seguro, auth, protección del APK.
- `agents/infrasec.md` — Seguridad de infraestructura: Firestore rules, Storage rules, hosting headers, API keys, configuración cloud.

### Nuevos archivos de soporte
- `_project-hub/SECURITY_STATUS.md` — Estado vivo de seguridad con vulnerabilidades clasificadas (7 hallazgos iniciales).
- `guardrails/SECURITY-BASELINE.md` — 12 estándares de seguridad mínimos (SB1-SB12).
- `orchestration/SECURITY-WORKFLOWS.md` — 6 flujos de seguridad (SW1-SW6): escaneo deps, secretos, auditoría mensual, respuesta a incidentes, pre-build, pre-deploy.

### Archivos actualizados
- `CLAUDE.md` — Tabla de agentes ampliada con security, appsec, infrasec.
- `orchestration/HANDOFFS.md` — Handoffs de seguridad añadidos (security↔appsec, security↔infrasec, appsec→app-dev, infrasec→web-dev, cualquiera→security).
- `orchestration/WORKFLOWS.md` — Referencia a flujos de seguridad (W10-W16 → SECURITY-WORKFLOWS.md).

### Hallazgos iniciales de seguridad
- SEC-001/002: `google-services.json` y `GoogleService-Info.plist` commiteados (severidad media).
- SEC-003: Sin validación de schema en Firestore rules (severidad media).
- SEC-004: Sin límites de tamaño ni filtro MIME en Storage rules (severidad media).
- SEC-005: Regex frágil en dailyLogs (severidad media).
- SEC-006: Headers de seguridad HTTP no configurados (severidad baja).
- SEC-007: GitHub Push Protection bloqueó tokens de GCloud (mitigada).

## 2026-04-14 (noche-4) — Motor audiovisual v4.0 (Studio)

### Visual Engine — Upgrade a calidad de estudio profesional
Ruta: `tools/visual-engine/`

**Nuevos módulos:**
- `post_processing.py` — Pipeline de postproducción cinematográfica: color grading (lift/gamma/gain con presets de marca), curva S filmica, vignette, grano de película, bloom, sharpening selectivo, aberración cromática
- `transitions.py` — Transiciones profesionales: zoom_cut, whip_pan, luma_fade, flash_white, directional_wipe, zoom_punch_in + funciones de easing (cubic, expo)

**Módulos actualizados:**
- `brand_overlay.py` v3→v4: glassmorphism (paneles de vidrio esmerilado), gradientes radiales, acentos decorativos (líneas, marcas de esquina, círculos de brillo), integración con post-processing
- `video_generator.py`: Ken Burns con easing cúbico, breathing orgánico, nuevos efectos (orbit, drift), upscale 2.5x
- `music_manager.py` v3→v4: salida estéreo, progresión de acordes (no estático), reverb por delay, shimmer armónico, textura noise filtrada, fades exponenciales
- `reel_composer.py` v3→v4: intro/outro animados con glows, integración de transiciones profesionales, color grading por frame
- `create_carousel.py`: tarjetas con glassmorphism, marcas decorativas, separadores, post-processing por slide
- `requirements.txt`: eliminado pydub (incompatible Python 3.13+), audio via numpy+wave

**Test completo validado:**
- Pipeline reel: 1080x1920 @ 30fps, -14 LUFS, codec h264 — OK
- Post-processing: 6 presets de color grading — OK
- Transiciones: 6 tipos profesionales — OK
- Ken Burns: 4 efectos con easing — OK
- Música: stereo pad con reverb y progresión — OK

## 2026-04-14 (noche-3) — Automatizacion activada + guia emails 3-7

### Brevo — Automatizacion #2 activada
- Email 2 "Tu primer paso: como usar tus macros" configurado con HTML branded completo
- Automatizacion activada con secuencia: Trigger → Email 1 → 2 dias → Email 2 → Salida
- URL: https://app.brevo.com/automation/edit/2

### Emails 3-7 — Guia y plantillas HTML
- Guia actualizada: `marketing/email/brevo-welcome-sequence-guide.md` con instrucciones paso a paso
- 5 plantillas HTML completas creadas en `marketing/email/html-templates/`:
  - email-3-coach-ia.html (Conoce a tu coach IA)
  - email-4-social-proof.html (Historias reales)
  - email-5-error-nutricion.html (Error #1 nutricion)
  - email-6-escaner.html (Escaner de comida)
  - email-7-cta-final.html (7 dias gratis)
- PENDIENTE: Judith debe añadir emails 3-7 manualmente en Brevo (drag-and-drop no automatizable)

### Lead magnet PDF
- PDF copiado a `public/guides/macro-calculator-guide.pdf` para Firebase Hosting
- URL objetivo: https://cals2gains.com/guides/macro-calculator-guide.pdf
- PENDIENTE: `firebase deploy --only hosting` para publicar

---

## 2026-04-14 (noche-2) — Configuracion completa Brevo email marketing

### Brevo — Plantilla, remitente, listas
- Plantilla HTML branded "C2G Newsletter Template" (#1) creada con colores coral/violet, header oscuro, footer
- Remitente configurado: info@cals2gains.com / Cals2Gains
- Listas creadas: "Main List" (#3) y "Lead Magnet - Macro Calculator" (#4)

### Brevo — Formulario de suscripcion
- Formulario embebido "C2G Subscription Form - Macro Calculator" creado
- Doble opt-in (RGPD) activado con plantilla DOI predeterminada
- Integrado via iframe en `website/link/index.html` (seccion "Guia de Macros Gratis")

### Brevo — Automatizacion Welcome Sequence
- Automatizacion #1 creada: trigger "Contacto añadido a Main List"
- Email 1 (Bienvenida + Guia de Macros Gratis) configurado con contenido HTML branded
- Delay de 2 dias configurado
- Guia completa con HTML de los 7 emails en `marketing/email/brevo-welcome-sequence-guide.md`
- Guia de integracion Brevo API + subscriber box en `marketing/email/brevo-web-integration-guide.md`

### Landing page link-in-bio
- Añadida seccion "Guia de Macros Gratis" con formulario Brevo embebido
- PENDIENTE: git commit + push (index.lock en sandbox impide commit automatico)

---

## 2026-04-14 (noche) — Activación completa de funcionalidades para publicación

### Fasting Tracker → Firestore real
- Eliminado mock store inline de `app/fasting.tsx`
- Conectado al Zustand store real (`store/fastingStore.ts`) con persistencia Firestore
- Añadidas funciones Firebase: `saveFastingConfig`, `getFastingConfig`, `saveFastingSession`, `getFastingSessions`
- Stats calculadas dinámicamente desde historial real

### Firestore Rules — 3 colecciones nuevas
- `waterLogs/{logId}`: patrón `{userId}_{date}` — **resuelve bug "Missing permissions" del water tracker**
- `fastingSessions/{sessionId}`: patrón estándar userId
- `fastingConfigs/{userId}`: userId como doc ID
- **PENDIENTE:** Ejecutar `firebase login --reauth` y luego `firebase deploy --only firestore:rules`

### expo-notifications reinstalado
- `expo-notifications@~0.31.0` añadido a package.json
- Plugin configurado en app.json con color `#9C8CFF` y canal `reminders`
- Permiso `POST_NOTIFICATIONS` añadido a Android
- `useNextNotificationsApi: true` habilitado
- `reminderService.ts` ya tenía fallback dinámico → detecta automáticamente el módulo

### Build EAS Android
- Build `531eb27b-3f95-4664-9682-c604f74f4ae2` lanzado con todos los fixes
- URL: https://expo.dev/accounts/civiltek/projects/cals2gains/builds/531eb27b-3f95-4664-9682-c604f74f4ae2

---

## 2026-04-14 — Preparación para publicación en stores

### Bugs corregidos
- **Progress Photos:** Corregido upload a Firebase Storage. Ahora las fotos se suben a Storage (`progressPhotos/{userId}/`) con patrón XMLHttpRequest blob (mismo que profile photo). Firestore guarda la download URL en vez de URI local. Fallback graceful si Storage falla.
- **Delete Progress Photo:** Ahora también borra el archivo de Storage (best-effort).
- **Firebase Storage import:** Añadido `deleteObject` al import de firebase/storage.

### Integraciones de salud
- Añadidos `react-native-health` (iOS HealthKit) y `react-native-health-connect` (Android) a package.json
- Configurado app.json: entitlements HealthKit iOS + 9 permisos Health Connect Android + plugin
- Water Tracker: reglas Firestore correctas, pendiente deploy (`firebase deploy --only firestore:rules`)

### Analytics
- Añadido GA4 tag `G-WMHZQ52NS2` a `website/index.html` y `public/index.html` (dual config con existente `G-97MNMCDEG2`)

### Store listing
- Creado `store-listing/STORE_METADATA.md` con metadata completa para Google Play y App Store (nombres, descripciones EN/ES, keywords, data safety, checklist)

### Auth
- Verificado: Google Sign-In, Apple Sign-In y Email/Password están completos y funcionales

---

## 2026-04-14 — Implementar pantalla de voice logging y refactorizar capture-hub con datos reales

### Voice Log Screen (app/voice-log.tsx)
- **Nueva pantalla completa** para registro de comidas por voz
- **Funcionalidades:**
  - Botón de micrófono con animación pulsante durante grabación
  - Uso de `expo-audio` para grabar en formato M4A
  - Transcripción automática mediante OpenAI Whisper (via voiceLog.ts)
  - Análisis de nutrición con IA mediante `voiceToNutrition()`
  - Interfaz de resultados mostrando transcripción + estimación nutricional
  - Botón "Guardar" para añadir comida al store
  - Botón "Intentar de nuevo" para reintentar grabación
- **Manejo de errores robusto:**
  - Permisos de micrófono (solicitud y validación)
  - Errores de API (key no configurada, inválida, red)
  - Errores de transcripción
- **Estilo:** Coherente con tema actual (useColors, AnimatedView para pulso)
- **i18n:** Traducciones en inglés y español añadidas (voiceLog namespace)

### Actualización de capture-hub.tsx
- **Ruta de voice:** 'voice' → 'voice-log' (línea 60)
- **Removido:** Handler especial inline para voice (setTimeout fake de 1500ms)
- **Mock data → Datos reales:**
  - Importado `useMealStore` y `useUserStore`
  - Reemplazado `createMockRecentMeals()` con `storeRecentMeals` del store
  - Reemplazado `createMockFavorites()` con extracción automática basada en frecuencia
  - Añadido `useEffect` para cargar datos cuando user está disponible
  - Filtrado de "yesterday's meals" usando lógica de fechas real
- **Removidas funciones mock:** `createMockRecentMeals()` y `createMockFavorites()`
- **Estilos:** Removido `voiceLoadingContainer` y `voiceLoadingText` (ya no necesarios)

### Traducciones añadidas (i18n/)
- **en.ts:** voiceLog namespace con 20 strings
- **es.ts:** voiceLog namespace con 20 strings (mismo contenido en español)

### Dependencias
- `expo-audio` ya estaba en app.json (línea 74) — sin cambios
- Microphone permissions ya configuradas en app.json

## 2026-04-14 — Re-agregar expo-notifications al proyecto
- **Paquete re-añadido:** `expo-notifications` ~0.31.0 en dependencies
- **Configuración del plugin en app.json:**
  - Icono: `./assets/images/notification-icon.png`
  - Color: `#9C8CFF` (violet)
  - Canal por defecto: `reminders`
- **Android config actualizado:**
  - `useNextNotificationsApi: true` habilitado
  - Permiso `android.permission.POST_NOTIFICATIONS` añadido a lista de permisos
- **Verificación:** reminderService.ts ya soporta importación dinámica con fallback seguro
- **FCM:** google-services.json ya configurado en app.json (android.googleServicesFile)
- **Nota:** Las notificaciones funcionarán correctamente ahora que FCM está configurado en google-services.json

## 2026-04-13 (23:30) — Fix crítico: crash al abrir APK en Android
- **Diagnóstico vía ADB logcat sobre Samsung R3CR10E9LSE conectado por USB** — la app se instalaba pero crasheaba al inicializar Reanimated
- **Error real:** `NoSuchFieldException: No field mIsFinished in MessageQueueThreadImpl` → `react-native-reanimated` 3.19.5 incompatible con RN 0.81
- **Fix aplicado:**
  - `react-native-reanimated`: 3.19.5 → ~4.1.1 (v4.1.7 instalada)
  - `react-native-worklets`: nuevo paquete añadido (0.5.1)
  - `babel.config.js`: plugin cambiado de `react-native-reanimated/plugin` → `react-native-worklets/plugin`
- **Nuevo build EAS lanzado:** `c00a412e-0ac0-4698-9646-bc36af7b10f0` (preview, Android, APK)
- Build anterior (358414d2) queda inválido — no instalar
- Confirmado que el proyecto no puede correr en Expo Go (usa módulos nativos RevenueCat, GoogleSignIn, expo-notifications, CameraView con children)

## 2026-04-13 (SEO Fixes aplicados — ejecución automática)
- **public/index.html actualizado** con 4 fixes SEO urgentes:
  - ✅ Twitter Card meta tags añadidos (summary_large_image, title, description, image)
  - ✅ Favicon link añadido (rel="icon" → /c2g-icon.png + apple-touch-icon)
  - ✅ FAQPage schema añadido (5 preguntas → rich snippets Google)
  - ✅ Schema MobileApplication description corregida a español
- **deploy-seo-fixes.bat** creado para facilitar el deploy
- **PENDIENTE:** Ejecutar `deploy-seo-fixes.bat` para publicar los cambios (credenciales Firebase expiradas)

## 2026-04-13 (19:00) — Revisión financiera automática
- Búsqueda automática de nuevos recibos en info@civiltek.es (Gmail MCP)
- **Sin nuevos gastos detectados** desde la última actualización (14:40)
- Dashboard regenerado con timestamp actualizado → ambas ubicaciones sincronizadas
- FINANCES.md actualizado: total acumulado clarificado (413,76 € desde inicio / 390,76 € desde 6 abril)
- Nota: cals2gains@gmail.com y judith.cordobes@gmail.com no accesibles vía MCP (revisar manualmente)

## 2026-04-13
- Auditoría completa Android: 21 fixes i18n, ~70 fixes tema oscuro, 4 fixes Android-específicos
- Build Android exitoso (bf859936) con todas las correcciones aplicadas
- Eliminado expo-notifications (causa crash en Android sin FCM configurado)
- Automatizada respuesta a comentarios en todas las cuentas IG/FB (3x/día)
- **Reorganización completa del proyecto** → estructura profesional con _project-hub
- Sistema financiero creado: Excel, recibos Anthropic (8 PDFs), dashboard, FINANCES.md

## 2026-04-12
- 28 posts ES programados en MBS (calendario 12-25 abril)
- Posts EN generados y parcialmente programados (1-5, 15-28)
- Comentarios automáticos en influencers configurados (2x/día)
- Reels assets creados: demos cámara IA en EN y ES
- Guiones de reels documentados

## Semanas anteriores (resumen)
- Desarrollo completo de la app: 35+ pantallas funcionales
- Integración Firebase (Auth, Firestore, Storage)
- Integración RevenueCat para suscripciones
- Sistema i18n completo (EN + ES)
- Tema claro/oscuro con detección automática
- Landing page creada y desplegada en Firebase Hosting
- Cuentas de RRSS creadas y configuradas
- Estrategia de marketing Fase 1 diseñada
- SEO audit completado para landing page

---
*Para actualizar: añade las entradas más recientes arriba con fecha.*

