# Cals2Gains - Estado del Proyecto
> Última actualización: 2026-04-17 — Build iOS bloqueado: créditos EAS al 100% (reset 1 mayo). app.json reparado (c8ab16c). buildNumber iOS en remoto: 52.

## App
- **Versión actual:** 1.0.0
- **Bundle ID:** com.civiltek.cals2gains
- **Expo SDK:** 54
- **React Native:** 0.81.5
- **✅ AAB PRODUCCIÓN (2026-04-16 18:03 UTC):** 77 MB, firmado — PRs #21-#26
  - Build GH Actions: https://github.com/civiltek/cals2gains/actions/runs/24524771335
  - Artifact ID: `6480223158` (expira 2026-05-16)
  - **Listo para subir a Google Play Console**
  - minSdkVersion: 26 (fix para react-native-health-connect)
- **Build Android anterior (roto por reanimated v3 + RN 0.81):** build 358414d2 — NO INSTALAR
- **Build iOS (App Store):** 🔴 BLOQUEADO — créditos EAS agotados (100%), reset 1 mayo 2026
  - buildNumber remoto actual: **52** (autoincremento en intento fallido 2026-04-17)
  - app.json reparado y pusheado: commit `c8ab16c` — credenciales iOS válidas hasta 14/04/2027
  - ⚠️ Upgrade EAS o esperar reset 1 mayo: https://expo.dev/accounts/civiltek/settings/billing
  - Comando listo: `eas build --profile production --platform ios --non-interactive`
  - Build obsoleto en cola (sin fix HealthKit): `b7cd8dc2-f6f0-4eac-9f00-b9dc16660eef`
  - Build anterior cancelado: `254b9c6e` (buildNumber 19); intento disco lleno: buildNumber 20
- **Estado:** AAB production firmado y descargado. Pendiente subida a Google Play Console.

## Stack Tecnológico
- React Native + Expo Router (typed routes)
- Firebase (Auth, Firestore, Storage)
- Zustand (state management)
- i18next (i18n: EN + ES)
- RevenueCat (subscriptions)
- Expo Camera, Image Picker, Audio

## Features Activas
Ver `FEATURES.md` para lista completa con estados.

Pantallas principales:
- Smart Onboarding (goal modes, nutrition settings)
- Dashboard con macros diarios
- Capture Hub (cámara IA, barcode scanner, búsqueda, quick add, voice)
- AI Review / Food Verification
- Análisis nutricional
- Weekly Coach (recaps semanales con IA)
- Recipes (generación IA)
- What to Eat (sugerencias IA)
- Meal Plan (planificación semanal)
- Fasting tracker
- Water tracker
- Weight tracker + Measurements
- Progress Photos
- Protein Dashboard
- Adherence tracking
- Analytics avanzados
- Export Data (PDF/CSV)
- Coach Share (compartir con nutricionista)
- Grocery List / Shopping List
- Training Day (ajuste por entreno)
- Paywall (RevenueCat)
- Settings completos (perfil, goals, nutrition mode)

## Bugs Conocidos
- **Firebase Storage:** Error al subir fotos de progreso (ArrayBuffer issue → usar XMLHttpRequest como workaround)
- **expo-notifications:** Removido temporalmente por crash en Android sin FCM configurado
- **Firebase Water permissions:** "Missing or insufficient permissions" en water tracker
- **Tema oscuro:** Corregidos ~70 issues en auditoría, pueden quedar edge cases
- **🔴 Google Sign-In DEVELOPER_ERROR (Android prod):** AAB firmado por Play App Signing key cuyo SHA-1 NO está en Firebase/OAuth. Requiere acción manual Judith (ver CHANGELOG 2026-04-17) ANTES del próximo build.

### Corregidos en tanda 2 (2026-04-17)
- ✅ `updateDailyLog` envuelto en try/catch
- ✅ `edit-meal` ratio clamp + clamp no-negativo en save
- ✅ `food-search` searchTimeout cleanup
- ✅ AbortController+timeout en las 5 llamadas OpenAI (adaptiveCoach, foodDatabase, macroCoach, voiceLog, label-scanner)
- ✅ A11y crítico en tab bar cámara + welcome + profile

