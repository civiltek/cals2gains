# 🚀 Cals2Gains — Guía Completa de Configuración y Publicación

Esta guía te lleva paso a paso desde cero hasta tener la app publicada en App Store y Google Play.
No necesitas saber programar. Sigue los pasos en orden.

---

## 📋 ÍNDICE

1. Instalar herramientas necesarias
2. Crear cuentas de servicios
3. Configurar Firebase (base de datos + login)
4. Configurar OpenAI (IA para análisis de fotos)
5. Configurar RevenueCat (suscripciones)
6. Configurar las claves secretas en el proyecto
7. Instalar dependencias y probar en local
8. Compilar con EAS Build (sin Mac)
9. Publicar en App Store (iPhone)
10. Publicar en Google Play (Android)

---

## PASO 1 — Instalar herramientas necesarias

### 1.1 Node.js
Descarga e instala Node.js desde: https://nodejs.org (versión LTS)
Cuando termine, abre el símbolo del sistema (CMD) y escribe:
```
node --version
```
Debería mostrar algo como `v20.x.x`

### 1.2 EAS CLI (herramienta de Expo para compilar)
En el símbolo del sistema escribe:
```
npm install -g eas-cli
```

### 1.3 Expo CLI
```
npm install -g expo-cli
```

---

## PASO 2 — Crear cuentas necesarias

Necesitas crear cuenta (todas gratuitas para empezar) en:

### 2.1 Expo (para compilar la app)
- Ve a: https://expo.dev
- Crea una cuenta gratuita
- Anota tu nombre de usuario de Expo

### 2.2 Firebase (base de datos y login)
- Ve a: https://console.firebase.google.com
- Inicia sesión con tu cuenta de Google
- Haz clic en "Crear proyecto" → ponle nombre: `cals2gains`
- Desactiva Google Analytics si te lo pide (no es necesario)

### 2.3 OpenAI (para la IA de análisis de fotos)
- Ve a: https://platform.openai.com
- Crea cuenta y añade método de pago
- En "API keys" crea una nueva clave
- **IMPORTANTE**: Copia y guarda esta clave, solo se muestra una vez

### 2.4 RevenueCat (para suscripciones)
- Ve a: https://app.revenuecat.com
- Crea cuenta gratuita

### 2.5 Apple Developer (para publicar en iPhone)
- Necesitas pagar 99€/año en: https://developer.apple.com/programs/
- Regístrate con tu Apple ID

### 2.6 Google Play Console (para publicar en Android)
- Pago único de 25$ en: https://play.google.com/console
- Regístrate con tu cuenta de Google

---

## PASO 3 — Configurar Firebase

### 3.1 Activar Authentication (login)
1. En Firebase Console, ve a tu proyecto `cals2gains`
2. En el menú izquierdo: **Build → Authentication**
3. Haz clic en "Empezar"
4. Ve a la pestaña "Sign-in method"
5. Activa **Google** → guarda
6. Activa **Apple** → guarda (necesario para iPhone)

### 3.2 Activar Firestore (base de datos)
1. En el menú izquierdo: **Build → Firestore Database**
2. Haz clic en "Crear base de datos"
3. Selecciona "Iniciar en modo de producción"
4. Elige la región: `europe-west1` (Europa)
5. Haz clic en "Listo"

### 3.3 Subir las reglas de seguridad
1. En Firestore, ve a la pestaña "Reglas"
2. Copia el contenido del archivo `firestore.rules` de tu carpeta
3. Pégalo en el editor de reglas
4. Haz clic en "Publicar"

### 3.4 Obtener las claves de Firebase para la app

**Para iOS:**
1. En Firebase Console, haz clic en el engranaje ⚙️ → "Configuración del proyecto"
2. En la sección "Tus apps", haz clic en el icono de Apple 🍎 "Agregar app"
3. Bundle ID: `com.civiltek.cals2gains`
4. Descarga el archivo `GoogleService-Info.plist`
5. Guárdalo — lo necesitarás más adelante

**Para Android:**
1. En "Tus apps", haz clic en el icono de Android 🤖 "Agregar app"
2. Nombre del paquete: `com.civiltek.cals2gains`
3. Descarga el archivo `google-services.json`
4. Guárdalo — lo necesitarás más adelante

**Claves para el archivo .env:**
1. En "Configuración del proyecto" → "General"
2. Busca "SDK de configuración" y selecciona "npm"
3. Verás un bloque con `apiKey`, `authDomain`, `projectId`, etc.
4. Anota todos esos valores

---

## PASO 4 — Configurar OpenAI

1. Ve a: https://platform.openai.com/api-keys
2. Haz clic en "Create new secret key"
3. Ponle un nombre: `Cals2Gains`
4. Copia la clave (empieza por `sk-...`)
5. Guárdala para el archivo .env

**Presupuesto recomendado:**
- Cada análisis de foto con GPT-4o Vision cuesta aproximadamente $0.01-0.03
- Con 1.000 usuarios activos, ~$50/mes en costes de API

---

## PASO 5 — Configurar RevenueCat

