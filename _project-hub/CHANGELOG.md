# Changelog - Cals2Gains

## 2026-04-18 — Web: actualizar landing con iPhone rico + secciones científicas + diferenciadores

Rediseño competitivo de `website/index.html`:
- **iPhone flotante**: pantalla completa con anillo SVG animado (88% kcal), 3 barras de macros con progreso real, lista de comidas del día (desayuno/almuerzo/merienda + kcal), mensaje del coach IA adaptado a la sesión deportiva del día, racha 🔥 e hidratación 💧.
- **Nueva sección "17 estudios. 0 pseudociencia."**: 4 cards con claims científicos verificables (17+ estudios, 82% Mifflin-St Jeor, 8 tipos de sesión, 0 cajas negras) + botón a metodologia.html.
- **Stats bar renovada**: sustituye "40+ funciones / IA / 100% privado" por datos científicos (17+ estudios, 82% precisión, 8 tipos sesión, 0 anuncios).
- **Nueva sección "Por qué elegirla"**: 4 diferenciadores vs competencia (periodización deportiva, cálculo transparente, coach que propone no impone, 0 publicidad siempre).
- **Copy hero** mejorado con mensajes de brand voice (macros por deporte, 17 estudios, sin caja negra).
- **Sección IA**: copy actualizado con autocorrección 15-20% y enfoque en transparencia.
- **2 FAQ nuevas**: cómo se calculan los macros (Mifflin-St Jeor, Katch-McArdle, ISSN) + periodización deportiva.
- **Footer**: añadido link "Metodología científica" → /guides/metodologia.html.
- **Tildes**: corregidas 6 instancias (gráficas, móvil, fricción, español, inglés, instantáneo, mayoría, estáticas, versión).

## 2026-04-18 — Web: corregir tildes/eñes en metodologia.html y privacy.html + TOC colapsable en móvil

- `website/guides/metodologia.html`: corrección completa de tildes y eñes en todo el archivo (TOC, h2, h3, párrafos, meta tags, atributos data-es). TOC ahora colapsable en móvil (toggle con chevron, abierto por defecto en desktop).
- `website/privacy.html`: corrección completa de tildes y eñes (~80 palabras corregidas).
- `website/terms.html`: revisado, no requirió cambios.

## 2026-04-18 — Crear kit completo de contenido de marketing basado en la metodología científica

Creado directorio `marketing/content-source/` con todo el contenido de marketing basado en la metodología científica de la app. Incluye:
- `METHODOLOGY_CONTENT.md`: fuente de verdad con 7 pilares científicos, 10 claims verificables, datos/cifras, frases gancho, FAQs, terminología (ES+EN)
- `SCIENCE_UPDATES.md`: 14 estudios recientes (2024-2026) con ideas de contenido para RRSS (ES+EN)
- `posts/`: 10 carruseles + 10 reels + stories interactivas (ES+EN, 4 archivos)
- `blog/`: 5 artículos de blog en borrador (ES+EN, 10 archivos)
- `email/`: secuencia de 5 emails de onboarding científico (ES+EN, 2 archivos)
Actualizado `_project-hub/CONTENT_PLAN.md` con referencia al nuevo content-source.
Actualizado `Claude code/agents/marketing.md` para que el agente de marketing consulte METHODOLOGY_CONTENT.md y SCIENCE_UPDATES.md antes de crear contenido con claims científicos.

## 2026-04-18 — Crear guía completa de voz de marca (Brand Voice Guide)

Creado documento `marketing/brand-voice/BRAND_VOICE_GUIDE.md` con guía completa de brand voice: personalidad y arquetipos, dimensiones del tono, vocabulario (usamos/evitamos), terminología propia, 5 pilares de comunicación, propuesta de valor, elevator pitch, taglines, guía específica por canal (IG ES/EN, web, email, app, soporte), do's & don'ts, notas para inglés con glosario bilingüe, checklist de contenido y ejemplos prácticos. Actualizado `_project-hub/BRAND.md` con referencia al nuevo documento.

## 2026-04-18 — Revisión automática de finanzas: 2 nuevos recibos

**Tarea automática ejecutada.** Revisadas las 4 cuentas de email en busca de nuevos recibos desde el 13/04/2026.

**Nuevos gastos encontrados:**
- **Anthropic #2771-7868-1788** (15/04/2026) — Prepaid extra usage, Individual plan — **€170,00** (Invoice 5RBPQUSE-0006, info@civiltek.es)
- **ElevenLabs #2265-9525-8929** (14/04/2026) — Creator subscription 1er mes (50% off) — **€12,25** (,31 USD, cals2gains@gmail.com)

**ElevenLabs** es un servicio nuevo, no registrado previamente. Plan Creator:  USD/mes + 21% IVA España = ~,62 USD/mes (~24,49 €/mes) después del periodo promocional.

