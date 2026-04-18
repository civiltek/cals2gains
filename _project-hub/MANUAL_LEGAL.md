# Manual Legal y de Cumplimiento — Cals2Gains

> **Versión:** 1.0 · **Fecha:** 2026-04-17 · **Responsable del tratamiento:** Judith Cordobes Andrés (CivilTek Ingeniería SLU)
> **Estado:** Vivo. Fuente de verdad del cumplimiento. Revisión ordinaria semestral (próxima 2026-10-17) o inmediata ante cambio normativo, nuevo encargado, incidente o expansión geográfica.
> **Alcance:** consolida en un único documento las reglas, procedimientos y plantillas legales que gobiernan Cals2Gains. Si un archivo específico del hub (DPIA, RAT, privacy.html, terms.html, auditorías) se contradice con este manual, se alinea en la siguiente revisión semestral — nunca se ignora.

---

## 0. Filosofía legal base

Tres principios no negociables:

1. **Cumplir por diseño, no por reacción.** El cumplimiento RGPD, MDR, AI Act y de plataformas se aplica **antes** de exponer la funcionalidad al usuario, no como parche posterior. Si algo nuevo toca datos de salud, claims o decisiones automatizadas, la revisión legal precede al código.
2. **Conservadurismo frente a incertidumbre.** Cuando una norma admite varias lecturas, se adopta la interpretación más protectora para la persona usuaria y más defensiva para la empresa. La app no cruza la Regla 11 MDR, no hace claims fuera del Reg 1924/2006 y no recoge datos innecesarios aunque técnicamente los pudiera justificar.
3. **Trazabilidad verificable.** Todo documento legal vive en el repositorio git. Cualquier cambio queda registrado con SHA de commit, fecha y autor. No hay "cambios silenciosos" ni versiones sueltas en drives dispersos.

---

## 1. Estructura societaria y jurisdicción

| Campo | Valor |
|-------|-------|
| Responsable | CivilTek Ingeniería SLU |
| Nombre comercial | Cals2Gains |
| Domicilio social | España |
| Jurisdicción aplicable | Derecho español |
| Tribunales competentes | Madrid (domicilio social), sin perjuicio del derecho del consumidor a demandar en su propio domicilio (RDL 1/2007 + Reg UE 1215/2012 Bruselas I bis) |
| Mercados destino | Unión Europea (activo), EEUU (activo), Reino Unido (en evaluación) |
| Idioma oficial de documentos legales | Español (castellano) + inglés (EN) como traducción de cortesía. En caso de conflicto entre versiones, prevalece la española |
| Contacto protección de datos | `info@cals2gains.com` |
| Contacto corporativo | `info@civiltek.es` |

**DPO (Delegado de Protección de Datos):** no designado obligatoriamente. No concurren los supuestos del Art. 37.1 RGPD (no somos autoridad pública, el tratamiento de datos de salud no es la actividad principal ni a gran escala en los términos del EDPB WP243). La función de privacidad la asume Judith Cordobes con apoyo del agente legal interno. Revisar obligación de designar DPO cuando: (a) el total de usuarios activos supere los 250.000 en EEE, (b) se añada monitorización sistemática a gran escala, (c) se contrate equipo ≥10 personas con acceso a datos de salud.

---

## 2. Protección de datos — RGPD + LOPD-GDD

### 2.1 Datos que tratamos (mapa)

Inventario detallado en `_project-hub/RAT_v1.md`. Resumen:

| Tipo | Categoría RGPD | Origen |
|------|-----------------|--------|
| Identificativos (nombre, email, foto SSO) | Ordinarios (Art. 6) | SSO Apple/Google |
| Perfil físico (edad, sexo, peso, altura) | **Salud (Art. 9)** | Declarado |
| `medicalFlags` (embarazo, TCA-sensible, diabetes, renal, minoría) | **Salud (Art. 9)** | Declarado |
| Composición corporal (%BF, LBM) | **Salud (Art. 9)** | Declarado / InBody / HealthKit |
| Registros (comidas, peso, medidas, fotos, ayunos) | **Salud (Art. 9)** | Usuario |
| Actividad (pasos, calorías, entrenamientos) | **Salud (Art. 9)** | HealthKit / Health Connect |
| Suscripción / facturación | Contractual | Apple / Google / RevenueCat |
| Analítica anónima | Anónimos | GA4 con IP masking |
| Email marketing | Ordinarios (consentimiento) | Formulario lead magnet |

### 2.2 Bases legales (Art. 6 y 9)

| Tratamiento | Base Art. 6 | Base Art. 9 si aplica |
|-------------|-------------|------------------------|
| Cuenta y autenticación | 6.1.b (contrato) | — |
| Objetivos nutricionales | 6.1.b | **9.2.a consentimiento explícito** |
| Registros de comidas / peso / fotos | 6.1.b | **9.2.a** |
| `medicalFlags` | 6.1.b | **9.2.a** con checkbox separado y granular |
| Análisis IA de comidas | 6.1.b | 9.2.a si la foto muestra rasgos biométricos |
| Coach adaptativo | 6.1.b | **9.2.a** (toggle opt-in, reversible) |
| HealthKit / Health Connect | 6.1.a consentimiento en S.O. | **9.2.a** |
| Pagos | 6.1.b + 6.1.c (facturación) | — |
| Email marketing | 6.1.a consentimiento + LSSI-CE Art. 21 | — |
| Analítica anónima | 6.1.f interés legítimo | — |
| Atención y ejercicio de derechos | 6.1.c | — |

### 2.3 Consentimientos — forma, registro y revocación

**Requisitos del consentimiento Art. 9.2.a:**
- **Explícito:** declaración afirmativa, NO casilla premarcada, NO "silencio equivale a sí".
- **Granular:** un checkbox por finalidad. No se mezcla consentimiento para `medicalFlags` con consentimiento para email marketing.
- **Informado:** enlace a `privacy.html` visible antes del click. Texto del consentimiento menciona expresamente "Art. 9.2.a RGPD".
- **Libre:** no se condiciona la prestación del servicio al consentimiento a finalidades no estrictamente necesarias. El usuario puede usar la app sin declarar `medicalFlags`.
- **Registrable:** al aceptar se almacena tupla `{userId, consentType, versionPrivacy, timestamp, method}` en `consentHistory` (implementado en userStore).
- **Revocable:** mismo acceso para retirar que para dar. En Ajustes → Condiciones declaradas → "Retirar consentimiento" → vacía `medicalFlags` y registra `consent_revoked` con timestamp.

