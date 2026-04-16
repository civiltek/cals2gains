# SHARED-CONTEXT.md — Contexto Unificado Cals2Gains

> **Lectura obligatoria para todos los agentes antes de actuar.**
> Última actualización: 2026-04-16
> Fuente: archivos del hub (`_project-hub/`) — verificar siempre con la fuente si hay duda.

---

## A) Funcionalidades de la App

### Pantallas implementadas (35+)

#### Onboarding y Autenticación
| Feature | Archivo | Estado |
|---------|---------|--------|
| Smart Onboarding | `app/smart-onboarding.tsx` | ✅ |
| Login (Email, Google, Apple) | `app/(auth)/` | ✅ |
| Goal Modes (5 modos) | `app/goal-modes.tsx` | ✅ |
| Nutrition Settings | `app/nutrition-settings.tsx` | ✅ |
| Nutrition Mode selector | `app/nutrition-mode.tsx` | ✅ |

#### Core — Registro de Comidas
| Feature | Archivo | Estado |
|---------|---------|--------|
| Capture Hub (entrada principal) | `app/capture-hub.tsx` | ✅ |
| Cámara IA (foto → macros) | `app/(tabs)/` + camera | ✅ |
| Barcode Scanner | `app/barcode-scanner.tsx` | ✅ |
| Label Scanner (etiquetas) | `app/label-scanner.tsx` | ✅ |
| Food Search (base de datos) | `app/food-search.tsx` | ✅ |
| Quick Add (registro rápido) | `app/quick-add.tsx` | ✅ |
| Fast Re-log (repetir comidas) | `app/fast-relog.tsx` | ✅ |
| Edit Meal | `app/edit-meal.tsx` | ✅ |
| AI Review / Food Verification | `app/ai-review.tsx`, `app/food-verification.tsx` | ✅ |
| Voice Logging (dictado por voz) | `app/voice-log.tsx` | ✅ (PR #23) |

#### Tracking y Métricas
| Feature | Archivo | Estado |
|---------|---------|--------|
| Dashboard principal (macros) | `app/(tabs)/` | ✅ |
| Water Tracker | `app/water-tracker.tsx` | 🔧 Firebase permissions |
| Weight Tracker | `app/weight-tracker.tsx` | ✅ |
| Measurements (medidas corporales) | `app/measurements.tsx` | ✅ |
| Progress Photos | `app/progress-photos.tsx` | 🔧 Firebase Storage upload |
| Fasting Tracker | `app/fasting.tsx` | ✅ |
| Training Day (ajuste macros) | `app/training-day.tsx` | ✅ |
| Adherence | `app/adherence.tsx` | ✅ |
| Analytics | `app/analytics.tsx` | ✅ |
| Protein Dashboard | `app/protein-dashboard.tsx` | ✅ |

#### IA y Coaching
| Feature | Archivo | Estado |
|---------|---------|--------|
| Weekly Coach (recap IA) | `app/weekly-coach.tsx` | ✅ |
| Analysis (análisis nutricional) | `app/analysis.tsx` | ✅ |
| What to Eat (sugerencias IA) | `app/what-to-eat.tsx` | ✅ |
| Recipes (generación IA) | `app/recipes.tsx` | ✅ |
| Meal Plan (plan semanal) | `app/meal-plan.tsx` | ✅ |
| Coach Share | `app/coach-share.tsx` | ✅ |

#### Utilidades
| Feature | Archivo | Estado |
|---------|---------|--------|
| Grocery List | `app/grocery-list.tsx` | ✅ |
| Shopping List | `app/shopping-list.tsx` | ✅ |
| Export Data (PDF/CSV) | `app/export-data.tsx` | ✅ |
| Settings | `app/settings.tsx` | ✅ |
| Edit Profile | `app/edit-profile.tsx` | ✅ |
| Help / About | `app/help.tsx`, `app/about.tsx` | ✅ |
| Paywall (RevenueCat) | `app/paywall.tsx` | ✅ |

### Features nuevas integradas (PRs #21–#26, mergeados 2026-04-16)

| PR | Feature | Descripción |
|----|---------|-------------|
| #21 | **Alergias/Intolerancias** | Campo de alergias en onboarding y perfil; warnings en análisis IA y sugerencias |
| #22 | **Widget iOS + Coach adaptativo** | Widget de macros para pantalla de inicio iOS; coach que adapta recomendaciones según historial |
| #23 | **Voice Logging** | Dictado por voz → Whisper → GPT → resultado nutricional editable. `app/voice-log.tsx` |
| #24 | **HealthKit/Health Connect (TDEE dinámico)** | Integración con Apple Health y Google Health Connect; ajuste automático de TDEE según actividad real |
| #25 | **DB 500+ alimentos españoles + Gamificación** | Base de datos local de alimentos típicos españoles; sistema de logros, rachas y badges |
| #26 | **Correcciones i18n** | Fix interpolación i18n en Estadísticas y Resumen Semanal |

### Infraestructura
| Área | Estado |
|------|--------|
| i18n (EN + ES) | ✅ Auditado |
| Tema claro/oscuro | ✅ Auditado |
| Firebase Auth | ✅ |
| Firebase Firestore | ✅ |
| Firebase Storage | 🔧 Upload issue (usar XMLHttpRequest como workaround) |
| RevenueCat Subscriptions | ✅ |
| Expo Router (typed) | ✅ |
| Zustand State Management | ✅ |

### Bugs conocidos activos
1. **Firebase Storage:** Error al subir fotos de progreso (ArrayBuffer issue → workaround: XMLHttpRequest)
2. **Firebase Water permissions:** "Missing or insufficient permissions" en water tracker
3. **expo-notifications:** Removido temporalmente por crash en Android sin FCM configurado
4. **APK rota (NO instalar):** build `358414d2` — reanimated v3 incompatible con RN 0.81

### Build actual
- **AAB producción:** `builds/app-release.aab` (75 MB, firmado) — generado 2026-04-16
- **minSdkVersion:** 26 (fix para react-native-health-connect)
- **Build Android estable más reciente:** `c00a412e`
- **iOS:** Pendiente (cuenta Apple Developer en verificación)
- **No puede correr en Expo Go** — usar siempre APK/build EAS

---

## B) Estado de la Web

### cals2gains.com
- **Hosting:** Firebase Hosting (`cals2gains` project)
- **Contenido actual:** Landing page, Privacy Policy, Terms of Service
- **Dominio:** cals2gains.com (también accesible en cals2gains.web.app)
- **Archivos fuente:** `public/`, `website/`
- **Deploy:** `firebase deploy --only hosting --project cals2gains`

### Google Analytics
- **Propiedad:** macrolens-ai-4c482 (ID: 532155665)
- **Account:** CIVILTEK INGENIERIA SLU (ID: 301326724)
- **Tag GA4:** `G-WMHZQ52NS2`
- **Estado:** ⚠️ Tag NO instalado en cals2gains.com — registra 0 usuarios y 0 sesiones
- **Acción pendiente:** Instalar tag GA4 en el `<head>` del sitio

---

## C) Estado de RRSS y Contenido Planificado

### Cuentas activas

| Cuenta | Red | Idioma | Seguidores | Observaciones |
|--------|-----|--------|------------|---------------|
| @cals2gains | Instagram | EN (principal) | 868 ✅ verificada | ⚠️ NO vinculada a Meta Business Suite — sin insights |
| @cals2gains_es | Instagram | ES | 11 | En MBS, portfolio ES |
| @calstogains | Instagram | EN (secundaria) | 8 | En MBS, portfolio EN |
| Cals2Gains (página) | Facebook | ES | 1 | Posts cruzados desde IG, 0 engagement |
| Cals2Gains - AI Nutrition | Facebook | EN | 1 | Posts cruzados desde IG, 0 engagement |

**Total seguidores IG combinados:** ~887
**Engagement:** Facebook genera 0 interacciones — concentrar esfuerzo en Instagram.

### Contenido publicado (posts que mejor funcionan)
- "Carbs make you fat — MYTH" (mito nutricional)
- "How long does it take to log a meal?" (encuesta interactiva)
- "BLACK BOX — Your app says 1800 kcal. Where does that number come from?" — **mejor performance en ambos idiomas**
- "SOMETHING IS COMING — And no, it's not another calorie counter"

### Plan editorial activo — Fase 1 Pre-lanzamiento (Abril 2026)

| Canal | Estado | Periodo |
|-------|--------|---------|
| @cals2gains_es — 28 posts ES | ✅ Programado en MBS | 12-25 abril 2026 |
| @cals2gains — posts 1-5 y 15-28 EN | ✅ Programado en MBS | — |
| @cals2gains — posts 6-14 EN | ❌ **Pendiente programar** | — |
| Reels: Demo Cámara IA (EN + ES) | ✅ Assets creados | Pendiente programar |

**Acción pendiente urgente:** Programar posts EN 6-14 en Meta Business Suite.

### Automatizaciones activas
| Automatización | Frecuencia | Estado |
|---------------|-----------|--------|
| Comentarios en influencers | 2x/día (todas las cuentas) | ✅ Activo |
| Respuesta a comentarios | 3x/día (todas las cuentas) | ✅ Activo |

**Config:** `skills/instagram-commenter/`

### Fase 2 — Lanzamiento (Mayo 2026, estimado)
- Posts de lanzamiento en stores, campaña "Ya disponible", más reels de demos, colaboraciones micro-influencers.
- ⏳ Pendiente planificación detallada.

---

## D) Estado de las Stores

### Google Play
- **Registro desarrollador:** Pagado (23 € / $25 USD, 09/04/2026)
- **AAB listo:** `builds/app-release.aab` (75 MB, firmado, generado 2026-04-16)
- **Estado:** Pendiente subida a Google Play Console
- **Acceso:** Google Play Console puede requerir cuenta distinta a info@civiltek.es (posiblemente cals2gains@gmail.com)

### App Store (iOS)
- **Estado:** Pendiente — cuenta Apple Developer en verificación
- **Build iOS:** No generado aún
- **Apple Developer Program:** ~99 USD/año — enrollment recibido, pendiente de pago

---

## E) Stack Técnico

| Área | Tecnología | Versión |
|------|-----------|---------|
| Framework | React Native + Expo Router (typed routes) | SDK 54, RN 0.81.5 |
| Backend | Firebase (Auth, Firestore, Storage) | — |
| Estado | Zustand | — |
| i18n | i18next | EN + ES |
| Subscriptions | RevenueCat | — |
| IA (foto/texto) | OpenAI GPT-4o / GPT-4o-mini | — |
| IA (voz) | OpenAI Whisper | — |
| Builds | EAS Build (owner: `civiltek`, project: `381120d5-3866-4b97-af00-4c6840768327`) | — |
| Analytics | GA4 `G-WMHZQ52NS2` (property `macrolens-ai-4c482`) | — |
| Dispositivo pruebas | Samsung (ADB serial: `R3CR10E9LSE`) | — |

**Nota crítica:** La app NO puede correr en Expo Go. Siempre generar APK/AAB vía EAS.

---

## F) Brand

### Identidad
- **Nombre:** Cals2Gains
- **Tagline EN:** "Turn calories into gains"
- **Tagline ES:** "Convierte calorías en resultados"

### Colores

| Color | Hex | Uso |
|-------|-----|-----|
| Coral | `#FF6A4D` | CTAs, acentos principales, energía |
| Violet | `#9C8CFF` | Secundario, elementos IA, premium |
| Orange | `#FF9800` | Alertas, highlights |
| Gold | `#FFD700` | Logros, badges, premium |
| Dark | `#17121D` | Fondo modo oscuro, splash screen |
| Bone | `#F7F2EA` | Fondo modo claro |

### Tipografía
- **Principal:** Outfit (Bold para títulos, Regular para cuerpo)
- **Secundaria:** Instrument Sans (UI elements)

### Tono de voz
1. **Cercano y motivador** — como un amigo que sabe de nutrición
2. **Basado en ciencia** — datos reales, sin pseudociencia
3. **No condescendiente** — respeta la inteligencia del usuario
4. **Inclusivo** — todos los niveles, todos los objetivos
5. **Empoderador** — "tú puedes" sin toxicidad fitness

**Diferenciación clave:** No somos "otra app de contar calorías". Somos IA que entiende tu comida con una foto + 5 modos nutricionales + coach que se adapta.

---

## G) Finanzas

| Concepto | Valor | Fecha |
|----------|-------|-------|
| Gasto total acumulado (desde 24/03/2026) | **1.120,08 €** | Todo el periodo |
| Gasto abril 2026 | **1.097,08 €** | ⚠️ Incluye cargo puntual Anthropic €595 |
| Burn rate mensual recurrente | ~196,98 €/mes | Subs fijas confirmadas |
| Coste mensual estimado total (con pendientes) | ~271 €/mes | Incluye pendientes |
| Ingresos | **0 €** | App no lanzada aún |

### Suscripciones activas confirmadas
| Servicio | Coste | Próximo cobro |
|----------|-------|---------------|
| Claude Team (Anthropic) | ~170 €/mes | 09/05/2026 |
| iCloud+ 2TB | 9,99 €/mes | 06/05/2026 |
| Meta Verified For Business | 16,99 €/mes | 12/05/2026 |
| OpenAI API (pay-as-you-go) | Variable | — (saldo: ~$99,66 USD) |

### Anomalía activa
- ⚠️ Cargo puntual Anthropic 13/04/2026: **595 € (Invoice 5RBPQUSE-0005)** — "Prepaid extra usage, Individual plan". ~3,5× el coste mensual habitual. Pendiente investigar causa.

**Fuente de verdad:** `finances/Cals2Gains_Finances.xlsx` / `_project-hub/FINANCES.md`

---

## Acciones Pendientes Globales (prioridad)

1. ⚠️ Subir AAB a Google Play Console
2. ⚠️ Vincular @cals2gains a Meta Business Suite (para obtener insights de la cuenta principal)
3. ⚠️ Instalar tag GA4 en cals2gains.com
4. ⚠️ Programar posts EN 6-14 en MBS
5. ⚠️ Resolver cuenta Apple Developer → build iOS
6. Resolver bug Firebase Storage (progress photos)
7. Resolver bug Firebase Water permissions

---

*Actualizar este documento cada vez que haya un cambio significativo en app, web, RRSS, stores o finanzas. Ver workflow W13 en `Claude code/orchestration/WORKFLOWS.md`.*
