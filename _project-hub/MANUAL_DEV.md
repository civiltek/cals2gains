# Manual de Desarrollo — Cals2Gains

> **Versión:** 1.0 · **Fecha:** 2026-04-18 · **Owner técnico:** Judith Cordobes (CivilTek Ingeniería SLU)
> **Alcance:** fuente de verdad del cómo está construida la app, cómo se desarrolla, cómo se testa, cómo se buildea y cómo se despliega. Si el código y este manual divergen, abrir bug.
> **Estado:** vivo. Revisión mayor con cada upgrade de Expo SDK o cambio arquitectónico; revisión menor mensual.

---

## 0. Filosofía dev

1. **TypeScript estricto y sin inventos.** Los tipos son la documentación que siempre está al día. Ningún `any` silencioso; si hace falta, `unknown` + narrowing.
2. **Un solo camino para cada cosa.** Un cálculo de macros, un store por dominio, un servicio por integración externa. La duplicación cuesta años — hoy ya se ve con Harris-Benedict vs Mifflin y con los dos onboardings.
3. **Fallar barato, fallar pronto.** Timeouts en red (5-30 s), `AbortController` en llamadas IA, try/catch donde puede reventar UX, `Math.max(x, floor)` antes que rezar.

---

## 1. Stack tecnológico

### 1.1 Runtime móvil

| Pieza | Versión | Notas |
|-------|---------|-------|
| Expo SDK | 54.0.33 | Expo Router 6 typed routes |
| React Native | 0.81.5 | — |
| React / React DOM | 19.1.0 | — |
| TypeScript | 5.8 | `"strict": true` |
| Node (dev/CI) | 22.x | `.nvmrc` si lo añadimos |
| Reanimated | 4.1.1 | **no bajar** — 3.x choca con RN 0.81 (causa del crash c00a412e) |
| Worklets | 0.5.1 | par de reanimated |
| Metro config | `@expo/metro-config` 54.0.14 | `unstable_enablePackageExports: false` |

### 1.2 Native bridges

- `expo-camera 17.0.10`, `expo-audio 1.1.1`, `expo-image-picker 17.0.10`, `expo-notifications 0.31.0`, `expo-file-system 19.0.21`, `expo-print 15.0.8`, `expo-secure-store 15.0.8`, `expo-haptics 15.0.8`, `expo-splash-screen 31.0.13`.
- `react-native-health 1.17.0` (iOS HealthKit).
- `react-native-health-connect 3.2.0` (Android).
- `@react-native-google-signin/google-signin 13.1.0`.
- `expo-apple-authentication 8.0.8`.
- `react-native-purchases 9.15.1` (RevenueCat).

### 1.3 State + data

- **Zustand 4.5.4** — 18 stores divididos por dominio (ver §5).
- **AsyncStorage 2.2.0** — persistencia.
- **i18next 23 + react-i18next 14** — traducciones ES + EN.
- **Firebase 10.12.5** — Auth, Firestore, Storage.

### 1.4 IA y tracking

- **OpenAI** — GPT-4o Vision, Whisper-1, GPT-4o-mini (vía REST, API key en `EXPO_PUBLIC_OPENAI_API_KEY`).
- **Open Food Facts** — API pública para barcode + búsqueda de alimentos.
- **HealthKit / Health Connect** — datos de actividad y composición.

### 1.5 Web (landing)

- HTML estático en `website/` (fuente) replicado a `public/` (fallback legacy). Tipografía Outfit + Instrument Sans por Google Fonts. Sin framework JS.
- Hosting: Firebase Hosting (prod) + GitHub Pages (backup desde `website/**` vía workflow).

### 1.6 Lo que NO usamos (y por qué)

- **Expo Go** — incompatibles desde SDK 53 por módulos nativos (RevenueCat, GoogleSignIn, HealthKit, CameraView con children). Probar siempre vía `eas build --profile preview --platform android`.
- **Redux / MobX / Jotai** — Zustand cubre nuestras necesidades sin el overhead.
- **React Query / SWR** — Firestore SDK + Zustand selectors son suficientes para el volumen de lecturas.
- **Detox / Jest / Testing Library** — validación manual vía ADB + dispositivo físico + `tsc --noEmit`. Cuando el equipo crezca, introducir tests.
- **Backend propio** — Firebase cubre Auth, Storage y Firestore. Las llamadas OpenAI van directas desde el cliente con API key pública gateada por uso.

---

## 2. Estructura del repositorio

