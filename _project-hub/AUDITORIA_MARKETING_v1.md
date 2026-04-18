# Auditoría de contenido publicado — Cals2Gains v1

> Fecha: 2026-04-17 · Autor: agentes legal + marketing
> Ámbito: Reg UE 1924/2006, 432/2012, Ley 17/2011 Art. 44, Código PAOS, RDL 1/2007, Metodología Nutricional v1.0 §9
> Referencia interna: INFORME_LEGAL_v1 §7 Acción 13

---

## 1. Resumen ejecutivo

- Archivos auditados: **11 HTML + 2 i18n + 9 docs marketing + 1 schedule JSON + 1 app-store listing** = 24 piezas.
- **Hallazgos críticos: 6** — testimonios fabricados con claims numéricos de pérdida de peso (incluido post-embarazo), rating/reviewCount inventado en schema.org, superlativos absolutos ("la única app con IA real"), porcentajes de precisión IA no sustanciados (94 %+, 85-95 %), copy in-app `loseFatDesc` usa "pérdida rápida" (lenguaje prohibido §9.2), age rating 4+ en App Store cuando INFORME_LEGAL exige 16+/18+.
- **Hallazgos altos: 9** — claims absolutos de exactitud ("macros exactos"), afirmaciones superlativas sin soporte ("the best", "revolucionario"), testimonio "perdí 2.3 kg en 3 semanas" en plan de Meta Ads, email de welcome sequence con "perdí 4 kg en 6 semanas" + dato inventado "78 % de nuestros usuarios", copy "ninguna otra app tiene eso", "IA más avanzada del mundo", promocional de campaña post 17 con "el ayuno intermitente quema grasa" (aunque la rebate), post ES calendario con "pérdida rápida controlada".
- **Hallazgos medios: 7** — "IA de verdad" como reclamo diferencial, "500+ alimentos verificados", "calcula exactamente", "3 segundos macros exactos", "mini corte: pérdida rápida", uso de "rápida" en `loseFatDesc` y `miniCutDesc` de i18n, hashtags como `#BajarDePeso` que pueden asociarse a poblaciones sensibles.
- **Hallazgos bajos: 4** — minúsculos (copy no crítico de stories, promo text, etc.).

**Riesgo principal:** publicidad engañosa (RDL 1/2007 Art. 20), declaraciones de salud fuera de lista positiva UE 432/2012, y potencial sanción AEPD/Consumo si los testimonios sin consentimiento siguen publicados. Urgente: retirar testimonios públicos con claims de pérdida de peso antes de cualquier spend de Meta Ads.

---

## 2. Hallazgos por archivo

### website/index.html  (== public/index.html)

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.1.1 | `"aggregateRating": {"ratingValue": "4.8", "ratingCount": "1250"}` (schema.org) | Rating y nº de reviews inventados; app aún no lanzada → publicidad engañosa. | RDL 1/2007 Art. 20; RGPD considerandos; política App/Play sobre reviews. | Eliminar `aggregateRating` por completo hasta contar con datos reales (ya aplicado). |
| 2.1.2 | Trust badge hero `★ 4.8 App Store` | Mismo motivo. | RDL 1/2007 Art. 20. | Sustituir por "Sin tarjeta" (aplicado). |
| 2.1.3 | `La única app con IA real` (hero badge) | Superlativo absoluto sin sustento. No hay evidencia de que sea la única. | RDL 1/2007 Art. 20 (práctica desleal por afirmación absoluta no probada). | "IA integrada en cada función" (aplicado). |
| 2.1.4 | `Tu nutrición merece IA de verdad.` (hero H1, final CTA) | Implica que la competencia no tiene IA "de verdad" — afirmación denigratoria. | LGP Art. 9, RDL 1/2007 Art. 19-20. | "Tu nutrición, con IA integrada." (aplicado). |
| 2.1.5 | Testimonios Maria L. "Perdió 8kg en 3 meses" / Carlos R. "ganado 3kg de músculo" / Ana P. "recomposición" | Testimonios ficticios (app no lanzada) con claims numéricos de pérdida/ganancia de peso. Publicidad engañosa + potencial claim de salud. | Reg UE 1924/2006; RDL 1/2007 Art. 20; Reg 432/2012 (no está autorizado claim "pérdida de peso" para apps). | Sección eliminada con comentario HTML indicando requisitos para reintegrar (aplicado). |
| 2.1.6 | FAQ `precisión del 85-95%` | Porcentaje no sustanciado con estudio. | Reg 1924/2006 (claim implícito de rendimiento). | Reformulado a "aproximación · consistencia semana a semana" sin porcentajes (aplicado). |
| 2.1.7 | `Miles de personas ya comen mejor con menos esfuerzo.` (final CTA desc) | "Miles" falso — app no lanzada. | RDL 1/2007 Art. 20. | "Prueba Cals2Gains 7 días gratis, sin tarjeta y sin compromiso." (aplicado). |
| 2.1.8 | `500+ alimentos verificados` (card feature) | Cifra sin verificar (el backend usa OpenFoodFacts con millones). | RDL 1/2007 Art. 20. | Pendiente: unificar con App Store listing (1M+ productos) o dejar claim vago ("base de datos amplia"). **No aplicado** — requiere decisión editorial. |