**Texto canónico del consentimiento para `medicalFlags`** (ES):

> He leído la [Política de Privacidad](https://cals2gains.com/privacy.html) y consiento expresamente el tratamiento de estos datos de salud para adaptar las recomendaciones de la app (base legal: Art. 9.2.a RGPD). Puedo retirar este consentimiento en Ajustes en cualquier momento sin que ello afecte a la licitud del tratamiento anterior.

**EN:**

> I have read the [Privacy Policy](https://cals2gains.com/privacy.html) and I expressly consent to the processing of these health-related data to adapt the app's recommendations (legal basis: Art. 9.2.a GDPR). I may withdraw this consent at any time in Settings without affecting the lawfulness of processing carried out prior to withdrawal.

### 2.4 Derechos ARSOLIP (Art. 15-22 RGPD)

| Derecho | Cómo se ejerce | Plazo respuesta |
|---------|------------------|------------------|
| Acceso (15) | Ajustes → Exportar mis datos (JSON) o `info@cals2gains.com` | 1 mes (ampliable a 2 con aviso) |
| Rectificación (16) | Edición directa en Ajustes | Inmediato |
| Supresión / olvido (17) | Ajustes → Eliminar mi cuenta | ≤30 días (con purgado backups 90 días) |
| Limitación (18) | `info@cals2gains.com` | 1 mes |
| Portabilidad (20) | Exportación JSON desde Ajustes | Inmediato |
| Oposición (21) | Toggle en Ajustes por finalidad | Inmediato |
| No ser objeto de decisiones automatizadas (22) | Toggle "Adaptación automática de objetivos" OFF | Inmediato |
| Retirada de consentimiento (7.3) | Ajustes → Condiciones declaradas → Retirar | Inmediato |
| Reclamación autoridad | AEPD: `www.aepd.es` | — |

El usuario recibe confirmación por email de cualquier ejercicio de derechos tramitado.

### 2.5 Encargados de tratamiento (Art. 28)

Relación completa en `RAT_v1.md`. Cada encargado debe tener:
- DPA firmado o Términos empresariales aceptados.
- Obligación de cooperar en auditorías y en atención a derechos.
- Obligación de notificar brechas al responsable sin dilación.
- Compromiso de no usar los datos para finalidades propias (especialmente "no training" para OpenAI).
- Eliminación al terminar la relación.

Encargados actuales:

| Proveedor | Servicio | DPA / Términos | Transferencia |
|-----------|----------|----------------|---------------|
| Google LLC | Firebase (Auth, Firestore, Storage), GA4, Health Connect, Google Sign-In, Play Store | Google Data Processing Addendum | EEUU — DPF 2023 + SCCs 2021/914 |
| OpenAI LLC | GPT-4o Vision, Whisper, GPT-4o-mini | OpenAI Business Terms + DPA | EEUU — DPF 2023 + SCCs |
| Apple Inc. | Sign in with Apple, HealthKit, App Store | Apple Developer Agreement + App Store Review Guidelines | EEUU — DPF 2023 + SCCs |
| RevenueCat Inc. | Middleware de suscripciones | RevenueCat DPA | EEUU — DPF 2023 + SCCs |
| Brevo (Sendinblue) | Email marketing | Brevo DPA | Francia (UE) — no aplica |
| Open Food Facts | API pública de productos | Datos abiertos | Francia (UE) |

**Procedimiento para añadir nuevo encargado:**
1. Evaluar necesidad real frente a proveedores existentes.
2. Revisar política de privacidad y términos del proveedor (especial atención a entrenamiento de modelos, subcontratas, jurisdicción).
3. Firmar o aceptar DPA con cláusulas mínimas Art. 28.3 RGPD.
4. Documentar en `RAT_v1.md`.
5. Actualizar `privacy.html` si afecta a datos visibles al usuario.
6. Registrar fecha de alta y SHA del commit que introduce el cambio.

### 2.6 Transferencias internacionales

EEUU: Decisión de Adecuación UE-EEUU Data Privacy Framework (Decisión C(2023) 4745 de 10/07/2023). Todos los encargados de EEUU están autoinscritos en el DPF; se verifica anualmente en `https://www.dataprivacyframework.gov/`.

Refuerzo: Cláusulas Contractuales Tipo (Decisión UE 2021/914) como fallback si el DPF fuera invalidado (Schrems III potencial). Los DPA de Google, OpenAI, Apple y RevenueCat ya incluyen SCCs.

Ningún país fuera de UE/EEE/EEUU-DPF. Si se expande a otros mercados, se reevalúa.

### 2.7 Plazos de conservación

Tabla consolidada (detalles en `RAT_v1.md`):

| Dato | Plazo | Base |
|------|-------|------|
| Cuenta + perfil | Activa + 30 días post-baja; backups purgados ≤90 días | Contrato |
| Datos de salud | Ídem + opción borrado inmediato en Ajustes | Consentimiento revocable |
| Historial coach (ajustes) | 24 meses o hasta baja | Finalidad analítica personal |
| Logs técnicos anonimizados | 12 meses | Art. 6.1.f |
| Email marketing | Hasta baja; después 3 años en lista negra | LOPD-GDD Art. 82 |
| Facturación | 6 años | Art. 30 CC + Art. 66 LGT |
| Atención al usuario | 3 años desde última comunicación | LOPD-GDD Art. 82 |
| Consentimientos | Tiempo de tratamiento + 3 años | LOPD-GDD Art. 82 |

### 2.8 Privacy by design y by default (Art. 25)

Check-list aplicado en cada feature nueva:

- [ ] ¿Recoge el dato estrictamente necesario para la finalidad?
- [ ] ¿Se ha evaluado una alternativa que no requiera ese dato?
- [ ] ¿La categoría es ordinaria o Art. 9? Si Art. 9, ¿hay consentimiento explícito granular?
- [ ] ¿Se loguea el dato en crash reports o telemetría? (Debe ser NO.)
- [ ] ¿Está cifrado en tránsito (TLS 1.3) y en reposo?
- [ ] ¿Tiene regla de acceso restringida por UID del propietario?
- [ ] ¿El usuario puede ver, exportar y borrar el dato desde Ajustes?
- [ ] ¿Se ha actualizado `privacy.html`, `RAT_v1.md` y (si aplica) `DPIA_v1.md`?

### 2.9 Brecha de seguridad — procedimiento Art. 33-34

**Definición:** violación de seguridad que ocasiona destrucción, pérdida, alteración, comunicación o acceso no autorizados a datos personales.

**Protocolo:**

```
T+0       Detección (interno o aviso de encargado)
T+0 a 4h  Triaje: alcance, datos afectados, vía de exfiltración, reversibilidad
T+4 a 24h Contención: rotar credenciales, revocar tokens, aislar sistema
T+24h     Decisión:
          - riesgo para derechos y libertades → notificar AEPD (≤72h)
          - riesgo alto → notificar a afectados sin dilación (email + banner in-app)
          - riesgo nulo → registro interno, no notificación
T+72h     Notificación AEPD si procede (sede electrónica, Art. 33.3 contenido mínimo)
T+30d     Post-mortem: causa raíz, lecciones, revisión DPIA
```

**Plantilla de notificación a AEPD:** ver §14.2.

**Plantilla de notificación a afectados:** ver §14.3.

### 2.10 Decisiones automatizadas (Art. 22)

El coach adaptativo semanal y la alerta de pérdida excesiva son **decisiones automatizadas parciales**. Desde el punto de vista legal se ha optado por el criterio más conservador:

- Declaramos que NO producen efectos jurídicos ni afectan significativamente al usuario (son orientativas, reversibles y no condicionan acceso al servicio).
- Aun así reconocemos expresamente los derechos del Art. 22: oposición, solicitud de no-adaptación, intervención humana y derecho de explicación.
- El toggle "Adaptación automática de objetivos" en Ajustes materializa el derecho de oposición.
- El usuario puede pedir explicación del criterio por `info@cals2gains.com` — se devuelve el resumen del §5 de `METODOLOGIA_NUTRICIONAL.md` adaptado a sus datos.

---

## 3. Frontera MDR — por qué Cals2Gains NO es producto sanitario

### 3.1 Criterios del Reg UE 2017/745 (MDR) + MDCG 2019-11

Un software es producto sanitario (MDSW) si cumple los tres requisitos acumulativos de MDCG 2019-11:
1. **Finalidad médica propia** (no solo infraestructura) — diagnosticar, prevenir, monitorizar, tratar o aliviar enfermedad; compensar lesión/discapacidad; investigación fisiológica/patológica; regulación de concepción.
2. **Beneficio a paciente individual** específico (no población).
3. **Procesamiento de datos más allá de almacenamiento, archivo, comunicación simple o búsqueda lossless**.

La Regla 11 MDR clasifica los MDSW que ayudan a decisiones diagnósticas/terapéuticas:
- **Clase IIa** por defecto.
- **Clase IIb / III** si la decisión puede causar daño grave / muerte.

### 3.2 Por qué Cals2Gains queda fuera

| Criterio | Cals2Gains |
|----------|-------------|
| Finalidad declarada | Estilo de vida y bienestar nutricional |
| Público objetivo | Personas adultas sanas (16+, 18+ para déficit) |
| Lo que hace | Estimación orientativa de macros; sugerencias; seguimiento |
| Lo que NO hace | No diagnostica, no prescribe, no trata, no previene enfermedades, no interpreta biomarcadores clínicos |
| Output | Orientativo, siempre editable por el usuario, nunca presentado como prescripción |
| Copy | "Recomendamos", nunca "prescribimos"; disclaimer ubicuo; derivación a profesional en perfiles sensibles |
| Datos de salud | Declarados por el usuario o provenientes de HealthKit/Health Connect; no se infiere diagnóstico a partir de ellos |

**Mitigantes que mantienen Cals2Gains fuera de MDR:**
- Screening médico con bloqueo de modos agresivos en embarazo, diabetes, enf. renal, menores.
- Disclaimer ubicuo en 4 puntos críticos (resultado onboarding, plan, notificaciones, alertas).
- Declaración inequívoca de no-MDR en `privacy.html`, `terms.html` y ficha de stores.
- Ajustes automáticos siempre reversibles por el usuario.
- Sin integración con historia clínica electrónica ni con profesionales sanitarios.

### 3.3 Línea roja — funcionalidades que NO podemos añadir

Si alguna de estas entra al roadmap, **se abre reclasificación MDR y hay que re-evaluar todo el stack**:

- Diagnóstico o sospecha diagnóstica automatizada ("posible TCA", "riesgo de diabetes", "deficiencia de vitamina X").
- Prescripción de dieta para una patología ("dieta para diabetes tipo 2").
- Interpretación de analíticas clínicas o biomarcadores (glucemia, perfil lipídico, etc.) con output accionable médico.
- Recomendaciones terapéuticas en pacientes identificados como enfermos.
- Integración con dispositivos que monitoricen signos vitales con finalidad diagnóstica.
- Coach conversacional que responda preguntas médicas específicas.

Antes de desarrollar cualquiera de lo anterior, abrir informe de clasificación MDR.

### 3.4 Declaración pública de no-MDR

Texto canónico (ES) presente en `privacy.html` §17, `terms.html` §1 y ficha de stores:

> Cals2Gains es una app de estilo de vida y bienestar nutricional destinada a personas adultas sanas. No es un producto sanitario en el sentido del Reglamento UE 2017/745. No diagnostica, no trata ni previene enfermedades. Las recomendaciones son orientativas y no sustituyen el consejo de un profesional sanitario.

---

## 4. AI Act — Reg UE 2024/1689

### 4.1 Clasificación

Cals2Gains contiene varios sistemas de IA:
- Análisis de imágenes (GPT-4o Vision).
- Transcripción de voz (Whisper).
- Estimación de nutrición (GPT-4o-mini).
- Coach adaptativo semanal (GPT-4o-mini).

**Clasificación aplicada:** riesgo limitado (Art. 50).
- No entra en prohibiciones Art. 5.
- No entra en "alto riesgo" Anexo III (al estar fuera de MDR, no cae en el apartado salud).
- Sí entra en "sistemas que interactúan con personas" → obligaciones de transparencia.

### 4.2 Obligaciones de transparencia (Art. 50)

Implementado:
- Banner `AITransparencyBanner` al entrar por primera vez a `ai-review`, `weekly-coach` y `what-to-eat` con el texto:
  > "Las recomendaciones y el asistente de esta app están generados por un sistema de inteligencia artificial. Son orientativas y editables por ti. (Reg. UE 2024/1689 Art. 50)"
- Sección específica en `privacy.html` §5 "Transparencia IA".
- Cláusula en `terms.html` §3-§4 sobre contenido generado por IA.

### 4.3 Gobernanza de modelos

Proveedor: OpenAI. Modelos: GPT-4o, GPT-4o-mini, Whisper-1.

- API empresarial con política "no training": los inputs (fotos, audio, texto) NO se usan para entrenar modelos OpenAI.
- Logs de inferencia retenidos por OpenAI 30 días máximo para abuse monitoring; no se usan para otros fines.
- Prompts del sistema documentados y versionados en `services/openai.ts` y en §6 de la metodología.
- Revisión trimestral de prompts para detectar derivas o nuevos claims no autorizados.

### 4.4 Trazabilidad ante reclamación

Si un usuario reclama una estimación IA claramente errónea:
1. Se reconoce el margen de error ±10-15 % ya documentado en privacy y metodología.
2. Se ofrece edición del registro por parte del usuario (ya disponible).
3. Si reiterado, se analiza si el prompt o el modelo necesitan ajuste.
4. No se reembolsa por estimaciones IA erróneas per se — están caracterizadas como orientativas; sí se reembolsa por mal funcionamiento general del servicio.

---

## 5. Claims nutricionales y de salud

### 5.1 Régimen aplicable

- **Reg UE 1924/2006:** declaraciones nutricionales y de salud sobre alimentos.
- **Reg UE 432/2012:** lista positiva UE de health claims autorizados (art. 13.1).
- **Reg UE 1169/2011:** información alimentaria al consumidor.
- **RDL 1/2007 Arts. 19-20:** prácticas comerciales desleales y engañosas.

Aunque Cals2Gains no vende alimentos, sí hace claims sobre nutrición y efectos de alimentación en el cuerpo. Se aplican los mismos criterios por analogía y por Art. 5 RDL 1/2007.

### 5.2 Lista negra — prohibidos

Nunca aparecerán en la app, ni en landing, ni en posts, ni en emails:

- "Quema grasa" / "fat-burning" / "acelera el metabolismo".
- "Detox" / "limpieza" / "purifica".
- "Alimento milagro" / "pérdida rápida sin esfuerzo".
- "Adelgaza comiendo" / "no pases hambre" (como reclamo absoluto).
- "Cura", "previene", "trata" referido a patologías.
- Afirmaciones numéricas absolutas de pérdida/ganancia ("pierde 10 kg en 30 días").
- "100 % preciso" / "IA perfecta" / "exacto".
- Referencias a ingredientes con propiedades no autorizadas ("detoxifica el hígado", "quema calorías mientras duermes").
- Testimonios ficticios o no consentidos por escrito.

### 5.3 Lista blanca — autorizados

Claims que SÍ podemos hacer con respaldo:

- "Proteína contribuye al mantenimiento de la masa muscular" (EFSA/Reg 432/2012).
- "La hidratación adecuada contribuye al mantenimiento de funciones cognitivas y físicas normales" (EFSA).
- "Seguimiento de la ingesta calórica respaldada por el método Mifflin-St Jeor (±10-15 %)".
- "Basado en literatura científica: ISSN, ACSM, EFSA, IOM" (siempre que esté referenciado).
- "Recomendaciones orientativas; no sustituyen consejo profesional".

### 5.4 Proceso de revisión de copy

Toda pieza nueva de marketing o in-app pasa por:

1. Redacción inicial por `marketing` o `app-dev`.
2. Revisión por `legal` contra lista negra/blanca y contra `METODOLOGIA_NUTRICIONAL.md §9`.
3. Check de coherencia brand (`brand` / `BRAND.md`).
4. Aprobación de Judith si se trata de campaña, claim nuevo o email público.
5. Publicación + registro del SHA de commit.

Ante duda: **no publicar** y consultar. Es más barato no publicar que rectificar.

---

## 6. Menores y publicidad a menores

### 6.1 Política de edad (decisión de producto adoptada)

- **Uso general:** permitido desde **16 años** cumplidos (por encima del mínimo legal RGPD+LOPD de 14, por protección reforzada en apps de salud/nutrición).
- **Modos con déficit calórico** (`lose_fat`, `mini_cut`): restringidos a **18+**.
- **Verificación:** declaración de fecha de nacimiento en onboarding. Sin verificación fuerte (Apple/Google no permiten KYC de edad a nivel app; rating en store es la otra capa).
- Si el usuario declara <16, se bloquea el acceso.

### 6.2 Publicidad dirigida a menores — prohibida

- No se hace publicidad (orgánica o pagada) con claims nutricionales a menores de 15 años (**Ley 17/2011 Art. 44**).
- No se emplean personajes, colores, lenguaje o formatos que apelen a menores.
- No se incluyen menores en imágenes de marketing sin consentimiento escrito de titulares de patria potestad y revisión legal previa.
- Cumplimiento **Código PAOS** — autorregulación publicidad alimentaria a menores en España.

### 6.3 Plataformas — age rating

- **Apple App Store:** Age Rating 17+. Cuestionario con "Medical/Treatment Information: Infrequent/Mild". Ver `AGE_RATING_STORES.md`.
- **Google Play:** Content Rating Teen o Mature 17+ (según IARC) + Target Age 18 and over + Families Policy "Not directed at children".
- **Revisión:** cada release mayor que afecte a funcionalidad de salud → recomprobar age rating.

### 6.4 Menores 16-17 (zona especial)

- Pueden usar la app en modo `maintain`, `gain_muscle`, `lean_bulk`, `recomp`.
- No se les muestra `lose_fat` ni `mini_cut` en la UI.
- Se recomienda (en copy del age gate) acompañamiento familiar o profesional para objetivos físicos.
- Los `medicalFlags` siguen siendo opcionales y confidenciales; no se comparten con tutores por defecto.
- En caso de país con consentimiento parental obligatorio hasta los 18 (no aplica España, sí algunos estados UE), el onboarding lo recoge.

---

## 7. Plataformas de distribución

### 7.1 Apple App Store

Políticas aplicables:
- **Guideline 1.4.1** — Physical Harm: apps con consejo de salud deben ser precisas y cuidadosas.
- **Guideline 1.4.2** — Drugs/Medical: no vendemos ni prescribimos sustancias.
- **Guideline 5.1.1(ix)** — HealthKit: datos HK no se usan para publicidad, profiling comercial ni entrenamiento de modelos (compromiso en `privacy.html` §2.7).
- **Guideline 5.1.1(i)** — Privacy policy obligatoria.
- **Guideline 3.1** — In-App Purchases vía StoreKit para contenido digital.
- **App Review Timelines:** media 24-48 h. Rechazo por salud: frecuente si falta disclaimer o si age rating es bajo.

Compromisos Cals2Gains:
- Age rating 17+ confirmado.
- Disclaimer ubicuo y visible.
- HealthKit con uso restringido y declarado.
- Subscripciones gestionadas exclusivamente por StoreKit.

### 7.2 Google Play

Políticas:
- **Developer Program Policies — Health Content:** obligatoria precisión, no promover prácticas dañinas (especial atención a TCA).
- **Families Policy:** no dirigido a menores de 13.
- **Target Age:** campo separado del rating IARC; se fija 18+.
- **Health and Fitness category** — compliance general.
- **Content Rating Questionnaire IARC:** responder "Yes" a "Health, medical or treatment information".

Compromisos:
- No se usa contenido generado por usuarios de otros usuarios (no hay feed público).
- Datos de Health Connect con uso restringido idéntico a HealthKit.

### 7.3 HealthKit / Health Connect — compromisos explícitos

Documentados en `privacy.html` §2.7 y en los DPA:

- Los datos provenientes de HealthKit / Health Connect **no se usan para**:
  - Publicidad dirigida ni remarketing.
  - Profiling comercial.
  - Entrenamiento de modelos propios o de terceros.
  - Cesión a terceros con fines distintos a la prestación del servicio.
- Se usan únicamente para calcular TDEE dinámico, alimentar el coach adaptativo y mostrar métricas al usuario.
- Se borran al revocar el permiso del S.O.

### 7.4 Suscripciones e in-app purchases

- Gestión exclusiva por Apple StoreKit y Google Play Billing vía RevenueCat como middleware.
- No se procesan datos de tarjeta en ningún momento por Cals2Gains.
- Cancelación y reembolso según política de cada plataforma. En España, aplica también derecho de desistimiento de 14 días para primera suscripción (RDL 1/2007 Art. 102) salvo que el usuario haya activado el servicio premium explícitamente y lo reconozca en pantalla de paywall — verificar copy.

---

## 8. Responsabilidad civil y consumidores

### 8.1 Marco aplicable

- **RDL 1/2007** — Ley General para la Defensa de Consumidores y Usuarios.
- **Código Civil Art. 1902** — responsabilidad extracontractual.
- **Reg UE 1215/2012 (Bruselas I bis)** — competencia judicial.
- **Reg UE 524/2013** — ODR, resolución alternativa online.

### 8.2 Limitación de responsabilidad (en `terms.html` §12)

Qué SÍ podemos excluir:
- Garantía de resultados específicos (pérdida/ganancia de peso concreta).
- Daños derivados de seguir recomendaciones sin consultar profesional cuando la app expresamente lo recomendó (disclaimer ubicuo).
- Daños por uso fuera del propósito declarado (p. ej. usar la app para pautar a un paciente renal grave).
- Tope económico: 50 € o la cuota de 12 meses de suscripción, la mayor.

Qué NO podemos excluir (ius cogens — consumidores UE):
- Dolo o negligencia grave del responsable.
- Daños personales directamente causados por defectos del servicio (no por uso).
- Fraude.
- Derechos irrenunciables del consumidor (RDL 1/2007 Art. 10).

### 8.3 Garantías

- Servicio "as is" dentro del alcance declarado.
- Disponibilidad razonable (no hay SLA contractual; objetivo interno >99 % mensual).
- Actualizaciones de seguridad cuando procedan.
- Atención al usuario en plazo ≤1 mes para ejercicios de derechos; ≤7 días laborables para incidencias técnicas graves.

### 8.4 Resolución de disputas

1. **Contacto directo:** `info@cals2gains.com`. Plazo de respuesta 7 días laborables.
2. **Hoja de reclamaciones:** si el usuario es consumidor en España, se le facilita hoja oficial a petición.
3. **ODR — Plataforma de Resolución de Litigios en Línea:** `https://ec.europa.eu/consumers/odr` (enlace en `terms.html` §18).
4. **Jurisdicción:** tribunales Madrid, sin perjuicio del derecho del consumidor a demandar en su propio domicilio.

---

## 9. Contenido de usuario y contenido IA

### 9.1 Fotos de comida

- Subidas por el usuario, procesadas por OpenAI (política no-training), guardadas en Firebase Storage con acceso restringido al propietario.
- Cal2Gains no reclama derechos sobre estas fotos. El usuario puede exportarlas y borrarlas.
- En raras ocasiones (reporte de fallo, debug), Judith puede solicitar permiso al usuario para ver una foto específica — solo con consentimiento escrito expreso, y tras el cierre del ticket se elimina la copia de trabajo.

### 9.2 Fotos de progreso

- Mismo régimen que fotos de comida, con cifrado adicional y URL firmadas de caducidad corta.
- **Nunca** se usan para marketing. Si se quiere usar una foto de un usuario en marketing, requiere contrato de cesión de derechos específico (RGPD Art. 9 + LO 1/1982 imagen).

### 9.3 Contenido generado por IA — política de entrenamiento

- **OpenAI:** los inputs de Cals2Gains NO se usan para entrenar modelos OpenAI. Confirmado por Business Terms.
- **Uso interno:** Cals2Gains NO entrena modelos propios con datos de usuarios sin consentimiento específico y DPIA actualizada. Si en el futuro se quisiera fine-tunear un modelo con datos de usuarios, el proceso requiere:
  - Consentimiento específico adicional opt-in.
  - Anonimización previa (ISO/IEC 20889).
  - Actualización DPIA + privacy.html.
  - Evaluación AI Act para re-clasificación si cambia el rol (podríamos pasar a ser "provider" con más obligaciones).

### 9.4 Moderación

- No hay contenido público generado por usuarios (no hay feed, no hay comentarios, no hay perfiles públicos).
- Las reseñas en App Store / Play se moderan por las plataformas.
- Si aparecen contenidos dañinos en redes sociales de la marca (comentarios en IG/FB), la política está en `marketing` y `growth` — no en este manual.

---

## 10. Marketing y publicidad

### 10.1 Email marketing y LSSI-CE

- Solo a personas que han dado consentimiento explícito opt-in en un formulario con finalidad clara.
- Checkbox NO premarcado. Texto del checkbox: "Quiero recibir contenido nutricional y novedades de producto (puedo darme de baja en cada envío)".
- Enlace de baja visible y funcional en cada email.
- Lista de exclusión permanente para emails que se dieron de baja.
- Registro de consentimiento: email, timestamp, IP, versión del formulario.
- Proveedor: Brevo (UE, no transferencia internacional).

### 10.2 Testimonios — política obligatoria

Tras la auditoría v1, queda establecido:

- **Prohibido** publicar testimonios ficticios, inventados o modificados.
- **Prohibido** publicar testimonios con cifras de pérdida/ganancia de peso ("perdí X kg") salvo con:
  - Consentimiento escrito de la persona (Art. 6.1.a + Art. 9 si cifras).
  - Verificación razonable de la cifra.
  - Revisión legal del texto completo.
- **Preferido:** testimonios sobre experiencia, adherencia, facilidad de uso, motivación — sin cifras biométricas.
- **Obligatorio:** al publicarse, etiquetado claro cuando aplica (por ejemplo, si es colaboración remunerada, según Autocontrol y Código de conducta).

### 10.3 Influencers y colaboraciones

- Contrato por escrito con cláusulas de derechos de imagen, uso, duración, exclusividad, retribución, cumplimiento normativo (no claims prohibidos, no dirigido a menores, etiquetado "publi" / "colab" según Autocontrol).
- Briefing explícito con lista negra de palabras y lista blanca aprobada.
- Revisión previa del contenido antes de publicación.
- Registro de cada colaboración en `marketing/collaborations/` con contrato, copia del post, fecha.

### 10.4 UGC (User Generated Content)

- La app no recoge UGC público hoy.
- Si se añadiera (ej. compartir recetas), requiere:
  - Términos de uso específicos (derechos de publicación, moderación).
  - Moderación proactiva según DSA 2022/2065 si aplica escala.
  - Revisión derechos de terceros (copyright en fotos, recetas atribuidas).

---

## 11. Procedimientos operativos

### 11.1 Ejercicio de derechos por el usuario

Entrada: email a `info@cals2gains.com` o petición in-app.

```
T+0       Recepción. Confirmación automática al usuario en ≤24h.
T+0 a 3d  Verificación de identidad (asociar email al UID, challenge adicional si duda).
T+3 a 30d Tramitación efectiva según derecho solicitado.
T+30d     Respuesta al usuario con acción tomada (acceso → enlace de descarga; supresión → confirmación; etc.).
          Si caso complejo → ampliación a 2 meses con aviso motivado (Art. 12.3).
```

Registro en log interno (3 años).

### 11.2 Notificación de brecha a AEPD

- Formulario: sede electrónica `https://sedeagpd.gob.es` → "Notificación de brechas".
- Plazo: 72 h desde conocimiento.
- Contenido (Art. 33.3):
  1. Naturaleza de la brecha, categorías y número aproximado de interesados y registros afectados.
  2. Nombre y contacto del DPO o equivalente (Judith Cordobes, info@cals2gains.com).
  3. Consecuencias probables.
  4. Medidas adoptadas o propuestas.

Ver plantilla §14.2.

### 11.3 Notificación a afectados (Art. 34)

Cuando haya **alto riesgo** para los derechos. Canal: email + banner in-app simultáneo. Contenido en lenguaje claro (no jurídico). Plantilla §14.3.

### 11.4 Requerimiento de autoridad

- Autoridades competentes (AEPD, juzgados, Guardia Civil cibercrimen, equivalentes UE): responder con la información estrictamente requerida en el plazo indicado.
- Informar al usuario afectado salvo orden judicial expresa en contrario.
- Archivar el requerimiento y la respuesta en log cerrado.

### 11.5 Conflicto con App Store / Play

- Rechazo en review: leer el motivo, ajustar, re-submit. Si recurrente, abrir ticket formal.
- Suspensión de la app: **emergencia** — notificar a Judith, evaluar si hay datos de usuario en riesgo, plan de comunicación a la base actual.
- Requerimiento de la plataforma (ej. Apple App Review legal team): responder con agente legal en copia.

---

## 12. Gobernanza y revisión

### 12.1 Cadencia

| Documento | Revisión ordinaria | Disparadores extraordinarios |
|-----------|---------------------|--------------------------------|
| `MANUAL_LEGAL.md` (este) | Semestral | Cambio normativo, nuevo encargado, nueva funcionalidad sensible |
| `DPIA_v1.md` | Anual | Idem + incidente |
| `RAT_v1.md` | Semestral | Alta/baja de proveedor, nueva finalidad |
| `privacy.html` / `terms.html` | Semestral | Cambio en cualquier otro documento del hub |
| `AUDITORIA_MARKETING_v1.md` | Trimestral | Nueva campaña, cambio de copy |
| `AGE_RATING_STORES.md` | Antes de cada release mayor | Cambio en stores |

### 12.2 Roles

| Rol | Responsabilidad |
|-----|-------------------|
| Judith Cordobes | Responsable del tratamiento. Firma todo documento legal. Única persona autorizada a aceptar DPAs y a responder requerimientos de autoridad. |
| Agente legal (Claude) | Redacción, revisión, detección de riesgos, plantillas, procedimientos. Autonomía completa salvo litigio/inspección abierta. |
| Agente app-dev | Implementación técnica de controles (screening, disclaimers, consentimientos). |
| Agente web-dev | Mantenimiento de `privacy.html`, `terms.html`, banner cookies. |
| Agente marketing | Producción de copy conforme a lista blanca. |
| Agente ops | Bitácora, CHANGELOG, coordinación. |

### 12.3 Trazabilidad

Todo cambio legal es visible en `git log _project-hub/` y `git log website/*.html`. Adopción formal de un documento = commit con mensaje claro + firma electrónica por actualización del campo "Estado" del propio doc.

---

## 13. Registro consolidado de proveedores

| Proveedor | Servicio | DPA | Sede | Transferencia |
|-----------|-----------|-----|------|----------------|
| Google LLC | Firebase, GA4, Play, Health Connect, Sign-In | Google DPA aceptado | EEUU | DPF + SCCs |
| OpenAI LLC | GPT-4o, Whisper, GPT-4o-mini | OpenAI Business Terms + DPA | EEUU | DPF + SCCs |
| Apple Inc. | Sign in with Apple, HealthKit, App Store | Apple Developer Agreement | EEUU | DPF + SCCs |
| RevenueCat | Suscripciones | RevenueCat DPA | EEUU | DPF + SCCs |
| Brevo | Email marketing | Brevo DPA | Francia | UE |
| Open Food Facts | API productos | Datos abiertos | Francia | UE |

---

## 14. Plantillas operativas

### 14.1 Respuesta a ejercicio de derechos ARSOLIP (email)

```
Asunto: Respuesta a tu solicitud de [derecho solicitado] — Cals2Gains

Hola [nombre],

Hemos recibido tu solicitud de ejercicio del derecho de [acceso / rectificación / supresión / oposición / portabilidad / limitación / no ser objeto de decisiones automatizadas] sobre tus datos personales en Cals2Gains.

[Resultado concreto]
- Acceso: puedes descargar el archivo JSON con todos tus datos en el siguiente enlace (válido 7 días): [url].
- Supresión: tu cuenta y datos asociados han sido eliminados. Los backups se purgan en los próximos 90 días. Se conservan datos de facturación 6 años por obligación legal (Art. 30 C. Comercio y Art. 66 LGT).
- [etc.]

Recuerda que puedes presentar reclamación ante la Agencia Española de Protección de Datos en www.aepd.es si consideras que tus derechos no han sido atendidos adecuadamente.

Saludos,
Cals2Gains · CivilTek Ingeniería SLU · info@cals2gains.com
```

### 14.2 Notificación de brecha a AEPD (plantilla)

Campos a rellenar en la sede electrónica AEPD (formulario oficial):

```
1. Identificación del responsable: CivilTek Ingeniería SLU · CIF [pendiente] · info@cals2gains.com
2. Fecha y hora de conocimiento: [ISO 8601]
3. Origen: [interno / encargado: Firebase / OpenAI / etc.]
4. Naturaleza: [confidencialidad / integridad / disponibilidad — una o varias]
5. Categorías de datos afectados: [identificativos / salud / credenciales / etc.]
6. Número aproximado de interesados afectados: [N]
7. Número aproximado de registros: [N]
8. Consecuencias probables: [pérdida de control sobre datos de salud / riesgo de fraude / etc.]
9. Medidas adoptadas: [contención, rotación de credenciales, comunicación a afectados en caso de alto riesgo]
10. Medidas propuestas para evitar repetición: [parche X, cambio de proceso Y]
```

### 14.3 Notificación a afectados (Art. 34) — plantilla email

```
Asunto: Comunicación importante sobre tus datos en Cals2Gains

Hola [nombre],

Queremos informarte de que hemos detectado un incidente de seguridad que puede haber afectado a algunos de tus datos personales en Cals2Gains.

Qué ha ocurrido: [descripción clara, sin jerga técnica]
Cuándo: [fecha]
Qué datos están implicados: [lista concreta]
Qué no se ha visto afectado: [contrapeso — ej. contraseñas, datos de pago]

Qué estamos haciendo: [acciones inmediatas]
Qué puedes hacer tú: [acciones recomendadas al usuario: cambiar contraseña del email asociado si aplica, revisar actividad en la cuenta, contactar si observa algo anómalo]

Hemos notificado este incidente a la Agencia Española de Protección de Datos en cumplimiento del Art. 33 RGPD.

Si tienes preguntas, escríbenos a info@cals2gains.com.

Lamentamos los inconvenientes y estamos comprometidos con tu privacidad.

El equipo de Cals2Gains
```

### 14.4 Disclaimer ubicuo in-app (texto canónico)

ES:
> Cals2Gains ofrece estimaciones orientativas basadas en literatura científica y no sustituye el consejo de un profesional sanitario. Si tienes una condición médica, estás embarazada o en lactancia, o tienes antecedentes de trastornos de la conducta alimentaria, consulta con tu médico o dietista-nutricionista antes de aplicar estas recomendaciones.

EN:
> Cals2Gains provides guidance based on scientific literature and does not replace the advice of a healthcare professional. If you have a medical condition, are pregnant or breastfeeding, or have a history of eating disorders, please consult your doctor or registered dietitian before applying these recommendations.

### 14.5 Derivación a profesional (cuando flag activo bloquea modo)

ES:
> Para este objetivo en tu situación actual, te recomendamos que lo acompañes con un/a profesional. Puedes activar el modo seguimiento mientras tanto (sin déficit calórico y sin números de calorías si prefieres).

EN:
> For this goal in your current situation, we recommend you pair it with a healthcare professional. You can activate tracking mode meanwhile (no caloric deficit, numbers hidden if you prefer).

### 14.6 Alerta automática de pérdida excesiva (copy canónico)

ES:
> Hemos detectado que tu ritmo de pérdida está siendo superior al rango habitualmente recomendado. Suele ser señal de que el déficit es demasiado agresivo. Vamos a ajustar tu objetivo calórico al alza (+150 kcal/día). Puedes revertirlo en Ajustes. Si esta pérdida rápida es deliberada y la estás haciendo con supervisión profesional, dinos para no volver a ajustar.

EN:
> We've detected that your weight loss pace is higher than the commonly recommended range. It usually means the deficit is too aggressive. We're going to raise your calorie target (+150 kcal/day). You can revert it in Settings. If this fast loss is intentional and under professional supervision, let us know so we don't adjust again.

---

## 15. Normativa aplicable — índice rápido

### UE

- Reg UE 2016/679 (**RGPD**)
- Reg UE 2017/745 (**MDR**) · MDCG 2019-11
- Reg UE 1924/2006 (claims nutricionales y de salud) · Reg UE 432/2012 (lista positiva)
- Reg UE 1169/2011 (información alimentaria)
- Reg UE 2024/1689 (**AI Act**)
- Reg UE 2022/2065 (**DSA**)
- Reg UE 1215/2012 (Bruselas I bis)
- Reg UE 524/2013 (ODR)
- Decisión C(2023) 4745 (DPF UE-EEUU)
- Decisiones UE 2021/914 y 2021/915 (SCCs)

### España

- LO 3/2018 (**LOPD-GDD**)
- Ley 34/2002 (**LSSI-CE**)
- Ley 17/2011 (Seguridad Alimentaria y Nutrición) — Art. 44 publicidad a menores
- RDL 1/2007 (**TRLGDCU** consumidores)
- RD 1591/2009 (productos sanitarios, en lo no derogado)
- Ley 29/2006 (medicamento)
- LO 1/1982 (honor, imagen, intimidad)
- LO 1/1996 (protección jurídica del menor)
- Código de Comercio y LGT (plazos de facturación)
- Código PAOS (autorregulación publicidad alimentaria a menores)
- Código de conducta Autocontrol

### Plataformas

- Apple App Store Review Guidelines
- Google Play Developer Program Policies
- HealthKit / Health Connect Terms
- OpenAI Business Terms + API Data Usage Policies

---

## 16. Backlog legal (pendientes)

| # | Acción | Owner | Estado |
|---|---------|--------|---------|
| 1 | Ejecutar cambios Age Rating en App Store Connect | Judith | 🔴 pendiente |
| 2 | Ejecutar cambios Age Rating en Google Play Console | Judith | 🔴 pendiente |
| 3 | Editar en MBS posts con claims prohibidos antes 20-abr 13:00 | Judith / marketing | 🔴 urgente |
| 4 | Editar anuncio Meta y Email 4 Brevo (testimonios fabricados) | Judith / marketing | 🔴 pendiente |
| 5 | Retirar posts ya publicados en IG/FB con claims incompatibles | Judith / marketing | 🔴 pendiente |
| 6 | Completar CIF oficial en RAT, DPIA y este manual | Judith | 🟡 cosmético |
| 7 | Revisar DPA de cada encargado una vez al año | legal | 🟢 programado |
| 8 | Verificar vigencia DPF en Data Privacy Framework list (anual) | legal | 🟢 programado |
| 9 | Evaluar necesidad de DPO si usuarios activos >250k | Judith + legal | 🟢 diferido |
| 10 | Formación interna anual RGPD+MDR+AI Act para Judith | Judith | 🟢 programado |

---

## 17. Referencias cruzadas a otros documentos del hub

| Documento | Alcance |
|-----------|----------|
| `_project-hub/DPIA_v1.md` | Evaluación de impacto, 15 riesgos, mitigaciones, firmada |
| `_project-hub/RAT_v1.md` | Registro Art. 30 RGPD de los 10 tratamientos |
| `_project-hub/INFORME_LEGAL_v1.md` | Análisis cruzado del §11 metodológico con marco legal |
| `_project-hub/AGE_RATING_STORES.md` | Pasos concretos para actualizar Age Rating en stores |
| `_project-hub/AUDITORIA_MARKETING_v1.md` | Hallazgos de copy retroactivos, correcciones aplicadas y pendientes |
| `_project-hub/METODOLOGIA_NUTRICIONAL.md` | Guía técnica/científica — fuente de verdad del motor |
| `_project-hub/PROMPT_UPDATE_APP.md` | Prompt reutilizable para ejecutar las fases técnicas |
| `website/privacy.html` + `public/privacy.html` | Política de Privacidad v2 pública |
| `website/terms.html` + `public/terms.html` | Términos y Condiciones v2 públicos |
| `Claude code/agents/legal.md` | Definición del agente legal con autonomía completa |

---

## 18. Changelog de este manual

- **2026-04-17 · v1.0** — Primera versión consolidada. Integra y armoniza los documentos legales dispersos (DPIA, RAT, INFORME_LEGAL, AUDITORIA_MARKETING, AGE_RATING_STORES, privacy, terms). Añade procedimientos operativos (brecha, derechos, requerimientos), plantillas (emails, disclaimers), lista negra/blanca de claims, régimen de menores y plataformas, frontera MDR y AI Act. Adoptado por Judith Cordobes (CivilTek Ingeniería SLU).
