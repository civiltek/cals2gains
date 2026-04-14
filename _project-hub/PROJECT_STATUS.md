# Cals2Gains - Estado del Proyecto
> Última actualización: 2026-04-13 (23:30) — Fix crash Android (reanimated v4 + worklets)

## App
- **Versión actual:** 1.0.0
- **Bundle ID:** com.civiltek.cals2gains
- **Expo SDK:** 54
- **React Native:** 0.81.5
- **Último build Android (con fix):** en compilación → build `c00a412e-0ac0-4698-9646-bc36af7b10f0`
  - Logs / descarga: https://expo.dev/accounts/civiltek/projects/cals2gains/builds/c00a412e-0ac0-4698-9646-bc36af7b10f0
- **Build Android anterior (roto por reanimated v3 + RN 0.81):** https://expo.dev/artifacts/eas/7BhzB8Q9sXS7LQyeTQE62k.apk (build 358414d2) — NO INSTALAR, crashea al abrir
- **Build iOS:** Pendiente (cuenta Apple Developer en verificación)
- **Estado:** Fix crítico de reanimated aplicado (13/04 23:30), build nuevo en cola para validar en Android físico (Samsung R3CR10E9LSE conectado vía ADB)

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
- ~~**Firebase Water permissions:** "Missing or insufficient permissions" en water tracker~~ → RESUELTO (reglas añadidas en `firestore.rules`)
- **Tema oscuro:** Corregidos ~70 issues en auditoría, pueden quedar edge cases

## Bugs Resueltos recientemente
- **[14/04] Firebase Water permissions** — RESUELTO
  - Causa: colección `waterLogs` no tenía reglas de seguridad en `firestore.rules`
  - Fix: reglas añadidas con auth + owner check + schema validation
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
1. **[URGENTE]** Esperar build `c00a412e` (~10-15 min) → desinstalar APK roto del móvil → instalar nuevo APK → validar que la app abre correctamente
2. Completar testing Android con APK corregido
3. Resolver cuenta Apple Developer → build iOS
4. Completar posts EN faltantes (6-14) y programar
5. Preparar submission a Google Play Store
6. Resolver bug Firebase Storage para progress photos
7. Vincular @cals2gains a Meta Business Suite para obtener insights
8. Instalar tag GA4 en cals2gains.com (propiedad ya creada: macrolens-ai-4c482)
9. Verificar acceso a Google Play Console con la cuenta de desarrollador correcta

## Notas de build
- **Cals2Gains NO puede correr en Expo Go** desde SDK 53. Usa módulos nativos (RevenueCat, GoogleSignIn, expo-notifications, CameraView con children). Para probar en dispositivo físico siempre generar APK vía EAS (`eas build --profile preview --platform android`).
- Dispositivo de pruebas Android conectado por ADB: Samsung serial `R3CR10E9LSE`. `adb logcat -s ReactNativeJS:V System.err:W AndroidRuntime:E` para capturar crashes.
