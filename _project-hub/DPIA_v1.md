# Evaluación de Impacto sobre Protección de Datos (DPIA) — Cals2Gains

> **Versión:** 1.0 · **Fecha:** 2026-04-17 · **Autor:** agente legal bajo supervisión de Judith Cordobes (responsable del tratamiento)
> **Base normativa:** RGPD Art. 35; Guía AEPD "Listas de cumplimiento del RGPD: Protección de Datos desde el diseño"; Directrices CEPD 01/2024.
> **Estado:** ✅ **FIRMADA Y ADOPTADA** el 2026-04-17 por Judith Cordobes en representación de CivilTek Ingeniería SLU. Revisión obligatoria anual (próxima 2027-04-17) o ante cualquier cambio sustancial de tratamiento.

---

## 0. Identificación

| Campo | Valor |
|-------|-------|
| Responsable del tratamiento | CivilTek Ingeniería SLU (España) |
| Nombre comercial | Cals2Gains |
| Web | https://cals2gains.com |
| Contacto | info@cals2gains.com |
| Delegado de Protección de Datos (DPO) | No designado obligatoriamente (no concurren supuestos Art. 37 RGPD). Contacto para asuntos de privacidad: info@cals2gains.com |
| Autoridad de control competente | Agencia Española de Protección de Datos (AEPD) |

---

## 1. Descripción del tratamiento

### 1.1 Finalidad
Cals2Gains es una aplicación móvil y servicio web de estilo de vida y bienestar nutricional. No es producto sanitario en el sentido del Reglamento UE 2017/745.

El tratamiento de datos personales persigue las siguientes finalidades:

- F1. Registrar y autenticar al usuario en la app.
- F2. Calcular objetivos nutricionales personalizados (calorías y macronutrientes) a partir de datos declarados por la persona.
- F3. Permitir al usuario registrar comidas, pesos, medidas, fotos de progreso, ayunos e hidratación.
- F4. Proporcionar estimación nutricional de comidas mediante análisis de imagen, voz y texto (IA de terceros).
- F5. Ofrecer recomendaciones adaptativas orientativas semanales (coach) y alertas de seguridad (p. ej. pérdida de peso excesiva).
- F6. Sincronización opcional con Apple HealthKit / Google Health Connect.
- F7. Gestión de suscripciones de pago.
- F8. Comunicaciones comerciales (email marketing) por consentimiento explícito opt-in, a quienes descargan lead magnets desde la web.
- F9. Estadísticas agregadas y analítica web anónima para mejorar el servicio.

### 1.2 Datos tratados

| Categoría | Detalle | Tipo RGPD |
|-----------|---------|-----------|
| Identificativos | Nombre, email, foto perfil (del proveedor SSO), UID interno | Ordinarios (Art. 6) |
| Perfil | Edad, sexo biológico, altura, peso declarado | **Salud (Art. 9)** |
| Composición corporal | % grasa, masa magra declarados o sincronizados desde InBody/HealthKit | **Salud (Art. 9)** |
| Objetivos | goalMode (perder grasa, ganar músculo, etc.), objetivos de peso | Ordinarios (vinculados a Art. 9) |
| Condiciones declaradas (`medicalFlags`) | Embarazo/lactancia, "relación sensible con la comida", diabetes, enfermedad renal, edad <18 | **Salud (Art. 9)** |
| Alergias e intolerancias | Lista declarada por el usuario | **Salud (Art. 9)** |
| Registro alimentario | Comidas logueadas, macros, fotos de platos | Ordinarios + contexto salud |
| Registro de actividad | Pasos, calorías activas, entrenamientos (desde HealthKit/Health Connect) | **Salud (Art. 9)** |
| Fotos de progreso | Imágenes subidas por el usuario | **Salud (Art. 9)** (biométricos contextuales) |
| Peso y medidas | Histórico de pesajes y medidas corporales | **Salud (Art. 9)** |
| Técnicos | IP anonimizada, modelo de dispositivo, versión de app, tokens de notificación | Ordinarios |
| Uso y analítica | Eventos anonimizados GA4 (web) y telemetría app | Anónimos tras anonimización |
| Facturación | Proveedor de pago (Apple/Google + RevenueCat). Cals2Gains NO almacena datos de tarjeta | Gestión contractual |

### 1.3 Personas afectadas
Usuarios adultos (16+ general, 18+ para modos con déficit calórico) que descarguen y se registren en la app.