### website/cals2gains-landing.html

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.2.1 | FAQ `GPT-4o Vision, el modelo más avanzado, calibrado con tu peso. Alcanza 94%+ de precisión tras 2-3 semanas` | Superlativo + porcentaje sin estudio + "más avanzado del mundo". | Reg 1924/2006; RDL 1/2007 Art. 20. | Reformulado sin cifras ni superlativos (aplicado). |
| 2.2.2 | Testimonios María Díaz (entrenadora) / Carlos López / Sofía Pérez (nutricionista "recomiendo Cals2Gains a todos mis clientes") | Testimonios ficticios; especialmente grave que uno sea presentado como nutricionista que "recomienda" la app — puede ser considerado aval profesional inexistente. | RDL 1/2007 Art. 20; Ley 44/2003 profesiones sanitarias (uso indebido de título si la persona no existe); Código PAOS 10. | Sección eliminada (aplicado). |

### public/landing.html

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.3.1 | `LA ÚNICA APP CON IA REAL` (hero) | Superlativo absoluto. | RDL 1/2007 Art. 20. | "IA INTEGRADA EN CADA FUNCIÓN" (aplicado). |
| 2.3.2 | Meta description: `La única app de nutricion con IA real` | Mismo motivo. | RDL 1/2007 Art. 20. | Reemplazado (aplicado). |
| 2.3.3 | Testimonial Laura A. "Perdí 8kg en 3 meses gracias al coach IA" (+ rol "Pérdida de peso transformadora") | Testimonio ficticio + claim numérico de peso + aval del "coach IA" como causa (prescripción implícita). | Reg 1924/2006 (claim de pérdida de peso no autorizado); RDL 1/2007 Art. 20; MDR Reg 2017/745 Regla 11 (riesgo de ser considerado SaMD). | Sección eliminada (aplicado). |
| 2.3.4 | `No hay nada igual en el mercado` (final CTA) | Superlativo absoluto. | RDL 1/2007 Art. 20. | "Empieza hoy, sin fricciones." (aplicado). |
| 2.3.5 | Testimonial Marco R. "Es exacto y súper rápido" | "Exacto" contradice naturaleza estimada de la IA. | RDL 1/2007 Art. 20; Metodología §9.2 (lenguaje recomendado = "aproximación"). | Eliminado junto con la sección (aplicado). |

### website/index-prod-original.html

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.4.1 | Hero `LA ÚNICA APP CON IA REAL` | Superlativo absoluto. | RDL 1/2007 Art. 20. | "IA INTEGRADA EN CADA FUNCIÓN" (aplicado). |
| 2.4.2 | FAQ `GPT-4o Vision, el modelo de IA más avanzado del mundo, 85-95% de precisión` | Superlativo + cifra sin sustento. | Reg 1924/2006; RDL 1/2007 Art. 20. | Reformulado sin superlativo ni porcentaje (aplicado). |
| 2.4.3 | Testimonial Marco R. "Crossfitter · Perdió 5kg en 3 meses" con claim "15 kcal de diferencia" | Testimonio ficticio + cifras biométricas falsas. | RDL 1/2007 Art. 20; Reg 1924/2006. | Sección eliminada (aplicado). |
| 2.4.4 | **Testimonial Laura A. "Después de mi segundo embarazo... perdí 8kg en 4 meses y gané definición"** | **CRÍTICO**: testimonio ficticio dirigido a **población posparto** (grupo sensible §6 legal.md). Publicidad de pérdida de peso a mujeres recién paridas incumple principio de precaución RGPD Art. 9 y Código PAOS. | Reg 1924/2006; Ley 17/2011 Art. 44 y 45; Código PAOS 15 (no dirigirse a situaciones de vulnerabilidad); RDL 1/2007 Art. 20. | Sección eliminada (aplicado). Revisar política general: **ninguna pieza debe mencionar embarazo/lactancia como audiencia de pérdida de peso**. |
| 2.4.5 | Testimonial Daniel G. (preparador físico) "exactamente qué comer... Revolucionario" | Testimonio ficticio + claim absoluto + implica prescripción dietética. | RDL 1/2007 Art. 20; Art. 1 Reg UE 1924/2006 (restricción de recomendación de profesional inexistente). | Sección eliminada (aplicado). |