Raíz: `C:\Users\Judit\Documents\Cals2Gains\`. Worktrees de Claude Code en `.claude/worktrees/<nombre>/`.

```
Cals2Gains/
├── .claude/
│   ├── launch.json              ← preview servers (Expo, Firebase, static)
│   ├── worktrees/               ← git worktrees de agentes (gitignored)
│   └── settings.local.json      ← config dev local (gitignored)
├── .github/workflows/
│   ├── build-android-production.yml   ← AAB manual por workflow_dispatch
│   ├── build-ios-production.yml       ← IPA manual por workflow_dispatch
│   └── deploy-website.yml             ← GitHub Pages desde website/**
├── Claude code/                 ← sistema de agentes (orquestación)
│   ├── CLAUDE.md
│   ├── agents/                  ← app-dev, web-dev, finance, marketing,
│   │                              growth, ops, research, legal
│   └── orchestration/HANDOFFS.md
├── _project-hub/                ← hub central (estado, métricas, docs)
│   ├── PROJECT_STATUS.md        ← estado vivo
│   ├── CHANGELOG.md             ← últimas ~50 entradas
│   ├── METODOLOGIA_NUTRICIONAL.md
│   ├── MANUAL_LEGAL.md
│   ├── MANUAL_DEV.md            ← este archivo
│   ├── DPIA_v1.md · RAT_v1.md · INFORME_LEGAL_v1.md
│   ├── AUDITORIA_MARKETING_v1.md · AGE_RATING_STORES.md
│   ├── PROMPT_UPDATE_APP.md
│   ├── FEATURES.md · FINANCES.md · METRICS.md · ACCOUNTS.md · BRAND.md
│   ├── CONTENT_PLAN.md · SCREENSHOTS.md · SEO_REPORT.md
│   └── dashboard.html
├── app/                         ← Expo Router (typed routes)
│   ├── _layout.tsx · index.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── onboarding.tsx       ← onboarding legacy (a deprecar)
│   │   ├── age-gate.tsx         ← primer paso: DOB + bloqueo <16
│   │   └── screening.tsx        ← medicalFlags + consentimiento Art.9.2.a
│   ├── (tabs)/                  ← home, capture, tools, progress, profile
│   ├── smart-onboarding.tsx     ← onboarding 7 pasos
│   ├── goal-modes.tsx · nutrition-settings.tsx · nutrition-mode.tsx
│   ├── capture-hub.tsx · ai-review.tsx · food-verification.tsx
│   ├── food-search.tsx · label-scanner.tsx · barcode-scanner.tsx
│   ├── quick-add.tsx · fast-relog.tsx · edit-meal.tsx · voice-log.tsx
│   ├── weekly-coach.tsx · what-to-eat.tsx · recipes.tsx · meal-plan.tsx
│   ├── analysis.tsx · analytics.tsx · protein-dashboard.tsx
│   ├── adherence.tsx · coach-share.tsx · export-data.tsx
│   ├── weight-tracker.tsx · water-tracker.tsx · measurements.tsx
│   ├── progress-photos.tsx · fasting.tsx
│   ├── training-day.tsx · training-plan.tsx · training-plans.tsx
│   │   · create-training-plan.tsx
│   ├── grocery-list.tsx · shopping-list.tsx · achievements.tsx
│   ├── settings.tsx · edit-profile.tsx · allergy-settings.tsx
│   ├── paywall.tsx · help.tsx · about.tsx
│   └── 35+ pantallas
├── components/ui/
│   ├── SafetyDisclaimer.tsx     ← disclaimer ubicuo Fase B
│   ├── AITransparencyBanner.tsx ← AI Act Art. 50 Fase B
│   ├── InfoButton.tsx           ← modales educativos
│   ├── MacroBar.tsx · MacroRing.tsx · MealCard.tsx
│   ├── HealthDashboardCard.tsx · StreakBadge.tsx
├── services/                    ← integraciones y motores
│   ├── firebase.ts              ← Auth, Firestore, Storage
│   ├── openai.ts                ← Vision, prompts, meal suggestions
│   ├── voiceLog.ts              ← Whisper + analyze text
│   ├── foodDatabase.ts          ← OFF + local DB + AI fallback
│   ├── healthKit.ts             ← HK + HC wrapper
│   ├── inBodyService.ts         ← persistencia InBody + sync HK
│   ├── revenuecat.ts            ← subscriptions
│   ├── macroCoach.ts            ← weekly AI coach prompt
│   ├── adaptiveMacroEngine.ts   ← adherence + goal adjustments + alert
│   ├── adaptiveCoachBridge.ts   ← puente app → motor
│   ├── personalEngine.ts        ← sugerencias personalizadas
│   ├── trainingPlanEngine.ts    ← factores por tipo de sesión
│   ├── recipeService.ts         ← import de URLs
│   ├── memoryEngine.ts          ← resumen/contexto por usuario
│   ├── smartNotificationService.ts
│   ├── reminderService.ts · exportService.ts
│   ├── terraService.ts          ← preparado (no activo)
│   └── widgetDataService.ts
├── store/ (18 stores Zustand — ver §5)
├── hooks/
│   ├── useAdaptiveEngines.ts
│   └── useHealthSync.ts
├── utils/
│   ├── nutrition.ts             ← BMR, TDEE estático + dinámico
│   ├── macros.ts                ← calculateMacroTargets canónico
│   ├── numericDisplay.ts        ← ocultación numérica si eating_sensitive
│   ├── language.ts · imageUtils.ts
├── constants/
│   ├── colors.ts                ← paleta marca
│   └── macroPresets.ts          ← balanced/high_protein/keto/low_fat
├── data/
│   └── spanishFoods.ts          ← base local ES/LatAm expandida
├── i18n/
│   ├── index.ts · en.ts · es.ts
├── types/
│   └── index.ts                 ← User, Meal, FoodItem, Nutrition,
│                                  UserGoals, MedicalFlag, etc.
├── theme.ts                     ← COLORS, BRAND_COLORS, BRAND_FONTS
├── assets/                      ← imágenes, fuentes
├── public/ · website/           ← landing (replicación)
├── finances/                    ← Excel + dashboard + receipts
├── marketing/                   ← campañas, posts, screenshots
├── brand-assets/ · store-screenshots/
├── tools/
│   ├── outlook-mcp-server · imap-mcp-server*
│   └── remotion-engine/         ← generación de reels (deuda TS)
├── patches/                     ← patch-package para fixes de libs
├── firebase.json · firestore.rules · storage.rules
├── app.json · eas.json · babel.config.js · metro.config.js
├── tsconfig.json · package.json
└── CLAUDE.md                    ← entry point de agentes
```

---

## 3. Setup local

### 3.1 Requisitos

- Node 22.x (npm 10+).
- Git + Git LFS (no indispensable todavía).
- Android: Android Studio + SDK 34, JDK 17, device físico con USB debugging o AVD.
- iOS: macOS + Xcode 15+, cuenta Apple Developer activa (para firma).
- EAS CLI: `npm install -g eas-cli` (login con cuenta `civiltek`).
- Firebase CLI: `npm install -g firebase-tools`.
- Python 3.12 (solo para `website/validate-web.py`).

### 3.2 Primera instalación

```bash
git clone https://github.com/civiltek/cals2gains.git
cd cals2gains
npm install            # corre patch-package post-install
# crea .env local (ver §14)
npx expo start         # Metro en 8081; NO se abre en Expo Go
```

Para probar en dispositivo: `eas build --profile preview --platform android` (genera APK instalable), o `eas build --profile development --platform android` con dev client.

### 3.3 Comandos frecuentes

```bash
npx tsc --noEmit                 # typecheck (obligatorio antes de PR)
npx expo start --clear           # cache cleared
adb devices                      # listar dispositivos Android
adb -s R3CR10E9LSE logcat -s ReactNativeJS:V System.err:W AndroidRuntime:E
firebase deploy --only hosting   # deploy web desde raíz
firebase deploy --only firestore:rules
eas build --profile preview --platform android
eas build --profile production --platform all
eas submit --platform ios
eas submit --platform android
```

---

## 4. Convenciones de código

### 4.1 TypeScript

- `"strict": true` en `tsconfig.json`.
- Tipos compartidos en `types/index.ts`. NO inventar duplicados en cada archivo.
- Evitar `any`. Usar `unknown` + narrowing o `satisfies`.
- Funciones públicas de `services/*` con JSDoc breve en la primera línea (qué hace, qué devuelve).

### 4.2 Naming

- Componentes y tipos: `PascalCase`.
- Funciones, variables, props: `camelCase`.
- Constantes exportadas: `UPPER_SNAKE_CASE` (`WEARABLE_CALIBRATION_FACTOR`, `PROTEIN_MULTIPLIER_BY_MODE`).
- Archivos `.tsx` para componentes/pantallas; `.ts` para lógica pura.

### 4.3 Idioma

- Código (identificadores, comentarios de código, commits técnicos): inglés.
- Copy, i18n, documentación del hub, CHANGELOG: español.
- Mensajes de error del usuario siempre i18n-ready, nunca hardcoded.

### 4.4 Commits

- Imperativo corto en español: "Añadir X", "Corregir Y", "Refactorizar Z".
- Cuerpo explicativo si el cambio no es trivial.
- Co-autoría con Claude cuando proceda: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Sin `--no-verify`; los hooks existen por algo.

### 4.5 Imports

- Relativos cortos (`../store/userStore`, `../utils/macros`).
- Nunca barrel files que rompan tree-shaking.
- Imports muertos son bugs — eliminar al detectar.

### 4.6 Errores

- Siempre `try/catch` alrededor de red y persistencia.
- `AbortController` con timeout en cada llamada OpenAI.
- `Math.max(floor, value)` en cualquier cálculo que tenga piso fisiológico/legal.
- `console.error` para errores técnicos; **nunca** loguear datos de salud, `medicalFlags`, fotos ni tokens.

---

## 5. State management (Zustand)

### 5.1 Inventario

| Store | Responsabilidad | Persistencia |
|-------|------------------|---------------|
| `userStore` | User profile, goals, medicalFlags, dateOfBirth, autoAdaptEnabled, numericDisplayMode, consentHistory | AsyncStorage |
| `themeStore` | Light/dark, preferred color scheme | AsyncStorage |
| `mealStore` | Comidas loggeadas hoy + histórico | AsyncStorage (cap reciente) + Firestore |
| `weightStore` | Histórico de pesos | AsyncStorage + Firestore |
| `waterStore` | Registro de hidratación diaria | AsyncStorage + Firestore |
| `fastingStore` | Ayunos activos y pasados | AsyncStorage + Firestore |
| `measurementStore` | Medidas corporales (cintura, cuello, etc.) | Firestore |
| `progressPhotoStore` | URLs de fotos de progreso | Firestore + Storage |
| `recipeStore` | Recetas guardadas / generadas | Firestore |
| `mealPlanStore` | Plan semanal de comidas | AsyncStorage + Firestore |
| `shoppingListStore` · `templateStore` | Auxiliares | AsyncStorage |
| `streakStore` | Racha de días loggeados | AsyncStorage |
| `reminderStore` | Recordatorios locales | AsyncStorage |
| `adaptiveStore` | Estado del coach adaptativo (último ajuste, cooldown) | AsyncStorage |
| `analysisStore` | Resultado intermedio de análisis IA durante el flujo | memoria |
| `trainingPlanStore` · `trainingPlanSessionStore` | Planes de entrenamiento activos + sesiones | AsyncStorage |

### 5.2 Patrones

- Un store = un dominio. No multiplexar.
- Selectors específicos en componentes para evitar re-renders (`useUserStore(s => s.user?.goals)`).
- Acciones mutadoras en el propio store (`setX`, `addX`, `clearX`). Sin reducers.
- Persistencia con `zustand/middleware` → `persist` con `AsyncStorage`. Volver a revisar si migramos a MMKV.

### 5.3 Reglas sensibles

- **`medicalFlags` y `dateOfBirth` no se loguean en crash reports**. Verificado en `services/*` y `hooks/*`.
- **`autoAdaptEnabled` debe respetarse en `adaptiveMacroEngine`**: si OFF, devolver recomendación sin mutar `userStore.goals`.
- **`numericDisplayMode === 'hidden'`** (eating_sensitive): consumidores en home, plan, what-to-eat y food-verification deben ocultar kcal y sustituirlas por "alto/medio/bajo" o emoji.

---

## 6. Internacionalización (i18next)

### 6.1 Estructura

- `i18n/index.ts` — setup, detect lang, fallback.
- `i18n/es.ts` — español (idioma por defecto).
- `i18n/en.ts` — inglés.
- Claves jerárquicas (`onboarding.screening.title`, `settings.medicalFlags.revoke`).
- Interpolación con `{{placeholder}}`. Ejemplo: `t('onboarding.ageGate.previewLine', { age })`.

### 6.2 Reglas

- **Nunca hardcodear copy en componentes**. Todo pasa por `t()`.
- Al añadir clave en `es.ts`, añadirla en `en.ts` en el mismo commit.
- Keys consistentes con el módulo: `home.*`, `weeklyCoach.*`, `paywall.*`.
- Textos largos pueden partirse con `\n\n` para párrafos en modales.

### 6.3 Gotchas conocidas

- Conflicto de namespace: `onboarding.age` (string) vs `onboarding.ageGate` (objeto). Siempre usar objeto anidado si hay más de una sub-clave.
- No usar `.` dentro del key final (rompe el path de i18next).
- `useTranslation()` se resuelve en cada render; memoizar `t` solo si se consume en callbacks caros.

---

## 7. Theming

Archivo canónico: `theme.ts`.

```ts
export const BRAND_COLORS = {
  plum: '#17121D', violet: '#9C8CFF', coral: '#FF6A4D',
  bone: '#F7F2EA', gold: '#FFD700', orange: '#FF9800',
  // + derivados card, elevado, gradientes
};
export const BRAND_FONTS = {
  display: { family: 'Outfit', weight: '700' },
  body: { family: 'Instrument Sans', weight: '400',
          weightMedium: '500', weightSemiBold: '600' },
  data: { /* numérica */ },
};
```

Hook canónico: `useColors()` en `store/themeStore.ts` — devuelve paleta resuelta según el modo activo. Componentes deben consumir `useColors()` y nunca hardcodear hex.

**Deuda actual:** `app/training-plan.tsx` e `InfoButton.tsx` usan `BRAND_FONTS.mono` y `BRAND_COLORS.orange` que ya no existen; también pasan `fontFamily` como objeto cuando RN espera string. Son los 18 errores TS preexistentes. Arreglar en próxima iteración (§17).

---

## 8. Servicios

### 8.1 Firebase (`services/firebase.ts`)

- Inicialización con `initializeApp` + `initializeAuth` (React Native persistence con `AsyncStorage`).
- Auth providers: Google, Apple, Email/password.
- Firestore reglas en `firestore.rules`: acceso por UID propietario.
- Storage reglas en `storage.rules`: path basado en UID, URLs firmadas de caducidad corta.
- Known bug: upload de fotos con ArrayBuffer falla; workaround `XMLHttpRequest` — ver `progress-photos.tsx`.

### 8.2 OpenAI (`services/openai.ts`, `foodDatabase.ts`, `voiceLog.ts`, `macroCoach.ts`)

- API key en `process.env.EXPO_PUBLIC_OPENAI_API_KEY` (embebida en cliente; limitar uso vía cuotas).
- Endpoints: `/v1/chat/completions` (GPT-4o, GPT-4o-mini), `/v1/audio/transcriptions` (Whisper).
- Timeouts: 15 s análisis texto, 20 s weekly coach, 30 s Whisper, 30 s visión por defecto.
- `AbortController` obligatorio.
- System prompts versionados en cada servicio. Documentados en `METODOLOGIA_NUTRICIONAL.md` §6.
- Política no-training verificada con Business Terms.

### 8.3 HealthKit / Health Connect (`services/healthKit.ts`)

- iOS: `react-native-health` con permisos `Steps`, `ActiveEnergyBurned`, `BasalEnergyBurned`, `BodyMass`, `BodyFatPercentage`, `LeanBodyMass`, `Workouts`, `HeartRate`.
- Android: `react-native-health-connect` equivalente (`minSdkVersion 26`).
- iOS requiere `isHealthDataAvailable()` antes de `initHealthKit` (confirmación Apple 14/04/2026).
- Entitlement `com.apple.developer.healthkit` + `background-delivery`.
- `inBodyService.syncFromHealthKit()` orquesta permisos → lectura → persistencia en `measurementStore`.

### 8.4 RevenueCat (`services/revenuecat.ts`)

- SDK `react-native-purchases 9.15.1`.
- API keys (iOS/Android) en `.env`.
- Paywall en `app/paywall.tsx` con Products dinámicos.
- Entitlement principal: `premium`.
- Webhooks no gestionados por la app — van a Firebase Functions si se añaden.

### 8.5 Motores (`adaptiveMacroEngine`, `personalEngine`, `trainingPlanEngine`, `macroCoach`)

- **Fuente de verdad de macros**: `utils/macros.ts::calculateMacroTargets`. Todos los motores consumen de ahí.
- `adaptiveMacroEngine`: adherencia (kcal 40 % + proteína 35 % + consistencia 25 %), `shouldAdjustGoals`, `detectExcessiveWeightLoss` (Fase B), `getGoalModeConfig` (metadata visual — NO calcular con él).
- `personalEngine`: sugerencias personalizadas, quick actions por timeOfDay.
- `trainingPlanEngine`: factores por tipo de sesión (§4.2 metodología).
- `macroCoach`: weekly AI prompt, contexto armado con HealthKit + meals + weights.

### 8.6 Notificaciones (`smartNotificationService`, `reminderService`)

- `expo-notifications` removido temporalmente por crash Android sin FCM configurado.
- Implementación actual: local scheduler + recordatorios ad hoc.
- Antes de reactivar push remoto: configurar FCM (Android) + APNs (iOS) + revisar copy conforme a `MANUAL_LEGAL.md` §4.2 (transparencia IA) y Art. 22 (reversibilidad).

### 8.7 Tools auxiliares (`tools/`)

- `outlook-mcp-server`, `imap-mcp-server-*` — MCP para integración de email con agentes Claude.
- `remotion-engine` — generación de reels promocionales. Fuera del bundle de app.

---

## 9. Navegación (Expo Router)

### 9.1 Estructura

- Typed routes habilitados: `experiments.typedRoutes: true` en `app.json`.
- Grupos: `(auth)` para flujos previos al login/onboarding, `(tabs)` para navegación principal.
- Stack modal para flows como `ai-review`, `paywall`, `edit-meal`.

### 9.2 Reglas

- `router.replace()` para reemplazar el stack tras onboarding y login.
- `router.push()` para abrir pantallas dentro del flujo.
- `router.back()` para cerrar modals.
- Deeplinking scheme `cals2gains://`.

