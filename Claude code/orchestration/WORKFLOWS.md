# WORKFLOWS.md — Flujos típicos del sistema

> Cada workflow describe una secuencia de pasos con agentes/skills involucrados. Úsalos como receta. Si un paso falla, se para y se informa — no se salta.

---

## W1. Nueva factura / recibo detectado

**Disparadores:** tarea `receipt-collector` (lun/jue 8:00), llegada de email con factura, input manual "tengo una factura nueva".

1. **ops** detecta el disparador.
2. **finance** — invoca skill `download-receipt`:
   - Clasifica proveedor (anthropic, openai, google, apple, meta, expo, hosting, otros).
   - Guarda PDF en `finances/receipts/{proveedor}/` con naming `YYYY-MM-DD_proveedor_descripcion_importeEUR.pdf`.
3. **finance** — invoca skill `update-dashboard`:
   - Backup de `Cals2Gains_Finances.xlsx` → `Cals2Gains_Finances_pre_update.xlsx`.
   - Añade fila al Excel (fecha, proveedor, concepto, importe EUR, archivo).
   - Regenera `finances/dashboard.html` y copia a `_project-hub/dashboard.html`.
4. **finance** actualiza `_project-hub/FINANCES.md` (tabla de gastos + burn rate).
5. **ops** añade entrada a `_project-hub/CHANGELOG.md`.
6. **ops** reporta a Judith: proveedor, importe, total mensual actualizado.

Anomalías a señalar:
- Importe >2× media mensual del proveedor → destacar como anomalía (como pasó con Anthropic €595 el 13/04).
- Proveedor nuevo → pedir confirmación de categoría.

---

## W2. Fix de bug en la app → build → validación

**Disparador:** crash/bug reportado, o issue de regresión.

1. **app-dev** reproduce (simulador o dispositivo ADB `R3CR10E9LSE`).
2. Aplica fix en código.
3. Invoca skill `eas-build`:
   - `npx tsc --noEmit` (typecheck).
   - `npm run lint` si existe.
   - `eas build --profile preview --platform android`.
   - Anota build ID.
4. Cuando termina build, valida en dispositivo:
   - `adb -s R3CR10E9LSE uninstall com.civiltek.cals2gains` (solo si había APK rota previa).
   - Instala APK, lanza la app.
   - Invoca skill `crash-diagnosis` si hay crash.
5. **app-dev** actualiza `_project-hub/PROJECT_STATUS.md`:
   - Nuevo build ID en "Último build Android".
   - Bug a "Bugs Resueltos" con causa + fix.
6. **ops** → CHANGELOG.

---

## W3. Publicación de post en RRSS

**Disparador:** Judith dice "publicar post X", o hueco en calendario de `CONTENT_PLAN.md`.

1. **marketing** toma el draft desde `marketing/Campaign_F1/` o del input de Judith.
2. Aplica brand voice (ver `context/BRAND.md` + `_project-hub/BRAND.md`).
3. Invoca skill `publish-post`:
   - Verifica imagen / vídeo disponible en `marketing/`.
   - Prepara copy ES o EN según cuenta.
   - Prepara hashtags y mención.
4. **Presenta a Judith para aprobación explícita** (R6 — nunca publicar sin revisión).
5. Al aprobarse: Judith programa en MBS o Claude abre el flujo en Chrome MCP para que ella confirme la publicación.
6. **marketing** anota en `_project-hub/CONTENT_PLAN.md` (post publicado, fecha, cuenta).
7. **ops** → CHANGELOG.

---

## W4. Métricas semanales

**Disparador:** tarea `c2g-weekly-metrics` (lunes), o `/metrics` manual.

1. **growth** invoca skill `weekly-metrics`:
   - GA4 (`G-WMHZQ52NS2`, property `macrolens-ai-4c482`) → usuarios 7d, fuentes, páginas top.
   - IG insights (@cals2gains, @cals2gains_es, @calstogains) → seguidores, alcance, engagement.
   - FB insights (EN + ES) → seguidores, alcance.
   - Play Console / App Store (cuando haya acceso) → descargas.
