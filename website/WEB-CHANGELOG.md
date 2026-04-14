# WEB-CHANGELOG.md — Cals2Gains Website Redesign

**Fecha:** 14 de abril de 2026  
**Versión:** 2.0.0  
**Autor:** Judith · CivilTek  

---

## Resumen General

Rediseño completo del sitio web estático de [cals2gains.com](https://cals2gains.com) para reflejar la migración a GPT-5.4, los nuevos motores de IA (visual y audio), los 11 subagentes de marketing, el sistema de ciberseguridad, el email marketing con lead magnets y la estrategia multiplataforma (3 cuentas IG + 2 FB).

---

## Archivos Modificados

| Archivo | Acción | Tamaño |
|---|---|---|
| `index.html` | Reescritura completa | 65.745 bytes |
| `privacy.html` | Actualización mayor | — |
| `terms.html` | Actualización mayor | — |
| `link/index.html` | Archivo nuevo | 11.655 bytes |

---

## Cambios por Archivo

### 1. `index.html` — Rediseño Completo

#### Sistema de Diseño (Design Tokens)
- Paleta dark-mode premium: `--violet:#9C8CFF`, `--coral:#FF6A4D`, `--plum:#17121D`, `--bone:#F7F2EA`, `--deep:#0D0B1A`
- Tipografías: Outfit (headings, 800–900), Instrument Sans (body), Geist Mono (monospace)
- Glassmorphism en nav y tarjetas (backdrop-filter, bordes translúcidos)
- Animaciones: orbs flotantes en hero, fadeUp con IntersectionObserver, hover transitions

#### Navegación (Nav)
- Fija con glassmorphism (`backdrop-filter:blur(20px)`)
- Logo wordmark: **Cals**2**Gains** con colores de marca
- Links: Features, AI Engine, Plans, FAQ
- Toggle idioma ES/EN (botón pill)
- CTA principal "Empieza Gratis"
- Menú hamburguesa responsive para móvil

#### Hero Section
- Badge animado: "Potenciado por GPT-5.4"
- Título con gradiente: "Tu Coach Fitness con IA de Última Generación"
- Subtítulo descriptivo
- Doble CTA: primario (coral) + secundario (outline)
- Trust bar: valoración 4.9★, "Disponible iOS y Android"
- Mockup placeholder del teléfono

#### Stats Bar
- 4 métricas clave: GPT-5.4 Engine, 11 Subagentes, 5 Redes Sociales, 0€ en Ads

#### Features Grid (9 tarjetas)
- GPT-5.4 Coaching Engine
- Motor Visual IA (DALL-E 3, Sora, Gemini, Canva)
- Motor Audio IA (ElevenLabs, Epidemic Sound)
- 11 Subagentes Marketing
- Cybersecurity System
- Content Repurposing
- Smart Meal Planner
- Workout Generator
- Progress Analytics

#### AI Spotlight Section
- Deep dive en GPT-5.4 con descripción extendida
- Badges de motores: GPT-5.4, DALL-E 3, Sora, Gemini, ElevenLabs
- Placeholder para gráfico/visual

#### Lead Magnet
- "Calculadora de Macros Gratis" / "Free Macro Calculator"
- Formulario de captura de email
- Tracking GA4: evento `lead_capture` con `email_domain`
- Mensaje de confirmación inline

#### How It Works (3 pasos)
1. Descarga la app
2. Configura tu perfil
3. Deja que la IA trabaje

#### Testimonials (3 tarjetas)
- Reseñas con avatar, nombre, rol y puntuación ★
- Grid responsive (3 → 2 → 1 columna)

#### Social Links
- 3 cuentas Instagram: @cals2gains, @cals2gains.fit, @cals2gains.coach
- 2 cuentas Facebook: Cals2Gains, Cals2Gains Community
- Iconos SVG inline, enlaces a perfiles reales

#### Pricing (2 planes)
- Monthly: 4,99€/mes
- Annual: 39,99€/año (badge "Ahorra 33%")
- Feature checklist por plan
- CTA a App Store / Play Store

#### FAQ (6 items)
- Accordion con toggle animado (+/×)
- Preguntas sobre IA, datos, idiomas, cancelación, plataformas, prueba gratuita

#### Final CTA
- Llamada a acción con doble botón (App Store + Play Store)

#### Footer
- 4 columnas: Marca, Producto, Legal, Social
- Links a privacy.html, terms.html
- Copyright 2024–2026

#### SEO y Meta
- Open Graph tags (título, descripción, imagen, URL)
- Twitter Card (summary_large_image)
- Schema.org: MobileApplication + Organization
- Google site verification: `oQNbjYAi1j6LWyHh5M5Lp2R22xyKANuSOIRUHqSRosI`
- GA4: `G-97MNMCDEG2`
- Canonical URL

#### Sistema Bilingüe
- Toggle ES/EN persistente con `localStorage`
- Atributos `data-es` / `data-en` en todos los elementos de texto
- Detección automática del idioma del navegador
- Fallback a español

#### Responsive Design
- Mobile-first (320px base)
- Breakpoints: 768px (tablet), 1024px (desktop)
- Hamburger menu en móvil
- Grid adaptable en todas las secciones

---

### 2. `privacy.html` — Política de Privacidad

- Actualizado GPT-4o → GPT-5.4
- Añadidos servicios de terceros: DALL-E 3, Sora, Gemini, Canva, ElevenLabs, Epidemic Sound
- Nueva sección de email marketing y recopilación de datos para lead magnets
- Descripción del sistema de ciberseguridad
- GA4 unificado a `G-97MNMCDEG2`

---

### 3. `terms.html` — Términos de Uso

- Actualizado GPT-4o → GPT-5.4
- Descripción de servicio ampliada con nuevos motores
- Precios actualizados: 4,99€/mes y 39,99€/año
- GA4 unificado a `G-97MNMCDEG2`

---

### 4. `link/index.html` — Link-in-Bio (NUEVO)

- Página nueva para funnel desde Instagram
- Ruta: `/link` (compatible con Linktree-style URLs)
- Diseño mobile-first optimizado para Stories/Bio
- Links a: App Store, Play Store, Web, Instagram ×3, Facebook ×2
- Tracking GA4: evento por cada click en enlace
- Misma paleta y tipografía que el sitio principal
- Bilingüe ES/EN

---

## Stack Técnico

| Componente | Tecnología |
|---|---|
| Framework | HTML estático (sin build) |
| CSS | Inline, custom properties, CSS Grid, Flexbox |
| JS | Vanilla ES6, IntersectionObserver, localStorage |
| Fonts | Google Fonts (Outfit, Instrument Sans, Geist Mono) |
| Analytics | GA4 (G-97MNMCDEG2) |
| SEO | Schema.org, OG, Twitter Cards |
| Hosting | GitHub Pages (civiltek/cals2gains) |

---

## Notas de Despliegue

1. Hacer commit y push de los 4 archivos al repo `civiltek/cals2gains`
2. Verificar que GitHub Pages sirve correctamente `/link/index.html`
3. Actualizar enlaces de Instagram bio a `https://cals2gains.com/link`
4. Probar formulario de lead magnet (actualmente frontend-only, requiere backend)
5. Subir imágenes reales: `c2g-icon.png`, `hero-phone.png`, OG image
6. Revisar que GA4 recibe eventos correctamente

---

## Próximos Pasos

- [ ] Conectar formulario de lead magnet con backend (Mailchimp / Resend / etc.)
- [ ] Subir assets de imagen reales (mockups, iconos, OG image)
- [ ] Configurar redirects si se usa dominio personalizado
- [ ] Test de rendimiento (Lighthouse, PageSpeed Insights)
- [ ] Validar Schema.org con Google Rich Results Test
- [ ] A/B testing en hero CTA copy