**Apple Developer Program**: Welcome email recibido el 14/04/2026 — enrollment completado. Sin email de factura por el pago de  USD (cargo sin recibo en email).

**Totales actualizados:**
- Gasto total acumulado: 1.120,08 € → **1.302,33 €** (+182,25 €)
- Burn rate mensual: 196,98 €/mes → **221,47 €/mes** (+24,49 € por ElevenLabs)
- Suscripciones activas: 3 → **4** (+ ElevenLabs Creator)

**Archivos actualizados:** FINANCES.md, Cals2Gains_Finances.xlsx (hojas Gastos + Suscripciones), dashboard.html (finances/ y _project-hub/), PROJECT_STATUS.md.

**Recibos guardados:** receipts/anthropic/2026-04-15_anthropic_receipt-2771-7868-1788_170eur.txt · receipts/otros/2026-04-14_elevenlabs_receipt-2265-9525-8929_13.31usd.txt

## 2026-04-18 — Fix iOS HealthKit build #70: resolver módulo nativo + guardas defensivas

Build 69 (b54dfbf, con el fix `isHealthDataAvailable` + entitlement + `resolveIOSPermission`) sigue fallando con el mismo **"Ha ocurrido un error. Inténtalo de nuevo."** en el onboarding. Nueva hipótesis (GPT Codex): la JS bridge de `react-native-health` no expone el módulo nativo en el path esperado — `AppleHealthKit.initHealthKit` puede no ser una función si el módulo autolinked se entrega vía `NativeModules.AppleHealthKit` en vez de `mod.default`.

Cambios en `services/healthKit.ts`:
- **`getAppleHealthKit()`**: probar cuatro paths de export (`mod.default`, `mod.AppleHealthKit`, `mod`, `NativeModules.AppleHealthKit`) y aceptar solo el candidato que exponga `initHealthKit` o `isAvailable` como función. Si ninguno cualifica → log + `null`.
- **`checkAvailability()`**: si `AppleHealthKit.isAvailable` NO es función, devolver `false` + log (antes asumía `true` como fallback). Además compat callback para firmas `(available)` (legacy) y `(err, available)` (actual).
- **`requestAuthorization()`**: guard temprano `typeof AppleHealthKit.initHealthKit !== 'function' → return false` con log explicativo — evita rompernos silenciosamente si el módulo nativo no está enlazado.

