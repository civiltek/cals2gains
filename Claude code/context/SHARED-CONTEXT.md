# SHARED-CONTEXT.md — Contexto compartido entre agentes

> Este archivo recoge estado y acuerdos que todos los agentes deben conocer. Lo mantiene **ops** y lo actualizan los agentes responsables de cada sección tras cada cambio relevante.

---

## RRSS — Estado y gobernanza del plan de contenido

### Cuentas activas
| Cuenta | Idioma | Seguidores (~abr 2026) | Rol |
|--------|--------|------------------------|-----|
| @cals2gains | EN | ~868 | Principal EN, contenido original |
| @cals2gains_es | ES | ~11 | Nativo ES, no traducción literal |
| @calstogains | EN | ~8 | Replica y amplifica @cals2gains |

### Plan de contenido — actualización automática

El plan de contenido (`_project-hub/CONTENT_PLAN.md`) se actualiza automáticamente en dos ciclos:

1. **Tras merge de features nuevas (W15):** app-dev notifica a marketing las features mergeadas. viral-strategist consulta `TREND-INSIGHTS.md` para decidir el formato óptimo por feature (reel/carrusel/story/serie) antes de planificar piezas. marketing actualiza CONTENT_PLAN.md con piezas priorizadas por potencial viral y diferenciador vs competencia.

2. **Semanalmente según métricas e insights (W16):** growth entrega a marketing el Performance Digest (incluyendo apartado "Formatos y tendencias virales"). marketing ajusta CONTENT_PLAN.md según ángulos ganadores/perdedores, horarios óptimos y ratio de formatos. trend-scout actualiza TREND-INSIGHTS.md con los formatos que están funcionando (carrusel vs reel, duración, hooks, estilos visuales, audios trending) y notifica a marketing de tendencias virales emergentes.

**marketing y growth son co-responsables de mantener CONTENT_PLAN.md alineado con la realidad.** ops es responsable de mantener este archivo actualizado.

### Formatos y tendencias (actualizar tras cada W16)
- Última actualización: pendiente (primer ciclo W16 por ejecutar)
- Formato con mejor rendimiento actual: —
- Duración óptima de reels: —
- Hooks que convierten: —
- Audios trending: —

---

## Métricas — referencia rápida

- **GA4:** `G-WMHZQ52NS2`, property `macrolens-ai-4c482`
- **Snapshot semanal:** `_project-hub/METRICS.md`
- **Performance Digest:** generado por performance-analyzer (+48-72h tras publicación)

---

*Última actualización: 2026-04-16 — Creación inicial con sección RRSS tras incorporar W15 y W16.*
