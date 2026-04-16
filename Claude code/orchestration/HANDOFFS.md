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
Cuando hay cambio visual o feature demostrable (W3 / ad-hoc).
- Entrega: screenshots en `marketing/screenshots/` + descripción corta ES + EN.
- B hace: preparar post/reel + actualizar CONTENT_PLAN.md.
- Cierre: draft de post listo para aprobación.

### app-dev → marketing (W15)
Cuando se mergean features nuevas visibles para el usuario (como parte de W10 paso 6c).
- Entrega: lista de features mergeadas + screenshots en `marketing/screenshots/` + público objetivo por feature.
- B hace: consultar TREND-INSIGHTS.md para elegir formato óptimo por feature (reel/carrusel/story/serie), planificar piezas en CONTENT_PLAN.md con cuenta destino, formato, pilar y fecha sugerida.
- Cierre: CONTENT_PLAN.md actualizado con piezas sobre las features nuevas, validadas por viral-strategist.

### finance → ops
Cada vez que finance modifica Excel o dashboard.
- Entrega: total mes actualizado, anomalías si las hay.
- B hace: CHANGELOG + comunicar a Judith en resumen ejecutivo.
- Cierre: entrada en CHANGELOG y mensaje a Judith.

### growth → marketing
Tras snapshot semanal (W4 ad-hoc).
- Entrega: top 3 / bottom 3 posts + hipótesis de qué funcionó/falló.
- B hace: ajustar plan editorial (replicar formatos ganadores, descartar los débiles).
- Cierre: CONTENT_PLAN.md actualizado.

### growth → marketing (W16)
Tras métricas semanales (W4) o Performance Digest (W9 paso 8) o anomalía detectada (3 piezas underperforming / pico viral inesperado).
- Entrega: Performance Digest con métricas por cuenta (alcance, engagement, saves, shares), ángulos ganadores/perdedores, horarios óptimos, y apartado "Formatos y tendencias virales" (carrusel vs reel, duración de reels, tipos de hooks que convierten, estilos visuales, audios trending).
- B hace: ajustar CONTENT_PLAN.md según datos (priorizar ángulos >1.5× media, descartar ángulos con 3 piezas bajo media, ajustar horarios y ratio de formatos).
- Cierre: CONTENT_PLAN.md ajustado a métricas reales + TREND-INSIGHTS.md actualizado por trend-scout con los formatos que funcionan.

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