### 9.3 Orden del flujo de entrada

1. `app/index.tsx` — splash/gate inicial.
2. Si no logueado → `(auth)/login`.
3. Si logueado pero sin `dateOfBirth` → `(auth)/age-gate`.
4. Si `age-gate` OK pero sin screening → `(auth)/screening`.
5. Si todo ok → `smart-onboarding` (si `!onboardingCompleted`) → `(tabs)/home`.

---

## 10. Builds

### 10.1 EAS Build (nube)

- Owner: `civiltek`. Project ID: `381120d5-3866-4b97-af00-4c6840768327`.
- Perfiles (`eas.json`):
  - `development` — dev client, distribution internal.
  - `preview` — APK Android, distribution internal (para Samsung `R3CR10E9LSE`).
  - `production` — AAB Android / IPA iOS, `autoIncrement: true` en versión.
- `appVersionSource: "remote"` — la fuente de `buildNumber`/`versionCode` es EAS, no `app.json`.
- Secrets de build en EAS dashboard (no en repo).

### 10.2 GitHub Actions (local, sin consumir EAS cloud)

- `build-android-production.yml` — manual por `workflow_dispatch`. Corre `eas build --local` en runner ubuntu, genera AAB, artifact retenido 30 días. Requiere keystore configurado en secrets. Útil cuando los créditos EAS están al 100 %.
- `build-ios-production.yml` — equivalente para IPA. Necesita macOS runner o proceso alternativo.
- `deploy-website.yml` — push a GitHub Pages desde `website/**` cuando cambia.