2. **growth** compila snapshot en `_project-hub/METRICS.md` con fecha.
3. **growth** genera análisis corto:
   - Δ vs semana anterior.
   - Top 3 posts por engagement.
   - Recomendaciones accionables (máx. 3).
4. **ops** → CHANGELOG + resumen a Judith.

---

## W5. Deploy de la web

**Disparador:** cambios en `public/`, `website/`, SEO updates, privacy/terms.

1. **web-dev** revisa cambios (`git status`, diff).
2. Check previo:
   - HTML válido (linter si disponible).
   - Meta tags SEO presentes (title, description, og:*).
   - Favicon y og:image accesibles.
   - GA4 tag en `<head>` si procede.
3. `firebase deploy --only hosting --project cals2gains`.
4. Verifica `https://cals2gains.web.app` responde 200 y refleja cambios.
5. Actualiza `_project-hub/SEO_REPORT.md` si hubo cambios SEO.
6. **ops** → CHANGELOG.

---

## W6. Morning brief

**Disparador:** `/morning-brief` o Judith dice "buenos días".

1. **ops** compila en paralelo:
   - Último build Android / iOS + estado (app-dev consulta `PROJECT_STATUS.md`).
   - Gasto acumulado + burn rate (finance).
   - Seguidores IG/FB + Δ 24h (growth).
   - Tareas programadas que corren hoy.
   - Pendientes abiertos marcados `⚠️` en el hub.
2. **ops** entrega a Judith: una sección por área, máx. 5 líneas cada una.

---

## W7. Limpieza semanal del workspace

**Disparador:** tarea `limpieza-cowork-semanal`.

1. **ops** revisa `/sessions/*/mnt/outputs/` → archivos >30 días sin referencia en el hub.
2. No borra — genera lista de candidatos y pide confirmación a Judith.
3. Archivos de recibos **NUNCA se borran** (R3).
4. Al aprobarse borrado → **ops** lo ejecuta y lo registra en CHANGELOG.

---

## W9. Content production cycle (reels + carruseles IG)

**Disparador:** Judith dice "hazme un reel/carrusel sobre X" · hueco en `_project-hub/CONTENT_PLAN.md` · `performance-analyzer` recomienda repetir un ángulo ganador.

> Flujo detallado en `orchestration/CONTENT-PIPELINE.md`. Aquí el resumen para que sea scan-able junto al resto de workflows.

0. **trend-scout** (corre en segundo plano lun/jue 09:30) mantiene `context/TREND-INSIGHTS.md` al día. Todos los subagentes lo leen antes de producir.
1. **viral-strategist** lee BRAND + BENCHMARKS + TREND-INSIGHTS + ACCOUNTS + RULES + FEATURES → produce **Content Brief** (cuenta, idioma, formato, pilar, ángulo, insight aplicado).
2. **hook-writer** genera 3 variantes de hook (A/B/C) y recomienda una.
3. Según formato:
   - **reels-scriptwriter** → script con shot list, timing, overlays, audio.
   - **carousel-designer** → spec slide-por-slide con copy + diseño.
4. **caption-hashtag** → caption final + hashtags por cuenta (respeta rol: `@calstogains` replica, `@cals2gains_es` nativo ES).
5. **brand-reviewer** → valida contra RULES + ANTI-PATTERNS + BRAND. Si rechaza, devuelve al subagente responsable (máx. 3 iteraciones antes de escalar).
6. **Aprobación Judith** (punto único humano): paquete compacto con preview, caption, hashtags, hora sugerida. Responde apruebo / cambios / rechazar. R6 siempre.
7. Judith (o Chrome MCP bajo su control) programa en MBS. **marketing** anota en `CONTENT_PLAN.md`. **ops** → CHANGELOG.
8. **performance-analyzer** (+48-72h) genera Performance Digest → alimenta `trend-scout` + próximo brief de `viral-strategist`.

Reglas clave: R1 (nada inventado), R6 (nunca publicar sin aprobación explícita), AP9 (no promocionar features inactivas), AP10 (no traducir literal entre idiomas).

---

## W8. Escaneo de respuestas a comentarios IG

**Disparador:** tarea `instagram-comment-replies` (2×/día).

