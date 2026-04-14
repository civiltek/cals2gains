# Cals2Gains — Guía de Testing

## Probar en iPhone (Safari) + Chrome

### Paso 1: Abrir Terminal en tu ordenador

En Windows: abre **PowerShell** o **CMD**
En Mac: abre **Terminal**

### Paso 2: Ir a la carpeta del proyecto

```bash
cd Documents/Cals2Gains
```

### Paso 3: Instalar dependencias (solo la primera vez)

```bash
npm install
```

### Paso 4: Lanzar el servidor

```bash
npx expo start --lan --web
```

Esto mostrará:
- Un **código QR** en la terminal
- Una URL tipo `http://192.168.x.x:8081` (tu IP local)
- La web se abrirá en Chrome automáticamente en `http://localhost:8081`

### Paso 5: Probar en iPhone

**Opción A — Safari (más fácil, sin instalar nada):**
1. Busca la IP local que muestra la terminal (ej: `192.168.1.45`)
2. En tu iPhone, abre Safari y ve a: `http://192.168.1.45:8081`
3. La app web se cargará directamente

**Opción B — Expo Go (experiencia nativa):**
1. Instala **Expo Go** desde la App Store
2. Escanea el QR que aparece en la terminal con la cámara del iPhone
3. La app se abrirá en Expo Go

> Ambos dispositivos deben estar en la misma red WiFi.

### Paso 6: Probar en Chrome

Simplemente abre: `http://localhost:8081`

---

## Para los otros chats de Cowork

El código actualizado ya está en tu carpeta `Documents/Cals2Gains`.
Cualquier nueva sesión de Cowork que seleccione esta misma carpeta
tendrá acceso automático a todo el código con los últimos cambios.

---

## Importante: instalar dependencias nuevas

Se ha añadido `expo-notifications` al proyecto. Antes de lanzar el servidor,
asegúrate de ejecutar:

```bash
npm install
```

Si usas Expo Go en iPhone, las notificaciones funcionarán directamente.
Si haces un build nativo, las notificaciones locales también funcionan sin configuración extra.

---

## Resumen de últimos cambios

- 3 motores adaptativos conectados (AdaptiveMacro, Personal, Memory)
- i18n completo: ES + EN en todas las pantallas
- Temas dark + light funcionando
- Lista de compra, capture hub, medidas corporales — todo traducido
- Acciones rápidas del gym flow en Training Day
- Sugerencias IA en ¿Qué como ahora?
- **Sistema de recordatorios conectado**: toggles de Settings programan/cancelan notificaciones locales recurrentes, con persistencia y re-programación al abrir la app
