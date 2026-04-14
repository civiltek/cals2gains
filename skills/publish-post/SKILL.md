# Skill: publish-post

> Flujo de publicación de post en IG/FB siguiendo brand voice y proceso de aprobación.

## Triggers
- "Publica este post"
- Hueco en calendario editorial (`CONTENT_PLAN.md`).
- Campaña activa con siguiente post programado.

## Pasos

1. **Cargar brand**: leer `_project-hub/BRAND.md` y `context/BRAND.md`.

2. **Preparar copy**:
   - Identificar cuenta destino (EN → @cals2gains y FB EN; ES → @cals2gains_es y FB ES).
   - Adaptar copy al idioma correcto (no traducción literal, tono nativo).
   - Incluir CTA claro y hashtags razonados (no sopa de hashtags).
   - Validar que cualquier feature mencionada está **activa** en `FEATURES.md`.

3. **Validar asset**:
   - Asset en `marketing/` con dimensiones correctas (IG 1080×1080 o 1080×1350, FB según formato).
   - Colores de marca presentes.
   - Logo legible si aparece.

4. **Revisión brand voice**:
   - Cercano, motivador, basado en ciencia.
   - Sin fitness tóxico, sin pseudociencia, sin "antes/después" morbosos.
   - Sin promesas de resultados mágicos.

5. **Presentar a Judith** (R6 obligatorio):
   - Copy completo + asset + cuenta(s) destino + fecha/hora propuesta.
   - Esperar "ok", "publicar", o edits.

6. **Publicación**:
   - **Preferido**: Judith programa en Meta Business Suite (ella tiene sesión).
   - **Alternativa**: Chrome MCP abre MBS y Claude rellena, Judith confirma el botón publicar.
   - **Nunca** publicar automáticamente sin que Judith lo confirme explícitamente.

7. **Registro**:
   - Marcar post como publicado en `CONTENT_PLAN.md`.
   - Añadir a `_project-hub/CHANGELOG.md`.
   - Añadir referencia (fecha + URL del post) a `marketing/published/` (⚠️ crear carpeta si no existe).

## Reglas
- **R6**: nunca publicación automática sin aprobación.
- Validar feature activa antes de promocionarla.
- Asset siempre en carpeta correcta del repo, no en Downloads.

## Verificación
- [ ] Copy en brand voice.
- [ ] Feature mencionada está activa en FEATURES.md.
- [ ] Asset verificado.
- [ ] Judith aprobó.
- [ ] CONTENT_PLAN.md actualizado tras publicación.
- [ ] CHANGELOG.
