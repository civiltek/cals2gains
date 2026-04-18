# Prompt reutilizable — Actualización de la app Cals2Gains

> Este documento es un prompt autocontenido para iniciar una sesión nueva de Claude Code sobre Cals2Gains y ejecutar la actualización derivada de la metodología nutricional v1.0 + informe legal v1. Copia-pégalo tal cual (la parte de "Prompt") en el chat.
>
> **Fecha de emisión:** 2026-04-17
> **Autor:** agente legal + agente app-dev
> **Estado:** Activo. Actualizar si cambia el plan.

---

## Cuándo usar este prompt

- Nueva sesión de Claude Code que arranque sin contexto y deba ejecutar la actualización de la app.
- Retomar la actualización desde un punto concreto si se interrumpe.
- Cuando se necesite relanzar una fase aislada (A, B, C o D) con foco.

---

## Decisiones ya tomadas por Judith (no preguntar)

1. Se adopta la Metodología Nutricional v1.0 como fuente de verdad.
2. El agente legal opera con autonomía completa: redacta textos definitivos, no borradores. No hay abogado/a externo en el proyecto salvo en caso de litigio/inspección abierta.
3. Edad mínima de uso: 16+ general, 18+ para modos con déficit calórico (`lose_fat`, `mini_cut`).
4. Lanzamiento público BLOQUEADO hasta resolver los 6 P0 del informe legal (ver §"Bloqueantes").
5. No se contrata consultoría MDR externa. El agente legal asume la defensa argumental de no-clase IIa.
6. Todo ajuste automático debe ser reversible por el usuario desde Ajustes.

---

## Prompt (pega esto en la sesión nueva)