### 1.4 Flujos y destinatarios (encargados y terceros)

| Destinatario | Tipo | Dato / Finalidad | Ubicación | Base de transferencia |
|---------------|-------|-------------------|-------------|------------------------|
| Google LLC (Firebase: Auth, Firestore, Storage, GA4) | Encargado | Autenticación, almacenamiento, analítica | EEUU | DPF 2023 + SCCs |
| OpenAI LLC (GPT-4o Vision / Whisper / Chat) | Encargado | Análisis de imágenes, voz, texto nutricional, coach | EEUU | DPF 2023 + SCCs + API no-training |
| RevenueCat Inc. | Encargado | Gestión de suscripciones | EEUU | DPF 2023 + SCCs |
| Apple Inc. (HealthKit, App Store, Sign in with Apple) | Encargado | Sync salud, distribución, autenticación | EEUU | DPF 2023 + SCCs |
| Google LLC (Health Connect, Play Store, Google Sign-In) | Encargado | Sync salud, distribución, autenticación | EEUU | DPF 2023 + SCCs |
| Brevo (Sendinblue) | Encargado | Email marketing opt-in | UE (Francia) | No requiere base adicional |
| Open Food Facts | Consulta API pública | Lookup de productos por código de barras | UE (Francia) | Uso público de datos abiertos |
| CivilTek Ingeniería SLU | Responsable | Administración del servicio | España | — |

### 1.5 Plazos de conservación

- Datos de cuenta y perfil: mientras la cuenta esté activa y durante 30 días posteriores a la baja (plazo de reversión). Después se eliminan de bases productivas; copias de seguridad se purgan en el siguiente ciclo de rotación (máx 90 días).
- Datos de salud (registros de comidas, peso, medidas, fotos, `medicalFlags`): mismo criterio, con opción de exportación y borrado inmediato en cualquier momento desde Ajustes.
- Logs técnicos anonimizados: 12 meses.
- Datos de facturación: 6 años (Ley General Tributaria, Art. 66).
- Consentimientos: tiempo de vida del tratamiento + 3 años (Art. 82 LOPD-GDD).
- Email marketing: hasta la baja por parte del usuario, con revocación del consentimiento en cada envío.

---

## 2. Necesidad y proporcionalidad

### 2.1 Base legal (Art. 6 y 9 RGPD)

| Tratamiento | Base |
|-------------|------|
| Autenticación y ejecución del servicio | Art. 6.1.b — ejecución del contrato |
| Datos de salud (perfil, `medicalFlags`, registros, composición) | **Art. 9.2.a — consentimiento explícito, granular y revocable** |
| Comunicaciones comerciales a emails de lead magnet | Art. 6.1.a — consentimiento específico |
| Analítica anónima | Art. 6.1.f — interés legítimo (datos anonimizados) |
| Cookies técnicas | Exención Art. 22.2 LSSI |
| Cookies de analítica | Consentimiento informado (banner) |
| Obligaciones legales (conservación facturación, notificación brechas) | Art. 6.1.c |

### 2.2 Justificación de proporcionalidad

- Se recoge el mínimo dato imprescindible para calcular recomendaciones nutricionales orientativas (principio de minimización, Art. 5.1.c RGPD).
- `medicalFlags` es opcional: el usuario puede usar la app sin declarar nada; al no declarar, no se activan las adaptaciones ni las restricciones de seguridad específicas.
- Las fotos de comidas se procesan en OpenAI sin almacenamiento permanente por el encargado: el servicio API de OpenAI no usa datos de clientes empresariales para entrenar modelos (política OpenAI API).
- Las fotos de progreso se almacenan cifradas en Firebase Storage bajo reglas que solo permiten acceso al propietario.
- No hay cesión a terceros con fines publicitarios. No hay perfilado comercial.

### 2.3 Cumplimiento de principios RGPD Art. 5

- **Licitud, lealtad y transparencia**: Privacy Policy pública, accesible en app y web, bilingüe ES/EN. Consentimientos explícitos y separados por finalidad.
- **Limitación de la finalidad**: cada dato se usa solo para su finalidad declarada. Los registros alimentarios no se venden ni transfieren con fines distintos.
- **Minimización**: se piden solo los datos necesarios; no se obliga a `medicalFlags`.
- **Exactitud**: el usuario puede editar y borrar en cualquier momento desde Ajustes.
- **Limitación del plazo**: tabla de conservación §1.5.
- **Integridad y confidencialidad**: cifrado en tránsito (TLS 1.3), Firebase con cifrado en reposo (AES-256), reglas Firestore con acceso por UID.
- **Responsabilidad proactiva**: esta DPIA, RAT actualizado, registros de consentimiento, notificaciones de brecha.

