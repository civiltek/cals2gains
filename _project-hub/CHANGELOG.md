# Changelog - Cals2Gains

## 2026-04-17 — Tanda 3: fixes feedback TestFlight build 1.0.0 (46)

Correcciones de los errores/comentarios reportados por Judith como tester interno TestFlight, tras instalar el build `6935ba28` (1.0.0, 46) en iPhone 16 Pro Max / iOS 26.3.1.

**🔴 Crashes:**
- **[app/analytics.tsx]** Pantalla Analíticas crasheaba al abrir porque `renderTrendLine` usaba elementos web `<svg>` y `<path>` en lugar de `Svg`/`Path` de `react-native-svg`. Importado `Svg, Path` y reemplazados los elementos → crash resuelto.

**🔴 Bugs funcionales:**
- **[services/firebase.ts:208-223]** `getUserData` solo deserializaba un subset de campos del user de Firestore y OMITÍA varios opcionales críticos: `allergies`, `intolerances`, `healthEnabled`, `dynamicTDEEEnabled`, `adaptiveMode`, `goalMode`, `nutritionMode`, `tdee`, `bmr`, `weight`. Esto causaba que:
  - Las alergias/intolerancias desaparecieran al reiniciar la app ("aparecen desmarcadas al volver a entrar")
  - El toggle Health/Apple Health se resetease a OFF aunque estuviera conectado
  - Los ajustes de adaptive / goal mode / TDEE dinámico se perdiesen entre sesiones
  Fix: deserializar todos los campos opcionales del interface `User`.

**🟡 Mejoras UX solicitadas por tester:**
- **[app/(tabs)/index.tsx]** Dashboard ahora tiene flechas ◄ ► junto a la fecha para navegar a días anteriores/siguientes. No permite ir al futuro. Cada cambio de día recarga las comidas correspondientes vía `loadMealsForDate`.
- **[app/food-search.tsx]** Búsqueda manual ahora permite ajustar peso exacto en gramos además del stepper de porciones. Input numérico `customGrams` que sobrescribe el cálculo `servingSize × servings`. Macros se recalculan usando `per100g × (grams/100)` para máxima precisión. Descripción de la comida ahora muestra "Xg" en vez de "1 porción".

**A11y:**
- Flechas navegación días: `accessibilityRole="button"` + labels i18n (`home.previousDay`, `home.nextDay`) + `accessibilityState.disabled` cuando es hoy.
- Stepper porciones y botón log: labels i18n (`foodSearch.decreaseServings`, `foodSearch.increaseServings`).

**i18n:** nuevas claves `home.previousDay`, `home.nextDay`, `foodSearch.weightLabel`, `foodSearch.increaseServings`, `foodSearch.decreaseServings` en ES + EN.

**Validación**: `npx tsc --noEmit` 0 errores en código relevante (preexistentes en `tools/remotion-engine`).

**Pendientes reportados que NO se abordan aún:**
- Fotos de progreso no se ven (bug conocido Firebase Storage, aún pendiente — `_project-hub/PROJECT_STATUS.md` → Bugs Conocidos).
- "No se conecta a la app de salud" (x2): los fixes de tanda 1 deben resolverlo; build nuevo con tanda 1+2+3 va a TestFlight tras este commit → verificar con build 47+.

## 2026-04-17 — Actualizar precios de suscripción en todo el proyecto

Nuevos precios: €8,90/mes y €59,90/año (antes €9,99/mes y €49,99/año). Ahorro anual: 44% (antes 58%). Equivalente mensual anual: €4,99/mes.

Archivos modificados:
- **Web**: website/index.html (precios + FAQ), website/terms.html (precios + tildes corregidas en toda la página)
- **App**: app/paywall.tsx, services/revenuecat.ts (product IDs: monthly_890, annual_5990), i18n/es.ts, i18n/en.ts
- **Copias web**: public/index.html, public/terms.html, public/cals2gains/terms.html, public/landing.html
- **Docs/Marketing**: store-listing-metadata, GUIA_COMPLETA, APP-STORE-LISTING, COMMUNITY-PLAYBOOK, INFLUENCER-PLAYBOOK, PROJECT-OVERVIEW (x2), instagram-comment-replies
- No se tocaron precios de competidores ni iCloud.
- **Pendiente**: actualizar precios en RevenueCat dashboard, App Store Connect y Google Play Console.

