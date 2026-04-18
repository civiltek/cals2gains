# Informe legal — Plan de fixes §11 Metodología Nutricional v1.0 y fases A/B/C/D

> **Fecha:** 2026-04-17
> **Autor:** agente legal (Claude) · Definición de rol en `Claude code/agents/legal.md`
> **Estado:** En revisión — requiere validación por abogado/a colegiado/a antes de desplegar.
> **Referencias cruzadas:** `_project-hub/METODOLOGIA_NUTRICIONAL.md` §11, `_project-hub/PROJECT_STATUS.md`.

---

## Riesgos detectados

### [CRÍTICO]

- **C1. Lanzar SIN screening médico (fix §11.3 — Fase B).** Entregar déficit calórico y modos agresivos (`lose_fat`, `mini_cut`) a una persona con TCA activo, embarazada/lactante, diabetes tipo 1, enfermedad renal crónica o menor, sin haberlo preguntado, expone a CivilTek a: (i) reclamación por daños ex Art. 1902 CC por negligencia en diseño; (ii) tratamiento de datos de salud sin base de Art. 9 RGPD específica; (iii) incumplimiento del deber de "privacy by design" (Art. 25 RGPD); (iv) rechazo de Apple (App Review 1.4.1); (v) alerta sanitaria pública si un medio recoge un caso de agravamiento de TCA tras uso de la app. Es el mayor riesgo del conjunto: **no debe haber lanzamiento público sin §11.3 implementado**.

- **C2. Lanzar SIN hard-cap de kcal en onboarding (fix §11.4 — Fase A).** El cálculo actual puede entregar objetivos <1200 kcal ♀ / <1500 ♂ a perfiles ligeros con `mini_cut`. Entregarlos de forma automatizada se parece a prescripción dietética. Riesgo de responsabilidad civil y de infracción del principio "not fit for purpose" y de las guías de Apple 1.4.1.

- **C3. Ausencia del campo `medicalFlags` en el registro de actividades de tratamiento (RAT).** En cuanto se cree el campo, hay que documentarlo en el RAT (Art. 30 RGPD), redactar consentimiento explícito separado y granular (Art. 9.2.a), y reflejarlo en `privacy.html` antes de primer usuario real. Lanzar habiendo empezado a recoger el dato sin esa trazabilidad es infracción grave (Art. 83.5 RGPD: hasta 20 M€ o 4 % facturación).

### [ALTO]

- **A1. Alerta automática de pérdida >1 %/sem (§11.6 / Fase C) — frontera MDR.** Detectar patrón biométrico + generar intervención automática ("sube kcal +150, notifica") es la línea más cercana a software con finalidad médica. Aunque el propósito declarado sea bienestar, Regla 11 MDR + MDCG 2019-11 miran la intención de uso. Hay margen para mantenerse fuera, pero requiere copy muy cuidadoso y disclaimers específicos.

- **A2. Copy de onboarding sobre TCA (Fase B).** Literatura (NICE NG69, APA 2023) advierte que preguntar por TCA con opciones tipo "¿tienes TCA?" puede generar negación, vergüenza o efecto nocebo. Riesgo reputacional alto.

- **A3. Modo "comida intuitiva sin números" (Fase B).** Es la mitigación correcta, pero requiere redactar que la app **no diagnostica TCA**: solo adapta interfaz a petición. Si no, Apple puede entenderlo como "tratamiento psicológico".

- **A4. Ausencia de disclaimers en puntos críticos.** Resultado del cálculo inicial, plan semanal, notificaciones de ajuste, alertas automáticas: ninguno lleva disclaimer actualmente. Sin disclaimer ubicuo, la defensa "solo damos orientación general" se debilita.

- **A5. Menores.** Art. 7 LOPD-GDD fija 14 años como edad válida. Pero una app de restricción calórica dirigida a 14-17 entra en zona de publicidad y salud reguladas por Código PAOS y Ley 17/2011 (art. 44). Apple App Store 1.3 exige Age Rating adecuado (17+ para apps que promueven dietas restrictivas) y Google Play Families Policy bloquea apps con riesgo de daño emocional/físico a menores. **Recomendación firme: 16+ mínimo, 18+ para modos agresivos (`lose_fat` con déficit >15 %, `mini_cut`).**

