# TREND-INSIGHTS.md — Insights frescos del `trend-scout`

> Este archivo es la "memoria corta" del sistema de marketing. Lo mantiene el subagente `trend-scout` 2×/semana (lun/jue 09:30). **Todos los subagentes de marketing deben leerlo antes de producir una pieza.**
>
> Reglas de publicación:
> - Un insight solo se lista como accionable si está confirmado en ≥2 fuentes independientes.
> - Con 1 sola fuente → va a "Observaciones pendientes".
> - Nunca métricas inventadas (R1).
> - Fuentes confirmadas siempre citadas.

---

## 2026-04-14 — Seed inicial (creación del sistema)

> Entrada creada al instalar el sistema de subagentes de marketing. Las siguientes observaciones provienen del research inicial documentado en `MARKETING-BENCHMARKS.md` y deben ser confirmadas / refrescadas en la primera ronda real del `trend-scout`.

### Insight S1 · Formato — Sweet spot de reels 7-15 s
**Patrón:** los reels que retienen mejor en fitness/nutrición están en el rango 7-15 s. Los <7 s no permiten hook + desarrollo; los >15 s sufren drop-off.
**Ejemplo:** observado transversalmente en @jeffnippard, @meowmeix, @nutritionbykylie.
**Fuentes:** DirectAI 2026 Guide · MarketingBlocks Hooks 2026 · Wellness Creatives Fitness Reels Strategies.
**Cómo aplicarlo en Cals2Gains:** `reels-scriptwriter` apunta a 10-13 s como default. Excepciones justificadas en notas del script.

### Insight S2 · Estructura — AIDA en carruseles 7-10 slides
**Patrón:** los carruseles virales de nutrición siguen AIDA: slide 1 hook, slides 2-9 educación, slide 10 CTA. Completion rate >72% reportado en top accounts.
**Ejemplo:** @thefitnesschef_, @midietacojea, @renaissanceperiodization.
**Fuentes:** Postnitro 2025 · TrueFutureMedia 2026 · Amra&Elma.
**Cómo aplicarlo:** `carousel-designer` usa 7 o 10 slides como estándar. Nunca menos de 7 en educativo.

### Insight S3 · Hook — Mito vs. realidad domina en ES
**Patrón:** el formato "MITO / REALIDAD" con tipografía grande y fondo contrastado es especialmente potente en audiencia española.
**Ejemplo:** @midietacojea, @gu_nutrition, @boticariagarcia.
**Fuentes:** El Español (ranking ES) · Marketing4eCommerce 2026.
**Cómo aplicarlo:** `hook-writer` usa patrón `myth-truth` como default en piezas ES educativas. Puede alternar con `rhetorical-Q` para variedad.

### Insight S4 · CTA — "Guarda" / "Save" supera a "Follow" en educativo
**Patrón:** Save rate se convierte en señal fuerte al algoritmo y en métrica propia de calidad. Top dietistas EN/ES piden "save" antes que "follow".
**Ejemplo:** @thefitnesschef_, @midietacojea, @abbeyskitchen.
**Fuentes:** TrueFutureMedia 2026 · Postnitro 2025.
**Cómo aplicarlo:** `caption-hashtag` por defecto cierra con "Guarda este post" (ES) / "Save this" (EN) en piezas educativas.

### Insight S5 · Observación no confirmada (pendiente)
**Patrón:** los reels con overlay de texto extremadamente grande (tipografía cover toda la pantalla) parecen destacar incluso en mute.
**Ejemplo (1 fuente):** DirectAI 2026 guide.
**Estado:** 1 fuente → NO accionable todavía. Pendiente confirmación en ronda real.

### Observaciones pendientes (1 sola fuente)
- Trending audio concreto esta semana en nicho fitness/nutrición ES → requiere inspección directa en IG; la seed actual no la incluye.
- Ratio exacto reel/carrusel de cada cuenta top — estimaciones, sin dato numérico duro.
- Patrón "split-screen reacción" en fitness: parece crecer, requiere confirmación en 2 fuentes.

---