### 5.1 Crear proyecto en RevenueCat
1. Ve a https://app.revenuecat.com
2. Crea un nuevo proyecto: `Cals2Gains`
3. Añade iOS app y Android app

### 5.2 Obtener API Keys
1. En tu proyecto RevenueCat → Settings → API Keys
2. Copia la **Public SDK key de iOS** (empieza por `appl_...`)
3. Copia la **Public SDK key de Android** (empieza por `goog_...`)

### 5.3 Crear los productos de suscripción

**En App Store Connect (para iOS):**
1. Ve a: https://appstoreconnect.apple.com
2. Tu app → Funciones → Compras integradas
3. Crea suscripción "Auto-Renovable"
4. Grupo: `Cals2Gains Premium`
5. Producto 1:
   - ID de referencia: `cals2gains_monthly_890`
   - Precio: 8,90€/mes
6. Producto 2:
   - ID de referencia: `cals2gains_annual_5990`
   - Precio: 59,90€/año

**En Google Play Console (para Android):**
1. Tu app → Monetización → Suscripciones
2. Crea suscripción con ID: `cals2gains_monthly_999` (precio 8,90€)
3. Crea suscripción con ID: `cals2gains_annual_4999` (precio 59,90€)

### 5.4 Configurar entitlement en RevenueCat
1. En RevenueCat → Entitlements → + New
2. ID: `premium`
3. Añade los 4 productos (iOS mensual, iOS anual, Android mensual, Android anual)

---

## PASO 6 — Configurar las claves secretas

1. En tu carpeta `C:\Users\Judit\Downloads\cals2gains\`
2. Copia el archivo `.env.example` y renómbralo a `.env`
3. Abre `.env` con el Bloc de Notas
4. Rellena todas las claves con los valores que obtuviste:

```
EXPO_PUBLIC_FIREBASE_API_KEY=tu-clave-aqui
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=cals2gains.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=cals2gains
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=cals2gains.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-numero-aqui
EXPO_PUBLIC_FIREBASE_APP_ID=tu-app-id-aqui

EXPO_PUBLIC_OPENAI_API_KEY=sk-tu-clave-openai

EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_tu-clave-ios
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_tu-clave-android
```

5. Guarda el archivo

---

## PASO 7 — Instalar dependencias y probar

Abre el símbolo del sistema (CMD) y escribe:

```
cd C:\Users\Judit\Downloads\cals2gains
npm install
```

Espera a que terminen de instalarse todos los paquetes (puede tardar 2-5 minutos).

**Para probar en tu teléfono (opcional):**
1. Instala la app "Expo Go" en tu iPhone o Android
2. En CMD escribe: `npx expo start`
3. Escanea el código QR con la cámara del iPhone o con la app Expo Go en Android

---

## PASO 8 — Compilar con EAS Build

EAS Build compila tu app en la nube de Expo. No necesitas Mac.

### 8.1 Iniciar sesión en Expo
```
eas login
```
Introduce tu usuario y contraseña de expo.dev

### 8.2 Configurar el proyecto
```
eas build:configure
```
Selecciona "All" cuando te pregunte por la plataforma

### 8.3 Compilar para iOS
```
eas build --platform ios --profile production
```
- Te pedirá credenciales de Apple Developer → introduce tu Apple ID
- EAS gestiona automáticamente los certificados y provisioning profiles
- La compilación tarda 15-30 minutos en la nube
- Cuando termine, te dará un enlace para descargar el archivo `.ipa`

### 8.4 Compilar para Android
```
eas build --platform android --profile production
```
- EAS genera automáticamente el keystore de Android
- **IMPORTANTE**: Guarda el keystore que genera EAS (lo necesitarás siempre)
- La compilación tarda 15-20 minutos
- Al terminar, obtienes el archivo `.aab`

---

## PASO 9 — Publicar en App Store (iPhone)

### 9.1 Crear la app en App Store Connect
1. Ve a: https://appstoreconnect.apple.com
2. "Mis apps" → "+" → Nueva app
3. Plataforma: iOS
4. Nombre: Cals2Gains
5. Idioma principal: Español
6. Bundle ID: `com.civiltek.cals2gains`
7. SKU: `cals2gains-001`

### 9.2 Completar la información de la app

**En la ficha de la App Store:**
- **Nombre**: Cals2Gains - Contador de Calorías con IA
- **Subtítulo**: Analiza comida con IA
- **Descripción** (copia esto):
```
Cals2Gains analiza automáticamente tus platos con inteligencia artificial.
Simplemente fotografía tu comida y la IA calculará las calorías, proteínas,
carbohidratos y grasas al instante.