### public/index.old.html

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.5.1 | Title/schema.org/hero `La unica app de nutricion con IA real` / `LA UNICA APP CON IA REAL` | Superlativo absoluto en metadatos que pueden ser indexados. | RDL 1/2007 Art. 20. | "App de nutricion con IA integrada" / "IA INTEGRADA EN CADA FUNCION" (aplicado). |
| 2.5.2 | Testimonial Laura A. "Perdio 8kg en 3 meses" | Testimonio ficticio + claim pérdida peso. | Reg 1924/2006; RDL 1/2007 Art. 20. | Sección eliminada (aplicado). |
| 2.5.3 | `No hay nada igual en el mercado` | Superlativo absoluto. | RDL 1/2007 Art. 20. | "Empieza hoy, sin fricciones." (aplicado). |

### i18n/es.ts

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.6.1 | `loseFatDesc: 'Déficit de 20% para pérdida rápida de grasa'` (l.612) | "Pérdida rápida" contradice directamente Metodología §9.2 (lenguaje prohibido) y §8 seguridad (ritmo recomendado 0,5-1 %/sem). | Reg 1924/2006; Metodología v1.0 §9.2. | "Déficit del 20 % pensado para una bajada de grasa sostenible." **No aplicado** — toca copy in-app en flujo de onboarding, coordinar con app-dev por posible ruptura de key i18n. Requiere decisión editorial. |
| 2.6.2 | `miniCutDesc: 'Pérdida rápida controlada por corto tiempo'` (l.139 y l.624) | Mismo — "pérdida rápida". | Metodología §9.2. | "Déficit más agresivo durante 4-6 semanas, supervisado." **No aplicado** — idem. |
| 2.6.3 | `loseFatDesc: 'Reducir peso corporal manteniendo músculo'` (l.132, onboarding) | OK, es correcto. | — | — |
| 2.6.4 | `exactValue: 'Valor exacto:'` (l.655) | "Exacto" para macros IA es contradictorio con la naturaleza estimada. | Metodología §9.2/9.3. | "Valor estimado:" — **no aplicado**, requiere confirmar contexto. |
| 2.6.5 | FAQ help `faq2.a: La precisión depende de la calidad de la foto y la iluminación` | OK — es honesto, no hay problema. | — | — |

### i18n/en.ts

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.7.1 | `loseFatDesc: '20% deficit for rapid fat loss'` (l.589) | Mismo que es.ts — "rapid fat loss". | Metodología §9.2. | "20% deficit for sustainable fat loss." **No aplicado** — idem. |
| 2.7.2 | `exactValue: 'Exact value:'` (l.631) | Mismo. | — | "Estimated value:" — **no aplicado**. |

### marketing/APP-STORE-LISTING.md

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.8.1 | `Age Rating: 4+ (no objectionable content)` | **CRÍTICO**: INFORME_LEGAL Acción 12 exige 16+ general y 18+ para modos con déficit. Publicar en 4+ expone a menores de 14 años (incluso a niños) a restricción calórica, contra Reg 432/2012 salvaguardas menores, Ley 17/2011 Art. 44, Código PAOS y LOPD-GDD Art. 7. | Ley 17/2011 Art. 44; Código PAOS; LOPD-GDD Art. 7; RGPD Art. 8. | Cambiar a **17+ en Apple** y **Mature 17+ / Teen with warning en Google**, coordinado con decisión de producto de Judith. **No aplicado** — requiere confirmación de Judith (cambio de política). |
| 2.8.2 | `3 seconds. Exact macros.` (Ad FOMO) / `Macros exactos` | "Exactos" no es cierto — IA estima. | RDL 1/2007 Art. 20; Metodología §9.3. | "Macros estimados en segundos." **No aplicado** — pieza marketing, Judith decide. |

