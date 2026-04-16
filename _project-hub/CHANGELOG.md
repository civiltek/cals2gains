# Changelog - Cals2Gains

## 2026-04-16 — Activación HealthKit / Health Connect: TDEE dinámico y UI de actividad

- **Desbloquear onboarding**: `app/(auth)/onboarding.tsx` — botón de integración de salud ahora pide permisos reales de HealthKit (iOS) / Health Connect (Android) en lugar de mostrar "Coming Soon"
- **TDEE dinámico**: `utils/nutrition.ts` — nueva función `calculateDynamicTDEE(bmr, avgActiveCalories7d, daysWithData)` que usa calorías activas reales con media móvil de 7 días y descuento de sobre-estimación (×0.9); fallback al multiplicador estático si hay <3 días de datos
- **Extensión HealthService**: `services/healthKit.ts` — nuevos métodos `get7DayCalorieAverage()` (media de calorías activas por plataforma) y `getIsAuthorized()` (expone estado de autorización)
- **Sync periódico**: `hooks/useHealthSync.ts` (nuevo) — sincroniza datos de salud al abrir la app, cada 30 minutos en foreground, y al volver de background; si `dynamicTDEEEnabled`, recalcula y persiste TDEE dinámico
- **Motor adaptativo**: `services/adaptiveMacroEngine.ts` — nuevo tipo `ActivityAdjustment` y método estático `shouldAdjustForActivity()` que detecta desviaciones ≥200 kcal respecto al TDEE estático y genera mensajes ES/EN
- **MacroCoach mejorado**: `services/macroCoach.ts` — `buildCoachingContext()` ahora incluye datos detallados de pasos, calorías activas/reposo, minutos de ejercicio, ritmo cardíaco y comparativa actividad vs. esperada; workouts muestran total kcal semanal
- **UI de salud**: `components/ui/HealthDashboardCard.tsx` (nuevo) — tarjeta con pasos, calorías activas, minutos de ejercicio, comparativa TDEE estático vs. dinámico, indicador de actividad extra, y toggle para activar/desactivar TDEE dinámico
- **Perfil actualizado**: `app/(tabs)/profile.tsx` — nueva sección "Salud y Actividad" con `HealthDashboardCard` + hook `useHealthSync` activo
- **Store extendido**: `store/userStore.ts` — nuevo campo `healthData`, acciones `updateHealthData`, `setHealthEnabled`, `setDynamicTDEEEnabled`
- **Firebase extendido**: `services/firebase.ts` — `updateUserGoalsAndMode` acepta `healthEnabled` y `dynamicTDEEEnabled`
- **Tipos**: `types/index.ts` — `User` ahora incluye `healthEnabled?` y `dynamicTDEEEnabled?`
- **i18n**: `i18n/en.ts` + `i18n/es.ts` — nueva sección `health` (ES+EN) con todos los textos de la UI

## 2026-04-16 — Motor Remotion v2: 6 fixes de calidad (tildes, voz, CTA, textos, Sora, música)

- **Fix UTF-8**: `create_reel_v2.py` — todos los `write_text()` ahora usan `encoding="utf-8"` explícito (corrige tildes/acentos en subtítulos karaoke en Windows)
- **Fix voz España**: ElevenLabs llama con `stability=0.75, similarity_boost=0.75` para maximizar acento castellano peninsular (voice_id `pFZP5JQG7iQjIQuC4Bku` — Lucía, España)
- **CTASlide nuevo**: componente `CTASlide.tsx` — pantalla final 3.5s con logo C2G-Logo-Light, "@cals2gains", "Descarga la app gratis", gradiente coral→violet; se añade automáticamente a todos los reels
- **Textos sentence case**: `TitleText.tsx` — función `toSentenceCase()` convierte títulos Title Case de GPT a minúsculas normales (solo primera letra mayúscula). Pill fondo cambiado a coral `rgba(255,106,77,0.78)` sobre fondo blanco
- **Prompts Sora realistas**: `BRAND_VIDEO_SUFFIX` en ambos scripts Python cambiado de "cinematic/neon/violet palette" a "realistic, handheld camera, natural lighting, casual everyday setting, no dramatic lighting"
- **Soporte música de fondo**: `ReelComposition.tsx` reproduce `backgroundMusicFile` a 25% volumen con loop; `create_reel_v2.py` busca automáticamente `public/background_music.mp3` (u otros nombres estándar). Para activar: colocar MP3 libre de royalties en `tools/remotion-engine/public/background_music.mp3`
- **Prompt GPT-4o actualizado**: pide sentence case explícitamente y tildes/acentos correctos en todos los textos
- **ReelProps actualizado**: nuevos campos `backgroundMusicFile?` y `showCTASlide?` en `types.ts`
- **calculateMetadata actualizado**: `Root.tsx` suma los frames del CTA slide al total de la composición

