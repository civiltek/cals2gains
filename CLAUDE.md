# CLAUDE.md — Reglas globales del sistema Cals2Gains

> Este archivo es el punto de entrada. Si un Claude nuevo llega al proyecto, debe leerlo entero antes de tocar nada. Léelo también tú, Claude, al inicio de cada sesión seria.

**Propietaria:** Judith (info@civiltek.es) — CivilTek
**Proyecto:** Cals2Gains — app móvil de nutrición con IA (React Native / Expo)
**Idioma de trabajo:** Español. Siempre responde a Judith en español salvo que ella cambie al inglés.

---

## 1. Las 3 reglas de oro (no negociables)

1. **Leer antes de actuar.** Abre `_project-hub/PROJECT_STATUS.md`, `_project-hub/CHANGELOG.md` y los archivos del hub relevantes a la tarea antes de proponer cambios.
2. **No inventar datos.** Si no tienes el dato (un importe, un KPI, una métrica, un estado de build) lo dices — no rellenas. Ver `guardrails/RULES.md`.
3. **Dejar rastro.** Toda acción no trivial se registra: entrada en `_project-hub/CHANGELOG.md` con fecha y resumen, y, si aplica, actualización del archivo de hub correspondiente.

Cualquier otra cosa de este documento es un derivado de estas tres.

---

## 2. Rutas clave del proyecto

```
Cals2Gains/
├── Claude code/           ← ESTE SISTEMA (agentes, skills, reglas, context)
│   ├── agents/            ← definiciones de agentes (.md)
│   │   └── marketing/     ← sub-agentes de marketing (carousel, reels, hooks…)
│   ├── commands/          ← slash commands (.md)
│   ├── context/           ← contexto del proyecto (brand, tech-stack, finanzas…)
│   ├── guardrails/        ← reglas, escalado, anti-patrones
│   ├── memory/            ← estructura de memoria persistente
│   ├── orchestration/     ← handoffs, workflows, tareas programadas
│   └── skills/            ← skills reutilizables (crash-diagnosis, eas-build…)
├── _project-hub/          ← Hub central de estado del proyecto
│   ├── PROJECT_STATUS.md  ← estado vivo (builds, bugs, métricas)
│   ├── CHANGELOG.md       ← log de cambios (mantener últimas 50 entradas)
│   ├── FEATURES.md        ← features con estado
│   ├── FINANCES.md        ← resumen financiero narrativo
│   ├── METRICS.md         ← métricas RRSS/web/stores
│   ├── ACCOUNTS.md        ← cuentas (sin credenciales)
│   ├── BRAND.md           ← voz, colores, tipografía
│   ├── CONTENT_PLAN.md    ← plan de contenido
│   ├── SCREENSHOTS.md     ← índice de screenshots
│   ├── SEO_REPORT.md      ← informe SEO
│   └── dashboard.html     ← copia del dashboard financiero
├── app/                   ← código fuente React Native (Expo Router)
│   ├── (auth)/            ← pantallas de autenticación
│   └── (tabs)/            ← pantallas principales con tabs
├── components/, services/, store/, i18n/, hooks/, utils/, constants/, theme.ts
├── types/                 ← tipos TypeScript compartidos
├── data/                  ← datos estáticos (spanishFoods.ts)
├── content/               ← lead magnets y contenido descargable
├── public/, website/      ← landing cals2gains.com (Firebase hosting)
├── finances/
│   ├── Cals2Gains_Finances.xlsx  ← FUENTE DE VERDAD financiera
│   ├── dashboard.html            ← dashboard generado desde el Excel
│   └── receipts/{anthropic,openai}/
├── marketing/             ← campañas, posts, screenshots, estrategias
│   ├── instagram/         ← contenido IG
│   ├── email/             ← plantillas de email
│   ├── screenshots/       ← capturas para RRSS
│   ├── strategies/        ← documentos de estrategia
│   └── content-calendar/  ← calendario de contenido
├── brand-assets/          ← logos, iconos, fuentes
├── store-screenshots/     ← screenshots para App Store / Play Store
├── docs/                  ← documentación (dossier inversores, guías, build-logs)
├── tools/
│   ├── outlook-mcp-server              ← MCP Outlook (Tenant civiltek)
│   ├── imap-mcp-server                 ← IMAP cals2gains
│   ├── imap-mcp-server-civiltek
│   ├── imap-mcp-server-gmail-cals2gains
│   ├── imap-mcp-server-gmail-judith
│   └── telegram-mcp-server             ← MCP Telegram
├── skills/                ← skills ejecutables (mirrors de Claude code/skills/)
│   ├── instagram-commenter/  ← respuestas a comentarios IG (legado)
│   ├── crash-diagnosis/
│   ├── download-receipt/
│   ├── eas-build/
│   ├── publish-post/
│   ├── update-dashboard/
│   └── weekly-metrics/
├── agents/                ← mirrors de Claude code/agents/
├── commands/              ← mirrors de Claude code/commands/
├── context/               ← mirrors de Claude code/context/
├── guardrails/            ← mirrors de Claude code/guardrails/
├── orchestration/         ← mirrors de Claude code/orchestration/
├── memory/                ← mirrors de Claude code/memory/
└── .github/workflows/    ← CI/CD workflows
```