### marketing/campaign-2026/ads/META-ADS-PLAN.md

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.9.1 | l.144 `"Llevo 3 semanas usando Cals2Gains y he perdido 2.3 kg sin dejar de comer lo que me gusta." — Usuario beta` (Ad Testimonial) | **CRÍTICO**: testimonio de beta sin consentimiento escrito + claim numérico de pérdida de peso dirigido a adquisición pagada. Si Meta lo aprueba y se rechaza tras denuncia, la multa de Consumo puede llegar al 4 % de ingresos anuales. | Reg 1924/2006 Art. 12 (no se autorizan claims de ritmo/cantidad de pérdida de peso); RDL 1/2007 Art. 19-20; Meta Ad Policies "Personal Health"; Autocontrol. | Proponer anuncio sin testimonio cuantificado. Por ejemplo: "Registra tus macros con una foto. Prueba 7 días." **No aplicado** — Judith ejecuta. |
| 2.9.2 | l.42 `Cals2Gains te muestra EXACTAMENTE como calcula tus macros.` | OK — "exactamente cómo calcula" se refiere a la fórmula TDEE, no al resultado. Se recomienda reformular a "paso a paso". | Metodología §9.3. | "Cals2Gains te muestra paso a paso cómo calcula tus macros." **No aplicado**. |
| 2.9.3 | l.195 `3 segundos. Macros exactos.` (Ad FOMO) | "Exactos" — claim absoluto. | RDL 1/2007 Art. 20. | "3 segundos. Macros estimados al instante." **No aplicado**. |

### marketing/email/brevo-welcome-sequence-guide.md (y html-templates/email-4-social-proof.html)

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.10.1 | Email 4 asunto + cuerpo `"Perdí 4kg sin dejar de comer lo que me gusta" — María L., usuaria desde febrero 2026` | Testimonio inventado (app no lanzada en producción pública) con claim de pérdida de peso cuantificado. | Reg 1924/2006; RDL 1/2007 Art. 20. | Sustituir email completo por contenido educativo (p. ej. "Cómo leer una etiqueta nutricional"). **No aplicado** — requiere redactar pieza alternativa. |
| 2.10.2 | Email 4 box `El 78 % de nuestros usuarios que siguen sus macros durante 4 semanas reportan mejoras visibles en energía y composición corporal` | Dato estadístico inventado. | RDL 1/2007 Art. 20. | Eliminar la frase o sustituir por cita bibliográfica real (Helms 2014, Aragon 2017). **No aplicado**. |
| 2.10.3 | Email 5 subject "El error #1 que arruina tu nutrición" | OK, claim genérico sin cifras. Mantener. | — | — |

### marketing/strategies/C2G_Campaign_Plan_v2.md (plan editorial)

| # | Texto original | Problema | Normativa | Propuesta de reemplazo |
|---|------------------|----------|------------|--------------------------|
| 2.11.1 | Post 17 — Mito ayuno: `"El ayuno intermitente quema grasa — DEPENDE. Sin déficit calórico, no pierdes nada"` | Tesis correcta pero la frase inicial repite claim prohibido ("quema grasa"). El lector que solo lee el titular queda con la idea opuesta. | Metodología §9.2 (lenguaje prohibido). | "Mito: el ayuno intermitente adelgaza por sí solo. Realidad: solo funciona si hay déficit calórico." **No aplicado** — ya programado en MBS para 20 abr, Judith decide. |

### marketing/Campaign_F1/EN/schedule_en.json (posts ya programados en MBS)

Estos están ya en el planificador de Meta Business Suite. **Judith tiene que editar/eliminar manualmente cada uno desde MBS** — NO se ha tocado aquí.

