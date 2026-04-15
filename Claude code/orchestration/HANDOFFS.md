# HANDOFFS.md — Cómo pasa trabajo un agente a otro

> Cuando un agente termina su parte y otro debe continuar, el handoff tiene que ser explícito y reproducible: qué se entrega, con qué formato, y cuándo dar por cerrado el paso.

---

## Formato estándar de handoff

Cuando un agente A pasa a un agente B, se produce una sección así (inline en la respuesta o como artefacto):

```
### Handoff: A → B
**Qué se entrega:** [lista concreta de archivos o datos]
**Contexto mínimo:** [1-3 frases con el porqué]
**Acción esperada de B:** [la siguiente operación]
**Criterio de cierre:** [qué observable indica que B terminó]
```

---

## Handoffs típicos

### app-dev → growth
Después de un release relevante.
- Entrega: build ID + features notables + fecha de publicación en store.
- B hace: capturar métricas de adopción en los 7 días siguientes.
- Cierre: snapshot añadido a METRICS.md con Δ vs pre-release.

### app-dev → marketing
Cuando hay cambio visual o feature demostrable.
- Entrega: screenshots en `marketing/screenshots/` + descripción corta ES + EN.
- B hace: preparar post/reel + actualizar CONTENT_PLAN.md.
- Cierre: draft de post listo para aprobación.

### finance → ops
Cada vez que finance modifica Excel o dashboard.
- Entrega: total mes actualizado, anomalías si las hay.
- B hace: CHANGELOG + comunicar a Judith en resumen ejecutivo.
- Cierre: entrada en CHANGELOG y mensaje a Judith.

### growth → marketing
Tras snapshot semanal.
- Entrega: top 3 / bottom 3 posts + hipótesis de qué funcionó/falló.
- B hace: ajustar plan editorial (replicar formatos ganadores, descartar los débiles).
- Cierre: CONTENT_PLAN.md actualizado.

### growth → app-dev
Cuando detecta señal de crash/uninstall alto.
- Entrega: datos de ratings + reviews negativas con errores repetidos.
- B hace: crear ticket interno en PROJECT_STATUS.md sección "Bugs Conocidos".
- Cierre: entrada en PROJECT_STATUS.md + plan de fix.

### finance → research
Cuando detecta cargo anómalo o pricing inesperado.
- Entrega: proveedor + importe + fecha + URL del portal.
- B hace: investigar cambio de pricing, uso excesivo, error de cobro.
- Cierre: informe en `docs/research/` con hallazgo + recomendación.

### marketing → app-dev
Cuando el copy necesita que una feature esté lista o visible.
- Entrega: lista de features necesarias + deadline del post.
- B hace: confirmar estado en FEATURES.md o adelantar fix pequeño.
- Cierre: FEATURES.md refleja estado real.

### research → cualquiera
Informes entregados en `docs/research/YYYY-MM-DD_tema.md`.
- Cierre: destinatario confirma lectura + aplica o descarta recomendación.

### legal → web-dev
Cuando hay cambios en textos legales (privacy.html, terms.html, aviso legal, cookies).
- Entrega: archivos HTML actualizados + confirmación de Judith obtenida (R16).
- B hace: deploy via `firebase deploy --only hosting` (W5).
- Cierre: URL accesible con contenido actualizado + fecha de "Última actualización" correcta.

### legal → app-dev
Cuando se necesita implementar funcionalidad legal in-app.
- Entrega: requisito específico (ej. "pantalla de eliminación de cuenta", "consentimiento explícito para datos de salud", "centro de privacidad").
- B hace: implementar la feature + actualizar FEATURES.md.
- Cierre: feature funcional + legal verifica que cumple el requisito.

### legal → finance
Cuando una acción legal tiene implicación de coste.
- Entrega: servicio o asesor necesario + coste estimado si se conoce.
- B hace: registrar en seguimiento financiero + escalar a Judith (R9).
- Cierre: Judith aprueba/rechaza el gasto.

### finance → legal
Cuando se detecta un contrato o DPA que requiere revisión legal.
- Entrega: proveedor + documento/enlace al contrato + contexto (qué datos se comparten).
- B hace: revisar cláusulas de protección de datos + actualizar LEGAL.md.
- Cierre: estado del DPA documentado en LEGAL.md.

### legal → research
Cuando se necesita investigar cambio normativo o requisito de mercado nuevo.
- Entrega: tema a investigar (ej. "requisitos AI Act para apps de nutrición", "Data Safety Section formato 2026").
- B hace: investigar + informe en `docs/research/`.
- Cierre: informe entregado, legal aplica hallazgos.

---

## Reglas de handoff

1. **No hay handoff tácito.** Si un agente no anota explícitamente que pasa a otro, el trabajo se considera suyo hasta cerrarse.
2. **El que recibe confirma.** Al recoger el handoff, B escribe una línea tipo "recogido de A: [X]" en CHANGELOG.
3. **Cierre es verificable.** Ambiguo ("cuando esté listo") no vale — siempre un criterio observable (archivo actualizado, build en estado verde, métrica presente).
4. **Si B no puede aceptar** (bloqueado, falta info), devuelve el handoff a A o escala a ops.
