# Registro de Actividades de Tratamiento (RAT) — Cals2Gains

> **Versión:** 1.0 · **Fecha:** 2026-04-17
> **Base normativa:** Art. 30 RGPD; Art. 31 LOPD-GDD.
> **Estado:** ✅ Adoptado 2026-04-17 por Judith Cordobes como representante de CivilTek Ingeniería SLU. Revisión ordinaria cada 6 meses o ante cambio sustancial en los tratamientos.

---

## 0. Datos del responsable y del corresponsable

| Campo | Valor |
|-------|-------|
| Responsable del tratamiento | CivilTek Ingeniería SLU |
| CIF | [pendiente reflejar el CIF real en copia oficial] |
| Domicilio | España (domicilio social en documentación mercantil) |
| Contacto protección de datos | info@cals2gains.com |
| DPO | No designado. No concurren supuestos obligatorios Art. 37 RGPD. Función de privacidad asumida por la administradora Judith Cordobes. |
| Corresponsables | No existen corresponsables. |

---

## 1. Tratamiento: Gestión de cuentas de usuario (T1)

| Campo | Detalle |
|---------|---------|
| Finalidad | Registro, autenticación y gestión del ciclo de vida de la cuenta del usuario en la app y web |
| Base legal | Art. 6.1.b RGPD — ejecución del contrato de prestación del servicio |
| Categorías de interesados | Personas físicas mayores de 16 años que se registran en Cals2Gains |
| Categorías de datos | Nombre, email, foto de perfil (proveniente del proveedor SSO), UID interno, idioma preferente, fecha de alta y baja |
| Destinatarios | Google LLC (Firebase Auth), Apple Inc. (Sign in with Apple), Google LLC (Google Sign-In). Encargados del tratamiento con DPA aceptado |
| Transferencias internacionales | EEUU — cobertura DPF 2023 (Decisión C(2023) 4745) y SCCs UE 2021/914 complementarias |
| Plazo de conservación | Mientras la cuenta esté activa + 30 días post-baja; copias de seguridad se purgan en rotación máx 90 días |
| Medidas de seguridad | Autenticación federada (sin gestión propia de contraseñas), tokens con rotación, cifrado TLS 1.3 en tránsito, AES-256 en reposo |

---

## 2. Tratamiento: Cálculo y personalización de objetivos nutricionales (T2)

| Campo | Detalle |
|---------|---------|
| Finalidad | Calcular objetivos orientativos de calorías y macronutrientes a partir de datos declarados por el usuario |
| Base legal | Art. 6.1.b RGPD (ejecución del contrato) para datos ordinarios + **Art. 9.2.a RGPD (consentimiento explícito)** para datos de salud |
| Categorías de interesados | Usuarios registrados que completan el onboarding nutricional |
| Categorías de datos | **Datos de salud (Art. 9)**: edad, sexo biológico, altura, peso, % grasa corporal, masa magra, objetivo (goalMode), `medicalFlags` (embarazo/lactancia, relación sensible con la comida, diabetes, enf. renal, minoría de edad), alergias e intolerancias |
| Destinatarios | Google LLC (Firebase Firestore). Ningún dato se cede a terceros con fines distintos |
| Transferencias internacionales | EEUU — DPF 2023 + SCCs complementarias |
| Plazo de conservación | Mientras la cuenta esté activa; exportación + borrado inmediato disponible desde Ajustes en cualquier momento |
| Medidas de seguridad | Reglas Firestore con acceso restringido por UID propietario; no loguear en crash reports ni telemetría; cifrado AES-256 en reposo |

---

## 3. Tratamiento: Registro de comidas, peso, medidas y fotos (T3)

| Campo | Detalle |
|---------|---------|
| Finalidad | Permitir al usuario llevar un historial nutricional y de progreso físico |
| Base legal | Art. 9.2.a RGPD (consentimiento explícito) |
| Categorías de interesados | Usuarios registrados |
| Categorías de datos | **Datos de salud (Art. 9)**: comidas registradas con macros, peso histórico, medidas corporales, fotos de progreso (biométricas en contexto), ayunos, hidratación |
| Destinatarios | Google LLC (Firebase Firestore y Storage) |
| Transferencias internacionales | EEUU — DPF 2023 + SCCs complementarias |
| Plazo de conservación | Mientras la cuenta esté activa; opción de exportación JSON + borrado inmediato del historial desde Ajustes |
| Medidas de seguridad | Reglas Storage que impiden acceso público; URLs firmadas con caducidad corta; cifrado en reposo y en tránsito |

---

