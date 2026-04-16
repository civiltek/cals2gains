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

---

## Reglas de handoff

1. **No hay handoff tácito.** Si un agente no anota explícitamente que pasa a otro, el trabajo se considera suyo hasta cerrarse.
2. **El que recibe confirma.** Al recoger el handoff, B escribe una línea tipo "recogido de A: [X]" en CHANGELOG.
3. **Cierre es verificable.** Ambiguo ("cuando esté listo") no vale — siempre un criterio observable (archivo actualizado, build en estado verde, métrica presente).
4. **Si B no puede aceptar** (bloqueado, falta info), devuelve el handoff a A o escala a ops.
5. **Contexto compartido actualizado — condición de cierre.** El handoff **NO se considera cerrado** hasta que el agente que entrega haya actualizado `Claude code/context/SHARED-CONTEXT.md` en la sección que le corresponde. Si el cambio modifica el estado del proyecto (nueva feature, deploy, publicación RRSS, nuevo build en store, gasto nuevo), la actualización de `SHARED-CONTEXT.md` es obligatoria antes de pasar el trabajo a B.
