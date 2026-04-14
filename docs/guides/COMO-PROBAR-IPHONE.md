# Cómo probar Cals2Gains en tu iPhone

## Requisitos previos
1. **iPhone** con Expo Go instalado (descárgalo gratis desde la App Store)
2. **Tu ordenador** y el iPhone en la **misma red WiFi**
3. **Node.js** instalado en tu ordenador (v18 o superior)

---

## Paso 1 — Abrir la terminal

Abre la terminal (Terminal en Mac, PowerShell en Windows) y navega a la carpeta del proyecto:

```
cd ruta/a/Cals2Gains
```

---

## Paso 2 — Instalar dependencias (solo la primera vez)

```
npm install
```

Esto tarda unos minutos la primera vez.

---

## Paso 3 — Arrancar el servidor de desarrollo

```
npx expo start
```

Verás un **código QR** en la terminal.

> Si el QR no funciona con tu iPhone, prueba con tunnel:
> ```
> npx expo start --tunnel
> ```
> (Te pedirá instalar @expo/ngrok — di que sí)

---

## Paso 4 — Conectar tu iPhone

1. Abre la **cámara** del iPhone
2. Apunta al **código QR** de la terminal
3. Toca la notificación "Abrir en Expo Go"
4. La app se cargará (la primera vez tarda 30-60 segundos)

---

## Paso 5 — Probar

Usa el checklist de pruebas: `CHECKLIST-PRUEBAS-IPHONE.md`

### Atajos útiles en la terminal mientras pruebas:
- **`r`** — Recargar la app
- **`m`** — Abrir el menú de desarrollo
- **`j`** — Abrir el debugger

---

## Solución de problemas

| Problema | Solución |
|----------|----------|
| "Network error" al escanear QR | Asegúrate de que iPhone y PC están en la misma WiFi |
| La app no carga | Prueba `npx expo start --tunnel` |
| Error de módulos | Ejecuta `npm install` de nuevo |
| Pantalla en blanco | Sacude el iPhone para abrir el menú de desarrollo → "Reload" |
| La cámara no funciona | Expo Go tiene limitaciones con la cámara — necesitarás un Development Build para probarla al 100% |

---

## Configuración verificada

- .env: Firebase + OpenAI + RevenueCat configurados ✓
- app.json: Bundle ID, permisos, plugins, iconos ✓
- Dependencias: Expo SDK 54, expo-router, react-i18next ✓
- Assets: icon.png, splash.png, adaptive-icon.png, C2G-Mark-512.png ✓
- i18n: ES/EN completo y sincronizado (994+ claves) ✓