## 4. Tratamiento: Estimación nutricional por IA (imagen, voz, texto) (T4)

| Campo | Detalle |
|---------|---------|
| Finalidad | Estimar contenido nutricional de comidas a partir de foto, descripción por voz o texto libre |
| Base legal | Art. 6.1.b RGPD (ejecución del servicio). Para la imagen, Art. 9.2.a cuando la foto muestre al usuario |
| Categorías de interesados | Usuarios que utilicen captura por IA |
| Categorías de datos | Imagen de la comida, grabación de voz (transcrita por Whisper), texto descriptivo; ninguna información de perfil médico se envía junto al prompt |
| Destinatarios | OpenAI LLC (GPT-4o Vision, Whisper, GPT-4o-mini). Encargado del tratamiento con Business Terms aceptados; política "no training" aplicable a la API empresarial |
| Transferencias internacionales | EEUU — DPF 2023 + SCCs complementarias |
| Plazo de conservación | OpenAI no almacena los inputs de forma permanente (política API enterprise). En Cals2Gains solo se conserva el resultado estructurado (macros estimados), no la imagen/audio original |
| Medidas de seguridad | TLS 1.3, API key rotativa, timeout 15-30 s con abort, no incluir alergias/medicalFlags en el prompt salvo lista de alérgenos específica para alertas de seguridad |

---

## 5. Tratamiento: Coach adaptativo y alertas automatizadas (T5)

| Campo | Detalle |
|---------|---------|
| Finalidad | Ajustar objetivos nutricionales orientativos en función de adherencia, peso y actividad; disparar alertas de seguridad (p. ej. pérdida >1 %/semana) |
| Base legal | Art. 9.2.a RGPD (consentimiento explícito — toggle de "adaptación automática de objetivos" en Ajustes, activable o desactivable por el usuario) |
| Categorías de interesados | Usuarios que activan la adaptación automática |
| Categorías de datos | **Datos de salud**: peso histórico, macros ingeridos, objetivos actuales, datos de actividad de HealthKit/Health Connect si están autorizados |
| Destinatarios | Google LLC (Firebase Firestore — almacenamiento del historial de ajustes); OpenAI LLC (GPT-4o-mini para el coach semanal) |
| Transferencias internacionales | EEUU — DPF 2023 + SCCs complementarias |
| Plazo de conservación | Historial de ajustes del coach: 24 meses para permitir auditoría del progreso. Borrado inmediato a petición del usuario |
| Medidas de seguridad | Los ajustes son orientativos, reversibles por el usuario (Art. 22 RGPD), sin efectos jurídicos. Toggle de opt-out disponible |

---

## 6. Tratamiento: Sincronización con Apple HealthKit / Google Health Connect (T6)

| Campo | Detalle |
|---------|---------|
| Finalidad | Importar opcionalmente datos de actividad y composición corporal desde la app Salud del dispositivo |
| Base legal | Art. 9.2.a RGPD (consentimiento explícito otorgado por el usuario al autorizar la integración en iOS/Android) |
| Categorías de interesados | Usuarios que autorizan la integración |
| Categorías de datos | **Datos de salud**: pasos, calorías activas y en reposo, frecuencia cardíaca, minutos de ejercicio, peso, % grasa, masa magra, TMB si está disponible |
| Destinatarios | Apple Inc. (HealthKit, iOS) y Google LLC (Health Connect, Android). Origen de los datos; Cals2Gains es consumidor |
| Transferencias internacionales | EEUU — DPF 2023 |
| Plazo de conservación | Últimos 30 días de datos crudos en caché local; agregados (media móvil 7d) conservados con los datos de perfil |
| Medidas de seguridad | Compromiso expreso (conforme Apple App Store 5.1.1(ix) y Health Connect Terms) de no usar datos HK/HC para publicidad ni profiling comercial ni entrenamiento de modelos |

---

## 7. Tratamiento: Gestión de suscripciones y pagos (T7)

| Campo | Detalle |
|---------|---------|
| Finalidad | Gestionar compras dentro de la app (premium por suscripción) |
| Base legal | Art. 6.1.b RGPD (ejecución del contrato) + Art. 6.1.c (obligaciones legales de facturación) |
| Categorías de interesados | Usuarios que adquieren una suscripción |
| Categorías de datos | Identificador de suscripción, tipo de plan, fecha de inicio y renovación, estado (activa/cancelada/expirada). Cals2Gains NO almacena datos de tarjeta |
| Destinatarios | Apple Inc. (App Store), Google LLC (Play Store), RevenueCat Inc. (middleware) |
| Transferencias internacionales | EEUU — DPF 2023 + SCCs complementarias |
| Plazo de conservación | Datos de facturación: 6 años (Art. 30 Código de Comercio + Art. 66 LGT) |
| Medidas de seguridad | Canal cifrado TLS 1.3; Cals2Gains no ve datos de tarjeta; gestión directa por plataforma (Apple/Google) |