- **A6. AI Act (Reg UE 2024/1689) — coach adaptativo.** Coach semanal + alerta automática son sistema de IA de riesgo limitado (no alto, si no cruza MDR). Dispara obligaciones de transparencia Art. 50: informar a la persona de que interactúa con un sistema de IA. Mantenerse fuera de MDR nos mantiene fuera de "alto riesgo" del AI Act.

### [MEDIO]

- **M1. Piso 0,5 g/kg de grasa (§11.5 / Fase A).** Lanzar sin él con planes de <0,5 g/kg en mujeres en `mini_cut` tiene literatura (RED-S, Fahrenholtz 2018) vinculándolo a amenorrea. Abre vía a demanda civil.

- **M2. Objetivo hidratación (Fase D).** Sin límite en ancianos/embarazadas podría contraindicar (hiperhidratación, hiponatremia). Mantener como recomendación orientativa con disclaimer.

- **M3. Factor carbos `competition` <60 min (§11.8 / Fase C).** Técnico-metodológico. Si la app dice "optimizado para tu competición" y entrega exceso de carbos, podría argumentarse claim engañoso (RDL 1/2007 Art. 20).

- **M4. Coherencia con contenido ya publicado.** Posts IG, landing o copy que prometan "pérdida de X kg" / "calcula exactamente" contradicen la metodología v1.0 (±10-15 % error honesto). Prácticas engañosas Art. 5-6 RDL 1/2007.

### [BAJO]

- **B1. Documentar coeficiente 0,9 TDEE dinámico (§11.9).** Sin impacto legal directo, útil como evidencia de diligencia.
- **B2. Rangos de validación `constants/nutritionBounds.ts` (§11.10).** Housekeeping. Riesgo de usabilidad/reputación, no legal estricto.

---

## Referencia normativa

**Protección de datos de salud (`medicalFlags`):**
- RGPD Art. 9.1 y 9.2.a — datos de salud, consentimiento explícito granular.
- RGPD Art. 25 — privacy by design: implementar antes del despliegue.
- RGPD Art. 30 — actualizar RAT con finalidad "adaptar recomendaciones a condiciones de salud declaradas".
- RGPD Art. 32 — cifrado en reposo y en tránsito; verificar que no se loguea en crash reports/telemetría.
- RGPD Art. 35 (DPIA) — obligatoria por tratamiento sistemático de salud + decisiones automatizadas (Art. 22).
- LOPD-GDD Art. 7 y Art. 9 — consentimiento menores y categorías especiales.

**Producto sanitario (frontera MDR):**
- Reg UE 2017/745 (MDR) Art. 2.1 + Anexo I + Regla 11.
- MDCG 2019-11 — guía de clasificación de software.
- RD 1591/2009 (en lo no derogado): registro responsables ante AEMPS.

**Claims nutricionales y de salud:**
- Reg UE 1924/2006 Art. 10 — solo claims de lista positiva UE.
- Reg UE 432/2012 — lista de health claims autorizados.
- Ley 17/2011 Seguridad Alimentaria Art. 44 — publicidad a menores.
- RDL 1/2007 Arts. 19-20 — prácticas comerciales desleales/engañosas.

**Plataformas:**
- Apple App Store Review Guideline 1.4.1 — consejo médico/dietético, extrema cautela.
- Apple 5.1.1(ix) — HealthKit no para publicidad/profiling sin consentimiento.
- Google Play Developer Program Policies — Health Content.
- HealthKit / Health Connect Terms.

**AI Act:**
- Reg UE 2024/1689 Art. 50 — transparencia IA.
- Art. 6 + Anexo III — clasificación alto riesgo.
- Considerando 27 — IA en salud, sesgos y fiabilidad.

**Responsabilidad:**
- CC Art. 1902 — responsabilidad extracontractual.
- RDL 1/2007 Art. 128 y ss. — productos/servicios defectuosos.

---

## Acciones propuestas

### Bloqueantes para lanzamiento público

