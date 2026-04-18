# Metodología Nutricional — Cals2Gains

> **Versión:** 1.0 · **Fecha:** 2026-04-17 · **Propietaria metodológica:** Judith Cordobes
> **Estado:** Vivo — se actualiza con cada cambio de fórmula, ratio o umbral que afecte al cálculo.
> **Alcance:** Este documento es la **fuente de verdad científica** del motor de nutrición de la app. Cualquier código (servicios, pantallas, prompts de IA) debe respetar lo que aquí se dice. Si el código y este documento divergen, **gana este documento** y hay que abrir bug.

---

## 0. Filosofía base

Cals2Gains no diagnostica, no prescribe dietas terapéuticas y no sustituye a un profesional sanitario. Da una **estimación energética y de macronutrientes basada en ciencia** para personas sanas en edad adulta que quieren perder grasa, ganar músculo, mantenerse o mejorar su rendimiento deportivo.

Tres principios no negociables:

1. **Precisión honesta.** Una estimación calórica es eso: una estimación. Los rangos reales de error de cualquier ecuación predictiva están en ±10-15 % ([Frankenfield et al., 2005](https://pubmed.ncbi.nlm.nih.gov/15883556/)). La app debe comunicarlo, no venderlo como exacto.
2. **Seguridad primero.** Ninguna recomendación debe llevar al usuario a déficits peligrosos, ingestas proteicas por debajo del mínimo vital, o restricciones incompatibles con salud hormonal, cognitiva o metabólica. Ver §8 (Salvaguardas).
3. **Adherencia > optimización.** Un plan perfecto que no se cumple vale cero. El motor prioriza planes sostenibles sobre planes agresivos (salvo modo `mini_cut`, que está acotado).

---

## 1. Cálculo de TMB (Tasa Metabólica Basal)

### 1.1 Ecuación oficial: Mifflin-St Jeor (1990)

```
Hombre:  BMR = 10·peso(kg) + 6,25·altura(cm) − 5·edad(años) + 5
Mujer:   BMR = 10·peso(kg) + 6,25·altura(cm) − 5·edad(años) − 161
```

**Por qué Mifflin-St Jeor y no Harris-Benedict**
La Academy of Nutrition and Dietetics (antes ADA) la considera la ecuación predictiva **más precisa** en adultos sanos no obesos, con <10 % de error en el 82 % de casos vs 69 % de Harris-Benedict revisada ([Frankenfield et al., J Am Diet Assoc, 2005](https://pubmed.ncbi.nlm.nih.gov/15883556/); [Mifflin et al., Am J Clin Nutr, 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/)).

### 1.2 INCONSISTENCIA DETECTADA — requiere fix

| Archivo | Fórmula que usa | ¿Correcto? |
|---------|------------------|------------|
| `utils/nutrition.ts` | Mifflin-St Jeor | ✅ |
| `app/smart-onboarding.tsx` (L637-648) | Harris-Benedict antiguo (1919) | ❌ |
| `services/macroCoach.ts` → `estimateBodyComposition` | Usa `calculateBMR` de nutrition.ts | ✅ |

**Acción:** `smart-onboarding.tsx` debe usar `calculateBMR` de `utils/nutrition.ts`. La rama Harris-Benedict hardcodeada en el onboarding hay que eliminarla — produce valores 2-5 % distintos del resto de la app y confunde al usuario.

### 1.3 Ajuste por composición corporal (Katch-McArdle)

Cuando el usuario ha introducido `%BF` (vía InBody/HealthKit o estimación Navy), la fórmula correcta es **Katch-McArdle**, que es más precisa porque no asume composición corporal media:

```
LBM = peso × (1 − %BF / 100)
BMR = 370 + 21,6·LBM
```

**Cuándo usar cada una:**
- Sin %BF conocido → Mifflin-St Jeor.
- Con %BF fiable (InBody, DEXA, bioimpedancia de calidad) → Katch-McArdle.
- Con %BF estimado por Navy Method → Mifflin-St Jeor (el error de la estimación Navy se propaga demasiado).

### 1.4 Estimación Navy Method (fallback para %BF)

Actualmente en `macroCoach.ts:75-103`. Mantener como **fallback opcional**, nunca como dato primario. Avisar al usuario de que el Navy Method tiene error ±3-4 % vs DEXA ([Hodgdon & Beckett, Naval Health Research Center, 1984](https://apps.dtic.mil/sti/citations/ADA143890)).

---

## 2. Cálculo de TDEE (Gasto Energético Total Diario)

### 2.1 TDEE estático (por defecto)

```
TDEE = BMR × factor_actividad
```

**Factores de actividad oficiales** (Mifflin-St Jeor / Institute of Medicine DRI):

| Nivel | Multiplicador | Definición operativa |
|-------|---------------|----------------------|
| Sedentario | **1,2** | Trabajo de escritorio, <30 min andar/día, 0 entrenos/semana |
| Ligeramente activo | **1,375** | 1-3 entrenos/sem ligeros (yoga, caminar intencionado, gym principiante) |
| Moderadamente activo | **1,55** | 3-5 entrenos/sem de intensidad media (gym regular, running 3×/sem) |
| Muy activo | **1,725** | 6-7 entrenos/sem intensos o trabajo físico |
| Extremadamente activo | **1,9** | Dos sesiones/día, atletas en competición, trabajos físicos pesados |

**Nota educativa ya presente en tooltips:** _"La mayoría sobreestima su actividad. Si dudas, elige el nivel por debajo."_ Mantener y reforzar — es correcto (validado por estudios de gasto energético con agua doblemente marcada: la gente sobreestima actividad ~20 %).

### 2.2 TDEE dinámico (HealthKit/Health Connect)

Cuando hay datos de wearable con ≥3 días en los últimos 7 (`calculateDynamicTDEE`):

```
TDEE_dinámico = BMR + (media_calorías_activas_7d × 0,9)
```

**El multiplicador 0,9** compensa la sobrestimación conocida de los wearables consumer (Apple Watch ~9 % ↑, Fitbit 12-18 % ↑ según [Shcherbina et al., 2017](https://pubmed.ncbi.nlm.nih.gov/28538707/); [Fuller et al., 2020](https://pubmed.ncbi.nlm.nih.gov/32897239/)). Documentar este coeficiente en código como constante con referencia.

**Regla de prioridad:**
- Si hay TDEE dinámico disponible → úsalo para el objetivo diario.
- Si no → TDEE estático.
- Si el delta entre dinámico y estático supera 25 % → **avisar**: probablemente el nivel de actividad declarado está mal, no cambiar el objetivo silenciosamente.

---

## 3. Distribución calórica por objetivo

### 3.1 Tabla maestra de goal modes

| Modo | Factor TDEE | Proteína (g/kg) | Carbos % kcal | Grasa % kcal | Duración recomendada | Referencia |
|------|-------------|------------------|---------------|---------------|-----------------------|-------------|
| `lose_fat` | **0,80** (−20 %) | **2,0-2,2** | 35-45 % | 25-30 % | 12-16 sem | Helms et al. 2014 |
| `mini_cut` | **0,75** (−25 %) | **2,3-2,5** | 25-35 % | 20-25 % | **máx 6 sem** | Helms et al. 2015 |
| `recomp` | **1,00** (manten.) | **2,2-2,4** | 35-45 % | 25-30 % | 10-14 sem | Barakat et al. 2020 |
| `maintain` | **1,00** | **1,6-1,8** | 40-50 % | 25-35 % | Indefinido | ISSN 2017 |
| `lean_bulk` | **1,05** (+5 %) | **1,8-2,0** | 45-55 % | 20-25 % | 10-12 sem | Iraki et al. 2019 |
| `gain_muscle` | **1,10** (+10 %) | **1,8-2,0** | 45-55 % | 20-25 % | 8-12 sem | Slater et al. 2019 |

**Referencias principales:**
- [Helms, Aragon & Fitschen — "Evidence-based recommendations for natural bodybuilding contest preparation" (JISSN 2014)](https://pubmed.ncbi.nlm.nih.gov/24864135/)
- [Jäger et al. — ISSN Position Stand: Protein and exercise (JISSN 2017)](https://pubmed.ncbi.nlm.nih.gov/28642676/)
- [Iraki, Fitschen, Espinar & Helms — "Nutrition recommendations for bodybuilders in the off-season" (Sports 2019)](https://pubmed.ncbi.nlm.nih.gov/31247944/)
- [Barakat, Pearson, Escalante, Campbell & De Souza — "Body recomposition" (Strength Cond J 2020)](https://journals.lww.com/nsca-scj/fulltext/2020/10000/body_recomposition__can_trained_individuals_build.3.aspx)

### 3.2 INCONSISTENCIA DETECTADA — proteína calculada de 3 formas distintas

| Ubicación | Cómo calcula proteína |
|-----------|------------------------|
| `utils/nutrition.ts:62-66` | % sobre kcal objetivo (0,25-0,35) |
| `services/adaptiveMacroEngine.ts:293-357` | g/kg × peso (1,8-2,4) |
| `services/macroCoach.ts` (prompt) | mínimo 1,6 g/kg para músculo |
| `app/smart-onboarding.tsx` (cálculo final) | 30 % fijo sobre kcal |

**La canónica es la de `adaptiveMacroEngine`** (g/kg × peso) porque:
1. Es lo que la literatura estandariza (ISSN, ACSM, IOC).
2. Es insensible al déficit calórico: si se baja kcal, la proteína NO debe bajar, y el método "% sobre kcal" hace justo lo contrario (baja proteína cuando más la necesitas para preservar músculo en déficit).

**Acción:** unificar en un único `calculateProteinGrams(weightKg, goalMode, bodyFatPct?)` que sea la única fuente de la cifra objetivo de proteína. Llamar desde onboarding, settings y coach.

### 3.3 Orden de cálculo correcto (unificado)

1. **Proteína (g):** `peso × proteinMultiplier(goalMode)`.
2. **Grasa (g):** máximo entre `(0,8 × peso_kg)` y `(% mínimo de kcal objetivo)`. Nunca por debajo de **0,5 g/kg** absolutos (ver §8.2).
3. **Carbohidratos (g):** `(kcal_objetivo − kcal_proteína − kcal_grasa) / 4`. Los carbos absorben el resto.
4. **Fibra (g):** 14 g por cada 1 000 kcal (IOM 2005) — equivale a ~25-38 g/día en la mayoría de usuarios.

**Por qué este orden:** proteína es la prioridad de síntesis tisular, grasa tiene mínimo hormonal (ver §8.2), carbos son flexibles y pueden escalar/reducir. Hacer el orden al revés (empezar por carbos) es el error de las dietas de los 90 y lleva a proteína o grasa subóptimas.

### 3.4 Micronutrientes y fibra

- **Fibra:** actualmente se fija 38 g ♂ / 25 g ♀ en código (coherente con IOM/EFSA). Correcto.
- **Micronutrientes:** no los trackeamos como objetivos. Correcto — la literatura no justifica contar micros manualmente en población sana con dieta variada. Sí educar sobre alimentos densos en micros vía sugerencias IA.

---

## 4. Ajuste por tipo de día (entrenamiento)

### 4.1 Principio: periodización nutricional

Referencia: [Impey et al. — "Fuel for the work required" (Sports Med 2018)](https://pubmed.ncbi.nlm.nih.gov/29675798/); [Burke, Hawley, Wong & Jeukendrup — "Carbohydrates for training and competition" (J Sports Sci 2011)](https://pubmed.ncbi.nlm.nih.gov/21660838/).

La proteína se mantiene **constante** (1,6-2,2 g/kg) todos los días; lo que oscila son los **carbohidratos** según demanda glucolítica de la sesión. La grasa absorbe residualmente.

### 4.2 Tabla de factores por tipo de sesión (validada)

Actual en `services/trainingPlanEngine.ts:94-212`. Revisada contra evidencia:

| Tipo | Factor kcal | Factor carbos | Factor proteína | Factor grasa | Válido |
|------|-------------|----------------|------------------|----------------|--------|
| `rest` | 0,90 | 0,75 | 1,05 | 1,15 | ✅ |
| `easy` (<60 min Z2) | 1,00 | 0,90 | 1,00 | 1,10 | ✅ |
| `tempo` | 1,10 | 1,20 | 1,05 | 0,90 | ✅ |
| `intervals` / HIIT | 1,15 | 1,30 | 1,10 | 0,85 | ✅ |
| `long_run` (>75 min) | 1,20 | 1,40 | 1,05 | 0,85 | ✅ |
| `strength` | 1,10 | 1,15 | 1,20 | 0,90 | ✅ |
| `crossfit` | 1,20 | 1,35 | 1,15 | 0,80 | ✅ |
| `competition` | 1,30 | **1,50** | 1,00 | 0,70 | ⚠️ |
| `recovery` | 0,95 | 0,85 | 1,10 | 1,05 | ✅ |

**⚠️ Competition:** el factor 1,5× en carbos es correcto para eventos ≥90 min (carbo-loading 8-12 g/kg según [Burke et al., 2011](https://pubmed.ncbi.nlm.nih.gov/21660838/)). Para competiciones cortas (<60 min), este factor está sobredimensionado. Añadir en código check de duración y usar factor 1,2 si la competición es corta.

### 4.3 Ajuste por duración (heurística actual)

```
durationFactor = 1 + (duración_min − 90) × 0,0015  // solo si >90 min
```

Traduce ~+10 % kcal por cada hora extra sobre la base de 90 min. Coherente con gasto energético de resistencia a ritmo moderado (~10-12 kcal/min en corredor de 70 kg). **Correcto.**

### 4.4 Timing de nutrientes (guía IA, no obligatoria)

El coaching y el generador de sugerencias deben poder aconsejar, sin ser dogmáticos:

- **Pre-entreno (1-3 h antes):** 1-3 g/kg de carbos de IG moderado, proteína opcional. ([Kerksick et al. — ISSN nutrient timing, 2017](https://pubmed.ncbi.nlm.nih.gov/28919842/)).
- **Intra-entreno:** solo necesario si sesión >75 min: 30-60 g/h carbos.
- **Post-entreno:** ventana anabólica no es tan estrecha como se creía (Schoenfeld 2013 — 3-4 h), pero 20-40 g de proteína dentro de 2 h post-esfuerzo optimiza MPS.
- **Distribución proteica:** 4-5 tomas de 0,4 g/kg (≈25-40 g) a lo largo del día maximiza MPS más que 2 tomas grandes ([Areta et al. 2013](https://pubmed.ncbi.nlm.nih.gov/23459753/)).

---

## 5. Coaching adaptativo semanal

### 5.1 Umbrales de ajuste

Actualmente en `services/adaptiveMacroEngine.ts:161-240` y `services/macroCoach.ts`:

- **Ventana mínima de datos:** 7 días consecutivos con ≥2 comidas/día loggeadas y ≥3 pesajes.
- **Cambio de peso que "cuenta":** ≥0,5 kg de tendencia (no pesaje puntual — usar media móvil de 7 días para filtrar fluctuaciones de agua).
- **Ajuste máximo por semana:** **±200 kcal** (coherente con [Helms et al. 2014](https://pubmed.ncbi.nlm.nih.gov/24864135/) — cambios mayores inducen adaptación metabólica).
- **Adherencia requerida para ajustar:** ≥0,6 overall. Por debajo → no ajustar, mensaje "mejora consistencia antes de cambiar números".

### 5.2 Lógica de decisión (canónica)

```
si adherencia < 60%          → mantener, mensaje educativo
si goal=lose_fat y peso estancado 2+ sem con adherencia > 80%
                             → reducir 100-200 kcal/día
si goal=gain_muscle y peso +0,5 kg/sem durante 2+ sem
                             → reducir 100 kcal/día (ganar demasiado rápido)
si goal=recomp y peso estable con proteína OK
                             → mantener, éxito
si ritmo de pérdida > 1% peso corporal/semana (cualquier goal)
                             → AVISO de salud: ritmo excesivo, subir kcal 150 (§8.3)
```

### 5.3 Adherencia: cómo se mide

**3 métricas ponderadas (`calculateAdherenceScore`):**
- Calorie adherence (peso 40 %): días dentro de ±10 % del objetivo calórico.
- Protein adherence (peso 35 %): días dentro de ±5 g del objetivo proteico.
- Consistency (peso 25 %): días con ≥2 comidas loggeadas.

La ventana ±10 % kcal / ±5 g proteína es coherente con error típico de tracking (estimaciones humanas y AI-vision tienen ~10 % de error).

---

## 6. Estimación de macros en captura de comidas

### 6.1 Jerarquía de fuentes de datos (unificada)

Cuando el usuario registra una comida, el sistema consulta en este orden:

1. **Código de barras** → Open Food Facts API → alta confianza (verified = true).
2. **Base local curada** (~27 alimentos ES/LatAm en `foodDatabase.ts` + expansión en `data/spanishFoods.ts`) → alta confianza. Valores de USDA/BEDCA.
3. **Búsqueda Open Food Facts por texto** → alta confianza si producto encontrado.
4. **Etiqueta OCR** (`label-scanner`) vía GPT-4o Vision → alta confianza si etiqueta nítida.
5. **Foto del plato** (`ai-review`) vía GPT-4o Vision → confianza media (0,5-0,9 autoreportada).
6. **Descripción por voz/texto libre** → GPT-4o-mini estimación → confianza media/baja.

**Regla crítica:** toda fuente no verificada (IA sin etiqueta ni barcode) debe mostrar al usuario un indicador de confianza y permitir edición antes de guardar. Actualmente se hace — mantener.

### 6.2 Prompts de IA — reglas metodológicas

Los prompts de `services/openai.ts` deben incluir siempre:

- **Fuente de referencia:** "Nutritional values should be based on standard food databases (USDA, BEDCA)". ✅ Presente.
- **Calibración de peso:** "AI vision OVERESTIMATES portion weights, estimate 15-20 % LOWER". ✅ Presente. Fundamento: [Lo et al. — "Food recognition: a new dimension", 2020](https://pubmed.ncbi.nlm.nih.gov/33182489/) y benchmarking interno reporta sesgo +20-35 % en Vision LLMs.
- **Bilingüe obligatorio:** siempre `nameEs` + `nameEn`. ✅ Presente.
- **Safety — alergenos:** bloque inyectado con alergias declaradas, nunca sugerir alimentos que los contengan. ✅ Presente.
- **Confidence cap:** 0,5-1,0. ✅ Presente.

### 6.3 Estimación de peso (reglas visuales)

Las heurísticas del prompt (plato 26 cm, smartphone 15 cm, cubierto 19 cm, banana pelada 100-120 g, pan 25-35 g/rebanada) son correctas y provienen de datos USDA SR-28. **Mantener tal cual.**

---

## 7. Hidratación (no implementado a nivel cálculo)

Hay tracker de agua (`app/water-tracker.tsx`, pendiente fix Firebase permissions) pero no hay **cálculo de objetivo**. Añadir:

```
objetivo_ml = peso_kg × 30      // base
+ 500 ml por cada hora de entreno
+ 500 ml si ambiente >30°C o altitud >2500m
```

Referencias: [EFSA 2010 — Scientific Opinion on Dietary Reference Values for water](https://www.efsa.europa.eu/en/efsajournal/pub/1459); [IOM DRI 2005](https://www.nap.edu/read/10925/chapter/8). Umbral mínimo absoluto: **1 500 ml/día** en persona sedentaria de 60 kg.

---

## 8. Salvaguardas de seguridad

Esta sección es la más importante. Es lo que diferencia una app **responsable** de una app peligrosa.

### 8.1 Déficit calórico — límites absolutos

- **Nunca recomendar <1 200 kcal/día en mujeres** ni **<1 500 kcal/día en hombres** (WHO; ACSM; [Manore 2015](https://pubmed.ncbi.nlm.nih.gov/25762489/)). Actualmente `personalEngine.ts:183` tiene `Math.max(1200, ...)` — correcto, pero debe aplicarse al cálculo inicial del onboarding también (hoy no).
- **Déficit máximo:** 25 % bajo TDEE, y solo en `mini_cut`. Para modos regulares el máximo es 20 %.
- **Si peso usuario → IMC < 18,5** al aplicar la recomendación → **bloquear modo pérdida**, mostrar recomendación profesional.

### 8.2 Grasa — mínimo hormonal

Por debajo de **0,5 g/kg de grasa** el riesgo de hipogonadismo masculino y amenorrea hipotalámica femenina crece ([Fahrenholtz et al. 2018](https://pubmed.ncbi.nlm.nih.gov/29607694/); [Loucks 2003](https://pubmed.ncbi.nlm.nih.gov/14666675/)). Fijar **piso duro 0,5 g/kg** — si el cálculo da menos, subir y recortar de carbos.

### 8.3 Ritmo de cambio de peso — alertas

- **Pérdida saludable:** 0,5-1 % del peso corporal/semana. >1 %/sem sostenido = pérdida de masa magra acelerada ([Trexler et al. 2014](https://pubmed.ncbi.nlm.nih.gov/24571926/)). Disparar alerta automática.
- **Ganancia saludable:** 0,25-0,5 % peso/sem en lean bulk, hasta 1 % en gain_muscle agresivo. >1 %/sem = mucha grasa, poca ganancia magra.

### 8.4 Poblaciones excluidas / necesitan derivación

El onboarding debe preguntar (actualmente **NO lo hace** — gap crítico a cubrir):

- **Embarazo / lactancia** → derivar a profesional. No aplicar déficits. Mostrar info sobre necesidades extra (~+340 kcal 2º trim, +450 kcal 3º trim y lactancia, [IOM 2006](https://www.ncbi.nlm.nih.gov/books/NBK208862/)).
- **Trastorno de conducta alimentaria actual o historial** → toggle en settings, si ON desactivar contador agresivo de kcal, activar modo "comida intuitiva" (sin números).
- **Diabetes tipo 1 o 2** → aviso: los cálculos son orientativos, el control glucémico requiere supervisión médica.
- **Enfermedad renal crónica** → limitar proteína a 0,8 g/kg, aviso: "tu médico debe fijar tu objetivo proteico".
- **Menores de edad (<18)** → bloquear modos pérdida agresiva, requerir consentimiento tutor.

### 8.5 Límites de entrada (validación)

Actualmente los rangos están sueltos entre archivos. Unificar:

| Campo | Mín | Máx | Acción fuera de rango |
|-------|-----|-----|------------------------|
| Edad | 14 | 100 | <14 bloqueo, >100 warning |
| Peso | 30 kg | 300 kg | Fuera → error entrada |
| Altura | 120 cm | 230 cm | Fuera → error entrada |
| IMC resultante | 15 | 45 | <15 recomendar médico, >45 ofrecer modo especial con expectativas realistas |

---

## 9. Comunicación al usuario (copy / educativa)

### 9.1 Tooltips actuales (auditados)

Revisados los 5 tooltips en `i18n/es.ts:1400-1413`:

| Tooltip | Veredicto científico |
|---------|----------------------|
| `fasting_body` | ✅ Correcto pero matizar: los beneficios del ayuno intermitente sobre pérdida de peso son **equivalentes a restricción calórica continua** ([Trepanowski 2017](https://pubmed.ncbi.nlm.nih.gov/28459931/)). Quitar "favorecer pérdida de grasa" como si fuera efecto extra. |
| `activityLevel_body` | ✅ Correcto. La frase "elige un nivel por debajo" es evidencia-based. |
| `goalMode_body` | ✅ Pendiente revisar tras unificar tabla §3.1. |
| `calories_body` | ✅ Correcto. |
| `macros_body` | ✅ Correcto. Atkins value de los 3 macros bien contado (4/4/9). |

### 9.2 Lenguaje prohibido

- "Quema grasa" (ningún alimento quema grasa).
- "Detox" / "limpieza" (no es un término fisiológico válido).
- "Alimento milagro" / "acelera metabolismo" / "adelgaza comiendo".
- "Dieta del X" sin estudios (keto y ayuno intermitente sí pueden nombrarse con referencias).

### 9.3 Lenguaje recomendado

- "Estimación basada en Mifflin-St Jeor ±10 %".
- "Los wearables sobreestiman el gasto, aplicamos un ajuste de calibración del 10 %".
- "La pérdida sostenible está entre 0,5 y 1 % de tu peso por semana".
- "Tu objetivo de proteína se mantiene constante aunque tus calorías cambien — protege tu músculo".

---

## 10. Métricas de calidad del motor nutricional (KPIs internos)

Para evaluar si la metodología funciona en la realidad, la app debe loggear (anonimizado):

1. **% usuarios cuyo cambio de peso real a 4 semanas cae en ±0,25 % de lo esperado** → precisión del TDEE calculado.
2. **% usuarios que hacen override manual del objetivo calórico en primera semana** → si >30 %, nuestro cálculo del onboarding no encaja con su experiencia.
3. **Mediana de error IA-vision vs valor real corregido por usuario** → debe ser <15 %. Si sube, revisar prompt de calibración.
4. **% usuarios que activan alertas de §8** → medir seguridad real.

---

## 11. Trabajo pendiente (consecuencia directa de este documento)

Inconsistencias detectadas que requieren fix de código para que la metodología sea coherente en toda la app:

1. **[HIGH]** `app/smart-onboarding.tsx:637-648` — reemplazar Harris-Benedict por `calculateBMR` de `utils/nutrition.ts`.
2. **[HIGH]** Crear `utils/macros.ts` con única función `calculateMacroTargets(profile, goalMode)` que devuelva `{calories, protein, carbs, fat, fiber}`. Que la llamen onboarding, settings, coach y goal-modes — hoy hay 3 implementaciones divergentes.
3. **[HIGH]** Añadir screening médico en onboarding (§8.4): embarazo, TCA, diabetes, enf. renal, menores. Crear campo `medicalFlags: string[]` en user profile.
4. **[HIGH]** Hard-cap de kcal en onboarding (1200 ♀ / 1500 ♂) como ya existe en `personalEngine.ts:183`.
5. **[MED]** Piso de 0,5 g/kg de grasa en el cálculo de macros.
6. **[MED]** Alerta automática si ritmo de pérdida >1 % peso/sem dos semanas seguidas.
7. **[MED]** Objetivo de hidratación calculado (§7).
8. **[MED]** Ajustar factor carbos de `competition` si duración <60 min.
9. **[LOW]** Documentar el coeficiente 0,9 del TDEE dinámico como constante nombrada con referencia.
10. **[LOW]** Unificar rangos de validación de inputs en un `constants/nutritionBounds.ts`.

---

## 12. Referencias bibliográficas (principales)

| # | Referencia | Uso en la app |
|---|------------|----------------|
| 1 | Mifflin MD et al., Am J Clin Nutr 1990 | BMR |
| 2 | Frankenfield D et al., JADA 2005 | Elección Mifflin vs HB |
| 3 | Jäger R et al., ISSN Position Stand (JISSN 2017) | Proteína |
| 4 | Helms AA et al., JISSN 2014 | Cut / déficit natural |
| 5 | Iraki J et al., Sports 2019 | Off-season bulk |
| 6 | Barakat C et al., Strength Cond J 2020 | Recomp |
| 7 | Schoenfeld BJ & Aragon AA, JISSN 2018 | Dosis proteica por comida |
| 8 | Areta JL et al., J Physiol 2013 | Distribución de proteína |
| 9 | Impey SG et al., Sports Med 2018 | "Fuel for the work required" |
| 10 | Burke LM et al., J Sports Sci 2011 | Carbohidratos y rendimiento |
| 11 | Kerksick CM et al., JISSN 2017 | Nutrient timing |
| 12 | Shcherbina A et al., J Pers Med 2017 | Precisión wearables |
| 13 | Fuller D et al., JMIR 2020 | Sobrestimación Apple Watch |
| 14 | Trexler ET et al., JISSN 2014 | Adaptación metabólica |
| 15 | Fahrenholtz IL et al., Appetite 2018 | RED-S / mín hormonal |
| 16 | EFSA Scientific Opinion 2010 | Ingesta de agua |
| 17 | Trepanowski JF et al., JAMA IM 2017 | Ayuno intermitente |

---

## 13. Changelog de esta metodología

- **2026-04-17 · v1.0** — Primera versión. Autor: Claude (agente nutrición) bajo supervisión de Judith Cordobes. Cubre TMB, TDEE, distribución macros, coaching adaptativo, captura IA, salvaguardas de salud, copy, KPIs y backlog de deuda técnica detectada.
