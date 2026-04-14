# TECH-STACK.md — Stack técnico

## App móvil
- **Framework**: React Native 0.81.5.
- **SDK**: Expo 54.
- **Routing**: Expo Router (typed routes).
- **State**: Zustand.
- **i18n**: i18next (ES + EN).
- **Auth + DB**: Firebase Auth, Firestore, Storage.
- **Subscriptions**: RevenueCat (`react-native-purchases`).
- **Cámara / media**: Expo Camera, Image Picker, Audio.
- **Animations**: `react-native-reanimated` 4.1.1 + `react-native-worklets` 0.5.1 (post fix 13/04/2026).
- **Bundle ID**: `com.civiltek.cals2gains`.
- **EAS**: owner `civiltek`, project `381120d5-3866-4b97-af00-4c6840768327`.

### No soportado
- **Expo Go**: la app no corre ahí desde SDK 53 por módulos nativos. Siempre build EAS.

## Web
- **Landing**: HTML/CSS/JS estático.
- **Hosting**: Firebase Hosting (project `cals2gains`, URL `cals2gains.web.app`).
- **Dominio**: cals2gains.com (⚠️ confirmar apunte).
- **Analytics**: GA4 (`G-WMHZQ52NS2`, property `macrolens-ai-4c482`). ⚠️ tag por instalar.

## Dispositivo de pruebas
- **Samsung**, serial ADB `R3CR10E9LSE` (USB).

## MCPs conectados al proyecto
- **Outlook MCP**: `tools/outlook-mcp-server`. Tenant `dca3514b-8434-4296-a4be-f6a9d00c7d86`, Client `22bf9098-ad53-4a8c-9b13-0831c35d7a22`. Para info@civiltek.es.
  - ⚠️ cals2gains.com pendiente (Microsoft no lo reconoce; recomendación: añadir como guest al tenant de civiltek).
- **IMAP MCPs**: cuatro instancias — `imap-mcp-server` (cals2gains), `imap-mcp-server-civiltek`, `imap-mcp-server-gmail-cals2gains`, `imap-mcp-server-gmail-judith`.
- **Gmail MCP**: integración con Google para `info@civiltek.es`.
- **Chrome MCP**: para operar web apps cuando no hay MCP dedicado.
- **Computer-use MCP**: último recurso.
- **Scheduled tasks MCP**: para crear/listar/actualizar tareas programadas.
- **PDF viewer MCP**: para anotar/firmar PDFs.

## Cuentas de pago / servicios
- Anthropic (Claude Team) — info@civiltek.es.
- OpenAI API (org CIVILTEK) — saldo restante ~$99,66 USD (13/04).
- iCloud+ 2TB — judith.cordobes@gmail.com.
- Meta Verified For Business — judith.cordobes@gmail.com.
- Google Play Console — cals2gains@gmail.com.
- Apple Developer — ⚠️ en verificación.
- Firebase / Google Cloud — proyecto `cals2gains`.
- Expo / EAS — owner `civiltek`, free tier.

## Notas operativas
- Archivos sensibles que NO se commitean: `google-services.json`, `GoogleService-Info.plist`, `.env`, claves privadas. Verificar `.gitignore`.
- `firestore.rules` y `storage.rules` son producción: todo cambio debe escalarse.