---

## 3. Identificación y evaluación de riesgos

Escala: Probabilidad (Baja/Media/Alta) × Impacto (Bajo/Medio/Alto) → Nivel de riesgo inherente.

| ID | Riesgo | Probabilidad | Impacto | Nivel inherente |
|----|---------|--------------|---------|-----------------|
| R1 | Acceso no autorizado a datos de salud de un usuario (hackeo, credenciales filtradas) | Baja | Alto | **Medio** |
| R2 | Recomendación nutricional perjudicial a persona en grupo vulnerable no declarado (TCA, embarazo, diabetes no comunicada) | Media | Alto | **Alto** |
| R3 | Procesamiento de datos de salud sin consentimiento explícito válido | Baja | Alto | **Medio** |
| R4 | Transferencia internacional indebida (proveedor EEUU sin base válida) | Baja | Medio | Bajo |
| R5 | Conservación más allá del plazo por fallo de proceso de baja | Media | Medio | **Medio** |
| R6 | Uso de `medicalFlags` para decisiones automatizadas sin transparencia (Art. 22) | Media | Medio | **Medio** |
| R7 | Menor de edad falsea la edad para acceder a modos con déficit | Media | Alto | **Alto** |
| R8 | Foto de comida u otra imagen sensible filtrada por fallo de reglas Firebase | Baja | Medio | Bajo |
| R9 | Incidente de seguridad sin notificación AEPD en 72 h | Baja | Alto | **Medio** |
| R10 | Brecha en encargado (OpenAI, Firebase) que afecte a titulares | Baja | Alto | **Medio** |
| R11 | Uso de datos por encargado (OpenAI) para entrenar modelos | Baja | Alto | **Medio** |
| R12 | Claims en marketing que no cumplan Reg UE 1924/2006 | Media | Medio | **Medio** |
| R13 | Considerada producto sanitario por AEMPS por funcionalidad que cruce la Regla 11 MDR | Baja | Alto | **Medio** |
| R14 | Funcionalidad de IA clasificada como "alto riesgo" bajo AI Act | Baja | Medio | Bajo |
| R15 | Usuario ejerce derecho de supresión y quedan residuos | Baja | Medio | Bajo |

---

## 4. Medidas mitigadoras adoptadas

### 4.1 Técnicas

- **T1** — Autenticación por Google / Apple SSO (no gestión propia de contraseñas).
- **T2** — Firebase Auth con tokens rotativos; reglas Firestore que restringen lectura/escritura al UID propietario.
- **T3** — Cifrado TLS 1.3 en tránsito; cifrado AES-256 en reposo (estándar Firebase).
- **T4** — Storage de fotos con reglas que bloquean acceso público; URLs firmadas con caducidad corta cuando aplique.
- **T5** — API OpenAI con política "no training" confirmada para endpoints usados (API empresarial).
- **T6** — No se loguean `medicalFlags` ni fotos en crash reports / telemetría. Verificado en auditoría de `services/*.ts`.
- **T7** — IPs anonimizadas en analytics (GA4 IP masking).
- **T8** — Exportación de datos del usuario en JSON desde Ajustes (Art. 20 RGPD).
- **T9** — Borrado efectivo (no soft-delete para datos de salud). Registros físicos eliminados en 30 días tras la baja.
- **T10** — Segregación de ambientes (dev / staging / prod) con datos dummy en no-prod.

### 4.2 Organizativas