1. **Implementar §11.3 (screening médico)** antes de primer usuario real. Fase B. Owner: app-dev ejecuta, legal revisa copy y consentimiento.
2. **Implementar §11.4 (hard-cap 1200 ♀ / 1500 ♂).** Fase A. Mensaje al activar: *"Hemos ajustado tu objetivo al mínimo seguro recomendado por WHO/ACSM. Déficits mayores requieren supervisión profesional."* Owner: app-dev.
3. **DPIA** (Evaluación de Impacto sobre Protección de Datos). Obligatoria por Art. 35 RGPD. Owner: Judith con apoyo agente legal.
4. **Actualizar `privacy.html` y `terms.html`** con: datos de salud tratados, base legal Art. 9.2.a, decisiones automatizadas Art. 22 + derecho de oposición, transferencias internacionales (DPF 2023), menores, disclaimers "no es dispositivo médico". Owner: web-dev ejecuta, legal redacta.
5. **Registro de actividades de tratamiento (RAT)** — actualizar con nueva finalidad, categorías, destinatarios, plazos, medidas. Owner: Judith con plantilla AEPD.
6. **Disclaimer ubicuo in-app.** Texto canónico (requiere validación):
> *"Cals2Gains ofrece estimaciones orientativas basadas en literatura científica y no sustituye el consejo de un profesional sanitario. Si tienes una condición médica, estás embarazada o en lactancia, o tienes antecedentes de trastornos de la conducta alimentaria, consulta con tu médico o dietista-nutricionista antes de aplicar estas recomendaciones."*
Ubicación: resultado onboarding, plan semanal, cada notificación de ajuste, ficha de alerta automática. Owner: app-dev coloca, legal valida, i18n ES/EN.

### Copy sensible — onboarding screening

7. **Pregunta sobre TCA — wording seguro.** Nunca binaria directa. Propuesta:
> *"Queremos adaptar la app a ti. ¿Alguna de estas situaciones te aplica ahora o recientemente?"*
> ☐ Embarazo o lactancia
> ☐ Mi relación con la comida es un tema sensible y prefiero no ver números de calorías
> ☐ Tengo diabetes (tipo 1 o 2)
> ☐ Tengo una enfermedad renal diagnosticada
> ☐ Ninguna de las anteriores

Evitar términos clínicos ("TCA", "anorexia", "bulimia") en UI. Owner: legal redacta, marketing valida tono, app-dev implementa.

8. **Derivación profesional — wording no ansiógeno.** Propuesta:
> *"Para este objetivo en tu situación actual, te recomendamos que lo acompañes con un/a profesional. Puedes activar el modo seguimiento mientras tanto (sin déficit calórico y sin números de calorías si prefieres)."*

Nunca "no puedes usar esta app" ni "no eres apta". Owner: legal + marketing.

### Fronteras MDR / AI Act

9. **Alerta automática §8.3 — acotar propósito.** Copy educativo-orientativo, no prescriptivo:
> *"Hemos detectado que tu ritmo de pérdida está siendo superior al rango habitualmente recomendado. Suele ser señal de que el déficit es demasiado agresivo. Vamos a ajustar tu objetivo calórico al alza (+150 kcal/día). Puedes revertirlo en Ajustes. Si esta pérdida rápida es deliberada y la estás haciendo con supervisión profesional, dinos para no volver a ajustar."*

Crítico: (i) "recomendamos" nunca "te prescribimos"; (ii) siempre reversible; (iii) siempre offramp a profesional. Aleja de Regla 11 MDR. Owner: legal redacta, app-dev implementa.

10. **Declaración de propósito en documentación pública.** Frase estable en Terms, Privacy y descripción stores:
> *"Cals2Gains es una app de estilo de vida y bienestar nutricional destinada a personas adultas sanas. No es un producto sanitario en el sentido del Reg. UE 2017/745. No diagnostica, no trata ni previene enfermedades."*

Owner: legal redacta, web-dev publica.

11. **Transparencia AI Act (Art. 50).** En onboarding y en pantalla del coach: *"Las recomendaciones y el asistente de la app están generados por un sistema de inteligencia artificial."* Owner: app-dev + i18n ES/EN.

### Menores

12. **Subir edad mínima a 16 años** (16+ general, **18+ para modos con déficit calórico**). Cambio en onboarding + Age Rating Apple (17+) y Play (Teen con advertencia). Justificación: evitar exposición de adolescentes a dieta restrictiva (Simpson & Mazzeo 2017). Owner: Judith confirma política, app-dev implementa, marketing actualiza landing.

### Coherencia con contenido publicado