Notas de la ronda · resumen ejecutivo para Judith:
- Seed inicial colocada con 4 insights sólidos (S1-S4) + 1 observación pendiente (S5).
- La primera ronda real del `trend-scout` (programable a lunes 2026-04-20 09:30) debe confirmar o descartar S5 y cubrir trending audio actual.
- Cualquier actualización de esta página debe citar fuentes y fechas.

---

> **Formato estándar para futuras entradas (usa esta plantilla):**
>
> ```
> ## YYYY-MM-DD — Ronda trend-scout [lunes | jueves]
>
> ### Insight N · [Tipo: audio | formato | hook | hashtag | mito | feature IG | cuenta emergente]
> **Patrón:** ...
> **Ejemplo:** ...
> **Fuentes:** [≥2]
> **Cómo aplicarlo en Cals2Gains:** ...
>
> ### Observaciones pendientes:
> - ...
> ---
> Notas de la ronda · resumen ejecutivo para Judith: ...
> ```

---

## 2026-04-14 — Ronda trend-scout [primera ronda real · martes]

> Primera ejecución real del agente trend-scout. El seed de hoy mismo (entrada anterior) queda como baseline. Los insights S1-S4 del seed siguen vigentes. S5 (overlay de texto full-screen) se actualiza abajo.

---

### Insight 1 · Audio — "World Stop!" de @browsbyzulema domina abril 2026
**Patrón:** El audio "World Stop!" (creado por @browsbyzulema) es el sonido breakout de abril 2026 en IG. Formato: one-take, pausa en el audio → transformación visual → "Carry on". Funciona en fitness, belleza, cocina, hogar. Es el audio de reels de transformación más usado este mes.
**Ejemplo:** Cuentas de fitness usando el formato para mostrar "antes del hábito nutricional / después del hábito nutricional" o resultados de entrenamiento. @browsbyzulema originó el trend.
**Fuentes:** newengen.com Instagram Trends April 2026 (actualización semanal) · later.com Instagram Reels Trends 2026 (weekly update) · socialbee.com Instagram Trends April 7 2026 · napoleoncat.com Top Instagram Reels Trends April 2026.
**⚠️ Flag de brand voice Cals2Gains:** Este trend tiende a "glow-up físico". NO usar para mostrar transformaciones corporales extremas (viola pilar anti-toxicidad fitness). SÍ es accionable adaptado como: "antes/después de entender tus macros", "antes/después de usar Cals2Gains" (demo de la app), o "lo que pensaba de la nutrición vs. lo que sé ahora".
**Cómo aplicarlo en Cals2Gains:**
- Cuenta destino: EN y ES (adaptar texto overlay)
- Pilar: IA-feature demo / mindset nutricional
- Hook adaptado: [antes: foto genérica de plato] → pausa → [después: foto con el análisis IA de Cals2Gains]. Demuestra valor de la app sin transformación corporal tóxica.
- `reels-scriptwriter` puede construir un script de 10-15 s sobre este audio.

---

### Insight 2 · Feature IG — "Your Algorithm for Reels" amplifica reach 40-50% en temas elegidos
**Patrón:** Instagram lanzó en diciembre 2025 la feature "Your Algorithm for Reels", que permite a usuarios configurar explícitamente los temas que quieren ver. Los reels que coinciden exactamente con los temas de un usuario ven su reach incrementado entre 40-50%.
**Ejemplo:** Creadores de nutrición que usan keywords exactas como "nutrición", "macros", "proteína", "recetas saludables" en sus captions se benefician de este sistema de distribución temática.
**Fuentes:** heropost.io Instagram Algorithm Changes 2026 · orangemonke.com Instagram Algorithm 2026 · mirra.my Instagram Algorithm 2026 Complete Analysis · clixie.ai Instagram Algorithm Tips 2026.
**Cómo aplicarlo en Cals2Gains:**
- Cuentas: EN y ES
- `caption-hashtag` debe incluir keywords exactas del nicho en las primeras líneas del caption: "protein", "nutrition", "calorie tracking", "macros" (EN) / "proteína", "nutrición", "contar calorías", "macros" (ES).
- Evitar captions genéricos o solo emojis. El texto es ahora señal de distribución temática.

---