| # | Post / fecha | Texto problemático | Problema | Propuesta reformulada |
|---|----|---|-----|-------|
| 2.12.1 | **Post 17 — 2026-04-20 13:00 (EN)** | `"Intermittent fasting burns fat" — IT DEPENDS ⚠️ Without a caloric deficit, you won't lose anything. [...] Fasting is a TIMING tool, not a magic diet.` | Comienza con claim prohibido ("burns fat"); aunque lo rebate, el lector que escanea sin leer ve la afirmación. | **Editar en MBS**: `"Does intermittent fasting help you lose weight?" — IT DEPENDS ⚠️ Without a caloric deficit, fasting alone won't do it. It's a timing tool, not a magic diet.` |
| 2.12.2 | **Post 15 — 2026-04-19 13:00 (EN)** | `Protein is the most important macro for body composition.` | Claim absoluto; los tres macros son relevantes. Reg 432/2012 solo permite claims concretos ("protein contributes to the maintenance of muscle mass"). | **Editar en MBS**: `Protein supports muscle maintenance and recovery (EFSA/EU-authorized health claim).` |
| 2.12.3 | **Post 25 — 2026-04-24 13:00 (EN)** | `Body recomposition: losing fat AND building muscle at the same time. 🔄 It's possible. Especially if: → You're a beginner → You're returning after a break → You have a high body fat %` | Frase "high body fat %" puede interpretarse como targeting a personas con obesidad — audiencia sensible. | **Editar en MBS**: Quitar el tercer bullet o reemplazar por "You have a consistent training routine". |
| 2.12.4 | **Post 23 — 2026-04-23 13:00 (EN)** | `75% of adults are chronically dehydrated.` | Estadística no verificable en su forma absoluta; varias fuentes (Popkin 2010) dan cifras menores. | **Editar en MBS**: "Many adults don't drink enough water [enlace a EFSA 2010]." |
| 2.12.5 | **Post 20 — 2026-04-21 19:30 (EN)** | `30+ features ✅ Real AI ✅ Zero ads ✅ All in one app ✅` | "Real AI" bien, pero "All in one" implica comparación superlativa; "Zero ads" OK (es verdadero). | **Editar en MBS**: reformular "Everything in one app" (no comparativo) en vez de "All in one". |
| 2.12.6 | **Post 21 — 2026-04-22 13:00 (EN)** | `You pay $9.99/month for an app… 💸 With ads. No AI. No wearables. No coaching. No transparency.` | Comparativa denigratoria genérica (si un competidor se siente aludido, puede demandar por competencia desleal). | **Editar en MBS**: presentar la propuesta propia sin descalificar a la competencia. |
| 2.12.7 | **Post 22 — 2026-04-22 19:30 (EN)** | `A nutritionist charges $50-100/session. [...] What if AI could do the weekly coaching for you? Not replace the professional. Complement them.` | Frase "complement them" es buena, pero el contexto igualmente posiciona AI como sustituto parcial del profesional — roza prescripción. | **Editar en MBS**: enfatizar "complement, never replace" y añadir disclaimer "no sustituye consejo profesional". |
| 2.12.8 | **Post 27 — 2026-04-25 13:00 (EN)** | `There's a better way. Faster. Smarter. More transparent. And it arrives TOMORROW.` | "Faster. Smarter." absoluto sin sustento. | **Editar en MBS**: "A different way — faster for you, built transparently." |