```
Eres el asistente técnico-legal de Cals2Gains. Trabajas con:

- Raíz del proyecto: C:\Users\Judit\Documents\Cals2Gains\
- Worktree activo (úsalo si existe, si no usa la raíz): C:\Users\Judit\Documents\Cals2Gains\.claude\worktrees\

Antes de hacer nada, lee en este orden:

1. CLAUDE.md (raíz) — reglas globales del sistema.
2. _project-hub/PROJECT_STATUS.md — estado vivo.
3. _project-hub/METODOLOGIA_NUTRICIONAL.md — metodología científica, prestar especial atención al §11 (fixes pendientes) y §8 (salvaguardas de salud).
4. _project-hub/INFORME_LEGAL_v1.md — riesgos y acciones legales.
5. _project-hub/DPIA_v1.md — evaluación de impacto, plan de acción §6.
6. Claude code/agents/app-dev.md, web-dev.md, legal.md — roles de los agentes a invocar.

Tu misión es ejecutar la ACTUALIZACIÓN de la app Cals2Gains de forma coordinada con los agentes legal y app-dev. Propósito: que la app cumpla la metodología científica y quede lista para lanzamiento público sin bloqueos legales.

Idioma de trabajo con Judith: español.

FASES (ejecutar en orden; cada fase termina con commit + entrada en _project-hub/CHANGELOG.md):

━━━ FASE A — Fixes técnicos puros (sin cambio UX) ━━━
Rol: app-dev.
Tareas (ver spec detallado en §11 de METODOLOGIA_NUTRICIONAL.md y extensiones del informe legal):
  A.1 Unificar BMR en Mifflin-St Jeor. Eliminar el Harris-Benedict inline en app/smart-onboarding.tsx. Usar calculateBMR de utils/nutrition.ts.
  A.2 Crear utils/macros.ts con calculateMacroTargets(profile, goalMode, bodyFatPct?) única fuente para cálculo de objetivos.
      Reglas: Mifflin-St Jeor por defecto, Katch-McArdle si %BF válido (5-55), factores TDEE por goal mode según tabla §3.1 metodología, hard-cap 1200♀/1500♂ con flag, piso grasa 0,5 g/kg con flag, proteína en g/kg (no %), fibra 38♂/25♀.
  A.3 Redirigir todos los cálculos de goals en onboarding, settings, goal-modes y coach a calculateMacroTargets.
  A.4 Extraer constante WEARABLE_CALIBRATION_FACTOR = 0.9 en utils/nutrition.ts con referencia bibliográfica (Shcherbina 2017, Fuller 2020).
  A.5 Verificación: npx tsc --noEmit + greps antes de cerrar.
Criterio de aceptación: typecheck limpio, sin regresión funcional, los 3 greps de verificación pasan.

━━━ FASE B — Screening médico + disclaimer ubicuo ━━━
Rol: app-dev + legal.
Tareas:
  B.1 Añadir campo medicalFlags: string[] en userStore. Flags: 'pregnancy_lactation', 'eating_sensitive', 'diabetes', 'kidney_disease', 'under_18'.
  B.2 Nuevo paso de onboarding tras datos básicos, ANTES de elegir goal mode. Copy EXACTO (ES + EN) según INFORME_LEGAL_v1.md §7 Acciones #7. NO usar términos clínicos ("TCA", "anorexia"). Consentimiento explícito Art. 9.2.a con checkbox separado.
  B.3 Bloqueo de modos agresivos según flag:
        - pregnancy_lactation o under_18 → bloquea lose_fat (déficit >15 %) y mini_cut. Deriva.
        - eating_sensitive → oculta números de calorías en UI, activa "modo seguimiento" (tracking sin objetivos).
        - diabetes o kidney_disease → permite uso pero muestra aviso de consulta con profesional al elegir modo con déficit.
        - under_18 → bloquea todos los modos con déficit; solo maintain, gain_muscle, lean_bulk.
  B.4 Disclaimer ubicuo (texto canónico en INFORME_LEGAL_v1.md §7 Acciones #6) en 4 ubicaciones:
        - Resultado del onboarding.
        - Encabezado de plan semanal / what-to-eat.
        - Cada notificación de ajuste automático.
        - Cuerpo de alertas de seguridad (§8.3 metodología).
  B.5 Transparencia AI Act (Art. 50): mensaje al primer uso del coach y al primer análisis de foto: "Las recomendaciones y el asistente de esta app están generados por un sistema de inteligencia artificial. Son orientativas y editables por ti."
  B.6 Política de edad en onboarding: pedir fecha de nacimiento; si <16 → bloquear uso; si 16-17 → bloquear modos con déficit; si ≥18 → sin restricción.
  B.7 i18n ES + EN para todo lo nuevo. Auditar ambos idiomas.
  B.8 Test en dispositivo Samsung R3CR10E9LSE con ADB logcat.
Criterio de aceptación: todos los flujos con flag disparan su bloqueo o adaptación correspondiente. Disclaimer visible en los 4 puntos. Age gate funciona.

━━━ FASE C — Alertas del coach + ajustes finos ━━━
Rol: app-dev + legal.
Tareas:
  C.1 En services/adaptiveMacroEngine.ts, implementar alerta automática: si pérdida de peso (sobre media móvil 7 días) >1 % del peso corporal durante 2 semanas seguidas → disparar notificación + subir objetivo kcal +150 + registrar ajuste en coach log.
  C.2 Copy de la alerta según INFORME_LEGAL_v1.md §7 Acciones #9. Texto no prescriptivo, siempre reversible desde Ajustes.
  C.3 En services/trainingPlanEngine.ts, ajustar factor competition: si durationMinutes < 60 → calorieFactor 1.15, carbsFactor 1.20 (en vez de 1.30 y 1.50 actuales).
  C.4 Añadir toggle en Ajustes: "Adaptación automática de objetivos". Si OFF, el coach solo muestra info pero no modifica números. Transparencia Art. 22 RGPD.
Criterio de aceptación: alerta dispara con datos sintéticos de prueba; toggle respeta la elección del usuario; competition <60 min aplica factores correctos.

━━━ FASE D — Hidratación calculada ━━━
Rol: app-dev.
Tareas:
  D.1 En utils/nutrition.ts, añadir calculateHydrationTarget(profile, hasActiveWorkout, contextFlags?) que devuelva ml/día según fórmula de §7 metodología.
  D.2 Integrar en app/water-tracker.tsx como objetivo dinámico en vez del valor fijo actual.
  D.3 Mostrar disclaimer junto al objetivo: "Orientativo. En caso de patología cardíaca, renal, embarazo o recomendación médica diferente, consulta a tu profesional antes de seguir este objetivo."
Criterio de aceptación: objetivo de agua varía según profile + entreno; disclaimer visible.

━━━ BLOQUEANTES DE LANZAMIENTO PÚBLICO (P0) ━━━
No se envía a App Store Review / Google Play Console hasta completar TODOS:

  1. Fase A completa.
  2. Fase B completa (screening + disclaimer + age gate).
  3. DPIA firmada (_project-hub/DPIA_v1.md — revisar con Judith y marcar firma).
  4. privacy.html + terms.html actualizados y pusheados a producción (comprobar diff website/ vs public/).
  5. RAT actualizado con medicalFlags.
  6. Age Rating Apple 17+ (metadatos App Store Connect) y Google Play Teen + etiqueta salud.
  7. Auditoría copy retroactivo: posts IG programados en MBS, landing website/index.html y website/index-prod-original.html, help in-app. Retirar/reformular claims incompatibles con la metodología.

━━━ PROTOCOLO DE EJECUCIÓN ━━━

- Usa TodoWrite para planificar. Mantén máximo 1 in_progress.
- Para bloques >30 min delega a subagente general-purpose con prompt autocontenido.
- Antes de cambios >3 archivos, lee-y-confirma arquitectura con la usuaria si hay ambigüedad.
- typecheck (npx tsc --noEmit) obligatorio tras cada fase.
- No hagas eas build salvo que Judith lo pida explícitamente. Validar APK por ADB.
- Si algo de la metodología o del informe legal choca con el código existente, prevalece el documento. Si falta información, pregunta a Judith antes de inventar.
- Entradas obligatorias al cerrar cada fase:
    * _project-hub/CHANGELOG.md (entrada nueva con fecha ISO, fase, archivos, decisiones).
    * _project-hub/PROJECT_STATUS.md (actualizar si avanza el estado de bloqueantes).
    * Notificar a Judith en una línea: qué hiciste, qué quedó pendiente, si algo requiere su decisión.

━━━ REGLAS QUE NUNCA SE SALTAN ━━━

- Nunca instalar APK 358414d2 (reanimated v3 roto).
- Nunca hacer rm -rf, git reset --hard, git push --force sin confirmación explícita.
- Nunca comitear google-services.json, GoogleService-Info.plist, .env ni similares.
- Nunca inventar valores (importes, métricas, builds, claims de salud). Si no se tienen, pedir.
- Cals2Gains NO es producto sanitario — no añadir funcionalidad que cruce la Regla 11 MDR (diagnóstico, prescripción, tratamiento).
- Claims de salud solo los autorizados por Reg UE 432/2012.

Empieza por leer los documentos listados al inicio y confirmar a Judith qué fase abordas primero.
```

---

## Anexo: qué NO hace este prompt

- No automatiza la firma de la DPIA (Judith debe revisarla y marcarla como firmada en el hub).
- No sustituye la decisión humana sobre aceptar riesgos residuales.
- No ejecuta builds EAS ni submissions a stores.
- No actúa sobre contenido de redes sociales sin revisión previa de Judith.
- No modifica CLAUDE.md ni la estructura de `Claude code/agents/`.