### 10.3 Pasos previos a build de producción

1. `npx tsc --noEmit` limpio (excepto deuda conocida).
2. Validar cambios en dispositivo con `eas build --profile preview`.
3. Aumentar `version` en `app.json` si hay features nuevas (no solo bugfix).
4. CHANGELOG y PROJECT_STATUS al día.
5. Age Rating correcto en stores (ver `AGE_RATING_STORES.md`).
6. Privacy policy publicada con los datos que procesa la build.

### 10.4 Submissions

```bash
eas submit --platform android   # Google Play (track internal por defecto)
eas submit --platform ios       # App Store Connect (ascAppId 6762235238)
```

---

## 11. Testing y validación

### 11.1 Stack actual

- **Typecheck** `npx tsc --noEmit` — lo único que corre en CI hoy. 32 errores preexistentes mapeados (§17).
- **Dispositivo físico Android**: Samsung `R3CR10E9LSE` conectado por USB. Logcat filtrado.
- **Dispositivo iOS**: TestFlight cuando haya build activo.
- **Preview web estática**: `http-server` en `website/` (config en `.claude/launch.json`).

### 11.2 Smoke test manual obligatorio tras build

1. Onboarding completo con datos realistas y flags activos.
2. Age gate: probar <16, 17, 25.
3. Screening: probar con y sin flags; consentimiento Art. 9.2.a bloquea "Continuar" si aplica.
4. Cálculo de objetivos: verificar hard-cap 1200♀ con perfil ligero en mini_cut.
5. Foto → análisis IA → editar → guardar en log.
6. Coach semanal con ≥7 días de datos simulados.
7. Toggle "Adaptación automática" OFF → el coach muestra sugerencia pero no muta goals.
8. HealthKit/Health Connect: autorizar, esperar sync, ver TDEE dinámico.
9. Paywall: abrir, navegar, cancelar (NO comprar salvo test sandbox).
10. Exportar datos (JSON) desde Ajustes.
11. Eliminar cuenta → verificar borrado en Firestore.

