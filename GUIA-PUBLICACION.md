# GUÍA DE PUBLICACIÓN — Cals2Gains
# ==================================
# Judith, estos son los pasos que necesitas completar para publicar la app.

## 📱 GOOGLE PLAY STORE (Android)

### Paso 1: Cuenta de Desarrollador Google Play
- Ve a: https://play.google.com/console/signup
- Coste: 25 USD (pago único, de por vida)
- Usa tu cuenta de Google asociada a info@civiltek.es
- Rellena los datos de CivilTek como desarrollador

### Paso 2: Crear la app en Google Play Console
- Una vez dentro, haz clic en "Crear app"
- Nombre: Cals2Gains - Contador de Calorías con IA
- Idioma predeterminado: Español (España)
- Tipo: App / Gratis
- Acepta las declaraciones

### Paso 3: Crear cuenta de servicio (para subida automática)
- Ve a Google Cloud Console: https://console.cloud.google.com
- Crea un proyecto (o usa el existente de Firebase: macrolens-ai-4c482)
- Ve a IAM > Cuentas de servicio > Crear cuenta de servicio
- Dale el rol "Editor" en Google Play Console
- Descarga la clave JSON y guárdala como:
  C:\Users\Judit\Documents\Cals2Gains\google-play-service-account.json
- Luego en Google Play Console > Configuración > Acceso a la API:
  Vincula la cuenta de servicio

### Paso 4: Subir el APK
- Cuando el build termine, yo puedo ejecutar:
  eas submit --platform android --profile production
- O puedes subir el APK manualmente desde Google Play Console

### Paso 5: Completar la ficha de la tienda
- Usa los textos del archivo store-listing-metadata.md
- Sube las capturas de store-screenshots/
- Sube el icono de alta resolución (512x512): assets/images/icon.png
- Sube el gráfico de funciones (1024x500): assets/images/feature-graphic.png

---

## 🍎 APP STORE (iOS)

### Paso 1: Cuenta Apple Developer
- Ve a: https://developer.apple.com/programs/enroll/
- Coste: 99 USD/año
- Necesitas un Apple ID (puedes crearlo en https://appleid.apple.com)
- El proceso de verificación puede tardar 24-48 horas

### Paso 2: Datos que necesito de ti
Una vez tengas la cuenta, necesito estos 3 datos:
1. Apple ID (email): el email de tu cuenta Apple Developer
2. Apple Team ID: lo encuentras en https://developer.apple.com/account > Membership
3. App Store Connect App ID: lo obtienes al crear la app en https://appstoreconnect.apple.com

### Paso 3: Yo me encargo del resto
- Actualizo eas.json con tus datos
- Lanzo el build de iOS con: eas build --platform ios --profile production
- Envío a App Store con: eas submit --platform ios --profile production

---

## ⚡ RESUMEN RÁPIDO

| Paso | Qué hacer | Quién |
|------|-----------|-------|
| Cuenta Google Play | Registrarse y pagar 25 USD | Judith |
| Crear app en Google Play | Click en "Crear app" | Judith |
| Cuenta de servicio | Crear y descargar JSON | Judith (con mi guía) |
| Subir APK a Google Play | Automático con EAS | Claude |
| Ficha Google Play | Textos + capturas | Claude (preparado) |
| Cuenta Apple Developer | Registrarse y pagar 99 USD | Judith |
| Compartir datos Apple | 3 datos (email, team ID, app ID) | Judith |
| Build + Submit iOS | Automático con EAS | Claude |

---

## 🌐 PENDIENTE: Hosting de políticas
Las páginas de privacidad y términos de servicio necesitan estar online.
Opciones:
1. Subirlas a civiltek.es (recomendado)
2. Usar GitHub Pages (gratis)
3. Usar Firebase Hosting (gratis)

Los archivos ya están creados:
- privacy-policy.html
- terms-of-service.html

Solo necesitan estar accesibles en:
- https://www.cals2gains.com/privacy
- https://www.cals2gains.com/terms