## 2026-04-17 — Tanda 2: estabilidad (timeouts OpenAI, try/catch, cleanup) + a11y crítico

Continuación de los fixes tras auditoría. Todo listo para ir en el mismo build que la tanda 1.

**Estabilidad:**
- **[services/firebase.ts:396]** `saveMeal` ahora envuelve `updateDailyLog` en try/catch. Si Firestore falla al actualizar el daily log, la comida (que ya se guardó) NO se marca como error para el usuario — el log se reconstruirá en el siguiente save.
- **[app/edit-meal.tsx:89-104]** `handleWeightEndEditing` clampa ratio a `[0.1, 20]` y descarta `Infinity/NaN` → evita que una entrada de peso errónea (0, -5, 99999) borre o infle los macros.
- **[app/edit-meal.tsx:177-192]** `handleSave` ahora pasa todos los campos de `nutrition` por `Math.max(0, parseFloat(s) || 0)` → no se graban negativos.
- **[app/food-search.tsx]** Añadido useEffect cleanup de `searchTimeout` al desmontar → evita `setState` en componente muerto si el usuario navega durante una búsqueda debounced.
- **[services/adaptiveCoachBridge.ts:62-101]** AbortController con timeout 15s en la llamada OpenAI que explica los ajustes de macros. Si la API cuelga, cae al fallback estático inmediato en vez de dejar la UI colgada.
- **[services/foodDatabase.ts:243-305]** `analyzeTextFood` (fallback búsqueda) → 15s timeout.
- **[services/macroCoach.ts:136-200]** Weekly coaching → 20s timeout (prompt más grande).
- **[services/voiceLog.ts:29-53]** Whisper transcribe → 30s timeout (upload audio).
- **[app/label-scanner.tsx:87-132]** OCR etiquetas nutricionales (gpt-4o vision) → 30s timeout.

**A11y (crítico para App Store review):**
- **[app/(tabs)/_layout.tsx]** Tab central de cámara (icono sin label) ahora tiene `accessibilityRole="button"` + `accessibilityLabel` i18n (`home.analyzeFood`: "Analizar comida con cámara" / "Analyze food with camera"). El resto de tabs ya tenía `title` implícito.
- **[app/(auth)/welcome.tsx]** Botones Google/Apple/Email + toggle mostrar contraseña: `accessibilityRole`, `accessibilityLabel`, `accessibilityState.busy` para estados de carga → VoiceOver/TalkBack los anuncia correctamente.
- **[app/(tabs)/profile.tsx]** Botón de notificación (icono sin texto) ahora tiene label.
- **[i18n/es.ts + en.ts]** Nuevas claves: `auth.showPassword`, `auth.hidePassword`, `home.analyzeFood`.

**Pendiente tanda 3** (más adelante):
- A11y al resto de pantallas (settings, home dashboard, capture-hub, camera, etc.) — son ~200 TouchableOpacity, tarea larga.
- Performance: virtualizar `app/(tabs)/index.tsx` (991 líneas) y `app/adherence.tsx` (SectionList en vez de ScrollView+map).
- Photo caching con expo-image en `progress-photos.tsx`.

**Validación**: `npx tsc --noEmit` 0 errores nuevos (preexistentes en `tools/remotion-engine` por deps no instaladas del subproyecto).

## 2026-04-17 — Fix bugs críticos v19 Android (Google Sign-In, Health Connect, tab bar Samsung, búsqueda ES) + auditoría técnica

Reportado por Judith tras test en Samsung con Android 19. Correcciones aplicadas:

- **[app/settings.tsx]** `handleConnectService` enrutaba `appleHealth`/`googleHealth` al flujo de Terra (wearables terceros), que no tiene mapping para HealthKit/Health Connect → error "No se pudo generar el enlace de autenticación". Ahora rama nativa para `appleHealth` (iOS) / `googleHealth` (Android) / `samsungHealth` (Android via Health Connect) → llama `healthService.requestAuthorization()` + `setHealthEnabled(true)`. Resto de wearables sigue por Terra como antes. Añadido `useEffect` para sincronizar toggle con `user.healthEnabled` persistido.
- **[app/(tabs)/profile.tsx]** La `HealthDashboardCard` no tenía `onConnect` → botón "Conectar" nunca se renderizaba. Añadido `handleConnectHealth` que llama a `healthService.requestAuthorization()` y activa `healthEnabled`.
- **[app/(tabs)/_layout.tsx]** `paddingBottom` del tab bar estaba hardcodeado a 8 en Android → botones del sistema de Samsung (3-button nav / gesture bar) se solapaban con las tabs. Ahora usa `useSafeAreaInsets()` y suma `insets.bottom` en Android.
- **[services/foodDatabase.ts]** Búsqueda con base española capaba resultados a 15 con `slice(0, 15)` aunque la DB tiene 500+ ítems → subido a 40. Flujo reordenado: local primero (instantáneo), OFF con timeout 5s (`AbortController`), y nuevo fallback a `analyzeTextFood` (OpenAI) cuando la unión de matches < 3 — resuelve platos caseros ("lentejas estofadas", "paella con chorizo") que OFF no tiene.
- **Pendiente Judith**: añadir SHA-1 del **App Signing Key** de Google Play Console (Configuración → Integridad de la app) al proyecto Firebase y al OAuth Android Client en Google Cloud. Esto desbloquea Google Sign-In en prod (`DEVELOPER_ERROR` actual). Sin este paso los builds Android no pueden hacer login con Google aunque se compilen perfectos.
- **Validación**: `npx tsc --noEmit` 0 errores. Builds nuevos Android+iOS pendientes de lanzar (créditos EAS al 96%).

## 2026-04-17 — Auditoría técnica + informe competitivo Cals2Gains

Informe completo en contexto de Claude (no commiteado). Resumen ejecutivo:

- **Bugs pendientes clasificados**:
  - 🔴 `services/firebase.ts:510-532` `updateDailyLog` sin try/catch → estado inconsistente si Firestore falla
  - 🔴 `services/firebase.ts:747-801` `migrateMealPhotosToFirestore` no valida `photoUri` antes de leer con FileSystem
  - 🟡 `app/edit-meal.tsx:94-98` ratio puede ser 0 → kcal=0
  - 🟡 `app/_layout.tsx:76` + `store/userStore.ts:188` listener `onAuthStateChange` puede fugar en hot reload
  - 🟡 `app/food-search.tsx:64,84-100` searchTimeout sin cleanup en desmontaje
  - 🟡 `services/adaptiveCoachBridge.ts:62-80` llamada OpenAI sin timeout (AbortController)
- **Huecos vs competencia** (MyFitnessPal/Lifesum/Yazio/Cronometer/MacroFactor): URL recipe importer, Strava sync bidireccional, historial de ajustes macro, escritura Apple Health, búsqueda recetas por macro, notificaciones predictivas, báscula Bluetooth, micronutrientes, dark mode automático
- **Diferenciadores reales** (dónde ganamos): Coach IA explicativa en lenguaje natural, análisis foto con contexto usuario, Memory Engine (patrones), Adaptive macro engine granular, integración nativa HealthKit+Health Connect, Fasting tracker con analytics, Coach Share (export nutriólogo), Training Day dinámico
- **UX/a11y**: 0 `accessibilityLabel` en toda la app → crítico para App Store y ~15% usuarios con discapacidad visual. Home `app/(tabs)/index.tsx` 991 líneas sin virtualización (scroll lento <4GB RAM). `app/adherence.tsx:454-514` ScrollView con mapa anidado → usar SectionList. `app/progress-photos.tsx` imágenes sin cache → `expo-image` con `cachePolicy="disk"`.
- **Próximas tandas sugeridas**: (1) estabilidad — timeouts + listeners + photo validation; (2) a11y — añadir `accessibilityLabel` a todos los TouchableOpacity; (3) feature win — Strava sync + "Por qué cambié tus macros" historial.