### 11.3 Cuando meter tests automáticos

Disparador: equipo ≥ 2 devs o >10.000 usuarios activos. Mínimo esperado:
- Jest + Testing Library para utils/macros, nutrition, numericDisplay, adaptiveMacroEngine.
- Detox o Maestro para smoke de onboarding y captura.

---

## 12. Despliegue web

### 12.1 Firebase Hosting (producción — cals2gains.com)

- Config en `firebase.json` → `public: "public"` (directorio servido).
- Flujo actual: los cambios reales se hacen en `website/`; copia a `public/` sincronizada.
- Deploy: `firebase deploy --only hosting` desde raíz.
- Dominio: `cals2gains.com` (CNAME en `website/CNAME`).

### 12.2 GitHub Pages (backup / preview)

- Workflow `deploy-website.yml` empuja `website/**` a Pages en cada push a main.
- Validador en Python (`website/validate-web.py`) corre antes del deploy.

### 12.3 Reglas

- `privacy.html` y `terms.html` **siempre** sincronizados entre `website/` y `public/`. Verificar con `diff -q`.
- Sitemap actualizado con cualquier nueva `/guides/*.html`.
- Assets estáticos en `/guides/`, `/brand-assets/`, `/store-screenshots/`.

---

## 13. Debugging

### 13.1 ADB / logcat Android

