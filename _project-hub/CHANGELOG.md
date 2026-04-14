# Changelog - Cals2Gains
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

