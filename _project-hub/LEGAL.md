# Cals2Gains — Estado Legal y Cumplimiento

**Última actualización:** 14 de abril de 2026
**Responsable del tratamiento:** CivilTek (Judith Cordobés) — info@civiltek.es

---

## Resumen ejecutivo

El proyecto tiene documentos legales básicos (privacy.html, terms.html) publicados desde el 9 de abril de 2026. Sin embargo, hay varios requisitos pendientes que **bloquean el lanzamiento público** en stores y que deben resolverse para cumplir la normativa española y europea.

**Estado general: 🟡 Parcialmente conforme — requiere acción antes de lanzamiento.**

---

## Estado por área

### 1. Política de Privacidad

| Estado | Detalle |
|--------|---------|
| ✅ Existe | `public/privacy.html` — última actualización 9/04/2026 |
| ✅ Accesible | URL: https://cals2gains.web.app/privacy.html |
| ⚠️ Incompleta | No cubre: fasting tracker, voice logging, training day, measurements, progress photos |
| ⚠️ Base legal | No especifica base legal por tipo de tratamiento (art. 13 RGPD) |
| ⚠️ Transferencias | No detalla transferencias internacionales (OpenAI → EEUU) |
| ⚠️ Retención | No indica periodos de retención de datos |
| ⚠️ DPO | No indica si hay DPO (no obligatorio, pero recomendable informar) |

### 2. Términos de Servicio

| Estado | Detalle |
|--------|---------|
| ✅ Existe | `public/terms.html` — última actualización 9/04/2026 |
| ⚠️ Disclaimer IA | No advierte que estimaciones nutricionales de IA no son consejo médico |
| ⚠️ Disclaimer salud | No incluye "no sustituye asesoramiento médico/nutricional profesional" |
| ⚠️ IA generativa | No menciona uso de IA generativa (GPT-4o) ni sus limitaciones |
| ⚠️ Jurisdicción | Verificar que indica ley española como aplicable |

### 3. RGPD / LOPD-GDD

| Requisito | Estado |
|-----------|--------|
| Información al interesado (arts. 13-14) | ⚠️ Parcial |
| Base legal por tratamiento | ⚠️ No especificada |
| Derechos ARCO+ informados | ⚠️ Parcial |
| Mecanismo ejercicio derechos in-app | 🔴 No implementado |
| Consentimiento explícito (datos salud) | ⚠️ Pendiente de verificar |
| Registro Actividades Tratamiento (RAT) | 🔴 No existe |
| DPA con Firebase/Google | ⚠️ Pendiente de verificar |
| DPA con OpenAI | ⚠️ Pendiente de verificar |
| DPA con RevenueCat | ⚠️ Pendiente de verificar |
| EIPD/DPIA (análisis IA fotos) | 🔴 No existe |
| Protocolo de brechas | 🔴 No existe |
| Eliminación de cuenta | 🔴 No implementado |

### 4. Web — LSSI-CE

| Requisito | Estado |
|-----------|--------|
| Aviso legal / Impressum | 🔴 No existe |
| Identificación titular (nombre, NIF, domicilio) | 🔴 No existe |
| Política de cookies | 🔴 No existe |
| Banner de consentimiento cookies | 🔴 No existe |
| Textos legales en footer | ✅ Privacy + Terms enlazados |

### 5. App Store / Play Store

| Requisito | Estado |
|-----------|--------|
| Privacy policy URL funcional | ✅ |
| Data Safety Section (Play Store) | 🔴 Pendiente |
| App Privacy Details (App Store) | ⏳ Cuenta en verificación |
| Política eliminación de cuenta | 🔴 No implementado |
| Clasificación por edad | ⚠️ Pendiente |
| Declaración de permisos | ⚠️ Pendiente de revisar |

---

## Prioridades (bloqueantes para lanzamiento)

### 🔴 Crítico — resolver antes de publicar en stores

1. **Implementar eliminación de cuenta in-app** — requisito obligatorio de Apple y Google desde 2024.
2. **Aviso legal / Impressum en web** — obligatorio por LSSI en España.
3. **Banner de cookies** con consentimiento granular — obligatorio con GA4 activo.
4. **Data Safety Section** en Google Play Console — obligatorio para publicar.
5. **Actualizar privacy.html** para cubrir todos los datos tratados.

### 🟡 Importante — resolver en los 30 días siguientes al lanzamiento

6. **Disclaimer nutricional/médico** en terms.html.
7. **Disclaimer IA** sobre limitaciones de estimaciones.
8. **Registro de Actividades de Tratamiento (RAT)** documentado.
9. **EIPD/DPIA** para análisis de fotos con IA.
10. **Verificar DPAs** con Firebase, OpenAI, RevenueCat.

### 🟢 Mejoras recomendadas

11. **Política de cookies dedicada** (separada de privacy.html).
12. **Versión EN** de textos legales.
13. **Centro de privacidad in-app** para gestión de consentimientos.
14. **Evaluación AI Act** — clasificación de riesgo del sistema.

---

## Historial de auditorías

| Fecha | Tipo | Resultado | Notas |
|-------|------|-----------|-------|
| 14/04/2026 | Inventario inicial | 🟡 Parcial | Primera evaluación al crear sistema de agentes |

---

## Próxima revisión programada

- Antes de primer lanzamiento en stores (fecha por definir).
- Tras cada cambio de feature que implique nuevos datos personales.
- Revisión periódica trimestral.
