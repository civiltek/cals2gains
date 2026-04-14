# Cals2Gains - Instrucciones del Proyecto

## Regla #1: Lee el contexto antes de empezar
Antes de hacer CUALQUIER trabajo, lee estos archivos del hub central:
- `_project-hub/PROJECT_STATUS.md` — estado actual del proyecto, builds, bugs
- `_project-hub/CHANGELOG.md` — cambios recientes (últimas 10 entradas)
- `_project-hub/FEATURES.md` — features de la app con estado
- `_project-hub/ACCOUNTS.md` — cuentas de RRSS y plataformas
- `_project-hub/BRAND.md` — colores, tipografía, tono de voz
- `_project-hub/CONTENT_PLAN.md` — plan de contenido actual
- `_project-hub/SCREENSHOTS.md` — screenshots disponibles
- `_project-hub/METRICS.md` — métricas de RRSS, web y stores (si existe)

## Regla #2: Actualiza el hub al terminar
Al finalizar tu tarea, SIEMPRE actualiza:
1. **CHANGELOG.md** — añade una entrada con fecha, descripción breve de lo que hiciste
2. **PROJECT_STATUS.md** — actualiza cualquier sección que haya cambiado (nuevo build, bug resuelto, feature añadida, etc.)
3. **FEATURES.md** — si añadiste, modificaste o eliminaste una feature
4. **METRICS.md** — si recopilaste métricas nuevas

## Regla #3: Screenshots
Si haces cambios visuales en la app (UI, nuevas pantallas, correcciones de diseño):
- Genera screenshots actualizados
- Guárdalos en `marketing/screenshots/`
- Actualiza `_project-hub/SCREENSHOTS.md` con las rutas

## Sobre el proyecto
- **Qué es**: App de nutrición con IA (React Native/Expo)
- **Propietaria**: Judith (info@civiltek.es)
- **Empresa**: CivilTek
- **Precio**: $9.99/mes (modelo freemium)
- **Idiomas**: Español y English
- **Plataformas**: iOS y Android

## Cuentas de RRSS
- IG @cals2gains — cuenta principal EN (800+ seguidores, verificación pendiente)
- IG @cals2gains_es — cuenta ES
- IG @calstogains — antigua EN renombrada
- FB "Cals2Gains - AI Nutrition" (EN)
- FB página ES
- Web: cals2gains.com

## Brand
- Colores: coral #FF6A4D, violet #9C8CFF, orange #FF9800, gold #FFD700, dark #17121D, bone #F7F2EA
- Fuente: Outfit
- Tono: cercano, motivador, basado en ciencia, no condescendiente

## Estructura del proyecto
```
Cals2Gains/
├── _project-hub/       ← HUB CENTRAL (lee siempre primero)
├── app/                ← Código fuente React Native
├── components/         ← Componentes React
├── services/           ← Servicios (Firebase, API, etc.)
├── store/              ← State management (Zustand)
├── i18n/               ← Traducciones ES/EN
├── marketing/          ← Todo marketing
│   ├── Campaign_F1/    ← Campaña Fase 1 (EN + ES)
│   ├── instagram/      ← Posts y reels
│   ├── content-calendar/
│   ├── strategies/
│   └── screenshots/    ← Screenshots actualizados de la app
├── docs/               ← Documentación, guías, reportes
├── website/            ← Landing page (cals2gains.com)
├── brand-assets/       ← Logos, iconos, fuentes
└── store-screenshots/  ← Screenshots para App Store / Play Store
```

## Bugs conocidos (actualizar conforme se resuelvan)
- Firebase Storage: error al subir fotos (ArrayBuffer issue → usar XMLHttpRequest)
- expo-notifications: removido por crash sin FCM en Android
- Firebase water permissions: "Missing or insufficient permissions"

## Comunicación entre áreas
- **Developer → Marketing**: al añadir features, actualizar FEATURES.md y generar screenshots
- **Marketing → Developer**: si necesita screenshots nuevos, pedirlos vía SCREENSHOTS.md
- **Contenido → Brand**: siempre consultar BRAND.md para colores, tono, estilo
- **Métricas**: se recopilan automáticamente cada lunes (metrics-collector)
- **Comentarios RRSS**: se responden automáticamente 3x/día (instagram-comment-replies)