Main: `6028d85`. Rama integración `claude/integration-nutri-legal`: cherry-pick `9450d5d` (para que PR #32 no regrese el fix). Build iOS disparado: **run 24592713096** desde `main`.

Si build 70 sigue fallando, el log del teléfono debe mostrar uno de:
- `AppleHealthKit.isAvailable is not a function` → módulo no linkado (react-native-health no se autolinked en el EAS build).
- `AppleHealthKit.initHealthKit is not a function` → mismo problema, rama diferente.
- Error nativo del NSError en `[HealthKit init error]` → entitlement o usage string.

## 2026-04-17 — Fix Android Health Connect VALIDADO en device ✅

APK firmado con debug keystore (`cals2gains-v2.apk`, 119 MB, del build run 24587043044) instalado en Samsung S20 Ultra (Android 13). Tras pulsar **Conectar Health Connect**: **NO crash**. El diálogo nativo de permisos se abre correctamente.

Confirma que `expo-health-connect@0.1.1` cabrea `HealthConnectPermissionDelegate.setPermissionDelegate(activity)` en MainActivity.onCreate vía `ReactActivityLifecycleListener` — el `lateinit property requestPermission` ya está inicializado cuando el usuario pulsa el botón.

Logcat filtrado a ReactNativeJS/System.err/AndroidRuntime/HealthConnect durante el test: **sin errores de Health Connect**. Solo ruido conocido y no relacionado (RevenueCat ConfigurationError + Firestore permission-denied en StreakStore).

**Android Health Connect: resuelto end-to-end**. Pendiente solo la declaración administrativa en Play Console para poder submitir a producción.

## 2026-04-17 — iOS HealthKit build #63: limpiar config clínica + logging crudo

Build 62 (sin prime, sin background-delivery) siguió fallando en device. Diagnóstico de ChatGPT convincente: la hipótesis del "mismatch binary↔profile" es **errónea** (Apple docs: provisioning profile funciona como allowlist, el binario puede pedir subconjunto). Los sospechosos reales:

1. Config clínica sobrante (`health-records` + `NSHealthClinicalHealthRecordsShareUsageDescription`) metiendo ruido sin necesidad — no pedimos `HKClinicalTypeIdentifier`.
2. El `err` del callback de `initHealthKit()` se está logueando mal y perdemos la señal diagnóstica (NSError wrapped → `[object Object]` en consola RN).

Cambios en este build:
- `app.json`: quitado `"com.apple.developer.healthkit.access": ["health-records"]` y `NSHealthClinicalHealthRecordsShareUsageDescription`. Queda solo `healthkit: true` + las dos usage strings estándar (share + update).
- `services/healthKit.ts`: logging exhaustivo del callback de error en iOS — extrae `message`, `code`, `domain`, `userInfo`, `toString()`, keys — además del `err` crudo. Permite leer el NSError real en Xcode Console / `npx react-native log-ios` la próxima vez que se reproduzca.

Si build 63 sigue fallando, con el logging sabremos exactamente qué error nativo sale y podremos apuntar al #1/#3 de ChatGPT (entitlement base malsigned, usage string ausente, o HealthKit no disponible).

## 2026-04-17 — Fix Health Connect crash nativo: migrar a plugin expo-health-connect

Nuevo crash detectado en device tras instalar Health Connect en Samsung S20 Ultra (Android 13): `kotlin.UninitializedPropertyAccessException: lateinit property requestPermission has not been initialized` en `HealthConnectPermissionDelegate.launchPermissionsDialog` (HealthConnectPermissionDelegate.kt:45).

**Causa raíz**: el plugin `react-native-health-connect` (matinzd) en Expo-managed **solo inyecta intent-filter en AndroidManifest**; NO cablea el `setPermissionDelegate(activity)` en MainActivity.onCreate. El `requestPermission: ActivityResultLauncher` es `lateinit` → sin init crasha al primer `requestPermission()`.

**Fix**: reemplazar el plugin Expo por `expo-health-connect@0.1.1` (mismo autor, diseñado para Expo). Incluye un `ReactActivityLifecycleListener` que registra `HealthConnectPermissionDelegate.setPermissionDelegate(reactActivity)` automáticamente en onCreate, y además añade el `activity-alias ViewPermissionUsageActivity` requerido por Android 14+.

Cambios:
- `package.json`: `+ expo-health-connect@0.1.1` (JS code sigue usando `react-native-health-connect`)
- `app.json`: quitado plugin `["react-native-health-connect", {...}]`; añadido `"expo-health-connect"`

Código JS en `services/healthKit.ts` no cambia — sigue importando desde `react-native-health-connect`.

## 2026-04-17 — Fix Health Connect validado en device (BodyFat + LeanBodyMass)

Validado manualmente en Samsung R3CR10E9LSE con APK universal extraído del AAB del run [24581293389](https://github.com/civiltek/cals2gains/actions/runs/24581293389). Flujo: bundletool 1.15.6 `build-apks --mode=universal` → `apksigner` con debug keystore (`~/.android/debug.keystore`, SHA1 `C4:BE:5E:57...`) → `adb install`. El botón "Conectar" de Health Connect ya no crashea y solicita permisos correctamente.

**Bloqueos aún abiertos**:
- **Play Store submit** sigue fallando por Health Connect declaration form pendiente en Play Console (administrativo, no código). Necesario antes de que el AAB llegue a Internal testing.
- **Google Sign-In no funciona en este APK** porque el debug keystore no está registrado en Firebase. No bloqueante (email/password funciona). Al firmar con keystore EAS de producción (futuros builds oficiales) el login vuelve.

## 2026-04-17 — Mockups Play Store EN: 8 variantes en inglés

Nuevo script `tools/create_playstore_mockups_en.py` (clon del ES con headlines/subtítulos traducidos). Salida: `store-screenshots/mockups-playstore-en/mockup_01.png`–`mockup_08.png`. **Nota**: los screenshots de fondo siguen siendo las capturas en español (la UI del device sigue en ES). Para screenshots 100% EN habría que recapturar con la app en inglés.

## 2026-04-17 — iOS HealthKit build #62 diagnóstico: limpieza config + RNH 1.19

Build 61 (`healthkit.access=["health-records"]`) siguió fallando → hipótesis del mismatch binario↔profile **falsada** como causa raíz. Apostamos por la línea de ChatGPT: ruido de config + posibles issues de RNH con New Architecture (habilitada por defecto en Expo SDK 54).

Cambios en este build:
- `package.json`: bump `react-native-health ^1.17.0` → `^1.19.0` (resuelve al mismo instalado en realidad — el range `^1.17` ya daba 1.19.0, así que este cambio es cosmético/diagnóstico)
- `app.json`: quitado `com.apple.developer.healthkit.background-delivery` (no usamos `HKObserverQuery`)
- `app/_layout.tsx`: eliminada llamada a `primeHealthKitRegistration()` en boot (antipatrón según Apple docs; contamina estado de permisos)
- `services/healthKit.ts`: `primeHealthKitRegistration()` convertido en no-op (stub para no romper callers)

**Qué NO tocamos aún**: `healthkit.access=["health-records"]` y `NSHealthClinicalHealthRecordsShareUsageDescription` se mantienen porque quitar uno sin el otro crearía mismatch con el profile de Apple (que auto-incluye `health-records`). Si este build sigue fallando, siguiente paso es parchear el plugin de RNH para suprimir el `healthkit.access=[]` que mete incondicionalmente y quitar clinical del todo.

## 2026-04-17 — Mockups Play Store: 8 screenshots brandeados generados

Script Python PIL (`tools/create_playstore_mockups.py`) que genera 8 mockups 1284×2778 px a partir de screenshots reales de la app. Cada mockup lleva fondo dark con glow coral/violet, pill "Cals2Gains" arriba, headline (Outfit-Bold 128px) + subtítulo (Outfit-Regular 44px), phone frame con esquinas redondeadas y borde de acento alternado. Ocho slots: Hoy, Historial fotos, 6 modos objetivo, Cálculo científico TDEE, Seguimiento completo, IA que te guía, Planes entreno, Perfil.

Salida: `store-screenshots/mockups-playstore/mockup_01.png`–`mockup_08.png`.

**Screenshots descartados por bugs detectados** — a arreglar en app antes de publicar:
- `WhatsApp Image 2026-04-17 at 19.49.20.jpeg` — "Qué como ahora" muestra placeholder sin interpolar: `Te faltan {{protein}}g de proteína`
- `WhatsApp Image 2026-04-17 at 19.49.21 (4).jpeg` — Historial muestra clave i18n sin traducir: `proteinDashboard....`
- `WhatsApp Image 2026-04-17 at 19.49.20 (3).jpeg` — Lista de la compra con ingredientes en inglés (Coconut milk, Chicken breast, Crushed tomato...) cuando la UI está en español

## 2026-04-17 — Fix Android Health Connect crash: permisos BodyFat + LeanBodyMass (845208f)

App crasheaba al pulsar "Conectar" en Android. Causa: el código llamaba `HealthConnect.requestPermission()` con `recordType: 'BodyFat'` y `'LeanBodyMass'`, pero los permisos `android.permission.health.READ_BODY_FAT` y `READ_LEAN_BODY_MASS` **no estaban declarados en AndroidManifest** (app.json > android.permissions). Health Connect lanza SecurityException nativa al pedir permisos no declarados, y el try/catch JS no la captura.

**Solución**: añadidos ambos permisos a `app.json`. Build Android triggered: [run 24581293389](https://github.com/civiltek/cals2gains/actions/runs/24581293389)

## 2026-04-17 — Fix iOS HealthKit REAL: healthkit.access mismatch binario↔profile (3624a53)

**Causa raíz definitiva** (descubierta inspeccionando el binario firmado extraído del IPA build 60):
- **Binario**: `com.apple.developer.healthkit.access` = `<array vacío/>`
- **Provisioning profile**: `com.apple.developer.healthkit.access` = `["health-records"]`
- iOS rechazaba `initHealthKit()` con error genérico por ese mismatch → usuaria veía "Error: no se pudo conectar a applehealth"

**Origen del mismatch**: el plugin Expo `react-native-health/app.plugin.js` añade `healthkit.access=[]` incondicionalmente si no está declarado. Apple añade automáticamente `health-records` al profile al marcar HealthKit en el Developer Portal y no se puede desactivar (la capability no tiene botón Configure, verificado vía Chrome MCP).

**Solución**: declarar explícitamente `["health-records"]` en `app.json > ios.entitlements`. El plugin respeta arrays pre-declarados (`if (!Array.isArray(...))`), así no lo sobrescribe. Binario == profile → iOS autoriza HealthKit.

Commit `3624a53`, build iOS triggered: [run 24580473404](https://github.com/civiltek/cals2gains/actions/runs/24580473404)

## 2026-04-17 — Fix iOS HealthKit (INCOMPLETO): NSHealthClinicalHealthRecordsShareUsageDescription (19daa6a)

Fix parcial: añadida usage description en Info.plist. Necesario pero no suficiente — no resolvió el error porque el problema real estaba en el entitlement del binario, no en Info.plist. Ver entrada siguiente para la fix completa.

Tras investigación profunda (extracción binaria del IPA + inspección de provisioning profile + Apple Developer Portal), identificada causa raíz del fallo de Apple Health:
- Provisioning profile incluye `com.apple.developer.healthkit.access: ["health-records"]` — Apple lo auto-añade al marcar HealthKit en el portal y **no se puede desactivar** (la capability no tiene botón Configure)
- Info.plist carecía de `NSHealthClinicalHealthRecordsShareUsageDescription` → mismatch entre entitlement y usage descriptions → iOS desactiva HealthKit silenciosamente
- Síntomas: no sale diálogo de permisos, app no aparece en Ajustes > Salud > Apps
- **Fix**: añadida `NSHealthClinicalHealthRecordsShareUsageDescription` en `app.json` aclarando que no se accede a historiales clínicos
- Commit `19daa6a`, build iOS production triggered: [run 24579407991](https://github.com/civiltek/cals2gains/actions/runs/24579407991)
- Usuario debe **desinstalar** versión actual del iPhone antes de instalar nuevo IPA (limpiar data HealthKit huérfana — bug Apple FB15201360)

## 2026-04-17 — Gating premium, cuotas freemium y códigos promocionales

Sistema completo de monetización tras auditoría del bug "trial acabado pero app sigue desbloqueada":
- `hooks/usePremiumGate.ts`: nuevo hook que redirige a `/paywall` si la suscripción no está activa
- `store/quotaStore.ts`: nuevo store Zustand + AsyncStorage con cuotas por bucket (día/semana/mes). Free: 1 foto/semana, 1 voz/día, 3 barcode/día, 1 label/mes. Suscriptores bypass a Infinity
- `constants/promoCodes.ts`: 1 código maestro lifetime `JUDITH-LIFETIME` (reutilizable) + 10 códigos de amigos de 1 año (single-use)
- `types/index.ts`: `subscriptionType` extendido con `'lifetime' | 'promo'`
- `services/firebase.ts`: `redeemPromoCodeInFirestore()` con `runTransaction` atómica (doc-per-code en `promoCodesRedeemed/{code}`) para amigos; master se aplica sin reserva
- `store/userStore.ts`: método `redeemPromoCode()` con update optimista + rollback ante `INVALID`/`ALREADY_REDEEMED`/`ERROR`
- `app/paywall.tsx`: modal "¿Tienes un código?" con TextInput monospace y flujo de canje
- **18 pantallas premium gateadas**: weekly-coach, ai-review, what-to-eat, analytics, recipes, meal-plan, shopping-list, grocery-list, training-plans, training-plan, create-training-plan, measurements, progress-photos, adherence, protein-dashboard, export-data, coach-share, goal-modes
- **4 pantallas con cuota**: `app/(tabs)/camera.tsx` (photo), `app/voice-log.tsx`, `app/barcode-scanner.tsx`, `app/label-scanner.tsx`

## 2026-04-17 — Ronda de comentarios IG tarde (8 comentarios)

Sesión automática de tarde: 8 comentarios de valor nutricional publicados desde 3 cuentas Cals2Gains.
- @cals2gains_es (4): @midietacojea, @nataliasipra, @alerisacademia, @carlosriosq
- @calstogains (2): @athleanx, @kayla_itsines
- @cals2gains (2): @michelle_lewin, @biolayne (post con 22 min de antigüedad)
- Actualizado daily-log.md + influencers.md (@nutri_aerfit marcado ❌)

## 2026-04-17 — Integración InBody con Apple Salud / Google Health Connect (b284bc6)

Importación automática de composición corporal desde la app Salud del móvil:
- `services/healthKit.ts`: permisos `BodyFatPercentage` + `LeanBodyMass` en iOS y Android; `requestBodyCompositionPermission()` independiente del sync completo; `getBodyComposition()` lee % grasa, masa magra, peso y TMB
- `services/inBodyService.ts`: campo `source` en mediciones ('manual' | 'healthkit'); `syncFromHealthKit()` orquesta permisos → lectura → guardado
- `app/settings.tsx`: botón "Importar desde Apple Salud / Google Salud" en el modal de InBody; si InBody ha sincronizado con la app Salud, los datos se importan automáticamente; fallback al formulario manual si no hay datos
- Commit: `b284bc6`

## 2026-04-17 — Sistema completo de planes de entrenamiento por ciclos (c108253)

Implementación del sistema de planes de entrenamiento con ajuste nutricional automático por tipo de día:
- `store/trainingPlanStore.ts`: store Zustand con tipos (entreno/descanso/refeed/competición), presets de macros, 3 planes predefinidos (Fuerza 3x, Fuerza 5x, Preparación 10K 8 semanas), activación con fecha inicio, auto-desactivación al acabar el plan
- `app/training-plans.tsx`: pantalla de gestión de planes — listado, WeekPreview con cuadrícula 7 días, activar/editar/eliminar
- `app/create-training-plan.tsx`: crear/editar plan con selector de día por semana (toca para ciclar tipo) y macros editables por tipo de día
- `app/(tabs)/index.tsx`: banner activo en home cuando hay plan activo — muestra tipo de día, nombre del plan, día X/Y
- `app/(tabs)/tools.tsx`: acceso directo a Planes de entrenamiento en sección de seguimiento
- `app/training-day.tsx`: tipo 'competición' añadido (🏁 #FF9800), banner del plan activo en pantalla de día de entrenamiento
- Commit: `c108253`

## 2026-04-17 — Investigación InBody + Apple Health / Google Health Connect

Resultado de la investigación de integración InBody con plataformas de salud:
- InBody **SÍ escribe** en Apple Health: `bodyMass`, `bodyFatPercentage`, `leanBodyMass`, `bodyMassIndex`
- BMR (`basalEnergyBurned`) posiblemente en modelos H30; SMM y grasa visceral NO tienen identificador HealthKit
- Datos persisten en HealthKit aunque el usuario desinstale InBody
- Google Health Connect: sin confirmación oficial (solo Google Fit legacy confirmado)
- **Acción recomendada**: pedir permisos `bodyFatPercentage` + `leanBodyMass` + `bodyMass` + `basalEnergyBurned` en HealthKit; captura manual como fallback en Android

## 2026-04-17 — Reemplazar integración InBody rota por entrada manual (3895532)

El botón InBody en Ajustes redirigía a la web de la API de InBody (B2B only, sin OAuth público).
Solución: sustituido por modal de entrada manual de mediciones del informe InBody.
- `inBodyService`: `hasData()`, `getLastMeasurement()`, `saveManualMeasurement()` (persistencia local)
- `settings.tsx`: Switch → botón "Registrar" que abre el modal; muestra fecha de última medición
- Modal con campos: grasa corporal (%), masa muscular (kg), agua % (opt.), grasa visceral (opt.)
- Al guardar, el servicio queda marcado como "conectado" con datos locales
- Commit: `3895532`

## 2026-04-17 — Reparar app.json truncado por commit ddbc981 (c8ab16c)

El commit `ddbc981` ("Fix iOS HealthKit...") eliminó correctamente el entitlement `healthkit.access`
pero cortó el archivo `app.json` a mitad del plugin `expo-notifications`. Restaurado:
`"sounds": []`, `experiments.typedRoutes`, `extra.eas.projectId`, `owner`. JSON validado y pusheado.

## 2026-04-17 — Build iOS producción fallido: créditos EAS agotados (100%)

Intento de `eas build --profile production --platform ios` cancelado por límite de plan Free.
- buildNumber autoincremento en servidor: 51 → 52 (ya registrado en EAS)
- Credenciales iOS en orden (cert caduca 14/04/2027, perfil activo T72VULK36U)
- Reset de créditos: **1 de mayo 2026** (13 días)
- Acción requerida: upgrade plan EAS en https://expo.dev/accounts/civiltek/settings/billing
  O esperar al 1 de mayo y relanzar: `eas build --profile production --platform ios --non-interactive`

## 2026-04-17 — Añadir Feature 1: Plan de comida adaptado a entrenamiento deportivo

Implementación completa del motor de planes de entrenamiento con ajuste diario de macros:

- **`services/trainingPlanEngine.ts`** (nuevo): motor de ajuste de macros por tipo de sesión. 9 tipos de sesión (descanso, cardio suave, tempo, series, tirada larga, fuerza, CrossFit, competición, recuperación activa). Factores de ajuste basados en evidencia científica (Jeukendrup, Burke). 3 plantillas de plan precargadas (Maratón 12 sem, CrossFit 8 sem, 10K 6 sem).
- **`store/trainingPlanStore.ts`** (nuevo): Zustand store persistente con AsyncStorage. CRUD completo de planes y sesiones.
- **`app/training-plan.tsx`** (nueva pantalla): 3 tabs — "Esta semana" (grid 7 días + macros ajustados de hoy), "Plan completo" (listado de semanas), "Importar" (plantillas). Modal de selección de tipo de sesión por día. Modal de detalle con comparativa base vs ajustado.
- **i18n**: claves `trainingPlan.*` añadidas en `en.ts` y `es.ts`.

## 2026-04-17 — Añadir Feature 2: Botones de info educativos (ℹ️)

Componente reutilizable InfoButton y tooltips en pantallas clave:

- **`components/ui/InfoButton.tsx`** (nuevo): botón ℹ️ que abre modal educativo. Acepta `title`, `body` (con párrafos separados por `\n\n`) y `emoji`. Brand-styled, compatible dark/light mode y haptics.
- **`app/fasting.tsx`**: InfoButton junto al título — explica qué es el ayuno intermitente.
- **`app/goal-modes.tsx`**: InfoButton junto al título (modos objetivo) y junto a "Distribución de macros".
- **`app/analysis.tsx`**: InfoButton en "Información nutricional" (explica calorías) y junto al grid de macros (explica proteína/carbos/grasa).
- **i18n**: 5 tooltips (`fasting`, `activityLevel`, `goalMode`, `calories`, `macros`) en EN + ES. Tono cercano, motivador, basado en ciencia.

## 2026-04-17 — Fix iOS HealthKit: isHealthDataAvailable + entitlement + archivo truncado

Build 52 iOS fallaba al conectar a Salud. Tres problemas encontrados y corregidos:

1. **Archivo truncado** (`services/healthKit.ts`): faltaban ~70 líneas finales (getAndroidSummary, getAppleHealthKit, getHealthConnect, singleton export). Restaurado completo.
2. **Falta `isHealthDataAvailable()` en iOS** (requerido por Apple docs): `checkAvailability()` simplemente ponía `this.isAvailable = true` sin llamar al nativo. Ahora llama `AppleHealthKit.isAvailable()` (que envuelve `HKHealthStore.isHealthDataAvailable()`). También se llama en `requestAuthorization()` antes de `initHealthKit`.
3. **Entitlement `com.apple.developer.healthkit.access: []`** en app.json: array vacío para clinical records que puede causar problemas de signing. Eliminado (no usamos clinical health records).
4. **settings.tsx**: ahora comprueba el resultado de `checkAvailability()` y muestra alerta si HealthKit no está disponible, en vez de continuar ciegamente.

## 2026-04-17 — Ronda de comentarios IG mañana (11 comentarios, 3 cuentas)

Tarea programada ejecutada. 11 comentarios publicados: 5 en @cals2gains_es (@realfooding ×2, @lanutrimorell, @hsnstore_es, @sabervivir_tve), 3 en @calstogains (@biolayne, @steficohen, @simeonpanda), 3 en @cals2gains (@mindpumpmedia, @athleanx, @megsquats). Daily log actualizado en skills/instagram-commenter/references/daily-log.md.

## 2026-04-17 — Fix Android Health Connect (faltaba initialize() + sdkStatus check)

Reportado por Judith tras instalar tanda 3 en Android: "en android tampoco funciona la conexion a la app de salud".

**Root cause**: `react-native-health-connect` v3.2.0 exige llamar a **`initialize()`** antes de cualquier `requestPermission`/`readRecords`/`insertRecords`. Nuestro `healthService.requestAuthorization()` llamaba directamente `HealthConnect.requestPermission([...])` → el cliente nativo no estaba inicializado → la promesa rechazaba silenciosamente → el catch devolvía `false` → el toggle no se activaba y el diálogo de Health Connect nunca aparecía.

**Fix** (`services/healthKit.ts`):
- Nuevo método privado `ensureAndroidInitialized()` idempotente que llama `getSdkStatus()` + `initialize()`. Cache de `isInitialized` para no re-inicializar.
- Llamada a `ensureAndroidInitialized()` al inicio de cada entrada Android: `requestAuthorization`, `saveWeight`, `getAndroidSummary`, `getAndroid7DayCalorieAverage`, `getRecentWorkouts`.
- `checkAvailability()` Android ahora llama `getSdkStatus()` y devuelve `true` solo si status es `SDK_AVAILABLE` (3). Antes devolvía hardcoded `true`.

**Impacto**: sin este fix, el AAB Android que se había subido tras las tandas 1+2 tenía el flujo de Health Connect correcto a nivel de routing pero **roto a nivel de cliente nativo**. Los testers veían el toggle pero al activarlo no pasaba nada visible.

**Requiere nuevo build Android + subir al canal alpha** (el AAB anterior descargado en `Downloads/c2g-aab-tanda3/` queda obsoleto).

## 2026-04-17 — Fix config iOS HealthKit (faltaba plugin expo + entitlement clinical inválido)

Reportado por Judith tras instalar tanda 3 en TestFlight: "en iOS sigue sin funcionar la conexión a los datos de salud del iphone".

**Root cause**: Aunque `react-native-health` estaba en `package.json` y las `NSHealthShareUsageDescription` + entitlements estaban en `app.json`, **el plugin de expo NO estaba en el array `plugins`** → expo prebuild no enlazaba el framework `HealthKit.framework` ni aplicaba las modificaciones necesarias al Podfile/target Xcode. Resultado: `require('react-native-health')` fallaba silenciosamente en runtime → `healthService.requestAuthorization()` retornaba `false` sin mostrar prompt de permisos al usuario. Los fixes de routing de tandas 1+2 (apple/googleHealth → servicio nativo en vez de Terra) eran correctos pero inútiles sin el módulo nativo cargado.

**Bug secundario**: `"com.apple.developer.healthkit.access": ["health-records"]` pedía autorización de Clinical Health Records que Apple requiere aprobar específicamente por app y NO está concedida para Cals2Gains → puede provocar rechazo en runtime o build. Cambiado a array vacío (solo datos normales de fitness/pasos/calorías).

**Fix**:
- **[app.json]** Añadido `react-native-health` al array `plugins` con las mismas strings de permisos que ya estaban en `infoPlist` manual.
- **[app.json]** `healthkit.access` → `[]` (quitado `health-records`).
- **Nuevo build iOS requerido** para que prebuild regenere con el plugin y linkee HealthKit framework. Android no se ve afectado (su plugin `react-native-health-connect` ya estaba bien configurado).

## 2026-04-17 — Token optimization audit (OpenAI + Claude) · tarea programada

Auditoría automática de uso de tokens en todos los servicios IA del proyecto.

**Cambio realizado:**
- Creado `CLAUDE-COMPACT.md` en la raíz del proyecto — versión comprimida de CLAUDE.md (~55 líneas vs ~174 líneas). Las tareas programadas deben leer este archivo en vez de CLAUDE.md para reducir tokens de contexto en cada ejecución. Ahorro estimado: ~120 líneas de contexto × coste por token en cada run de tarea.

**Hallazgos OpenAI (app · services/):**
- ✅ `gpt-4o-mini` correctamente usado en: macroCoach, adaptiveCoachBridge, foodDatabase (analyzeTextFood), recipeService, openai.ts (generateAIMealSuggestions)
- ✅ `detail:low` correctamente aplicado en análisis de fotos
- ✅ TTS: `tts-1` en voice_generator.py (NO tts-1-hd)
- ✅ visual-engine/script_generator.py → `gpt-4o-mini`
- ⚠️ **RECOMENDACIÓN PENDIENTE aprobación Judith:** `analyzeFoodPhoto` y `refineAnalysis` (services/openai.ts líneas 192 y 302) usan `gpt-4o` en vez de `gpt-4o-mini`. La función central de análisis de fotos de comida es el servicio de mayor volumen de llamadas. Cambiar a `gpt-4o-mini` + `detail:low` ya activo supondría ahorro estimado ~16× en coste por token (gpt-4o: $2.50/1M input vs gpt-4o-mini: $0.15/1M input). Riesgo: posible degradación en precisión nutricional — requiere test A/B antes de aplicar en producción.
- ℹ️ No existe `tools/carousel-engine/` — el motor de vídeo es `tools/remotion-engine/` (no usa OpenAI directamente para scripts de carrusel).

**Hallazgos Claude/Anthropic (tareas programadas · agentes):**
- ✅ `instagram-comment-replies.md` → modelo `sonnet` correcto para tarea compleja de escritura
- ✅ Agentes en `Claude code/agents/`: todos entre 34-91 líneas, compresión no urgente
- ❌ **CORREGIDO:** `CLAUDE-COMPACT.md` no existía; creado en esta ejecución
- ⚠️ `instagram-comments-morning.md` y `instagram-comments-afternoon.md` están marcados como DEPRECADOS (reemplazados por `instagram-comments-outbound.md`) pero contienen rutas hardcodeadas a `/sessions/brave-festive-feynman/` (sesión antigua inexistente). El archivo `instagram-comments-outbound.md` al que señalan tampoco existe en `orchestration/scheduled-tasks-prompts/`. Pendiente: o crear el archivo consolidado o actualizar las rutas.
- ⚠️ `scheduled-tasks-map.md` está desactualizado (fecha: 14 abr). No incluye `token-optimization` ni `instagram-comments-outbound`.
- ℹ️ `trend-scout-biweekly` documentada pero aún no activada — modelo `sonnet` correcto cuando se active.
- ℹ️ No se puede auditar los archivos `.md` de tareas programadas en `C:\Users\Judit\OneDrive\Documentos\Claude\Scheduled\` desde esta sesión (ruta Windows fuera del workspace montado).

**Recomendaciones pendientes para Judith:**
1. Probar `gpt-4o-mini` para `analyzeFoodPhoto` en entorno de test (mayor impacto en coste OpenAI).
2. Crear `orchestration/scheduled-tasks-prompts/instagram-comments-outbound.md` y eliminar los dos archivos deprecated.
3. Actualizar `orchestration/scheduled-tasks-map.md`.
4. Verificar que las tareas programadas en Cowork usan `CLAUDE-COMPACT.md` y no `CLAUDE.md` completo.

---

## 2026-04-17 — Deploy web GitHub Pages: precios 8,90€/mes y 59,90€/año + tildes terms.html

- Actualizar precios en `website/index.html`, `website/terms.html`, `public/index.html`, `public/terms.html` y sus variantes `/cals2gains/`
- Corregir tildes en `terms.html` (español)
- Merge `fix/android-v19-bugs-and-stability` → `main` (fast-forward, 42 archivos)
- Push a `origin/main` → GitHub Pages desplegará automáticamente

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
- **Onboarding**: nuevo step 5 (de 8) con chips seleccionables para alérgenos e intolerancias 