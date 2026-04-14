# Cals2Gains — Estado Legal y Cumplimiento

**Última actualización:** 14 de abril de 2026
**Responsable del tratamiento:** CivilTek (Judith Cordobés) — info@civiltek.es

---

## Resumen ejecutivo

El proyecto tiene documentos legales completos y actualizados: política de privacidad (RGPD), términos de servicio (con disclaimers IA/salud), aviso legal (LSSI), política de cookies y banner de consentimiento. La eliminación de cuenta está implementada in-app. Quedan pendientes items operativos (rellenar Data Safety en Play Console, verificar DPAs, crear EIPD/DPIA).

**Estado general: 🟢 Preparado para lanzamiento — quedan items operativos no bloqueantes.**

---

## Estado por área

### 1. Política de Privacidad

| Estado | Detalle |
|--------|---------|
| ✅ Actualizada | `public/privacy.html` — actualización 14/04/2026 |
| ✅ Accesible | URL: https://cals2gains.web.app/privacy.html |
| ✅ Completa | Cubre: cuenta, perfil, nutrición, salud (peso, medidas, ayuno, fotos progreso), voz, wearables, suscripciones |
| ✅ Base legal | Tabla con base legal por tipo de tratamiento (art. 13 RGPD) |
| ✅ Transferencias | Detalla servicios de terceros con ubicación y estado DPA |
| ✅ Retención | Indica periodos de retención y política de eliminación |
| ✅ ARCO+ | Lista completa de derechos con mecanismos (in-app + email) |
| ✅ AEPD | Incluye referencia a la Agencia Española de Protección de Datos |
| ✅ Menores | Art. 8 RGPD + art. 7 LOPD-GDD (16 años) |

### 2. Términos de Servicio

| Estado | Detalle |
|--------|---------|
| ✅ Actualizado | `public/terms.html` — actualización 14/04/2026 |
| ✅ Disclaimer IA | Sección dedicada a limitaciones de la IA (sección 3) |
| ✅ Disclaimer salud | "NO es un sustituto del consejo médico, nutricional o dietético profesional" (sección 2) |
| ✅ Eliminación | Sección dedicada a eliminación de cuenta (sección 6) |
| ✅ Jurisdicción | Ley española + normas imperativas UE consumidor |
| ✅ Reembolsos | Referencia a políticas de Apple/Google |

### 3. RGPD / LOPD-GDD

| Requisito | Estado |
|-----------|--------|
| Información al interesado (arts. 13-14) | ✅ Completa en privacy.html |
| Base legal por tratamiento | ✅ Tabla detallada |
| Derechos ARCO+ informados | ✅ Lista completa con mecanismos |
| Mecanismo ejercicio derechos in-app | ✅ Exportar datos + Eliminar cuenta |
| Consentimiento explícito (datos salud) | ⚠️ Pendiente de verificar flujo in-app |
| Registro Actividades Tratamiento (RAT) | 🟡 Documentado en context/LEGAL-OVERVIEW.md, formalizar |
| DPA con Firebase/Google | ⚠️ Pendiente de verificar |
| DPA con OpenAI | ⚠️ Pendiente de verificar |
| DPA con RevenueCat | ⚠️ Pendiente de verificar |
| EIPD/DPIA (análisis IA fotos) | 🟡 Pendiente (no bloqueante para lanzamiento) |
| Protocolo de brechas | 🟡 Pendiente (crear protocolo documentado) |
| Eliminación de cuenta | ✅ Implementado (firebase.ts + settings.tsx) |

### 4. Web — LSSI-CE

| Requisito | Estado |
|-----------|--------|
| Aviso legal / Impressum | ✅ `public/aviso-legal.html` |
| Identificación titular | ✅ CivilTek — Judith Cordobés — info@civiltek.es |
| Política de cookies | ✅ `public/cookies.html` |
| Banner de consentimiento cookies | ✅ Implementado en index.html (GA4 condicionado a consentimiento) |
| Textos legales en footer | ✅ Privacidad + Términos + Aviso Legal + Cookies |

### 5. App Store / Play Store

| Requisito | Estado |
|-----------|--------|
| Privacy policy URL funcional | ✅ |
| Data Safety Section (Play Store) | 🟡 Documento preparado (`docs/legal/data-safety-section.md`), falta rellenar en Console |
| App Privacy Details (App Store) | ⏳ Cuenta en verificación |
| Política eliminación de cuenta | ✅ Implementada in-app |
| Clasificación por edad | ⚠️ Pendiente de rellenar en stores |
| Declaración de permisos | ✅ Documentados en privacy.html y app.json |

---

## Prioridades restantes

### 🟡 Importante — resolver antes o poco después del lanzamiento

1. **Rellenar Data Safety Section** en Google Play Console (documento preparado en `docs/legal/data-safety-section.md`).
2. **Verificar DPAs** vigentes con Firebase, OpenAI, RevenueCat (que las SCCs estén en vigor).
3. **Crear EIPD/DPIA** formal para el análisis de fotos con IA.
4. **Verificar flujo de consentimiento in-app** para datos de salud (categoría especial RGPD art. 9).
5. **Crear protocolo de notificación de brechas** (72h AEPD).

### 🟢 Mejoras recomendadas

6. **Versión EN** de textos legales (actualmente solo ES).
7. **Centro de privacidad in-app** para gestión de consentimientos.
8. **Evaluación AI Act** — clasificación de riesgo del sistema de IA.
9. **Formalizar RAT** en documento separado.

---

## Documentos legales implementados

| Documento | Ubicación | Fecha |
|-----------|-----------|-------|
| Política de Privacidad | `public/privacy.html` (+ 5 copias sincronizadas) | 14/04/2026 |
| Términos de Servicio | `public/terms.html` (+ 5 copias sincronizadas) | 14/04/2026 |
| Aviso Legal (Impressum) | `public/aviso-legal.html` (+ copia en website/) | 14/04/2026 |
| Política de Cookies | `public/cookies.html` (+ copia en website/) | 14/04/2026 |
| Banner de Cookies | Integrado en `public/index.html` | 14/04/2026 |
| Data Safety Section (borrador) | `docs/legal/data-safety-section.md` | 14/04/2026 |
| Eliminación de cuenta | `services/firebase.ts` + `store/userStore.ts` + `app/settings.tsx` | 14/04/2026 |

## Historial de auditorías

| Fecha | Tipo | Resultado | Notas |
|-------|------|-----------|-------|
| 14/04/2026 | Inventario inicial | 🟡 Parcial | Primera evaluación al crear sistema de agentes |
| 14/04/2026 | Implementación completa | 🟢 Conforme | Privacy, terms, aviso legal, cookies, eliminación cuenta, Data Safety prep |

---

## Próxima revisión programada

- **Julio 2026** — revisión trimestral (tarea `c2g-legal-review`).
- Antes de primer lanzamiento en stores (fecha por definir).
- Tras cada cambio de feature que implique nuevos datos personales.