13. **Auditoría de copy existente**: posts IG @cals2gains/@cals2gains_es/@calstogains, landing `website/index.html`, help in-app, newsletters Brevo. Detectar/reformular: promesas numéricas, "calcula exactamente", "adelgaza rápido", "quema grasa", "detox". Sustituir por lenguaje §9.3 metodología. Owner: marketing lista, legal valida, marketing republica. **Estado 2026-04-17: en curso.** Auditoría entregada en `_project-hub/AUDITORIA_MARKETING_v1.md`. Correcciones inequívocas aplicadas a los 6 HTML de landing (testimonios ficticios eliminados, superlativos absolutos reemplazados, rating inventado removido). Pendiente: Age Rating store, i18n "pérdida rápida", Ad Meta testimonio, Email 4 Brevo, posts programados en MBS (posts 15, 17, 22, 23, 25 EN y equivalentes ES).

### Housekeeping regulatorio

14. Entrada en `_project-hub/CHANGELOG.md` y nota crítica en `PROJECT_STATUS.md`: lanzamiento público bloqueado hasta fixes críticos.
15. Actualizar `FEATURES.md` marcando qué features dependen de qué fix para poder activarse.

---

## Requiere validación externa (abogado/a colegiado/a)

- **Texto definitivo de `privacy.html` y `terms.html`** antes de producción.
- **DPIA** — borrador interno, validación por DPO externo o abogado/a RGPD sanitario.
- **Confirmación clasificación MDR** — consultoría regulatoria (BSI, TÜV, abogado/a MDR). Exposición si nos equivocamos: clase IIa (marcado CE obligatorio, organismo notificado, ISO 13485). Coste consulta: ~1-2 k€. **Se recomienda encarecidamente hacerlo antes del lanzamiento público.**
- **Copy del screening TCA** — validación por profesional de salud mental con experiencia en TCA.
- **Decisión de edad mínima** — validar con Apple/Google + abogado/a LOPD-GDD y publicidad a menores.
- **Cláusula de consentimiento Art. 9 RGPD** — texto exacto del checkbox por abogado/a RGPD.
- **Revisión marketing retroactiva** — si hay posts ya publicados con claims no conformes, borrado/corrección con criterio legal.

---

## Priorización operativa

| Prioridad | Fase técnica | Fix / Acción | Bloqueante lanzamiento |
|-----------|--------------|---------|------------------------|
| **P0 Crítico** | Fase A | §11.3 (screening médico) | Sí |
| **P0 Crítico** | Fase A | §11.4 (hard-cap kcal) | Sí |
| **P0 Crítico** | — | DPIA + privacy.html + RAT | Sí |
| **P0 Crítico** | — | Disclaimer ubicuo | Sí |
| **P0 Crítico** | — | Edad mínima 16+/18+ | Sí |
| **P1 Alto** | Fase C | §11.6 (alerta >1 %/sem) con copy mitigado | Recomendado |
| **P1 Alto** | — | Transparencia AI Act | Recomendado |
| **P1 Alto** | — | Auditoría copy publicado | Recomendado |
| **P1 Alto** | Fase A | §11.5 (piso grasa 0,5 g/kg) | Recomendado |
| **P2 Medio** | Fase D | §11.7 (hidratación) con disclaimer | No bloqueante |
| **P2 Medio** | Fase C | §11.8 (carbos competición corta) | No bloqueante |
| **P3 Bajo** | Fase A | §11.9, §11.10 | No bloqueante |

---

## Estado

**En revisión.** Lanzamiento público bloqueado hasta:

1. DPIA firmada.
2. `privacy.html` y `terms.html` revisados por abogado/a.
3. §11.3 y §11.4 implementados y probados.
4. Consulta con consultora MDR confirmando no-clase IIa (o aceptación explícita del riesgo y plan marcado CE).
5. Copy screening TCA validado por profesional de salud mental.
6. Age Rating stores ajustado.

Una vez resueltos estos seis, las P1 pueden desplegarse post-lanzamiento. P2-P3 son deuda menor, no bloqueante.

*Nota de cierre obligatoria: este informe detecta riesgos y propone mitigaciones, pero no constituye opinión jurídica vinculante. Requiere validación por asesoría jurídica colegiada antes de publicar/desplegar.*