## 2026-04-16 — Fix iOS build: patch expo-dev-menu reloadAppAsync

- **Error**: Build iOS #19 fallaba con `AppContext has no member reloadAppAsync` (Swift compile error)
- **Causa**: `expo-dev-menu 55.0.23` llama `appContext?.reloadAppAsync()` pero `AppContext` en `expo-modules-core 3.0.29` no tiene ese método nativo
- **Fix**: `patch-package` → parche en `patches/expo-dev-menu+55.0.23.patch` que sustituye la llamada por `bridge?.reload()`
- **Archivos**: `patches/expo-dev-menu+55.0.23.patch` (nuevo), `package.json` (añadido `patch-package ^8.0.1` + script `postinstall`)

## 2026-04-16 — Build AAB Android producción (versionCode 14) generado

- **AAB generado**: `builds/app-release.aab` (75 MB, firmado con keystore EAS)
- **versionCode**: autoincrement desde EAS (~v14 según intentos fallidos previos)
- **Método**: GitHub Actions ubuntu-latest + `eas build --local` (sin cuota EAS cloud)
- **Workflow reutilizable**: `.github/workflows/build-android-production.yml`
- **Fix aplicado**: Config plugin `plugins/withMinSdkVersion.js` → `minSdkVersion=26` vía `withGradleProperties` (requerido por `react-native-health-connect` / `androidx.health.connect:connect-client:1.1.0-alpha11`)
- **Listo para subir** a Google Play Console (internal testing track)

## 2026-04-16 — Formato viral + fixes pipeline render (PR #16, PR #18)

- **Subtítulos karaoke**: palabra activa en dorado #FFD700 con glow, font 52-58px bold, zona segura IG (340px bottom)
- **Logo esquina izquierda**: movido de top-right a top-left, opacidad 75%
- **Ken Burns effect**: imágenes estáticas con zoom lento 100→108% + pan sutil
- **TitleText pill**: fondo semi-transparente en hook y escenas regulares, mejor shadow
- **Zona segura Instagram**: subtítulos 340px bottom, watermark 330px
- **Framework 3/8/12**: GPT-4o genera hooks 3s, contenido 2-3s por escena, CTA 4s
- **Voz Lucía (ElevenLabs)**: castellana España peninsular (pFZP5JQG7iQjIQuC4Bku)
- **Fix fonts**: fonts.css con rutas relativas para webpack (antes fallaba en bundling)
- **Fix video faststart**: `_apply_faststart()` en generate_sora_clips.py — Chrome headless requiere moov atom al inicio
- **Fix render concurrency**: concurrency=1 para evitar timeout al cargar videos Sora en paralelo
- **Reel de prueba v2**: `output/2026-04-16T12-26-42_3_tips_viral.mp4` (14MB, 19.4s, 5 clips Sora 2)

## 2026-04-16 — Motor de reels v2: Remotion + Sora 2 + ElevenLabs