### A11y pendiente (tanda 3)
- 🟡 Resto de pantallas (~200 TouchableOpacity sin label). Settings, home dashboard, capture-hub, camera, history, tools, recipes, weight-tracker, etc.

## Bugs Resueltos recientemente
- **[13/04 23:30] Crash inmediato al abrir APK en Android** — RESUELTO
  - Causa: `react-native-reanimated` 3.19.5 incompatible con RN 0.81/Expo SDK 54 (buscaba campo `mIsFinished` en `MessageQueueThreadImpl` que ya no existe)
  - Fix: upgrade a `react-native-reanimated` ~4.1.1 + instalación de `react-native-worklets` 0.5.1 + cambio del plugin babel a `react-native-worklets/plugin`
  - Validado vía logcat ADB sobre dispositivo Samsung conectado por USB
  - Nuevo build en cola con el fix: `c00a412e-0ac0-4698-9646-bc36af7b10f0`

## Finanzas (resumen)
| Concepto | Valor |
|----------|-------|
| Gasto total acumulado (desde 24 mar) | **413,76 €** |
| Burn rate mensual confirmado | ~207 €/mes |
| Suscripciones activas | 3 (Claude Max 20x, iCloud+, Meta Verified) |
| Ingresos | 0 € (app no lanzada) |
| Última revisión automática | 13 abr 2026, 19:00 — sin nuevos gastos |

Ver `FINANCES.md` para detalle completo.

## Métricas Clave (13 abril 2026)
| Canal | Métrica | Valor |
|-------|---------|-------|
| @cals2gains (IG EN) | Seguidores | 868 ✅ |
| @cals2gains_es (IG ES) | Seguidores | 11 |
| @calstogains (IG EN sec.) | Seguidores | 8 |
| Facebook ES | Seguidores | 1 |
| Facebook EN | Seguidores | 1 |
| Total seguidores IG | — | ~887 |
| cals2gains.com (GA) | Usuarios 7d | 0 (tag no instalado) ⚠️ |
| Google Play | Descargas | No accesible ⚠️ |

## Marketing
- **Fase 1 ES:** 28 posts programados en MBS (12-25 abril 2026)
- **Fase 1 EN:** Posts 1-5, 15-28 programados en MBS; faltan 6-14
- **Comentarios influencers:** Automatizado 2x/día en todas las cuentas
- **Respuesta comentarios:** Automatizado 3x/día
- **Reels:** Assets creados (demos cámara IA EN/ES)

## Cuentas
Ver `ACCOUNTS.md` para detalle completo.

## Próximos Pasos
1. **[BLOQUEANTE]** Judith añade SHA-1 App Signing Key (Play Console → Integridad de la app → Firma de apps) a Firebase Console + Google Cloud OAuth Android client. Sin esto Google Sign-In Android roto en prod.
2. **[SIGUIENTE BUILD]** Build Android + iOS con los 4 fixes del 2026-04-17 (auth Health, card onConnect, tab bar Samsung, búsqueda ES con fallback OpenAI)
3. **[ACTIVO]** Esperar build iOS `254b9c6e` → validar en TestFlight → submit a App Store Review
4. Completar posts EN faltantes (6-14) y programar
5. Verificar submission Google Play (AAB `builds/app-release.aab`)
6. ⚠️ Revisar créditos EAS (96% usados) — upgrade recomendado antes del próximo build combinado
7. **[TANDA 2]** Tras validar los fixes: estabilidad (timeouts OpenAI + listener cleanup + photo validation) y a11y (accessibilityLabel en TouchableOpacity)
8. Resolver bug Firebase Storage para progress photos
9. Vincular @cals2gains a Meta Business Suite para obtener insights
10. Instalar tag GA4 en cals2gains.com (propiedad ya creada: macrolens-ai-4c482)

## Notas de build
- **Cals2Gains NO puede correr en Expo Go** desde SDK 53. Usa módulos nativos (RevenueCat, GoogleSignIn, expo-notifications, CameraView con children). Para probar en dispositivo físico siempre generar APK vía EAS (`eas build --profile preview --platform android`).
- Dispositivo de pruebas Android conectado por ADB: Samsung serial `R3CR10E9LSE`. `adb logcat -s ReactNativeJS:V System.err:W AndroidRuntime:E` para capturar crashes.