### Insight 3 · Algoritmo — "Sends per Reach" (DM shares) es la señal de mayor peso junto a watch time
**Patrón:** Adam Mosseri confirmó que los tres rankings signals más importantes de IG son: (1) watch time, (2) sends per reach (compartidos por DM), (3) likes per reach. Los DM shares tienen un peso 3-5× mayor que los likes para alcanzar audiencias nuevas. Tendencia confirmada y amplificada en 2026.
**Ejemplo:** Contenido tipo "envía esto a tu amigo que…" o "manda esto a quien necesite verlo" genera shares por DM masivos. @thefitnesschef_ usa "Save for your next shop" que también convierte en DM share.
**Fuentes:** dataslayer.ai Instagram Algorithm 2025 (Mosseri statement Q1 2025) · influencermarketinghub.com "Sends per Reach" Playbook 2026 · truefuturemedia.com Instagram Reels Reach 2026 · buffer.com Instagram Algorithm 2026 · sproutsocial.com Instagram Algorithm 2026.
**Cómo aplicarlo en Cals2Gains:**
- Cuentas: EN y ES
- Añadir micro-CTA "DM-bait" al final del caption: "Manda esto a alguien que siempre dice que no tiene tiempo para comer bien" / "Send this to a friend who keeps skipping protein".
- `caption-hashtag` añadir variante de DM-CTA como opción B del CTA en piezas educativas.
- Este CTA es complementario al "Guarda" / "Save": idealmente caption cierra con save (señal de calidad) + DM-bait (señal de distribución).

---

### Insight 4 · Algoritmo — Originality Score: el contenido reciclado o con watermark TikTok pierde 60-80% de reach
**Patrón:** El algoritmo de IG 2026 tiene un "Originality Score" que fingerprinta cada vídeo. Reels con watermarks de TikTok o CapCut, o reposteados de otras cuentas sin edición original, ven caídas de reach del 60-80%. Los creadores de contenido original ven incrementos del 40-60%.
**Ejemplo:** Cuentas que construyeron audiencia reposteando contenido de otros han colapsado en 2026. Cuentas con producción 100% propia están en el ciclo alcista.
**Fuentes:** truefuturemedia.com Reels Reach 2026 · autofaceless.ai Instagram Reels Statistics 2026 · syncstudio.ai Instagram Reels Algorithm 2026 · almcorp.com Meta Original Content Rules 2026 · socialpilot.co Instagram Reels Algorithm.
**Cómo aplicarlo en Cals2Gains:**
- Implicación directa: TODO el contenido de Cals2Gains debe ser original. No reciclar clips, no usar plantillas con watermark.
- Si se reedita contenido anterior, editar lo suficiente para que el fingerprint difiera (cambio de resolución, corte, overlay nuevo).
- `reels-scriptwriter` y `carousel-designer` deben producir siempre assets originales.

---

### Insight 5 · Mitos en ciclo — Aceite de semillas (seed oils), huevos/colesterol, detox: los tres debates nutricionales virales de 2026
**Patrón:** En 2026, los tres debates nutricionales más compartidos en IG en el nicho científico son: (1) ¿Son malos los aceite de semillas? (seed oils), (2) ¿Los huevos suben el colesterol?, (3) ¿Funciona el "detox"? Múltiples RDs y clínicas están publicando contenido debunking esta semana con alta tracción.
**Ejemplo:** Dietistas EN como @abbeyskitchen, @nutritionbykylie y @syattfitness están en el ciclo de desmitificar seed oils y detox en 2026. En ES, @midietacojea y @boticariagarcia cubren el debate huevos/colesterol.
**Fuentes:** aurathedietclinic.com Diet Myths Debunked 2026 · scienceofcardio.com New Diet Myths Debunked 2026 · peermedbenoni.co.za Nutrition Myths 2026 · nutritionnews.abbott Nutrition Myths 2026.
**Cómo aplicarlo en Cals2Gains:**
- Cuenta EN: reel o carrusel "Seed oils: ¿veneno o villanizado sin razón?" — la evidencia 2026 sigue mostrando que son cardio-saludables al sustituir grasas saturadas.
- Cuenta EN+ES: "¿Los huevos suben el colesterol?" — mito perfectamente alineado con pilar ciencia > hype.
- Cuenta ES: "¿El detox de enero funciona?" — el hígado y riñones ya son tu detox, message brand-aligned.
- Pilar: Mito vs. Realidad nutricional.
- ⚠️ Cuidado: NO tomar posición política en "seed oils" más allá de la evidencia. El debate tiene ruido ideológico; citar solo estudios revisados.