- **Nuevo motor**: `tools/remotion-engine/` creado desde cero (NO toca visual-engine existente)
- **Stack**: Remotion 4.0.291 (React/TypeScript) + Sora 2 API + DALL-E 3 fallback + ElevenLabs voiceovers
- **Componentes Remotion**: `ReelComposition`, `SceneLayer`, `Background`, `TitleText`, `Subtitles`, `Logo`, `ProgressBar`, `Watermark`
- **Pipeline Python**: GPT-4o (guion) -> Sora 2 (clips video) -> ElevenLabs (voiceovers con timestamps) -> Remotion render
- **Formato**: 1080x1920 px 30fps H.264, tipografia Outfit, colores brand (coral #FF6A4D, violet #9C8CFF)
- **Reel de prueba generado**: `3 tips para beber mas agua` (ES, 23s, 690 frames, 10MB)
  - scene_0, scene_4: clips Sora 2 (4s, 720x1280)
  - scene_1-3: imagenes DALL-E 3 (5s -> fallback por limites Sora: solo acepta 4/8/12s)
  - 5 voiceovers ElevenLabs con word-level timestamps para subtitulos
  - Output: `tools/remotion-engine/output/2026-04-16T11-33-41_3_tips_para_beber_mas_agua.mp4`
- **Bugs conocidos/resueltos**: Sora 2 solo acepta 4/8/12s -> quantizador anadido en generate_sora_clips.py; Windows subprocess npx -> shell=True fix en create_reel_v2.py
- **Uso**: `cd tools/remotion-engine && python create_reel_v2.py --topic "tema" --lang es`

## 2026-04-15 — Pipeline visual-engine end-to-end validado + corrección de 8 bugs moviepy v2

- **API key Muapi**: `MUAPI_KEY` y `MUAPI_API_KEY` añadidas al `.env` raíz
- **Pipeline probado**: `create_reel.py --topic "3 mitos sobre las proteínas"` → GPT script ✅ → Sora 2 (5 clips) ✅ → ElevenLabs (5 voces ES) ✅ → composición ✅
- **Fallback activo**: Muapi devuelve 402 (key sin prefijo `sk-`) → Sora 2 hace de fallback automático
- **Bugs corregidos en `reel_composer.py` y `create_reel.py`**:
  - `→` U+2192 → `->` (charmap Windows cp1252 crash en print)
  - `scene_voices` kwarg ausente en `compose_reel()` → añadido con `CompositeAudioClip` por escena
  - `generate_voice()` devuelve dict → `create_reel.py` desempaqueta `result["audio_path"]`
  - `AudioClip.resized()` no existe → eliminado de `mix_audio_tracks`
  - `clip.resized(newsize=)` → `clip.resized(new_size=)` (moviepy v2)
  - `clip.fl()` → `clip.transform()` (moviepy v2)
  - `add_watermark(position=)` kwarg inválido → eliminado
  - `with_volume_multiplied` → `with_volume_scaled` (moviepy v2)
  - `write_videofile(verbose=False)` → eliminado (moviepy v2)
- **Archivo final**: `tools/visual-engine/output/3_mitos_sobre_las_proteínas_1776266756/compose_test.mp4` (7.7 MB, ~24s, 1080×1920)

## 2026-04-15 — Generar carrusel PIEZA-01 "Huevos y colesterol" con imágenes Gamma

- **render_gamma_slides.py**: ejecutado completo — genera 14 slides (7 ES + 7 EN) con imágenes Gamma como fondo + overlays de marca Outfit Bold/Regular
- **Calidad**: 453 KB – 1.07 MB por slide (vs 37-74 KB del script anterior sin Gamma)
- **Output ES**: `content/piezas/pieza-01-assets/slide_01-07.png` + copia en `pieza-01-final/`
- **Output EN**: `content/piezas/pieza-01-assets-en/slide_01-07.png`
- **Enviado a Telegram**: 7 slides ES enviadas como media group al canal de aprobación (`draft_id: pieza-01-es-v1`), pendiente aprobación de Judith

## 2026-04-15 — Deploy Firebase: reglas Firestore, índices y hosting

- **Firestore rules**: `firestore.rules` compilado y publicado en Cloud Firestore (water tracker, fasting y seguridad activos en producción)
- **Firestore indexes**: `firestore.indexes.json` desplegado en base de datos `(default)`
- **Hosting**: 16 archivos en `public/`, release completo — cals2gains.com actualizado

## 2026-04-15 — Migrar visual-engine a API open source de Higgsfield (Muapi.ai)

- **higgsfield_client.py**: reescritura completa — cambia de `cloud.higgsfield.ai` (de pago) a `api.muapi.ai` (open source, tier gratuito)
- **Auth**: de `Authorization: Bearer` a header `x-api-key`; env var renombrada de `HIGGSFIELD_API_KEY` a `MUAPI_API_KEY`
- **Endpoints actualizados**: submit `POST /api/v1/{model-id}` · polling `GET /api/v1/predictions/{id}/result` · upload `POST /api/v1/upload_file`
- **40+ modelos disponibles**: Kling v2.6 Pro (por defecto), Seedance 2.0, Veo 3.1, Sora 2, Runway, Wan 2.6, etc.
- **Mapeo automático** de nombres heredados (sora-2, kling-3.0, veo-3.1…) a IDs de Muapi
- **brand_config.py**: añadido `MUAPI_API_KEY` + `HIGGSFIELD_DEFAULT_MODEL`; `HIGGSFIELD_API_KEY` queda como alias de compatibilidad
- **.env**: añadido placeholder `MUAPI_API_KEY=` (pendiente de rellenar con key gratuita de muapi.ai)
- **Sin breaking changes**: misma interfaz pública (`HiggsFieldClient`, `CameraPresets`, `StylePresets`, `generate_scene_clip`); `create_reel.py` funciona sin modificar

## 2026-04-15 — Notion workspace completo + auto-sync diario

- **Notion API**: workspace completo conectado al repo vía integración "Cals2Gains hub"
- **Páginas estáticas**: Dashboard & KPIs, SEO & Web, Brand Guidelines, Tech Stack, Cuentas & Servicios, Agentes IA, Legal
- **Bases de datos**: Roadmap (19 tareas), Finanzas (9 gastos), Features App (42 pantallas), Plan de Contenido (10 piezas)
- **Auto-sync diario 9:00**: tarea programada `notion-sync-cals2gains` creada via Claude Code scheduled tasks
- **Scripts**: `tools/setup-notion.mjs` (setup), `tools/update-notion.mjs` (auto-sync), `tools/sync-notion.mjs` (manual/CLI)
- **IDs Notion**: `tools/notion-ids.json` · Parent page: `3435c636bbd680b181b0d03f747b2cd0`
- **Qué actualiza el auto-sync**: Dashboard (KPIs + alertas desde hub), Finanzas DB (nuevos gastos sin duplicar), timestamp HQ

## 2026-04-15 — Fix bloqueantes pre-lanzamiento (rama claude/awesome-herschel)

- **gpt-5.4 → gpt-4o**: sustituido el modelo inexistente en 6 archivos de código (openai.ts, label-scanner.tsx, foodDatabase.ts, macroCoach.ts, recipeService.ts, create_reel.py)
- **firestore.indexes.json**: añadido índice compuesto `fastingSessions` (userId ASC + startTime DESC)
- **waterStore.setGoal**: ahora persiste el goal en Firestore (antes solo local)
- **Streak proteínas**: implementado cálculo real desde `recentMeals` en protein-dashboard.tsx
- **TS errors export-data.tsx**: corregidos accesos incorrectos a `Meal.date`, `Meal.calories`, `Meal.name` → `timestamp`, `nutrition.calories`, `dishName`; añadidos estilos `loadingContainer`/`loadingText` faltantes
- **TS errors coach-share.tsx**: corregido `m.date → m.timestamp`, `user.profile.name → user.displayName`; añadidos estilos de coach faltantes en StyleSheet
- **TS errors edit-profile.tsx**: corregidas referencias a `user.profile.name → user.displayName`
- **types/index.ts**: añadidos `bio?`, `avatarType?`, `name?` opcionales a `UserProfile`
- **Nota**: `services/firebase.ts` — sin bytes nulos (limpio). `services/openai.ts` — no estaba truncado, sólo faltaba el fix del modelo.
- **Pendiente**: errores TS pre-existentes en otros archivos (history.tsx, measurements.tsx, fastingStore.ts, etc.) — no formaban parte de esta tarea

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