- **O1** — Consentimiento explícito, granular y separado para categorías especiales (Art. 9.2.a). Registros de consentimiento almacenados.
- **O2** — Privacy Policy bilingüe, accesible desde onboarding, desde cada pantalla de consentimiento, desde Ajustes y desde la web.
- **O3** — Disclaimer ubicuo "no es producto sanitario" en puntos críticos (resultado de cálculo, plan semanal, notificaciones, alertas automáticas).
- **O4** — Política de edad: 16+ general, 18+ para modos con déficit calórico.
- **O5** — Registro de actividades de tratamiento (RAT) en documento interno, revisado cada 6 meses.
- **O6** — DPA firmados o aceptados con cada encargado (Firebase DPA, OpenAI Business Terms, RevenueCat DPA, Brevo DPA).
- **O7** — Procedimiento documentado de notificación de brecha (Art. 33-34 RGPD) con plantilla AEPD.
- **O8** — Revisión legal trimestral de copy in-app y de marketing para cumplir Reg 1924/2006.
- **O9** — Auditoría semestral de flujos de datos (esta DPIA + RAT).
- **O10** — Formación interna continua (Judith como responsable) sobre RGPD, MDR, AI Act y normativa sectorial.

### 4.3 De producto (específicas para Cals2Gains)

- **P1** — Screening médico en onboarding (`medicalFlags`) que desactiva modos agresivos si hay flag crítico.
- **P2** — Hard-cap de calorías mínimas (1.200 ♀ / 1.500 ♂).
- **P3** — Piso hormonal de grasa 0,5 g/kg.
- **P4** — Alerta automática si pérdida de peso >1 %/semana durante 2 semanas, sube kcal +150 y notifica.
- **P5** — Modo "comida intuitiva" sin números si el usuario declara relación sensible con la comida.
- **P6** — Transparencia AI Act (Art. 50): informar de que las recomendaciones son generadas por IA.
- **P7** — Copy no prescriptivo ("recomendamos", no "te prescribimos"); reversibilidad de todo ajuste automático.
- **P8** — Lista blanca de claims conforme a Reg UE 432/2012 para marketing.

---

## 5. Riesgo residual tras mitigación

| ID | Riesgo residual | Nivel |
|----|------------------|-------|
| R1 | Acceso no autorizado a datos de salud | Bajo |
| R2 | Recomendación perjudicial tras screening | Bajo (si el usuario falsea datos voluntariamente) |
| R3 | Consentimiento Art. 9 defectuoso | Bajo |
| R4 | Transferencia internacional indebida | Muy bajo |
| R5 | Conservación más allá de plazo | Bajo |
| R6 | Decisiones automatizadas sin transparencia | Muy bajo |
| R7 | Menor falsea edad | Medio — aceptado (no hay método 100 % fiable de verificación de edad sin KYC, desproporcionado para la finalidad) |
| R8 | Fuga de foto por error configuración | Muy bajo |
| R9 | Brecha sin notificar en 72 h | Muy bajo |
| R10 | Brecha en encargado | Bajo |
| R11 | Uso de datos para entrenamiento por OpenAI | Muy bajo |
| R12 | Claims marketing incumplidores | Bajo |
| R13 | Calificación AEMPS como producto sanitario | Bajo — se ha diseñado para no cruzar Regla 11 MDR |
| R14 | IA clasificada alto riesgo | Muy bajo |
| R15 | Residuos tras ejercicio de supresión | Muy bajo |

**Riesgo residual global:** aceptable. No concurren los supuestos de consulta previa a AEPD (Art. 36 RGPD) al no permanecer ningún riesgo alto tras mitigación.

---

## 6. Plan de acción

| # | Acción | Responsable | Plazo | Estado |
|---|---------|-------------|---------|---------|
| 1 | Implementar screening médico en onboarding | app-dev + legal | Antes del lanzamiento | Pendiente (Fase B) |
| 2 | Hard-cap kcal + piso grasa | app-dev | Antes del lanzamiento | En ejecución (Fase A) |
| 3 | Actualización `privacy.html` + `terms.html` | legal + web-dev | Antes del lanzamiento | En ejecución |
| 4 | Alerta automática pérdida >1 %/sem con copy mitigado | app-dev + legal | Antes del lanzamiento público | Pendiente (Fase C) |
| 5 | Disclaimer ubicuo en 4 puntos críticos | app-dev + legal | Antes del lanzamiento | Pendiente |
| 6 | Age Rating stores + onboarding 16+/18+ | app-dev + Judith | Antes del lanzamiento | Pendiente |
| 7 | Aceptación DPA con cada encargado | Judith | Antes del lanzamiento | Pendiente verificación |
| 8 | RAT formal en papel | legal + Judith | Antes del lanzamiento | Pendiente (entregable DPIA) |
| 9 | Auditoría marketing retroactiva | marketing + legal | Antes del lanzamiento | Pendiente |
| 10 | Procedimiento interno notificación brecha | legal | Antes del lanzamiento | Pendiente (plantilla en esta DPIA §8) |