## 2026-04-17 — Reel "3 errores en tu desayuno" — prompts DALL-E corregidos, sin bloqueos

- **Fix prompts**: eliminadas todas las referencias a cuerpos humanos en `SCRIPT_SYSTEM_PROMPT` (create_reel_v2.py) y en `BRAND_IMAGE_SUFFIX` / `BRAND_VIDEO_SUFFIX` (generate_sora_clips.py). Ahora los video_prompt usan solo escenas de comida, cocinas, equipamiento fitness y entornos — sin personas ni partes del cuerpo.
- **Reel generado**: tema "3 errores en tu desayuno que te hacen engordar", 5 escenas (~16s), `--force-image`
- **Fondos DALL-E 3**: 5/5 generados sin bloqueo de content_policy
- **Voz ElevenLabs**: Lucía peninsular (pFZP5JQG7iQjIQuC4Bku), tildes correctas en todas las escenas
- **Output**: `tools/remotion-engine/output/2026-04-17T00-25-02_3_errores_en_tu_desayuno_que_t.mp4`

## 2026-04-16 — Build Android AAB + iOS production con Firebase secrets

- **Android AAB descargado**: GitHub Actions run `24535633430` → `C:\Users\Judit\Downloads\cals2gains-build-new\android-production-aab\app-release.aab` (build con EAS secrets de Firebase configurados)
- **Samsung**: no instalable directo (AAB requiere bundletool, no instalado); subir a Play Console para testear
- **Build iOS `b7cd8dc2`**: ya estaba cancelado (no requirió acción)
- **Nuevo build iOS lanzado**: `652077c3-059e-41ef-9ba5-18cbae29fc66` — production, build number 44, con todos los Firebase secrets cargados (FIREBASE_API_KEY, APP_ID, AUTH_DOMAIN, MEASUREMENT_ID, etc.)
- **Disco liberado**: borrados ~8.5 GB de temporales EAS CLI (`AppData/Local/Temp/eas-cli-nodejs`); C: pasa de 1.2 GB a 31 GB libres
- **Alerta**: 96% créditos EAS del mes consumidos — considerar upgrade de plan

## 2026-04-16 — Generar reel de prueba con motor Remotion

- **Motor**: remotion-engine / create_reel_v2.py con `--force-image` (DALL-E 3, sin Sora)
- **Tema**: "5 alimentos que destruyen tu grasa abdominal"
- **Script GPT-4o**: 5 escenas, 16s, tildes correctas, CTA a Cals2Gains
- **Voz**: ElevenLabs Lucía (pFZP5JQG7iQjIQuC4Bku — peninsular femenina)
- **Fondos**: DALL-E 3 con placeholders donde content_policy bloqueó prompts de cuerpos
- **Output**: `tools/remotion-engine/output/2026-04-16T23-50-25_5_alimentos_que_destruyen_tu_g.mp4` (9.2 MB)
- **Nota**: el script JSON de escenas en `tools/remotion-engine/temp/2026-04-16T23-50-25_script.json`

## 2026-04-16 — Corregir errores críticos web cals2gains.com + validador pre-deploy

- **Tildes en español**: corregidas ~50 palabras sin acento en todo el HTML (nutrición, función, código, calorías, visión, etc.) tanto en contenido visible como en atributos data-es
- **Enlace Google Play**: `href="#"` → `https://play.google.com/store/apps/details?id=com.civiltek.cals2gains`
- **Enlace App Store**: `href="#"` → `https://apps.apple.com/app/cals2gains/id6744253498`
- **Logo Instagram**: emojis de bandera en social cards reemplazados por SVG oficial de Instagram
- **&copy; en footer**: `&amp;copy;` en atributos data-es/data-en → `©` directo (el JS usaba textContent y mostraba `&copy;` literal)
- **website/validate-web.py**: script de validación pre-deploy que verifica tildes, URLs de stores, SVG de Instagram, símbolo ©, charset UTF-8 y lang=es
- **.github/workflows/deploy-website.yml**: añadido job `validate` (ejecuta validate-web.py) como prerequisito del deploy — si hay errores, el deploy se bloquea
- **public/index.html** sincronizado con website/index.html