Memoria persistente de Cowork: `/sessions/*/mnt/.auto-memory/` (ver `memory/MEMORY-STRUCTURE.md`).

---

## 3. Sistema de agentes

Cuando una tarea cae claramente dentro del alcance de un agente, invócalo (léete su `.md` y opera bajo su rol). Los agentes están en `Claude code/agents/`:

| Agente | Alcance corto |
|--------|---------------|
| `app-dev` | React Native / Expo, builds EAS, Android/iOS, i18n, tema oscuro, testing |
| `web-dev` | Firebase hosting, SEO, landing cals2gains.com |
| `finance` | Excel + dashboard + recibos + reconciliación |
| `marketing` | Brand voice, posts IG/FB, emails, copy |
| `growth` | Métricas GA4, IG/FB, análisis, recomendaciones |
| `ops` | Coordinación, limpieza, tareas programadas, salud del sistema |
| `research` | Competidores, trends, user research |

**Sub-agentes de marketing** (en `Claude code/agents/marketing/`):
`brand-reviewer`, `caption-hashtag`, `carousel-designer`, `hook-writer`, `performance-analyzer`, `reels-scriptwriter`, `trend-scout`, `viral-strategist`

Los handoffs entre agentes se definen en `Claude code/orchestration/HANDOFFS.md`.

---

## 4. Convenciones

### Idioma y tono
- Respuestas a Judith: español, directo, sin adorno innecesario.
- Nombres de archivos, variables, código: inglés (consistente con el resto del repo).
- Commits / CHANGELOG: español, imperativo corto ("Añadir X", "Corregir Y").

### Nombres de archivos de recibos
`YYYY-MM-DD_proveedor_descripcion-corta_importe.ext`
Ejemplo: `2026-04-13_anthropic_receipt-2466-5491-6579_595eur.pdf`
Ubicación: `finances/receipts/{proveedor}/`

### Brand (resumen — detalle en `context/BRAND.md`)
- Coral `#FF6A4D` · Violet `#9C8CFF` · Orange `#FF9800` · Gold `#FFD700`
- Dark `#17121D` · Bone `#F7F2EA`
- Tipografía: Outfit (Instrument Sans para UI)
- Voz: cercana, motivadora, basada en ciencia, no condescendiente

### Tech stack (resumen — detalle en `context/TECH-STACK.md`)
- React 19.1.0, React Native 0.81.5, Expo SDK 54, Expo Router 6 (typed routes)
- Firebase 10.x (Auth, Firestore, Storage), Zustand 4.x, i18next 23.x, RevenueCat (react-native-purchases 7.x)
- Reanimated 4.1.1, Gesture Handler 2.28, Screens 4.16
- Android: compileSdk 35, targetSdk 35, minSdk 24, Kotlin 2.0.21
- iOS: deployment target 16.0, Apple Sign-In, Google Sign-In
- EAS Build (owner `civiltek`, project `381120d5-3866-4b97-af00-4c6840768327`)
- GA4 (`G-WMHZQ52NS2`, property `macrolens-ai-4c482`)

