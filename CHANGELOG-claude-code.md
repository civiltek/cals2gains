# CHANGELOG — Sistema "Claude code"

> Cambios mayores en la estructura de agentes, skills, comandos y reglas. Para cambios del producto / del proyecto Cals2Gains → `_project-hub/CHANGELOG.md`.

---

## 2026-04-14 — Creación inicial del sistema
- Se crea la carpeta `Claude code/` en la raíz del proyecto.
- Estructura base completa:
  - `CLAUDE.md` — reglas globales + punto de entrada.
  - 7 agentes en `agents/`: app-dev, web-dev, finance, marketing, growth, ops, research.
  - 6 skills en `skills/`: update-dashboard, download-receipt, publish-post, crash-diagnosis, eas-build, weekly-metrics.
  - 6 slash commands en `commands/`: `/status`, `/receipts`, `/deploy-web`, `/build-app`, `/metrics`, `/morning-brief`.
  - `orchestration/` con WORKFLOWS.md, HANDOFFS.md, scheduled-tasks-map.md.
  - `guardrails/` con RULES.md (15 reglas), ANTI-PATTERNS.md (15 patrones), ESCALATION.md.
  - `context/` con PROJECT-OVERVIEW, BRAND, TECH-STACK, ACCOUNTS, FINANCES-OVERVIEW.
  - `memory/MEMORY-STRUCTURE.md`.
- Decisiones clave documentadas en este changelog:
  - **R7** explícita: jamás instalar APK `358414d2` (reanimated v3 roto).
  - **R2** explícita: backup del Excel siempre antes de modificar.
  - **Doble copia** del dashboard (finances/ + _project-hub/) como invariante.
  - **R6**: publicación en RRSS requiere aprobación explícita (excepción: comentarios IG automáticos autorizados).
- Pendientes marcados con ⚠️ a confirmar con Judith, documentados en archivos correspondientes.