Posts ES programados (según C2G_Instagram_Posts_Copies.md y Campaign_F1/ES/*.png) replican mayoritariamente la estructura EN → aplicar los mismos cambios en ES.

---

## 3. Posts RRSS — lista accionable para Judith

**Acciones en MBS antes de la próxima publicación** (orden crítico → bajo):

1. **URGENTE — Post 17 EN (2026-04-20 13:00)**: editar caption para reformular "burns fat" como pregunta (2.12.1).
2. **URGENTE — Post 15 EN (2026-04-19 13:00)**: reformular claim de proteína (2.12.2).
3. **MEDIO — Post 25 EN (2026-04-24 13:00)**: eliminar bullet "high body fat %" (2.12.3).
4. **MEDIO — Post 23 EN (2026-04-23 13:00)**: eliminar cifra "75%" (2.12.4).
5. **MEDIO — Post 22 EN (2026-04-22 19:30)**: añadir disclaimer "no sustituye consejo profesional" (2.12.7).
6. **BAJO — Post 21 EN (2026-04-22 13:00)**: suavizar comparativa (2.12.6).
7. **BAJO — Post 20 / 27 EN**: suavizar superlativos (2.12.5, 2.12.8).
8. **Revisar todas las versiones ES** programadas en MBS con los mismos criterios.
9. **Post Instagram Posts Copies #4** (Escaneo con IA): el claim "te diga EXACTAMENTE qué nutrientes tiene" contradice Metodología §9.3 → sustituir por "te diga los nutrientes estimados de tu comida" antes de publicar.
10. **Plan de campaña v2 Post 5 TDEE** (2026-04-14, 12:30): texto correcto. Sin acción.
11. **Plan de campaña v2 Post 13** ("Déficit calórico"): OK. Sin acción.

**Acción sobre posts ya publicados** (si los hubiera publicados antes de 2026-04-17): revisar Instagram @cals2gains, @cals2gains_es, Facebook y borrar/editar cualquiera con claim de pérdida de peso numérica, "la única", "quema grasa" sin rebatir. Si no es posible editar (posts ya publicados sin opción), eliminar.

---

## 4. Acciones automáticas aplicadas (correcciones inequívocas ya hechas en el repo)

Archivos modificados directamente por este agente:

1. `website/index.html` —
   - Eliminado `aggregateRating` inventado (4.8 / 1250 reviews).
   - `La única app con IA real` → `IA integrada en cada función`.
   - `IA de verdad` → `IA integrada` (hero H1 y final CTA).
   - FAQ precisión `85-95%` → reformulación sin cifra.
   - Trust badge `★ 4.8 App Store` → `Sin tarjeta`.
   - Sección testimonios (Maria L., Carlos R., Ana P.) eliminada con comentario HTML de contexto.
   - Final CTA `Miles de personas...` → `Prueba Cals2Gains 7 días gratis, sin tarjeta y sin compromiso.`
2. `public/index.html` — sincronizado con `website/index.html`.
3. `website/cals2gains-landing.html` —
   - FAQ `GPT-4o Vision, el modelo más avanzado, 94%+` → reformulación sin superlativo ni cifra.
   - Sección testimonios (María Díaz, Carlos López, Sofía Pérez nutricionista) eliminada.
4. `public/landing.html` —
   - Hero badge `LA ÚNICA APP CON IA REAL` → `IA INTEGRADA EN CADA FUNCIÓN`.
   - `<title>`, og:title, og:description, meta description — removido "la única / la única app de nutrición con IA real".
   - Sección testimonios (Marco R., Laura A. "Perdí 8kg en 3 meses", Daniel G.) eliminada.
   - Final CTA `No hay nada igual en el mercado` → `Empieza hoy, sin fricciones.`
5. `website/index-prod-original.html` —
   - Hero badge `LA ÚNICA APP CON IA REAL` → `IA INTEGRADA EN CADA FUNCIÓN`.
   - FAQ `GPT-4o Vision más avanzado del mundo, 85-95%` → reformulación.
   - Sección testimonios (incluye el testimonio posparto de Laura A.) eliminada completa.
6. `public/index.old.html` —
   - `<title>`, schema.org, hero badge — sustituido "La unica app" por "App de nutricion con IA integrada".
   - Testimonios eliminados.
   - CTA `No hay nada igual en el mercado` → `Empieza hoy, sin fricciones.`

No se ha tocado: copy de redes sociales, imágenes .png programadas, schedule_en.json, copy i18n con riesgo de romper claves runtime.

---

## 5. Pendiente decisión de producto (no aplicado — requiere decisión editorial / coordinación)

1. **`i18n/es.ts` y `i18n/en.ts` — claves `loseFatDesc` y `miniCutDesc`**: contienen "pérdida rápida / rapid loss" (prohibido §9.2). Propuesta de reemplazo en §2.6.1 y 2.7.1. **Dependencia**: app-dev debe validar que el cambio no rompe el flow de onboarding o goal-modes. Coordinar con el trabajo pendiente §11 de la Metodología (unificación `utils/macros.ts`).

2. **`i18n/{es,en}.ts` — `exactValue: 'Valor exacto / Exact value'`**: requiere ver contexto de uso (probablemente en `app/nutrition-settings.tsx` o `app/ai-review.tsx`). Si se usa para mostrar el resultado de la IA, cambiar a "estimado". Si se usa para un macro calculado (p. ej. objetivo proteico), mantener.

3. **`marketing/APP-STORE-LISTING.md` — Age Rating 4+**: subir a 17+ Apple y Teen con advertencia en Google. Es una decisión estratégica que cambia público objetivo y ASO. **Judith confirma política**, app-dev actualiza config stores, marketing actualiza landing y hashtags.

4. **`marketing/campaign-2026/ads/META-ADS-PLAN.md` — Ad 2A-3 Testimonial "Perdí 2.3 kg"**: toda la estructura del anuncio depende de un testimonio cuantificado. Hay que rediseñar el ad (crear variación sin claim numérico) o eliminarlo del plan.

5. **`marketing/email/brevo-welcome-sequence-guide.md` y `email-4-social-proof.html` — Email 4 social proof**: todo el email gira en torno a un testimonio inventado con cifra. Requiere redacción alternativa (p. ej. serie educativa sobre "cómo leer una etiqueta nutricional") o posponer ese email hasta tener testimonios reales con consentimiento.

6. **`website/index.html` — `500+ alimentos verificados`**: la app usa OpenFoodFacts (>1 millón productos). La cifra 500+ es incoherente. Decidir si se unifica con "1M+ productos" (listing App Store) o se deja vago.

7. **Posts ya publicados**: Judith debe revisar manualmente Instagram y Facebook y retirar cualquier pieza con claims de pérdida de peso cuantificada, "la única", "quema grasa" sin rebatir, y en general toda pieza que contradiga §9.2 de la Metodología.

8. **Testimonios reales (política a futuro)**: marketing debe establecer un pipeline de recogida de testimonios reales con (a) consentimiento escrito RGPD Art. 6.1.a y Art. 9 para datos de salud, (b) sin cifras de pérdida/ganancia de peso, (c) enfocados en experiencia/UX no en resultados biométricos, (d) revisión legal antes de publicar.

---

## 6. Acciones siguientes (coordinación)

- **legal** (este agente): actualizar `_project-hub/INFORME_LEGAL_v1.md §7 Acción 13` marcándola como "en curso — auditoría entregada 2026-04-17".
- **marketing** (agente dueño de CONTENT_PLAN): ejecutar §3 de este informe en MBS antes del próximo post (20 abr). Añadir a `_project-hub/CONTENT_PLAN.md` un apartado "Reglas de copy legal" con lenguaje prohibido/recomendado resumido.
- **app-dev**: aplicar fixes i18n §5.1-5.2 cuando app-dev los aborde como parte del trabajo pendiente §11 Metodología.
- **ops**: añadir entrada en `_project-hub/CHANGELOG.md` con fecha 2026-04-17 y resumen; actualizar `PROJECT_STATUS.md` marcando como bloqueante para el lanzamiento público (R5 INFORME_LEGAL).
- **web-dev**: validar que `website/index.html` y `public/index.html` siguen rindiendo bien y redeployar (Firebase hosting) tras esta auditoría — o esperar a que Judith apruebe el conjunto.

---

## 7. Seguimiento

| Hallazgo # | Severidad | Acción | Owner | Estado |
|---|---|---|---|---|
| 2.1.1 — ratings inventados | CRIT | Eliminado | legal | ✅ hecho |
| 2.1.5 — testimonios ficticios website/index | CRIT | Sección eliminada | legal | ✅ hecho |
| 2.2.2 — testimonio nutricionista ficticio | CRIT | Sección eliminada | legal | ✅ hecho |
| 2.3.3 — testimonio 8 kg/3 meses | CRIT | Sección eliminada | legal | ✅ hecho |
| 2.4.4 — testimonio posparto | CRIT | Sección eliminada | legal | ✅ hecho |
| 2.8.1 — Age Rating 4+ | CRIT | Subir a 17+ | Judith → app-dev | ⏳ pendiente |
| 2.9.1 — testimonio Meta Ad | ALTO | Reescribir anuncio | marketing | ⏳ pendiente |
| 2.10.1 — email 4 social proof | ALTO | Reescribir email | marketing | ⏳ pendiente |
| 2.12.1 — Post 17 EN "burns fat" | ALTO | Editar en MBS antes 20 abr 13:00 | Judith | ⏳ pendiente |
| 2.6.1 — i18n "pérdida rápida" | MEDIO | Cambiar strings | app-dev | ⏳ pendiente |
| resto | MEDIO/BAJO | Ver tabla | marketing | ⏳ pendiente |

---

*Auditoría cerrada para esta iteración. Re-auditar: (a) cuando se redefinan los testimonios reales, (b) antes de activar cualquier campaña paid (Meta Ads, Google Ads), (c) al actualizar listing de App Store / Play Store.*