✨ CARACTERÍSTICAS:
• Análisis de fotos con GPT-4o Vision
• Estimación automática de cantidades por proporciones visuales
• Seguimiento diario de macronutrientes
• Historial de comidas con fotos
• Metas personalizadas según tus objetivos
• 7 días de prueba gratuita
• Disponible en Español e Inglés
```

- **Palabras clave**: contador calorías, macros, nutrición, dieta, IA, análisis comida
- **URL de soporte**: tu sitio web o email (puedes poner mailto:info@civiltek.es)
- **Categoría**: Salud y forma física

### 9.3 Capturas de pantalla
Necesitas capturas de pantalla de la app. Opciones:
- Usa el simulador de iOS en Mac (si tienes acceso a uno)
- Usa capturas del simulador en EAS
- Crea mockups en Canva con capturas reales de tu teléfono

Tamaños necesarios:
- iPhone 6.7" (1290 × 2796 px) — mínimo 3, máximo 10

### 9.4 Subir el build a App Store Connect
```
eas submit --platform ios --latest
```
O manualmente:
1. Descarga Transporter desde la Mac App Store (si tienes Mac)
2. O usa: `xcrun altool` en Mac

### 9.5 Enviar para revisión
1. En App Store Connect → tu app → "Enviar para revisión"
2. Apple tarda entre 1 y 3 días en revisar
3. Si rechazan la app, te dirán el motivo y puedes corregirlo

---

## PASO 10 — Publicar en Google Play (Android)

### 10.1 Crear la app en Google Play Console
1. Ve a: https://play.google.com/console
2. "Crear app"
3. Nombre: Cals2Gains
4. Tipo: App
5. Gratis o de pago: Gratis (con compras integradas)
6. Acepta las políticas

### 10.2 Completar la ficha de Play Store

**Descripción corta** (máx 80 caracteres):
```
Analiza tus comidas con IA y controla tus macros automáticamente
```

**Descripción completa**: usa la misma que en App Store

**Capturas de pantalla**: mínimo 2, formato 16:9 o 9:16

### 10.3 Subir el build
1. En Google Play Console → "Producción" → "Crear nueva versión"
2. Arrastra el archivo `.aab` que generó EAS
3. Añade notas de la versión: "Versión inicial de Cals2Gains"

### 10.4 Completar los requisitos de Google Play
Google Play requiere rellenar varias secciones antes de publicar:
- **Clasificación de contenido**: completa el cuestionario (app de salud/nutrición)
- **Público objetivo**: Mayores de 13 años
- **Política de privacidad**: necesitas una URL. Puedes crear una en: https://www.termsfeed.com/privacy-policy-generator/
- **Anuncios**: indica que no hay anuncios
- **Acceso a la app**: "Todas las funciones disponibles con suscripción de prueba"

### 10.5 Enviar para revisión
1. Haz clic en "Enviar para revisión"
2. Google tarda entre 3 y 7 días en la primera revisión
3. Las actualizaciones posteriores suelen tardar menos de 24h

---

## 🔄 ACTUALIZACIONES FUTURAS

Para actualizar la app después de publicarla:

```
# Incrementar la versión en app.json (buildNumber para iOS, versionCode para Android)
# Compilar de nuevo:
eas build --platform all --profile production

# Subir a las tiendas:
eas submit --platform all --latest
```

---

## 💰 CONFIGURAR PAGOS Y COBRAR

Para empezar a cobrar suscripciones necesitas:

**En Apple:**
1. App Store Connect → Acuerdos, impuestos y bancos
2. Firma el acuerdo de "Aplicaciones de pago"
3. Añade tu información bancaria (IBAN)
4. Apple paga mensualmente, 30 días después del mes

**En Google:**
1. Google Play Console → Configuración → Pagos
2. Crea cuenta de pagos de Google
3. Añade tu información bancaria
4. Google paga mensualmente

**Comisiones:**
- Apple cobra el 30% (o 15% si facturas menos de $1M/año con el Small Business Program)
- Google cobra el 30% (o 15% el primer año y si facturas menos de $1M)
- RevenueCat cobra 0% hasta 2.500$/mes de ingresos, luego 1%

---

## 🆘 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "Bundle identifier already in use"
- El bundle ID `com.civiltek.cals2gains` ya existe. Cámbialo en `app.json` por algo único como `com.civiltek.cals2gains`

### Error al compilar: "Missing provisioning profile"
- EAS gestiona esto automáticamente. Asegúrate de haber iniciado sesión con `eas login`

### La IA no analiza bien las fotos
- Comprueba que la clave de OpenAI en `.env` es correcta
- Verifica que tienes saldo en tu cuenta de OpenAI

### El login con Google no funciona
- En Firebase Console → Authentication → Google → asegúrate de haber añadido el SHA-1 del certificado de Android

### Las suscripciones no aparecen
- Los productos de RevenueCat tardan 24-48h en sincronizarse desde App Store Connect / Google Play
- Asegúrate de que los IDs de los productos coinciden exactamente

---

## 📞 CONTACTO Y RECURSOS

- Documentación Expo: https://docs.expo.dev
- Documentación Firebase: https://firebase.google.com/docs
- Documentación RevenueCat: https://docs.revenuecat.com
- EAS Build: https://docs.expo.dev/build/introduction/
- Soporte Expo: https://forums.expo.dev

---

*Cals2Gains — Desarrollado con React Native + Expo + GPT-4o Vision*
*Bundle ID: com.civiltek.cals2gains | Versión: 1.0.0*