---

### Insight 6 · Hashtag — Cap de 5 hashtags; keywords en caption son la nueva señal de distribución
**Patrón:** En 2026, Instagram recomienda explícitamente usar 3-5 hashtags muy relevantes (no 20-30 como en años anteriores). Las keywords en el caption en texto natural son más importantes que los hashtags para la distribución temática, según múltiples fuentes de marketing.
**Ejemplo:** Cuentas top EN y ES han reducido sus hashtag sets a 3-5 tags ultra-específicos + keywords en caption.
**Fuentes:** glofox.com Best Fitness Hashtags 2026 · perspire.tv Top Fitness Hashtags 2026 · iqhashtags.com Fitness Hashtags 2026 · edigitalagency.com.au Top 25 Fitness Hashtags Instagram 2026.
**Hashtags confirmados activos en nicho fitness/nutrición:**
- EN: #fitnessmotivation, #nutritioncoach, #mealprep, #caloriedeficit, #proteinrecipes
- ES: #nutricionysalud, #nutricionsaludable, #vidasana, #nutricionconsciente, #fitnessenespañol
- Emergentes en ES: #nutricioninteligente (crecimiento detectado en search, pendiente verificación volumen exacto)
**Cómo aplicarlo en Cals2Gains:**
- `caption-hashtag` reduce set de hashtags a 3-5 por pieza, ultra-relevantes al tema.
- Primera línea del caption = keyword relevante (no emoji aislado): ej. "Proteína en el desayuno: cuánto necesitas realmente."

---

### Observaciones pendientes (1 sola fuente, NO accionables aún)
- **ASMR food prep reels:** Mencionado como tendencia emergente en nutrición (comidas con sonido ambiente, sin voz). Solo 1-2 menciones en resultados; no confirmado en 2 fuentes independientes. Seguimiento en próxima ronda.
- **S5 del seed (tipografía full-screen):** Los resultados de esta ronda indican que el overlay de texto grande sigue siendo un patrón (múltiples cuentas benchmark lo usan), pero no hay nueva fuente específica que lo cuantifique. Mantener como patrón vigente pero sin confirmación numérica.
- **Trending audio específico fitness EN/ES (Central Cee "WAGWAN", "Seaside Eyes" de Bertie Newman):** Aparecen en un resultado de búsqueda (socialpilot snippet) pero sin segunda fuente independiente. No accionable todavía. Monitorear en próxima ronda (jueves 2026-04-16).
- **Cuentas emergentes app-tracking nutrición en España:** Búsqueda no produjo candidatos confirmables en ≥2 fuentes. Pendiente.

---

Notas de la ronda · resumen ejecutivo para Judith:
- **5 insights accionables confirmados** en ≥2 fuentes: audio "World Stop!" (con flag brand voice), algoritmo DM-shares top signal, Originality Score, mitos en ciclo (seed oils/huevos/detox), hashtag cap 5 + keywords en caption.
- **Más urgente esta semana:** (1) Crear una pieza debunking sobre seed oils o huevos — alto volumen de búsqueda, perfectamente alineado con brand voice ciencia > hype. (2) Revisar que `caption-hashtag` ya esté usando keywords en caption, no solo hashtags.
- **Cambio algorítmico a monitorear:** El DM-share como señal top implica cambiar el CTA estándar — añadir variante "envíalo a alguien que…" junto al "guarda".
- **Flag brand voice:** El trend "World Stop!" tiene riesgo de deslizarse hacia transformación física. Adaptar únicamente como demo de app o cambio de hábito cognitivo, nunca como antes/después corporal.
- **Sin cambios en MARKETING-BENCHMARKS.md esta ronda** (no se han confirmado cuentas nuevas en ≥2 fuentes). Se añade nota de actualización en sección "pendientes".

---


## 2026-04-16 — Ronda trend-scout [jueves]