## 2026-04-16 — Configurar EAS env vars para builds Android/iOS

- **12 variables EXPO_PUBLIC_* creadas** en EAS (production + preview + development) vía `eas env:create`
- Variables incluidas: FIREBASE_API_KEY (sensitive), FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID, FIREBASE_MEASUREMENT_ID, OPENAI_API_KEY (sensitive), REVENUECAT_ANDROID_API_KEY (sensitive), GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, BUNDLE_ID
- **Build Android lanzado** en GitHub Actions para verificar fix: https://github.com/civiltek/cals2gains/actions/runs/24535633430

## 2026-04-16 — Actualizar landing cals2gains.com: features completas + precios correctos

- **6 nuevas feature cards**: registro por voz, alergias e intolerancias, HealthKit & Health Connect, gamificación y rachas, widget y coach adaptativo, multiidioma ES/EN
- **Base de datos**: actualizado a "500+ alimentos verificados" en card de búsqueda
- **Precios corregidos** (fuente: RevenueCat product IDs): €8.90→€9.99/mes, €49.90→€49.99/año, ahorro 53%→58%
- **Price features lists** ampliadas en ambos planes (mensual y anual)
- **FAQ + Schema.org** actualizados con precios correctos
- **public/index.html** sincronizado con website/index.html
- **PR #27** — deploy automático via GitHub Actions al mergear a main

## 2026-04-16 — Lanzar build Android GitHub Actions (PRs #21-#26)

- **GH Actions workflow** `build-android-production.yml` lanzado — run ID `24524771335`
- URL: https://github.com/civiltek/cals2gains/actions/runs/24524771335
- Incluye PRs #21-#26: i18n bugs, voice logging, alergias, HealthKit/Health Connect, gamificación, DB 500+
- Tiempo estimado: ~23 min (igual que build anterior exitoso)

## 2026-04-16 — Relanzar build iOS production para App Store (con fix expo-dev-menu)

- **EAS Build iOS** `b7cd8dc2-f6f0-4eac-9f00-b9dc16660eef` en cola (free tier)
- Profile: `production`, buildNumber: 21 (autoIncrement; 19=cancelado, 20=fallo disco)
- Fix aplicado: `patches/expo-dev-menu+55.0.23.patch` — `reloadAppAsync()` → `self.bridge?.reload()`
- Verificaciones previas: patch ✅, postinstall ✅, npm install ✅, TS 0 errores ✅
- URL seguimiento: https://expo.dev/accounts/civiltek/projects/cals2gains/builds/b7cd8dc2-f6f0-4eac-9f00-b9dc16660eef
- ⚠️ Créditos EAS al 96% — riesgo cancelación; considerar upgrade de plan

## 2026-04-16 — Lanzar build iOS production para App Store

- **EAS Build iOS** `254b9c6e-7099-4640-8795-2d4e3c1d80bb` en cola (free tier) — CANCELADO
- Profile: `production`, buildNumber: 18 → 19 (autoIncrement)
- Certificado distribución App Store válido hasta Apr 2027 (Apple Team UX7W6U98F5)
- URL seguimiento: https://expo.dev/accounts/civiltek/projects/cals2gains/builds/254b9c6e-7099-4640-8795-2d4e3c1d80bb
- ⚠️ Créditos EAS al 96% — revisar plan antes del próximo build

## 2026-04-16 — Corregir bugs i18n en Estadísticas y Resumen Semanal