1. Skill legado `skills/instagram-commenter/` (autorizado por R6 excepción).
2. Si responde a comentario "sensible" (queja, pregunta técnica, duda nutricional específica) → deja flag y no responde automáticamente, espera revisión.
3. **marketing** revisa al día siguiente lo flaggeado.
4. Registro en `_project-hub/METRICS.md` — sección comentarios.

---

## W10. Auditoría legal

**Disparador:** comando `/legal-check`, pre-lanzamiento en stores, feature nueva que recopila datos, revisión trimestral.

1. **legal** activa skill `legal-audit`.
2. Escanea código fuente → inventario de datos personales tratados.
3. Audita `privacy.html` contra datos reales (¿cubre todo?).
4. Audita `terms.html` (disclaimers, jurisdicción, IA).
5. Verifica requisitos de stores (eliminación de cuenta, data safety, permisos).
6. Verifica requisitos web LSSI (aviso legal, cookies, impressum).
7. Compara copias de textos legales entre ubicaciones (deben ser idénticas).
8. Genera informe priorizado (🔴 crítico / 🟡 importante / 🟢 mejora).
9. **legal** actualiza `_project-hub/LEGAL.md`.
10. **ops** → CHANGELOG.
11. Reporta a Judith con prioridades y acciones requeridas.

Handoffs posibles:
- Si hay cambios en HTML → handoff a `web-dev` para deploy.
- Si falta feature in-app (ej. eliminación de cuenta) → handoff a `app-dev`.
- Si hay coste (ej. DPA de pago, asesor externo) → handoff a `finance`.

---

## W11. Reporte financiero mensual

**Disparador:** comando `/finance-report`, final de mes (1–3 del siguiente), petición de Judith.

1. **finance** activa skill `reconciliation`:
   - Cruza filas del Excel con recibos en `finances/receipts/`.
   - Cruza suscripciones activas con cobros del mes.
   - Lista discrepancias.
2. **finance** activa skill `financial-report`:
   - Calcula totales, desglose por proveedor, desglose por tipo.
   - Variación vs mes anterior.
   - Burn rate recurrente.
   - Detecta anomalías.
   - Genera proyecciones (si hay ≥2 meses de datos).
   - Produce hasta 3 recomendaciones.
3. **finance** genera reporte en `finances/reports/YYYY-MM_financial-report.md`.
4. **finance** invoca skill `update-dashboard` (regenera HTML en ambas ubicaciones).
5. **finance** actualiza `_project-hub/FINANCES.md`.
6. **ops** → CHANGELOG.
7. Reporta a Judith: resumen ejecutivo con gasto total, burn rate, anomalías, reconciliación.

---

## W12. EIPD / DPIA para nueva feature

**Disparador:** feature nueva que trata datos personales sensibles (ej. voice logging, progress photos, health data).

1. **legal** evalúa la feature:
   - ¿Qué datos nuevos se recopilan?
   - ¿Cuál es la base legal?
   - ¿Hay transferencia internacional?
   - ¿Qué riesgos para los derechos del usuario?
2. **legal** consulta con `app-dev` la implementación técnica.
3. **legal** genera EIPD en `docs/legal/YYYY-MM-DD_dpia_[feature].md`.
4. Si el riesgo es alto → escalar a Judith + recomendar consulta con asesor legal.
5. **legal** actualiza `_project-hub/LEGAL.md`.
6. **ops** → CHANGELOG.

---

## Pendiente de confirmar con Judith

- ⚠️ ¿Frecuencia ideal del `/morning-brief`? (Propuesta: manual, no automático.)
- ⚠️ ¿Qué hacer con emails de facturación que aparecen en `info@civiltek.es` (cuenta CIVILTEK general, no Cals2Gains)? ¿Reenviar? ¿Ignorar?
- ⚠️ Umbral exacto de "anomalía" en gastos (propuesta: >2× media mensual del proveedor).
- ⚠️ ¿Frecuencia de auditoría legal? (Propuesta: trimestral + antes de cada release en stores.)
- ⚠️ ¿Tiene CivilTek asesor legal externo para consultas complejas?