> Tercera ejecución real del trend-scout. Insights de la ronda anterior (2026-04-14) siguen vigentes salvo actualizaciones indicadas abajo.

---

### Insight 1 · Mito — GLP-1 / Ozempic es EL debate nutricional de abril 2026

**Patrón:** El debate sobre fármacos GLP-1 (Ozempic, Wegovy, Mounjaro) ha escalado a ser el tema nutricional más viral de mediados de abril 2026, superando en volumen al debate de seed oils. Tres subtemas dominan: (1) "Resistencia GLP-1" — un estudio del 11/04/2026 revela que ~10% de personas tienen variantes genéticas que impiden respuesta al fármaco. (2) Pérdida muscular — hasta 40% del peso perdido con GLP-1 es masa magra, fenómeno bautizado "Ozempic face". (3) Ciclo quit/restart — ~50% de usuarios abandonan en el primer año y recuperan peso rápidamente; NPR (15/04/2026) cubre que muchos reinician sin guía médica.
**Ejemplo:** Dietistas y médicos en IG están generando contenido de alto engagement explicando por qué "Ozempic no es magia" y enfatizando que sin cambio nutricional, los resultados no son sostenibles. El ángulo "el fármaco sin nutrición no funciona" es perfecto para cuentas science-based.
**Fuentes:** NPR "GLP-1 Friendly Diet" (23/03/2026) · NPR "Quit a GLP-1?" (15/04/2026) · ScienceDaily "GLP-1 Resistance" (11/04/2026) · Healthline "GLP-1 Effectiveness Varies" (abril 2026) · OurHealtho "Ozempic for Everyone?" (2026) · Buzops "GLP-1s Myths vs Reality" (2026).
**⚠️ Flag brand voice Cals2Gains:** NO tomar posición anti-fármaco ni pro-fármaco. El ángulo correcto es: "los fármacos son herramientas médicas legítimas, pero la nutrición es la base — Cals2Gains te ayuda a construir esa base, con o sin GLP-1." Ciencia > hype, sin shaming.
**Cómo aplicarlo en Cals2Gains:**
- Cuenta EN: Carrusel "3 things your doctor won't tell you about GLP-1 weight loss" → enfoque en nutrición como complemento esencial, no sustituto.
- Cuenta EN+ES: Reel "¿Ozempic = magia? Lo que dice la ciencia" → mito vs. realidad, 10-15 s.
- Pilar: Mito vs. Realidad nutricional.
- `caption-hashtag`: usar keywords "GLP-1", "Ozempic", "weight loss science", "nutrición basada en evidencia" en caption (señal distribución temática).

---

### Insight 2 · Feature IG — "Edits" app: actualizaciones de abril 2026 con IA y links internos

**Patrón:** Instagram ha lanzado actualizaciones significativas a su app "Edits" (editor de vídeo propio de IG) en abril 2026: (1) Efectos de vídeo potenciados por IA (modelo SAM 3) que permiten aplicar efectos como Scribble, Outline o Glitter a personas u objetos específicos. (2) Links internos: se pueden añadir enlaces clicables a otros perfiles o reels directamente sobre el vídeo. (3) Storyboard mejorado con controles de movimiento y velocidad. (4) Exportación sin watermark — lo cual alimenta directamente el Originality Score del algoritmo.
**Ejemplo:** Creadores que usan Edits para producir reels nativos de IG evitan watermarks de CapCut/TikTok, beneficiándose del Originality Score (+40-60% reach). Los efectos IA permiten crear content más dinámico sin herramientas externas.
**Fuentes:** creators.instagram.com (oficial) · SocialMediaToday "Edits Gets IG Links" · BuzzInContent "Instagram expands Edits features" · EmbedSocial "New Instagram Features 2026".
**Cómo aplicarlo en Cals2Gains:**
- Evaluar migración de edición de vídeo a Edits para reels — exportación sin watermark es ventaja directa.
- Links internos útiles para cross-promotion @cals2gains ↔ @cals2gains_es.
- Efectos IA SAM 3 pueden usarse para highlight de alimentos en reels de "foto → macros" (demo de la app).

---

### Insight 3 · Feature IG — Links clicables en Reels (Meta Verified + Product Tags)