---

## 5. Qué NUNCA hacer

1. **Nunca ejecutar `rm -rf`, `git reset --hard`, `--force`, o borrados masivos sin confirmación explícita de Judith.**
2. **Nunca inventar importes, métricas, recibos o estados de build.** Si no los ves, lo dices.
3. **Nunca tocar credenciales, tokens o API keys.** No los pegues en archivos, no los pongas en CHANGELOG, no los envíes por email.
4. **Nunca publicar contenido en RRSS sin que Judith lo haya revisado** (salvo flujos automáticos ya autorizados: respuestas a comentarios IG).
5. **Nunca instalar la APK rota** (build `358414d2` — reanimated v3 incompatible). El proyecto ahora usa reanimated v4.1.1. Siempre validar que el build es uno posterior al fix del 13/04/2026.
6. **Nunca modificar `finances/Cals2Gains_Finances.xlsx` sin hacer antes copia de seguridad** en `finances/Cals2Gains_Finances_pre_update.xlsx`.
7. **Nunca borrar recibos originales (PDFs) de `finances/receipts/`.**
8. **Nunca commitear `google-services.json`, `GoogleService-Info.plist`, `.env` ni similares.**

Lista completa y detallada en `guardrails/RULES.md`.

---

## 6. Comandos frecuentes

### Slash commands (en `commands/`)
- `/status` — estado general (app, web, finanzas, RRSS)
- `/morning-brief` — briefing del día
- `/receipts` — escaneo manual de recibos
- `/metrics` — snapshot de métricas
- `/build-app` — build EAS con verificación previa
- `/deploy-web` — deploy Firebase con checks

### Bash útiles
```bash
# ADB logcat del dispositivo de pruebas (Samsung R3CR10E9LSE)
adb -s R3CR10E9LSE logcat -s ReactNativeJS:V System.err:W AndroidRuntime:E

# Build Android preview
eas build --profile preview --platform android

# Deploy web (desde raíz del proyecto)
firebase deploy --only hosting
```

---

## 7. Al terminar cualquier tarea

1. Añadir entrada a `_project-hub/CHANGELOG.md` (fecha ISO + descripción breve).
2. Si afecta a estado del proyecto → actualizar `_project-hub/PROJECT_STATUS.md`.
3. Si afecta a finanzas → actualizar `_project-hub/FINANCES.md` **y** regenerar `dashboard.html` en ambas ubicaciones (`finances/` y `_project-hub/`).
4. Si afecta a features → actualizar `_project-hub/FEATURES.md`.
5. Si afecta a screenshots → actualizar `marketing/screenshots/` + `_project-hub/SCREENSHOTS.md`.
6. Reportar a Judith en una línea: qué hiciste, qué quedó pendiente, si hay algo que confirmar.

---

## 8. Escalado a Judith

Consulta siempre antes de:
- Hacer cualquier pago, suscripción o compra.
- Publicar en RRSS (fuera de respuestas automáticas ya autorizadas).
- Enviar emails a terceros desde info@civiltek.es o cualquier otra cuenta.
- Modificar `firebase.json`, `eas.json`, `app.json`, `package.json` si el cambio puede romper builds.
- Borrar archivos del proyecto.
- Cambiar la estructura de `_project-hub/` o de `Claude code/`.

Detalle en `guardrails/ESCALATION.md`.

---

## 9. Estado inicial del sistema (al crear esta estructura)

- **Fecha creación:** 14 de abril de 2026
- **Último build Android estable:** `c00a412e` (pendiente validar tras fix reanimated v4)
- **Gasto acumulado:** 1.120,08 € (ver `_project-hub/FINANCES.md`)
- **Seguidores IG totales:** ~887 (@cals2gains 868, @cals2gains_es 11, @calstogains 8)
- **App no lanzada aún** → ingresos = 0 €