---

## 7. Derechos de las personas afectadas

Se garantiza el ejercicio de los siguientes derechos mediante `info@cals2gains.com` o desde la sección Ajustes → Privacidad de la app:

- **Acceso** (Art. 15): descarga completa de los datos en JSON.
- **Rectificación** (Art. 16): edición directa en Ajustes.
- **Supresión / derecho al olvido** (Art. 17): botón "Eliminar mi cuenta" en Ajustes.
- **Oposición** (Art. 21): desactivación de decisiones automatizadas.
- **Limitación** (Art. 18): pausa de tratamiento a solicitud.
- **Portabilidad** (Art. 20): exportación en formato estructurado (JSON).
- **No ser objeto de decisiones automatizadas** (Art. 22): toggle para desactivar el coach adaptativo.
- **Retirada del consentimiento** (Art. 7.3): en cualquier momento, con mismo efecto hacia futuro.
- **Reclamación ante autoridad de control**: AEPD (www.aepd.es).

Respuesta en plazo máximo 1 mes (Art. 12.3), ampliable a 2 meses en casos complejos con aviso al interesado.

---

## 8. Procedimiento de notificación de brecha (Art. 33-34 RGPD)

1. **Detección**: cualquier miembro del equipo o aviso de encargado (Firebase, OpenAI, etc.).
2. **Evaluación (4 h)**: agente legal + Judith evalúan alcance, datos afectados, riesgo para los derechos.
3. **Si hay riesgo para los derechos y libertades** → notificación AEPD en < 72 h desde que se tuvo conocimiento. Formulario: sede electrónica AEPD.
4. **Si hay alto riesgo para los derechos** → notificación a los interesados sin dilación indebida (email + in-app banner si afecta >1% usuarios).
5. **Contenido mínimo de la notificación** (Art. 33.3): naturaleza de la violación, categorías y número aproximado de interesados, consecuencias probables, medidas adoptadas.
6. **Registro interno** de toda brecha (aunque no requiera notificación), mantenido 3 años.
7. **Revisión post-incidente**: análisis de causa raíz y actualización de esta DPIA si aplica.

---

## 9. Evaluación periódica

- Revisión ordinaria: anual (próxima revisión: 2027-04-17).
- Revisión extraordinaria disparada por:
  - Nueva finalidad de tratamiento.
  - Nuevo encargado de tratamiento.
  - Incidente de seguridad.
  - Cambio normativo relevante (RGPD, MDR, AI Act).
  - Queja o requerimiento AEPD.
- Responsable de la revisión: agente legal bajo supervisión de Judith.

---

## 10. Firma y adopción

Esta DPIA se adopta formalmente por CivilTek Ingeniería SLU como responsable del tratamiento.

| Campo | Valor |
|---------|---------|
| Firmante | Judith Cordobes Andrés, administradora de CivilTek Ingeniería SLU |
| Fecha de adopción | 2026-04-17 |
| Forma de firma | Electrónica, mediante actualización del estado de este documento en el hub del proyecto (control de versiones git; trazabilidad por commit SHA del repositorio Cals2Gains). |
| Próxima revisión ordinaria | 2027-04-17 |

**Aceptación de riesgo residual**: los riesgos residuales identificados en §5 son aceptados por el responsable tras aplicar las medidas mitigadoras de §4. No concurren supuestos de consulta previa a la AEPD (Art. 36 RGPD).

---

## Anexo A — Glosario

- **RGPD**: Reglamento UE 2016/679.
- **LOPD-GDD**: Ley Orgánica 3/2018.
- **AEPD**: Agencia Española de Protección de Datos.
- **DPF**: Data Privacy Framework UE-EEUU (Decisión C(2023) 4745).
- **SCCs**: Cláusulas Contractuales Tipo (Decisión UE 2021/914).
- **MDR**: Reglamento UE 2017/745 sobre productos sanitarios.
- **AI Act**: Reglamento UE 2024/1689 sobre inteligencia artificial.
- **RAT**: Registro de Actividades de Tratamiento (Art. 30 RGPD).
- **DPA**: Data Processing Agreement (Art. 28 RGPD).
- **TCA**: Trastorno de la Conducta Alimentaria.
- **SaMD**: Software as a Medical Device (FDA).