**Patrón:** Instagram permite ahora añadir enlaces clicables directamente sobre reels, pero con restricciones: (1) Vía Meta Verified: Plus = 2 reels con link/mes, Premium = 4, Max = 6. (2) Product tagging: expandiéndose a 22 países, permite hasta 30 links de producto por post. (3) Non-verified: siguen dependiendo de link in bio, Story link sticker, o automatización DM. El feature "link in bio" podría quedar obsoleto para cuentas verificadas.
**Ejemplo:** Social Media Examiner publicó análisis detallado sobre cómo esta feature cambia la estrategia de conversión en IG. Para apps como Cals2Gains, poder linkear directamente al app store desde un reel es un game-changer para descargas.
**Fuentes:** SocialMediaExaminer "Clickable Reels Links 2026" · inro.social "Meta Verified Clickable Links" · napoleoncat.com "New Features 2026" · Instagram oficial (@instagram, post DNn3ulMxmP4) · TechTimes "Meta Adds Clickable Shopping Links to Reels".
**⚠️ Dependencia:** Cals2Gains tiene Meta Verified pendiente (ver ACCOUNTS.md). Si se activa, es prioridad alta vincular reels de demo de la app con link directo a app stores.
**Cómo aplicarlo en Cals2Gains:**
- PRIORIDAD: acelerar verificación Meta para @cals2gains si es posible — desbloquea links directos en reels.
- Mientras tanto: seguir con CTA "link in bio" + Story link sticker.
- `caption-hashtag` ajustar CTA según estado de verificación.

---

### Insight 4 · Feature IG — "Blend" (feed compartido de Reels) lanzado oficialmente