- **BUG 1 — analytics.tsx**: `t('analytics.currentDays/longestStreak/totalLogged')` ahora pasa `{ count: valor }` — ya no aparece `{{count}}` literal en pantalla
- **BUG 2 — weekly-coach.tsx**: `generateWins` y `generateImprovements` usaban la clave del título de sección como contenido; ahora usan claves específicas (`win5Days`, `win3Days`, `winCalories`, `winProtein`, `winDefault`, `improveLogging`, `improveCalories`, `improveProtein`, `improveVariability`)
- **i18n/es.ts + en.ts**: añadidas 9 claves nuevas en `weeklyCoach` para los mensajes de logros y mejoras

## 2026-04-16 — Merge masivo: 5 PRs integrados + auditoría TypeScript

- **PRs mergeados**: #25 (DB alimentos 500+ + gamificación), #22 (Widget + Coach adaptativo), #21 (Alergias), #24 (HealthKit/Health Connect), #23 (Voice Logging)
- **Conflictos resueltos**: `openai.ts` (allergies + urgencyMode combinados), `i18n/es.ts` (allergies + achievements), `onboarding.tsx` (state alergias + HealthKit), `profile.tsx` (HealthDashboardCard + achievements), `types/index.ts` y `userStore.ts` (campos health + allergy combinados)
- **TypeScript**: `npx tsc --noEmit` → 0 errores
- **Sin archivos sensibles** (.env, google-services.json) en ningún PR

## 2026-04-16 — Añadir Voice Logging (dictado por voz para registrar comidas)

- **Nueva pantalla** `app/voice-log.tsx`: flujo completo idle → recording → processing → results/error
- **Grabación** con `expo-audio` (`useAudioRecorder` + `RecordingPresets.HIGH_QUALITY`); auto-stop a 30s; animación pulsante durante grabación
- **Pipeline IA**: Whisper (auto-detect idioma) → `analyzeTextFood` (GPT-4o-mini) → resultado nutricional editable
- **Integración**: editor de peso, selector de tipo de comida, guardado con `useMealStore().addMeal()`; transcripción guardada en `notes` (`🎙️ "..."`)
- **Limpieza `services/voiceLog.ts`**: eliminado `expo-file-system` (base64 no se usaba); Whisper ahora sin parámetro `language` para mejor auto-detección bilingüe
- **`capture-hub.tsx`**: botón Voz navega a `/voice-log` (eliminado mock inline + estado `isLoading` no usado)
- **i18n**: añadidas ~20 claves `voiceLog.*` en `es.ts` y `en.ts`
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
## 2026-04-16 — Feature: Sistema de alergias e intolerancias (seguridad del usuario)

- **Modelo de datos**: `types/index.ts` — campos `allergies: string[]` e `intolerances: string[]` en `User`; `allergenWarnings?: string[]` en `FoodAnalysisResult` y `Recipe`
- **Firebase**: `updateUserAllergies(uid, allergies, intolerances)` en `services/firebase.ts`
- **Zustand store**: acción `updateAllergies` en `userStore.ts` con optimistic update y rollback
- **i18n**: traducciones completas ES + EN (`allergies.*`) — 14 alérgenos + 4 intolerancias + disclaimer médico
- **Onboarding**: nuevo step 5 (de 8) con chips seleccionables para alérgenos e intolerancias + campo libre "Otras"
- **Pantalla nueva**: `app/allergy-settings.tsx` — edición de alergias desde ajustes en cualquier momento
- **Settings**: enlace en `app/settings.tsx` en sección propia entre "Objetivo" y "Modo nutricional"
- **Filtro IA — sugerencias**: `openai.ts generateAIMealSuggestions` nunca sugiere alimentos con alérgenos declarados
- **Filtro IA — análisis de foto**: `openai.ts analyzeFoodPhoto` añade `allergenWarnings[]` cuando detecta alérgenos; banner rojo prominente en `analysis.tsx`
- **Filtro IA — macro coach**: `macroCoach.ts buildCoachingContext` incluye las alergias en el contexto del coach
- **Filtro IA — recetas**: `recipeService.ts` — función `detectRecipeAllergens()` con mapa de keywords; `importRecipeFromUrl` marca `allergenWarnings` automáticamente
- **Disclaimer médico** en pantalla de alergias y en step de onboarding

