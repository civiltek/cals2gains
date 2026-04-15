# Cals2Gains — KPI Dashboard & A/B Testing Framework

---

## North Star Metrics

| Métrica | Definición | Target Q2 2026 | Target Q3 2026 |
|---------|-----------|----------------|----------------|
| **Trial starts** | Usuarios que inician los 7 días gratis | 2,000 | 8,000 |
| **Trial → Paid conversion** | % que pasan a pagar tras trial | 15% | 22% |
| **D30 Retention** | % activos a 30 días del registro | 35% | 45% |
| **Monthly Recurring Revenue** | MRR en EUR | 3,000€ | 15,000€ |

---

## Métricas por canal

### Instagram

| Métrica | Frecuencia | Target | Herramienta |
|---------|-----------|--------|-------------|
| Followers | Semanal | +500/sem (fase 1), +300/sem (fase 2-3) | IG Insights |
| Engagement rate | Por post | >5% (carousels), >3% (reels) | IG Insights |
| Reach (no-follower) | Semanal | >40% del reach total | IG Insights |
| Saves | Por post | >4% (carousels), >2% (reels) | IG Insights |
| Shares | Por post | >2% | IG Insights |
| Story completion rate | Diario | >60% | IG Insights |
| Bio link clicks | Semanal | >200/sem | Linktree/UTM |
| DMs recibidos | Semanal | >50/sem | Manual |

### TikTok

| Métrica | Frecuencia | Target | Herramienta |
|---------|-----------|--------|-------------|
| Followers | Semanal | +1000/sem (si viral), +200/sem (normal) | TikTok Analytics |
| Video views (avg) | Por video | >5,000 | TikTok Analytics |
| Watch time | Por video | >60% avg watch | TikTok Analytics |
| Shares | Por video | >1% | TikTok Analytics |
| Profile visits | Semanal | >500/sem | TikTok Analytics |
| Bio link clicks | Semanal | >100/sem | UTM |

### Meta Ads

| Métrica | Frecuencia | Target | Herramienta |
|---------|-----------|--------|-------------|
| CPC (link click) | Diario | <0.30€ | Meta Ads Manager |
| CPM | Diario | <5€ | Meta Ads Manager |
| CTR | Por ad set | >2% | Meta Ads Manager |
| Cost per trial start | Semanal | <3€ | Meta + Analytics |
| Cost per paid conversion | Semanal | <15€ | Meta + RevenueCat |
| ROAS | Mensual | >3x | Calculado |
| Frequency | Semanal | <3 (awareness), <5 (retargeting) | Meta Ads Manager |

### Email (Brevo)

| Métrica | Frecuencia | Target | Herramienta |
|---------|-----------|--------|-------------|
| List growth | Semanal | +200 subs/sem | Brevo |
| Open rate | Por campaign | >35% | Brevo |
| Click rate | Por campaign | >5% | Brevo |
| Unsubscribe rate | Por campaign | <0.5% | Brevo |
| Trial starts from email | Semanal | >50/sem | UTM + Analytics |

---

## Reporting cadence

### Diario (5 min — automatizable)
- [ ] Revisar gasto Meta Ads vs budget
- [ ] Comprobar CPC y CTR anómalos
- [ ] Número de trial starts del día

### Semanal (lunes, 30 min)
- [ ] Actualizar dashboard con métricas de la semana anterior
- [ ] Top 3 posts por engagement → anotar patrón
- [ ] Bottom 3 posts por engagement → anotar qué falló
- [ ] Comparar trial starts vs semana anterior
- [ ] Ajustar presupuesto ads si CPC > target

### Mensual (primer viernes del mes, 2h)
- [ ] Report completo: todos los KPIs vs targets
- [ ] Cálculo de CAC (Customer Acquisition Cost) real
- [ ] Análisis de cohorte: retención por semana de registro
- [ ] Review de A/B tests completados → implementar ganadores
- [ ] Propuesta de nuevos tests para el mes siguiente
- [ ] Actualizar hashtag performance (ver HASHTAG-STRATEGY.md)

---

## A/B Testing Framework

### Principios
1. **Un solo variable** por test. Nunca testear hook + CTA + visual a la vez.
2. **Sample size mínimo**: 1,000 impresiones por variante antes de declarar ganador.
3. **Duración mínima**: 7 días (cubrir ciclo semanal completo).
4. **Significancia estadística**: >90% confianza antes de escalar ganador.
5. **Documentar todo**: hipótesis, resultado, aprendizaje.