**Patrón:** "Blend" se ha lanzado oficialmente (17/04/2026 previsto, ya en rollout). Permite crear un feed compartido de Reels dentro de DMs con amigos o grupos. Vector de distribución adicional al DM share: el contenido que se comparte por DM ahora tiene un espacio permanente de consumo compartido, lo que amplifica la señal "sends per reach" ya documentada como señal #1 del algoritmo.
**Ejemplo:** Contenido tipo "manda esto a tu grupo de gym" o "comparte con tu amigo de meal prep" ahora tiene un destino natural (el Blend), incentivando aún más los DM shares.
**Fuentes:** metricool.com "Instagram Updates 2026" · napoleoncat.com "New Features 2026" · heyorca.com "Instagram Changes 2026" · socialbee.com "Instagram Updates April 7, 2026".
**Cómo aplicarlo en Cals2Gains:**
- Refuerza la estrategia de DM-bait CTA (patrón hook #9). Blend convierte los DM shares en experiencia continua, no puntual.
- Considerar mencionar Blend explícitamente en CTAs: "Crea un Blend con tu partner de gym y comparte esto" → engagement loop.
- `caption-hashtag`: variante experimental de CTA → "Añádelo a tu Blend."

---

### Insight 5 · Audio — Upgrade: Central Cee "WAGWAN" confirmado en ≥2 fuentes

**Patrón:** "WAGWAN" de Central Cee, que estaba como observación pendiente en la ronda anterior (1 fuente), ahora se confirma en ≥2 fuentes como audio trending para contenido fitness de alta intensidad y food content energético. UK grime, beat agresivo, ideal para clips de entrenamiento intenso o food prep dinámico.
**Ejemplo:** Creadores de fitness lo usan para montajes de gym y clips de comida tipo "prep like a beast". Tono alto, no apto para talking-head educativo.
**Fuentes:** socialpilot.co "Trending Audio This Week 2026" · scottsocialmarketing.com "50+ Trending Reels Audio April 2026" · buffer.com "Trending Sounds April 2026".
**Cómo aplicarlo en Cals2Gains:**
- Cuenta EN: apto para reel de "high-protein meal prep in 60s" — montaje rápido de cocina con beat fuerte.
- NO apto para contenido educativo o myth-busting (tono no encaja con brand voice ciencia > hype).
- Duración ideal: 10-15 s, cortes rápidos.

---

### Insight 6 · Audio — "Everything Is Romantic" (Charli XCX remix) y "Uncanny Valley" (Melanie Martinez) trending en fitness

**Patrón:** Dos audios adicionales con tracción creciente en abril 2026: (1) "Everything Is Romantic" (Charli XCX remix) — sección "fall in love again and again" usada con motivación y progreso gym. (2) "Uncanny Valley" (Melanie Martinez) — energía cool y desenfadada, versátil para cocina y workout. Ambos encajan con contenido de rutina/hábito más que con educativo.
**Ejemplo:** Creadores usando "Everything Is Romantic" para montajes de progreso en el gym con cortes rápidos; "Uncanny Valley" para food prep con vibes relajadas.
**Fuentes:** buffer.com "Trending Sounds April 2026" · socialbee.com "Trending Instagram Songs April 7, 2026" · newengen.com "Instagram Trends April 2026".
**Cómo aplicarlo en Cals2Gains:**
- "Everything Is Romantic": reel de "falling in love with nutrition" / demo de la app con transiciones suaves. Tono positivo, alineado con brand voice motivadora.
- "Uncanny Valley": reel de "lo que como en un día" con vibes ASMR-light. Cocina overhead.
- Ambos para cuenta EN; evaluar recepción antes de replicar en ES.

---

### Insight 7 · Feature IG — Trial Reels programables

**Patrón:** Adam Mosseri confirmó que los Trial Reels (reels que se muestran solo a no-seguidores para testear rendimiento) ahora se pueden programar con antelación. Esto permite testear contenido en horarios óptimos sin estar online, y evaluar qué content funciona con audiencia fría antes de publicarlo a seguidores.
**Ejemplo:** Creadores usan Trial Reels para A/B testing de hooks: suben dos versiones del mismo reel a audiencia fría y publican la ganadora a seguidores.
**Fuentes:** napoleoncat.com "Instagram New Features 2026" · embedsocial.com "New Instagram Features 2026" · heyorca.com "Instagram Changes 2026".
**Cómo aplicarlo en Cals2Gains:**
- Implementar flujo de A/B testing: `reels-scriptwriter` produce 2 variantes de hook → se suben como Trial Reels → la ganadora (mayor watch time) se publica a seguidores.
- Especialmente útil para @cals2gains (868 seguidores) donde la audiencia orgánica es pequeña y la audiencia fría del Trial Reel es más representativa del público objetivo.

---

### Observaciones pendientes (1 sola fuente, NO accionables aún)

- **Stanford BRP peptide ("natural Ozempic"):** Estudio publicado 12/04/2026 en ScienceDaily. Una sola inyección del péptido BRP redujo consumo de comida un 50% en una hora en ratones. Solo 1 fuente científica primaria, pendiente cobertura más amplia. Si confirma, será contenido de alto potencial viral para Cals2Gains.
- **"Pretty Little Baby" audio para fitness:** Sigue con 1 fuente. No accionable.
- **Reels públicos indexados por Google/Bing:** 1 fuente (invideo.io). Si se confirma, implicaría que SEO de caption importa más allá de IG. Pendiente.
- **Nieves Bolós (@nievesbolos, ~929K):** Pendiente de ronda anterior. No se encontraron nuevas fuentes confirmatorias esta ronda. Mantener como pendiente.

---

Notas de la ronda · resumen ejecutivo para Judith:
- **GLP-1/Ozempic es el mega-tema nutricional de abril 2026.** Múltiples ángulos science-based perfectos para Cals2Gains: resistencia genética, pérdida muscular, importancia de la nutrición como base. Prioridad alta para crear contenido esta semana.
- **3 features IG nuevas accionables:** (1) Edits app con IA y sin watermark → usarla para producción. (2) Links clicables en reels vía Meta Verified → acelerar verificación de @cals2gains. (3) Blend amplifica DM-shares → reforzar DM-bait CTAs.
- **Trial Reels programables** → implementar A/B testing de hooks con audiencia fría.
- **Audio trending:** WAGWAN (Central Cee) confirmado para contenido high-energy. "Everything Is Romantic" y "Uncanny Valley" como opciones versátiles.
- **Sin cambios de alarma algorítmica.** Las señales principales (shares > saves > likes, Originality Score, keywords en caption) siguen vigentes sin cambios.

---
