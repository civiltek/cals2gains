# CALS2GAINS — Campaign Master Plan 2026
## "Turn Calories Into Gains"

> Documento maestro de la campana de marketing y RRSS.
> Fecha: Abril 2026 | Duracion: 90 dias (Abril-Julio)

---

## 1. RESUMEN EJECUTIVO

**Objetivo:** Lanzar Cals2Gains como la app de nutricion con IA real, consiguiendo 5.000 descargas y 1.500 suscriptores en 90 dias.

**Canales:**
- Instagram: @cals2gains (EN) + @cals2gains_es (ES)
- Facebook: Cals2Gains (EN) + Cals2Gains ES
- TikTok: @cals2gains (EN+ES)
- Meta Ads (Instagram + Facebook)
- Email (Brevo): Secuencia welcome + nurturing
- Web: cals2gains.com (lead capture + conversion)

**Presupuesto total:** 1.800-3.600 EUR (90 dias)

---

## 2. FASES DE CAMPANA

### FASE 0: Pre-calentamiento (Abril 11-14) — YA EJECUTADA
- 4 posts teaser atacando pain points
- Sin revelar marca
- Formato: imagen estatica con texto provocador

### FASE 1: Revelacion + Hype (Abril 15-27)
- **Reveal post** (Abril 15): carousel 6 slides
- Posts de ventajas competitivas (posts 7-15)
- 2 posts/dia (12:30 + 19:00 CEST)
- Stories diarias: polls, countdowns, Q&A
- **Meta:** +500 seguidores, >5% engagement

### FASE 2: Educacion + Features (Abril 28 - Junio 22)
- 1 post/dia (lun-vie 12:30, sab-dom 19:00)
- 8 semanas tematicas:
  - S3: Foto → Macros (IA hero feature)
  - S4: Transparencia total (TDEE/BMR visible)
  - S5: 5 Modos de objetivo
  - S6: Coach IA semanal
  - S7: Todo en una app
  - S8: Wearables + ecosistema
  - S9: Recetas + meal planning
  - S10: Analytics + progreso
- 2 reels/semana + 2 carousels/semana + 1 static + stories diarias
- Meta Ads comienzan: awareness + consideration
- **Meta:** +200 seg/semana, 100 visitas/dia web, 500 descargas

### FASE 3: Conversion + Escala (Junio 23 - Julio 13)
- Contenido centrado en testimonios, social proof, urgency
- Meta Ads: conversion + retargeting
- Influencer collabs (2-4/semana)
- Expansion LATAM (Mexico, Colombia, Argentina)
- **Meta:** 2.000 descargas adicionales, <2 EUR CPI, 1.500 suscriptores

---

## 3. DISTRIBUCION DE CONTENIDO SEMANAL

| Dia | Formato | Pilar | Detalle |
|-----|---------|-------|---------|
| Lunes | Carousel educativo | Educacion (35%) | #MacroMonday — tips de macros |
| Martes | Reel | Producto (25%) | Demo de feature / before-after |
| Miercoles | Static + carousel | Educacion | #MitoOFact — myth busting |
| Jueves | Reel | Lifestyle (15%) | POV / dia de macros / relatable |
| Viernes | Carousel | Producto | #ScanItWithAI — IA demos |
| Sabado | Static motivacional | Motivacion (20%) | Transformaciones, mindset |
| Domingo | Engagement post | Comunidad (5%) | Polls, UGC spotlight, Q&A |

**Stories diarias (7 dias):**
- Lunes: Encuesta ("Que desayunaste hoy?")
- Martes: Behind the scenes (desarrollo app)
- Miercoles: Quiz nutricional
- Jueves: Tip rapido (15s video)
- Viernes: User spotlight / testimonio
- Sabado: Countdown a feature nuevo
- Domingo: Resumen semanal + CTA

---

## 4. CONTENIDO POR FORMATO

### Reels (2/semana = 26 en 90 dias)
Producidos con el motor audiovisual v4.0 (`tools/visual-engine/`)
- Scripts JSON en `marketing/campaign-2026/reels/`
- Duracion: 15-30s (sweet spot viral 2026)
- Subtitulos word-by-word (85% watch mute)
- Transiciones: zoom_cut, whip_pan (top performers)
- Post-processing: color grading cals2gains, vignette, grain

### Carousels (2/semana = 26 en 90 dias)
Producidos con `create_carousel.py`
- Scripts JSON en `marketing/campaign-2026/carousels/`
- 8 slides optimo, formato 4:5 (1080x1350)
- Glassmorphism cards para screenshot_cards
- CTA siempre: save-bait + DM-bait

### Static posts (1/semana = 13 en 90 dias)
- Imagenes generadas con `image_generator.py` + post-processing
- Texto overlay con brand_overlay v4