```bash
adb devices
adb -s R3CR10E9LSE logcat -s ReactNativeJS:V System.err:W AndroidRuntime:E
adb -s R3CR10E9LSE install -r build.apk   # instalación manual
adb -s R3CR10E9LSE uninstall com.civiltek.cals2gains
```

Filtros útiles:
- `ReactNativeJS:V` — console.log del JS.
- `AndroidRuntime:E` — crashes nativos.
- `-s System.err:W` — warnings del runtime.

### 13.2 iOS — Xcode + TestFlight

- Safari Web Inspector no aplica (no somos webview).
- Console de dispositivo vía Xcode `Window → Devices and Simulators → View Device Logs`.
- Para TestFlight crashes: App Store Connect → app → TestFlight → crashes.

### 13.3 Preview de landing

- `preview_start` con server `Static preview (website)` en `.claude/launch.json` (http-server en 5050, autoPort).
- Navegar con `preview_eval` (`window.location.href = '/guides/...'`).
- Screenshot / snapshot para validar.

### 13.4 Incidentes conocidos

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Crash al abrir APK (campo `mIsFinished`) | Reanimated 3.x vs RN 0.81 | Subir a 4.1.1 + worklets 0.5.1 (resuelto) |
| "Missing or insufficient permissions" water | Firestore rules incompletas | Revisar `firestore.rules` de water |
| Upload foto falla (ArrayBuffer) | Firebase SDK + RN ArrayBuffer | `XMLHttpRequest` workaround |
| Google Sign-In `DEVELOPER_ERROR` en AAB | SHA-1 Play App Signing no registrado en Firebase | Añadir SHA-1 en Firebase + OAuth client Android |
| iOS HealthKit falla al conectar | Faltaba `isHealthDataAvailable()` | Añadido 14/04 (resuelto) |
| Créditos EAS al 100 % | Plan Free | Upgrade o esperar reset 1 mayo |

---

## 14. Entornos y secretos

### 14.1 Variables de entorno

Archivo `.env` (gitignored). **Nunca commitear.**

```
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=macrolens-ai-4c482
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=...
EXPO_PUBLIC_GA4_ID=G-WMHZQ52NS2
```

Prefijo `EXPO_PUBLIC_` obligatorio para que la variable llegue al bundle del cliente.

### 14.2 Archivos de secreto que NO se comitean

- `google-services.json` (Android Firebase) → gitignored.
- `GoogleService-Info.plist` (iOS Firebase) → gitignored.
- `google-play-service-account.json` → gitignored, path en `eas.json`.
- `.env`, `.env.local`, `.env.production` → gitignored.
- Certificados iOS / keystores → EAS credentials service.

### 14.3 Rotación

- OpenAI API key: revisar uso mensual, rotar cada 3 meses o ante sospecha.
- Firebase Auth: no aplica rotación de API key (es pública).
- Play service account: rotar anualmente.
- Certificados iOS: cert actual expira 14/04/2027.