## 2026-04-16 — Widget iOS/Android + Coach adaptativo mejorado

### Feature A: Widget (infraestructura JS)
- **`services/widgetDataService.ts`** (nuevo): sincroniza datos de nutrición del día (consumido/objetivo, porcentajes de progreso, colores de marca) hacia AsyncStorage como puente para widgets nativos. Expone `sync()`, `buildSmallPayload()` y `buildMediumPayload()`.
- **`docs/WIDGETS.md`** (nuevo): guía completa de activación para Android (AppWidgetProvider + config plugin Expo) y iOS (WidgetKit SwiftUI). Diseño small 2×2 y medium 4×2 con colores de marca Coral/Violet/Dark. Pendiente de build EAS tras configurar cuenta Apple Developer.

### Feature B: Coach adaptativo mejorado
- **`services/adaptiveCoachBridge.ts`** (nuevo): conecta `AdaptiveMacroEngine` con `macroCoach`. Cuando el motor decide ajustar macros, genera explicación en lenguaje natural vía GPT-4o-mini (con fallback sin IA). Persiste mensaje en AsyncStorage para que la UI lo recoja al abrir "Qué como hoy".
- **`services/smartNotificationService.ts`** (nuevo): notificaciones inteligentes — "8h sin registrar comida", "¡macros cumplidos!", "proteína pendiente en cena". Usa `expo-notifications` con graceful no-op si FCM no configurado. Bilingüe ES/EN.
- **`app/what-to-eat.tsx`**: añadido `CoachAdjustmentBanner` (muestra explicación del ajuste adaptativo con botón de dismiss), `UrgencyBanner` (alerta si >14:00 y <300kcal, o >19:00 y >50g proteína pendiente), detección de `urgencyMode` para adaptar sugerencias IA.
- **`services/openai.ts`**: `generateAIMealSuggestions` acepta nuevo param `urgencyMode?: 'high_calories' | 'high_protein'` que modifica el system prompt para priorizar comidas sustanciosas o altas en proteína según el contexto.
- **`i18n/es.ts` + `i18n/en.ts`**: nuevas claves `coachAdjustedTitle`, `urgencyCaloriesTitle/Body`, `urgencyProteinTitle/Body`.

## 2026-04-16 — Feature: DB alimentos 500+ y gamificación (streaks + logros)

### Feature A — Base de datos de alimentos expandida (167 → 500 alimentos)
- `data/spanishFoods.ts`: ampliado de 167 a 500 alimentos con nuevas categorías: mexicana, argentina, colombiana/venezolana, peruana, centroamericana, caribeña, tapas, desayunos latinos, postres, bebidas latinas, comida italiana/asiática/internacional
- Nuevas categorías en DB: `mexicana`, `argentina`, `colombiana`, `peruana`, `centroamericana`, `caribena`, `tapas`, `desayunos`, `postres`
- Mantenido formato exacto f() con nutritionPer100g + nutritionPerServing, locale es/en, aliases

### Feature B — Gamificación: streaks y logros
- `store/streakStore.ts` (nuevo): Zustand store con streak (≥2 comidas/día), 13 logros, persistencia en Firestore `users/{uid}/gameProgress/main`
- `components/ui/StreakBadge.tsx` (nuevo): badge compacto con animación pulse, navega a pantalla de logros
- `app/achievements.tsx` (nuevo): pantalla completa con streak actual/máximo, barra de progreso, lista de 13 logros con estado bloqueado/desbloqueado + celebración animada al desbloquear
- `app/(tabs)/index.tsx`: añadido StreakBadge en greeting, overlay celebración cuando se desbloquea logro, refresh streak cuando hay ≥2 comidas
- `app/(tabs)/profile.tsx`: sección "Actividad y Logros" con streak + link a pantalla achievements
- `i18n/es.ts` + `i18n/en.ts`: claves `achievements.*` añadidas (es + en)

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