### Stories (diarias = 90 stories)
- Templates en `marketing/campaign-2026/stories/`
- Interactivas: polls, quiz, slider, countdown

---

## 5. META ADS — ESTRUCTURA

### Presupuesto por fase:
| Fase | Diario | Mensual | Objetivo |
|------|--------|---------|----------|
| F2 (May) | 8-12 EUR | 250-360 EUR | Awareness + Consideration |
| F3 (Jun) | 12-18 EUR | 360-540 EUR | Conversion + Retargeting |
| F3b (Jul) | 15-22 EUR | 450-660 EUR | Scale + LATAM |

### Campanas:
1. **TOFU — Awareness:** Video 15s hook + feature demo
2. **MOFU — Consideration:** Carousel features, testimonios
3. **BOFU — Conversion:** CTA directo, urgency, trial gratis
4. **Retargeting:** Website visitors, app installers sin signup

### Audiencias:
- **Core:** Intereses fitness/nutricion, 18-45, Espana
- **Lookalike:** 1% de visitantes web + subscribers
- **Retargeting:** Pixel 7 dias, carrito abandonado
- **LATAM:** Mexico, Colombia, Argentina, Peru (Fase 3)

---

## 6. INFLUENCER STRATEGY

### Tiers:
| Tier | Seguidores | Inversion | Formato |
|------|-----------|-----------|---------|
| Nano | 1K-10K | Producto gratis | Story + post |
| Micro | 10K-50K | 100-500 EUR | Reel + carousel |
| Mid | 50K-500K | 500-2.000 EUR | Reel + serie |
| Macro | 500K+ | 2.000-10.000 EUR | Ambassadorship |

### Calendario:
- **Mayo S1-2:** 5 nano-influencers (seeding, sin pago)
- **Mayo S3-4:** 3 micro-influencers (100-300 EUR c/u)
- **Junio S1-2:** 2 mid-influencers (500-1.000 EUR c/u)
- **Junio S3-4:** 1 macro-influencer (2.000+ EUR)

### Kit de influencer:
- Media kit PDF (`marketing/campaign-2026/influencer-kit/`)
- Brief creativo por tier
- Contrato tipo
- Tracking links personalizados

---

## 7. EMAIL MARKETING

### Secuencia Welcome (7 emails, 14 dias) — EN BREVO
Ya configurado: emails 1-2 activos, 3-7 HTML listo

### Secuencia Nurturing (post-trial)
- Email 8 (dia 16): "Tu resumen de 2 semanas" (engagement data)
- Email 9 (dia 21): "Lo que te pierdes sin Premium" (feature gate)
- Email 10 (dia 28): "Ultima oportunidad: 30% descuento" (conversion)

### Newsletters (mensuales)
- Recap de contenido top
- Nuevas features
- Receta del mes
- Community spotlight

---

## 8. KPIs Y METRICAS

### Metricas organicas (semanal):
| Metrica | Meta Fase 2 | Meta Fase 3 |
|---------|-------------|-------------|
| Followers (total) | +200/sem | +400/sem |
| Engagement rate | >5% | >4% |
| Saves/post | >50 | >100 |
| Shares/post | >20 | >50 |
| Reel views | >5K | >15K |
| Web clicks | >100/sem | >300/sem |

### Metricas paid (semanal):
| Metrica | Meta | |
|---------|------|--|
| CPM | <3.50 EUR | |
| CPC | <0.60 EUR | |
| CTR | >2% | |
| CPI (coste por instalacion) | <2.00 EUR | |
| ROAS | >2.5x | |

### Metricas email:
| Metrica | Meta |
|---------|------|
| Open rate | >35% |
| Click rate | >5% |
| Unsubscribe | <1% |

---

## 9. ARCHIVOS DE REFERENCIA

| Archivo | Ruta |
|---------|------|
| Brand guide | `_project-hub/BRAND.md` |
| Visual engine | `tools/visual-engine/` |
| Reel scripts | `marketing/campaign-2026/reels/` |
| Carousel scripts | `marketing/campaign-2026/carousels/` |
| Ad copy | `marketing/campaign-2026/ads/` |
| Influencer kit | `marketing/campaign-2026/influencer-kit/` |
| Community playbook | `marketing/campaign-2026/community/` |
| Stories templates | `marketing/campaign-2026/stories/` |
| Email templates | `marketing/email/html-templates/` |
| Template specs | `tools/visual-engine/templates/TEMPLATE-SPECS.json` |
| Reel format guide | `tools/visual-engine/templates/REEL-FORMAT-GUIDE.md` |
| Existing strategies | `marketing/strategies/` |
| Content calendars | `marketing/content-calendar/` |