---

## 15. Runbooks operativos

### 15.1 Nuevo build Android en 5 comandos

```bash
git pull origin main
npx tsc --noEmit
eas build --profile preview --platform android     # para testing
# tras validar en Samsung:
eas build --profile production --platform android
# tras autorización de Judith:
eas submit --platform android
```

### 15.2 Nuevo build iOS

```bash
npx tsc --noEmit
eas build --profile production --platform ios
# validar en TestFlight
eas submit --platform ios
```

**Si créditos EAS agotados:** usar `.github/workflows/build-android-production.yml` (local en runner) o esperar reset.

### 15.3 Deploy web

```bash
# tras cambios en website/ o public/
diff -q website/privacy.html public/privacy.html   # deben ser idénticos
firebase deploy --only hosting
# GH Pages se actualiza solo al push a main
```

### 15.4 Rollback de release

1. Google Play Console → Release → Halt rollout si el % es bajo.
2. App Store Connect → Ventas → Reject current build if in review; if live, requesting expedited review.
3. Server-side: no aplica (cliente standalone).
4. Comunicar en banner in-app si la app sigue funcional pero con bug conocido.

### 15.5 Incidente de seguridad (app)

Ver `MANUAL_LEGAL.md` §2.9 y §11.2. Flujo técnico:

```
Detección → revocar tokens Firebase afectados → rotar API keys comprometidas
         → forzar re-login si aplica → patch + build de emergencia
         → notificación AEPD + afectados si procede
```

### 15.6 Upgrade de Expo SDK

Requisito para upgrade mayor (ej. SDK 55):
1. Leer release notes Expo + RN.
2. Rama aislada `chore/sdk-55`.
3. `npx expo install --fix`.
4. Revisar breaking changes en libs nativas (reanimated, purchases, camera).
5. Probar build preview.
6. Smoke test dispositivo.
7. Merge + commit al CHANGELOG.

### 15.7 Añadir nueva pantalla

1. Crear archivo en `app/` respetando Expo Router convention.
2. Importar `useColors`, `useTranslation`, SafeAreaView.
3. Añadir claves i18n en ES + EN.
4. Si es pantalla sensible (salud, objetivos, resultados) → añadir `SafetyDisclaimer`.
5. Si es pantalla de IA → añadir `AITransparencyBanner` (una vez).
6. Ver cumplimiento con `MANUAL_LEGAL.md` §2.8 (privacy by design check-list).
7. Actualizar `FEATURES.md`.

---

## 16. Decisiones técnicas documentadas (ADRs)

Resumen denso de decisiones con coste de reversión alto.

### ADR-01 · Zustand sobre Redux

**Fecha:** anterior al hub · **Estado:** vigente.
Motivo: volumen de estado moderado, preferencia por boilerplate mínimo, TypeScript-friendly. Revisable si el tree de estado supera 30 stores o necesitamos middlewares avanzados.

### ADR-02 · Firebase sobre backend propio

**Fecha:** arranque · **Estado:** vigente.
Auth + Firestore + Storage cubren el 100 % de las necesidades sin coste de ops. Límite: si escalamos a >1M usuarios con patrones costosos, revisar por costes de Firestore read/write.

### ADR-03 · OpenAI direct-from-client

**Fecha:** arranque · **Estado:** vigente con vigilancia.
API key pública con uso cuoteado. Ventaja: menor latencia, sin backend. Desventaja: exposición de uso. Mitigación: rate-limit por UID, key rotable. Revisar si el coste mensual de OpenAI supera X €.

### ADR-04 · Mifflin-St Jeor como BMR canónico

**Fecha:** 2026-04-17 · **Estado:** vigente.
Harris-Benedict inline en `smart-onboarding` eliminado. Fuente única `utils/nutrition.ts::calculateBMR` + `utils/macros.ts::calculateMacroTargets`. Referencia: Frankenfield 2005.

### ADR-05 · Proteína en g/kg, no % de kcal

**Fecha:** 2026-04-17 · **Estado:** vigente.
Unificado en `calculateMacroTargets`. Motivo: la proteína objetivo debe ser insensible al déficit. ISSN 2017.

### ADR-06 · Hard-cap 1200♀/1500♂ en el motor

**Fecha:** 2026-04-17 · **Estado:** vigente.
`Math.max(floor, calculated)` con flag `calorieCapApplied` para UX. WHO + ACSM + Manore 2015.

### ADR-07 · `autoAdaptEnabled` por defecto ON pero reversible

**Fecha:** 2026-04-17 · **Estado:** vigente.
Compromiso Art. 22 RGPD. Disclaimer explica el comportamiento antes de activar ajuste automático.

### ADR-08 · i18n obligatorio ES + EN desde el primer commit de feature

**Fecha:** arranque · **Estado:** vigente.
Evita el efecto "inglés añadido tres meses después" que produce inconsistencias.

### ADR-09 · `metro.config.js` recreado en eas-build-post-install

**Fecha:** 2026-03 · **Estado:** workaround.
Motivo: EAS cloud builds perdían el archivo. Hook post-install lo recrea con `unstable_enablePackageExports: false`. Revisar cuando Expo SDK 56 lo haga innecesario.

