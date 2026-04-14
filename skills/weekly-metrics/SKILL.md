# Skill: weekly-metrics

> Compila snapshot semanal de métricas multi-canal y actualiza `_project-hub/METRICS.md`.

## Triggers
- Tarea programada `c2g-weekly-metrics` (lunes).
- Comando `/metrics`.
- Post-release importante.

## Canales a capturar

### GA4 (web)
- Property: `macrolens-ai-4c482`
- Tag: `G-WMHZQ52NS2` (⚠️ pendiente de instalar en landing — señalar en cada snapshot hasta que esté)
- Métricas: usuarios 7d, sesiones, fuentes principales, páginas top.

### Instagram
- @cals2gains (EN): seguidores, alcance 7d, engagement, top 3 posts.
- @cals2gains_es (ES): idem.
- @calstogains: idem (cuenta antigua).

### Facebook
- FB EN y FB ES: seguidores, alcance, posts del periodo.

### Stores
- Google Play Console: descargas, ratings (⚠️ acceso pendiente con cuenta correcta).
- App Store Connect: — (app aún no publicada).

## Pasos

1. **Abrir Chrome MCP** en sesión de Judith (ella debe estar logueada).
2. Para cada canal → navegar a insights / analytics → capturar métricas listadas.
3. Anotar fecha de captura exacta.
4. Calcular deltas vs snapshot anterior (si existe en `METRICS.md`).
5. Identificar top 3 / bottom 3 posts por engagement (si aplica).
6. Escribir sección nueva en `_project-hub/METRICS.md` con:
   - Fecha.
   - Tabla por canal con valor + Δ%.
   - Top 3 / Bottom 3.
   - 1-3 recomendaciones accionables.
   - Anomalías (⚠️).
7. CHANGELOG.
8. Reportar a Judith en 5 líneas máximo.

## Reglas
- R1: si un canal no responde, lo reportas. No estimas.
- Máximo 3 recomendaciones. Que sean accionables.
- Nunca sobrescribir snapshots antiguos — siempre añadir nuevo bloque.
- Señalar en cada snapshot que GA4 aún no recibe datos hasta que el tag esté instalado.

## Verificación
- [ ] Todos los canales accesibles intentados.
- [ ] Errores de acceso anotados explícitamente.
- [ ] Δ vs semana anterior calculado.
- [ ] Recomendaciones presentes y accionables.
- [ ] CHANGELOG.
