# Claude code — Sistema operativo de Cals2Gains

> Carpeta raíz del sistema de agentes, skills, comandos y reglas que operan el proyecto Cals2Gains para Judith.

---

## Punto de entrada

**Lee primero:** [`CLAUDE.md`](./CLAUDE.md) — reglas globales, rutas clave, convenciones.

Si llegas nuevo a este proyecto, el orden recomendado es:

1. `CLAUDE.md` — reglas y mapa general.
2. `guardrails/RULES.md` — lo que NUNCA se hace.
3. `context/PROJECT-OVERVIEW.md` — qué es Cals2Gains.
4. `orchestration/WORKFLOWS.md` — flujos típicos.
5. Agente(s) correspondientes a tu tarea en `agents/`.

---

## Estructura

```
Claude code/
├── README.md                     ← este archivo (índice visual)
├── CLAUDE.md                     ← reglas globales (PUNTO DE ENTRADA)
├── CHANGELOG.md                  ← log de cambios de este sistema
│
├── agents/                       ← subagentes especializados
│   ├── app-dev.md                ← React Native / Expo / EAS
│   ├── web-dev.md                ← Firebase hosting / SEO
│   ├── finance.md                ← Excel, dashboard, recibos
│   ├── marketing.md              ← Brand voice, posts, copy
│   ├── growth.md                 ← Analítica GA4 / IG / FB / stores
│   ├── ops.md                    ← Coordinación, CHANGELOG, salud
│   └── research.md               ← Competidores, trends, user research
│
├── skills/                       ← skills reutilizables
│   ├── update-dashboard/         ← regenera dashboard desde Excel
│   ├── download-receipt/         ← archiva recibos con naming canónico
│   ├── publish-post/             ← flujo de publicación IG/FB
│   ├── crash-diagnosis/          ← diagnóstico ADB Android
│   ├── eas-build/                ← build EAS con validación
│   └── weekly-metrics/           ← snapshot semanal multi-canal
│
├── commands/                     ← slash commands
│   ├── status.md
│   ├── receipts.md
│   ├── deploy-web.md
│   ├── build-app.md
│   ├── metrics.md
│   └── morning-brief.md
│
├── orchestration/                ← coordinación entre agentes y tareas
│   ├── WORKFLOWS.md              ← flujos típicos paso a paso
│   ├── HANDOFFS.md               ← cómo pasa trabajo un agente a otro
│   └── scheduled-tasks-map.md    ← mapa de tareas programadas
│
├── guardrails/                   ← reglas y criterios de parada
│   ├── RULES.md                  ← 15 reglas inquebrantables
│   ├── ANTI-PATTERNS.md          ← errores comunes y cómo evitarlos
│   └── ESCALATION.md             ← cuándo preguntar vs actuar
│
├── context/                      ← info de dominio
│   ├── PROJECT-OVERVIEW.md       ← qué es Cals2Gains
│   ├── BRAND.md                  ← voz, colores, tipografía
│   ├── TECH-STACK.md             ← stack técnico
│   ├── ACCOUNTS.md               ← mapa de cuentas (sin credenciales)
│   └── FINANCES-OVERVIEW.md      ← arquitectura del sistema financiero
│
└── memory/
    └── MEMORY-STRUCTURE.md       ← cómo organizar la memoria persistente
```

---

## Cómo extender

### Añadir un agente
1. Crear `agents/<nombre>.md` siguiendo la misma plantilla (rol, alcance, inputs, outputs, herramientas, delegación, reglas específicas, checklist).
2. Actualizar `CLAUDE.md` §3 con el nuevo agente.
3. Añadir handoffs relevantes en `orchestration/HANDOFFS.md`.
4. CHANGELOG.

### Añadir una skill
1. Crear carpeta `skills/<nombre>/` con `SKILL.md` (triggers, pasos, reglas, verificación).
2. Referenciar desde el agente que la usa.
3. CHANGELOG.

### Añadir un comando
1. Crear `commands/<nombre>.md` con frontmatter `description`.
2. Describir pasos y qué agente lo ejecuta.
3. CHANGELOG.

### Añadir una tarea programada
1. Usar `mcp__scheduled-tasks__create_scheduled_task`.
2. Documentar en `orchestration/scheduled-tasks-map.md`.
3. CHANGELOG.

---

## Regla de oro visual

Todo lo que este sistema hace se resume en tres pasos:

**LEER** (hub + archivos relevantes) → **ACTUAR** (dentro de los guardrails) → **DEJAR RASTRO** (CHANGELOG + actualizar hub).

---

## Conectado con

- `_project-hub/` — fuente de verdad pública del proyecto (estado, features, finanzas, métricas).
- `/sessions/*/mnt/.auto-memory/` — memoria persistente de Cowork.
- MCPs: Outlook (civiltek), IMAP (4 instancias), Gmail, Chrome, Computer-use, Scheduled tasks, PDF viewer.
- Tareas programadas: `receipt-collector`, `c2g-weekly-metrics`, `instagram-comment-replies`, `limpieza-cowork-semanal`, etc.

---

## Estado inicial

**Creado:** 14 de abril de 2026.
**Último update:** ver `CHANGELOG.md`.
**Propietaria:** Judith (info@civiltek.es) — CivilTek.