### ADR-10 · Reanimated 4.1.1 obligatorio para RN 0.81

**Fecha:** 2026-04-13 · **Estado:** vigente.
Reanimated 3.x rompe en RN 0.81 por campo `mIsFinished`. NO downgrade.

### ADR-11 · Sin tests automatizados aún

**Fecha:** arranque · **Estado:** provisional.
Tradeoff explícito: velocidad pre-launch > cobertura. Revisar cuando equipo crezca o tras primer incidente grave.

---

## 17. Deuda técnica consolidada

| # | Archivo / Área | Descripción | Severidad | Bloqueo |
|---|----------------|-------------|-----------|---------|
| 1 | `app/training-plan.tsx` (17 errores TS) | Usa `BRAND_FONTS.mono` y `BRAND_COLORS.orange` inexistentes + `fontFamily` como objeto | Alto | Rompe build strict si se activa en CI |
| 2 | `components/ui/InfoButton.tsx` (1 error TS) | Mismo problema de `fontFamily` objeto | Alto | Ídem |
| 3 | `tools/remotion-engine/*` (14 errores TS) | Config propia no alineada con tsconfig raíz | Medio | No bloquea app; bloquea generación reels |
| 4 | `app/(auth)/onboarding.tsx` (legacy) | Flujo paralelo a `smart-onboarding` con BMR inline duplicado | Alto | Decidir cuál se deprecar |
| 5 | `i18n/es.ts` y `en.ts` `loseFatDesc`/`miniCutDesc` | "Pérdida rápida" / "rapid loss" prohibidos §9.2 metodología | Medio | Legal |
| 6 | `services/firebase.ts` storage upload ArrayBuffer | Workaround XHR | Medio | Bug conocido |
| 7 | Water permissions Firestore | Reglas incompletas para water | Medio | Bug conocido |
| 8 | `expo-notifications` desactivado | Crash Android sin FCM | Medio | Falta configurar FCM |
| 9 | Tema oscuro edge cases | ~70 corregidos en auditoría, quedan residuales | Bajo | UX |
| 10 | Sin tests automáticos | Ver ADR-11 | Bajo | Velocidad pre-launch |
| 11 | `hooks/useHealthSync.ts` import `calculateBMR` no usado directamente | Higiene | Bajo | Limpiable |
| 12 | CIF de CivilTek falta en docs legales | RAT, DPIA, MANUAL_LEGAL | Bajo | Cosmético |

---

## 18. Integraciones con el sistema de agentes

- **`app-dev`** es el agente principal para todo lo de este manual. Ver `Claude code/agents/app-dev.md`.
- **`web-dev`** para `website/`, `public/`, Firebase hosting, SEO.
- **`legal`** para cualquier cambio que toque `privacy.html`, `terms.html`, consentimientos, screening, disclaimers.
- **`ops`** para CHANGELOG, PROJECT_STATUS, coordinación.
- **`growth`** para métricas GA4 / Play Console / App Store Connect.
- **`marketing`** para posts, landing copy, screenshots.

Handoffs formales en `Claude code/orchestration/HANDOFFS.md` cuando exista.

### 18.1 Cuándo invocar qué agente

| Trabajo | Agente |
|---------|--------|
| Bug en pantalla o servicio | app-dev |
| Upgrade SDK | app-dev |
| Nuevo proveedor IA / pagos | app-dev + legal |
| Cambio en cálculo nutricional | app-dev (valida contra `METODOLOGIA_NUTRICIONAL.md`) |
| Nuevo claim en landing/copy | marketing + legal |
| Cambio en `privacy.html` o `terms.html` | legal + web-dev |
| Datos de salud nuevos (feature) | legal (DPIA update) + app-dev |
| Post-mortem de incidente | ops + legal si hay brecha |

---

## 19. Referencias cruzadas

| Documento | Alcance |
|-----------|---------|
| `_project-hub/METODOLOGIA_NUTRICIONAL.md` | Fórmulas, factores, salvaguardas, referencias científicas |
| `_project-hub/MANUAL_LEGAL.md` | Cumplimiento RGPD, MDR, AI Act, plataformas, procedimientos |
| `_project-hub/DPIA_v1.md` · `RAT_v1.md` | Documentos legales firmados |
| `_project-hub/PROMPT_UPDATE_APP.md` | Prompt reutilizable para sesiones nuevas de actualización |
| `_project-hub/AGE_RATING_STORES.md` | Pasos concretos stores |
| `_project-hub/FEATURES.md` | Listado de pantallas con estado |
| `_project-hub/PROJECT_STATUS.md` | Estado vivo del proyecto |
| `Claude code/agents/app-dev.md` | Rol del agente técnico |
| `CLAUDE.md` (raíz) | Reglas globales del sistema de agentes |

---

## 20. Changelog de este manual

- **2026-04-18 · v1.0** — Primera versión consolidada del manual técnico. Cubre stack, estructura de repo, setup local, convenciones, 18 stores Zustand, i18n, theming, 7 servicios principales, navegación Expo Router, builds EAS + GitHub Actions, testing manual, despliegue web, debugging, secretos, runbooks operativos, 11 ADRs, deuda técnica y cross-refs con los otros manuales.