### Tests activos (template)

| ID | Canal | Variable | Variante A | Variante B | Métrica | Estado | Ganador |
|----|-------|----------|-----------|-----------|---------|--------|---------|
| T001 | IG Reels | Hook | Pregunta directa | Dato impactante | Watch-through rate | — | — |
| T002 | Meta Ads | CTA | "Prueba gratis" | "Empieza ahora" | CTR | — | — |
| T003 | IG Carousel | Slides | 5 slides | 8 slides | Save rate | — | — |
| T004 | TikTok | Duración | 15s | 30s | Completion rate | — | — |
| T005 | Email | Subject | Emoji vs no emoji | — | Open rate | — | — |
| T006 | Meta Ads | Audience | Lookalike 1% | Interest-based | CPA | — | — |
| T007 | IG Reels | Música | Trending sound | Custom ambient | Shares | — | — |
| T008 | Landing | Pricing | Monthly first | Annual first | Trial start rate | — | — |

### Tests por área

#### Reels / TikTok
- **Hook**: Pregunta vs afirmación vs dato impactante vs POV
- **Duración**: 15s vs 25s vs 45s
- **Subtítulos**: Con vs sin (para verificar el 85% mute stat)
- **CTA final**: "Link en bio" vs "Envía a un amigo" vs "Guarda esto"
- **Música**: Trending sound vs custom brand ambient
- **Primer frame**: Texto grande vs cara vs comida

#### Carousels
- **Nº slides**: 5 vs 7 vs 10
- **Cover**: Bold text vs visual impactante vs pregunta
- **CTA slide**: Soft (guarda esto) vs hard (link en bio)
- **Estilo**: Infographic vs foto real vs mixto

#### Meta Ads
- **Formato**: Video 15s vs carousel vs imagen estática
- **Copy**: Corto (2 líneas) vs largo (párrafo)
- **CTA button**: "Learn More" vs "Sign Up" vs "Get Started"
- **Audience**: LAL 1% vs LAL 3% vs interest stack
- **Placement**: Auto vs Feed only vs Stories only
- **Bid strategy**: Lowest cost vs Cost cap

#### Email
- **Subject line**: Con emoji vs sin | Pregunta vs afirmación | Largo vs corto
- **Send time**: 07:00 vs 12:00 vs 19:00
- **CTA button**: Color (coral vs violet) | Texto (Empezar vs Probar)
- **Contenido**: Educativo puro vs educativo + CTA vs CTA directo

### Registro de resultados completados

| ID | Fecha | Resultado | Aprendizaje | Implementado |
|----|-------|-----------|-------------|--------------|
| — | — | — | — | — |

*Rellenar conforme se completen tests*

---

## Attribution model

### UTM structure
```
utm_source = {plataforma}        // instagram, tiktok, meta_ads, email, influencer
utm_medium = {formato}           // reel, carousel, story, ad, newsletter, dm
utm_campaign = {campaign_name}   // awareness_may26, engagement_jun26, etc
utm_content = {variante}         // hook_a, hook_b, cta_green, etc
utm_term = {hashtag_o_audience}  // lookalike_1pct, interest_fitness, etc
```

### Ejemplo completo
```
https://cals2gains.com/download?utm_source=instagram&utm_medium=reel&utm_campaign=awareness_may26&utm_content=protein_myth&utm_term=fitness_es
```

### Modelo de atribución
- **Primario**: Last-click (RevenueCat attribution)
- **Secundario**: First-touch para awareness (Meta pixel)
- **Ventana**: 7 días click, 1 día view

---

## Alertas

| Alerta | Trigger | Acción |
|--------|---------|--------|
| CPC spike | CPC > 2x target durante 24h | Pausar ad set, revisar creative fatigue |
| Engagement drop | Engagement rate < 2% en 3 posts consecutivos | Revisar contenido, cambiar formato |
| Trial drop | Trial starts < 50% del target semanal | Revisar funnel: ads → landing → signup |
| Churn spike | D7 retention < 20% | Alertar a producto, revisar onboarding |
| Budget overspend | Gasto diario > 120% del daily budget | Pausar campaigns, rebalancear |
