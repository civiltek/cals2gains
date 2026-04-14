# /legal-check — Auditoría legal del proyecto

> Ejecuta una auditoría legal completa: privacidad, términos, RGPD, stores, cookies, web.

## Uso
```
/legal-check                 → auditoría completa
/legal-check privacy         → solo política de privacidad
/legal-check terms           → solo términos de servicio
/legal-check stores          → solo requisitos de stores
/legal-check pre-launch      → checklist completo pre-lanzamiento
```

## Qué hace

1. Activa el agente `legal`.
2. Ejecuta skill `legal-audit` (completo o parcial según parámetro).
3. Escanea código fuente para verificar datos tratados vs datos declarados.
4. Compara copias de textos legales para verificar consistencia.
5. Actualiza `_project-hub/LEGAL.md`.
6. Añade entrada a CHANGELOG.
7. Entrega informe priorizado a Judith.

## Output esperado

- Informe de auditoría en `_project-hub/LEGAL.md` (actualizado).
- Si es pre-launch: checklist en `docs/legal/store-compliance-checklist.md`.
- Resumen en chat:
  ```
  ⚖️ Auditoría Legal — 14/04/2026
  🔴 Crítico: [N] items (bloquean lanzamiento)
  🟡 Importante: [N] items (resolver en 30 días)
  🟢 Mejora: [N] items
  • Detalle: _project-hub/LEGAL.md
  ```

## Reglas
- No modifica textos legales directamente; genera borradores para aprobación.
- R16: nunca publica textos legales sin ok de Judith.
- R1: no afirma cumplimiento sin verificación.
