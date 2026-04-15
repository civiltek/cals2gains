# Skill: legal-audit

> Auditoría legal completa del proyecto: privacidad, términos, RGPD, requisitos de stores, cookies. Genera informe con estado y acciones pendientes.

## Triggers
- Comando `/legal-check`.
- Antes de un lanzamiento en stores (pre-launch checklist).
- Cambio significativo en la app (nueva feature que recopila datos).
- Actualización de privacy.html o terms.html.
- Judith pide: "¿estamos bien legalmente?", "revisa la privacidad".

## Archivos a auditar

### Documentos legales publicados
- `public/privacy.html` (fuente para deploy)
- `public/terms.html` (fuente para deploy)
- `public/cals2gains/privacy.html` (copia, debe ser idéntica)
- `public/cals2gains/terms.html` (copia, debe ser idéntica)
- `website/privacy.html`, `website/terms.html` (copias, deben ser idénticas)
- `website/cals2gains/privacy.html`, `website/cals2gains/terms.html` (copias)

### Código fuente (verificar qué datos se tratan)
- `services/` — Firebase, OpenAI, RevenueCat integrations
- `store/` — Zustand stores (qué se persiste)
- `app.json` — permisos declarados
- `firestore.rules`, `storage.rules` — seguridad de datos

### Hub
- `_project-hub/LEGAL.md` — estado legal del proyecto
- `_project-hub/ACCOUNTS.md` — cuentas y servicios de terceros

## Pasos

1. **Inventario de datos tratados**: escanear código fuente para identificar qué datos personales recopila la app.
   - Datos de cuenta (email, nombre, foto — Firebase Auth)
   - Datos de perfil (peso, altura, edad, género, nivel actividad)
   - Datos de salud/nutrición (comidas, macros, peso, medidas, fotos de progreso, ayuno)
   - Datos de voz (si voice logging está activo)
   - Fotos de comida (enviadas a OpenAI)
   - Analytics (GA4 events)

2. **Auditar privacy.html** contra datos reales:
   - ¿Menciona todos los tipos de datos recopilados?
   - ¿Identifica correctamente al responsable del tratamiento (CivilTek)?
   - ¿Indica base legal para cada tratamiento?
   - ¿Menciona transferencias internacionales de datos (OpenAI — USA)?
   - ¿Incluye derechos ARCO+?
   - ¿Incluye datos de contacto del responsable?
   - ¿Indica periodo de retención?
   - ¿Menciona menores (si aplica)?

3. **Auditar terms.html**:
   - ¿Limitación de responsabilidad sobre estimaciones nutricionales?
   - ¿Aviso de "no sustituye asesoramiento médico/nutricional"?
   - ¿Propiedad intelectual y licencia de uso?
   - ¿Política de reembolso (vinculada a stores)?
   - ¿Modificación de términos y notificación?
   - ¿Jurisdicción y ley aplicable (España)?

4. **Verificar requisitos de stores**:
   - [ ] URL de privacy policy funcional y accesible.
   - [ ] Política de eliminación de cuenta (requisito desde 2024).
   - [ ] Data Safety Section (Play Store) completada.
   - [ ] App Privacy Details (App Store) preparado.
   - [ ] Clasificación por edad correcta.
   - [ ] Permisos justificados (cámara, galería, notificaciones).

5. **Verificar web**:
   - [ ] Aviso legal / Impressum (obligatorio en España — LSSI).
   - [ ] Banner de cookies con consentimiento (si usa GA4 u otros trackers).
   - [ ] Textos legales accesibles desde footer.
   - [ ] Versiones ES e EN disponibles.

6. **Verificar consistencia**: comparar todas las copias de privacy.html y terms.html (deben ser idénticas o tener redirección).

7. **Generar informe**:
   ```
   ## Auditoría Legal — [Fecha ISO]
   
   ### Privacidad
   | Requisito | Estado | Acción requerida |
   |-----------|--------|-----------------|
   
   ### Términos
   | Requisito | Estado | Acción requerida |
   |-----------|--------|-----------------|
   
   ### Stores
   | Requisito | Estado | Acción requerida |
   |-----------|--------|-----------------|
   
   ### Web (LSSI)
   | Requisito | Estado | Acción requerida |
   |-----------|--------|-----------------|
   
   ### Prioridades
   🔴 Crítico (bloquea lanzamiento): [lista]
   🟡 Importante (resolver antes de 30 días): [lista]
   🟢 Mejora (nice-to-have): [lista]
   ```

8. **Actualizar** `_project-hub/LEGAL.md` con resultado.

9. **CHANGELOG** + informe a Judith.

10. **Handoffs**:
    - Si hay cambios en HTML → handoff a `web-dev` para deploy.
    - Si falta feature in-app (ej. eliminación de cuenta) → handoff a `app-dev`.
    - Si hay impacto financiero (ej. DPA de pago) → handoff a `finance`.

## Reglas
- R1: no afirmar "cumplimos" si no se ha verificado.
- R16: nunca publicar textos legales modificados sin aprobación de Judith.
- Conservadurismo: ante duda, la opción más protectora.

## Verificación
- [ ] Código fuente escaneado para datos tratados.
- [ ] privacy.html auditada contra datos reales.
- [ ] terms.html auditada.
- [ ] Requisitos de stores verificados.
- [ ] Requisitos web (LSSI) verificados.
- [ ] Copias de textos legales son idénticas entre ubicaciones.
- [ ] `_project-hub/LEGAL.md` actualizado.
- [ ] Judith informada con prioridades.