---

## 8. Tratamiento: Comunicaciones comerciales (email marketing) (T8)

| Campo | Detalle |
|---------|---------|
| Finalidad | Enviar contenido nutricional y de producto a personas que han descargado un lead magnet desde la web |
| Base legal | Art. 6.1.a RGPD (consentimiento específico) + LSSI-CE Art. 21 |
| Categorías de interesados | Personas que voluntariamente han facilitado su email en formulario con checkbox opt-in |
| Categorías de datos | Email, nombre (opcional), idioma, etiqueta de lead magnet, métricas de envío (abiertos, clics) |
| Destinatarios | Brevo (Sendinblue) — encargado del tratamiento con DPA aceptado |
| Transferencias internacionales | Francia (UE) — no aplica transferencia internacional |
| Plazo de conservación | Hasta la baja por parte del usuario. Enlace de baja en cada envío. Tras baja, email conservado en lista negra para evitar reenvíos erróneos (3 años, Art. 82 LOPD-GDD) |
| Medidas de seguridad | TLS 1.3, autenticación por API key rotativa, registros de consentimiento con timestamp + IP |

---

## 9. Tratamiento: Analítica web anónima (T9)

| Campo | Detalle |
|---------|---------|
| Finalidad | Medir uso del sitio web para mejorar el servicio |
| Base legal | Art. 6.1.f RGPD (interés legítimo — datos anonimizados) y consentimiento para cookies no estrictamente necesarias |
| Categorías de interesados | Visitantes del sitio cals2gains.com |
| Categorías de datos | IP anonimizada (IP masking GA4), tipo de dispositivo, navegador, páginas vistas, duración de sesión, fuente de tráfico |
| Destinatarios | Google LLC (Google Analytics 4) |
| Transferencias internacionales | EEUU — DPF 2023 |
| Plazo de conservación | 14 meses (configuración GA4 estándar) |
| Medidas de seguridad | IP masking, sin identificadores de usuario; respeto de señal Do-Not-Track y de preferencias del banner de cookies |

---

## 10. Tratamiento: Atención al usuario y ejercicio de derechos (T10)

| Campo | Detalle |
|---------|---------|
| Finalidad | Gestionar consultas, incidencias y solicitudes de ejercicio de derechos ARSOLIP |
| Base legal | Art. 6.1.c RGPD (obligaciones legales — cumplimiento del RGPD) |
| Categorías de interesados | Usuarios que contactan con info@cals2gains.com o ejercen derechos |
| Categorías de datos | Email, contenido de la consulta, histórico de la conversación, datos necesarios para verificar la identidad en caso de ejercicio de derechos |
| Destinatarios | Email provider de CivilTek (correo corporativo info@civiltek.es / info@cals2gains.com) |
| Transferencias internacionales | No aplica (proveedor UE) |
| Plazo de conservación | 3 años desde la última comunicación (Art. 82 LOPD-GDD) |
| Medidas de seguridad | Cifrado en tránsito, acceso restringido a la administradora, sin compartir con terceros |

---

## 11. Políticas transversales

- **Principio de minimización (Art. 5.1.c RGPD)**: solo se recogen los datos imprescindibles. `medicalFlags` es opcional.
- **Privacy by design (Art. 25)**: screening médico, hard-caps y alertas diseñadas antes del primer despliegue público.
- **Registro de consentimientos**: para cada consentimiento se almacena timestamp, versión de la política aceptada y método (checkbox explícito, separado y granular).
- **Notificación de brechas (Art. 33-34)**: procedimiento en DPIA §8; notificación AEPD en 72 h si hay riesgo para los derechos.
- **Derechos ARSOLIP**: tramitados en `info@cals2gains.com` en plazo máximo 1 mes (ampliable a 2 meses en casos complejos con aviso).
- **Auditoría**: este RAT se revisa cada 6 meses (próxima 2026-10-17) y ante cualquier tratamiento nuevo, cambio de encargado o incidente.

---

## 12. Bases de adopción

Adoptado por Judith Cordobes Andrés, administradora de CivilTek Ingeniería SLU, el 2026-04-17, en coherencia con la DPIA v1.0 y la Política de Privacidad v2.0 vigentes. Este RAT estará disponible para exhibición ante la AEPD en caso de requerimiento (Art. 30.4 RGPD).
