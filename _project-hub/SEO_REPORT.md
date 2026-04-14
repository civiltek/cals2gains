# SEO Report — Cals2Gains
> Última actualización: 2026-04-13 | Auditoría #1 (Línea base)

---

## 📊 Estado General del SEO

| Área | Estado | Nota |
|------|--------|------|
| Sitio activo | ✅ OK | HTTP 200, respuesta ~239ms |
| Indexación Google | ✅ Indexado | Aparece en site:cals2gains.com |
| Title tag | ✅ OK | Dinámico ES/EN, bien optimizado |
| Meta description | ✅ OK | Presente, longitud adecuada |
| OG tags | ✅ OK | og:title, og:description, og:image, og:url, og:locale |
| Twitter Cards | ❌ FALTA | No hay meta twitter:* en el sitio en producción |
| Canonical | ✅ OK | `<link rel="canonical" href="https://cals2gains.com">` |
| hreflang | ✅ OK | es, en, x-default presentes |
| Schema.org | ⚠️ PARCIAL | MobileApplication presente, pero sin FAQPage ni AggregateRating |
| robots.txt | ✅ OK | Permite todo, referencia al sitemap |
| sitemap.xml | ✅ OK | 3 URLs: /, privacy.html, terms.html |
| GA4 tag | ✅ Instalado | G-97MNMCDEG2 presente en producción |
| Favicon | ❌ 404 | /favicon.ico retorna "Page Not Found" |
| HTTPS / HSTS | ✅ OK | HSTS max-age=31556926 activo |
| Links rotos | ✅ Sin roturas | Todos los assets accesibles |
| Mobile-friendly | ✅ OK | Viewport meta presente, diseño responsive |
| H1 | ⚠️ MEJORABLE | "Sacale una foto a tu plato." — sin keywords ni marca |
| Velocidad respuesta | ✅ OK | ~239ms tiempo hasta primer byte |
| Contenido | ⚠️ DÉBIL | Landing page única, sin blog ni páginas de contenido |
| Keywords ranking | ❌ Sin posiciones | No aparece en top 20 para ningún keyword (esperado en fase 1) |

---

## 🔍 Auditoría Técnica Detallada

### 1. Meta Tags (Sitio en producción)

```html
<title data-es="Cals2Gains — La única app de nutrición con IA real"
       data-en="Cals2Gains — The only nutrition app with real AI">
Cals2Gains — La única app de nutrición con IA real
</title>

<meta name="description" content="Cals2Gains — La app de nutricion con IA real.
Escanea tu plato, recibe coaching semanal personalizado y deja que la app ajuste tus macros por ti.">

<meta property="og:title" content="Cals2Gains — La única app de nutrición con IA real">
<meta property="og:description" content="...">
<meta property="og:image" content="https://cals2gains.com/logo.png">
<meta property="og:type" content="website">
<meta property="og:url" content="https://cals2gains.com/">
<meta property="og:locale" content="es_ES">
<meta property="og:locale:alternate" content="en_US">
```

**✅ Bien:** Title y OG tags presentes y bien redactados. hreflang correcto.
**❌ Falta:** Meta tags `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`

### 2. Estructura de Headings

```
H1: "Sacale una foto a tu plato."
H2: Así de fácil
H2: Por qué somos diferentes
H2: Todo en una app
H2: ¿Por qué Cals2Gains?
H2: Planes
H2: Lo que dicen nuestros usuarios
H2: Preguntas frecuentes
H2: Tu nutrición merece IA de verdad.
H3: Foto / Revisa / Progresa / Cámara IA / Coach IA semanal / ¿Qué como? / Ajuste adaptativo / GRATIS
```

**⚠️ Problema:** El H1 actual ("Sacale una foto a tu plato.") no incluye keywords SEO relevantes ni el nombre de la app. Esto es una oportunidad perdida para las búsquedas orgánicas.
**Recomendación:** Mejorar el H1 o añadir el nombre de marca + keyword principal de forma visible.

### 3. Structured Data (Schema.org)

**Presente:**
```json
{
  "@type": "MobileApplication",
  "name": "Cals2Gains",
  "description": "Nutrition tracking app powered by AI",   ← EN en página ES
  "applicationCategory": "HealthAndFitnessApplication",
  "operatingSystem": "iOS, Android",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" }
}
```

**Problemas detectados:**
- La `description` en el schema está en inglés ("Nutrition tracking app powered by AI") pero la página sirve en español. Inconsistencia de idioma.
- No hay `FAQPage` schema — la sección FAQ existe en el HTML con 6+ preguntas detalladas, pero no tiene markup estructurado. Esto pierde la oportunidad de aparecer en los "rich results" de Google.
- No hay `AggregateRating` — útil para mejorar CTR en resultados.

### 4. robots.txt
```
User-agent: *
Allow: /
Sitemap: https://cals2gains.com/sitemap.xml
```
✅ Correcto.

### 5. sitemap.xml
```xml
<url>https://cals2gains.com/</url>              priority 1.0, lastmod 2026-04-11
<url>https://cals2gains.com/privacy.html</url>  priority 0.3
<url>https://cals2gains.com/terms.html</url>    priority 0.3
```
✅ Correcto. Se recomienda actualizar `lastmod` cada vez que se publiquen cambios significativos.

### 6. Assets y enlaces

| Asset | Estado |
|-------|--------|
| c2g-icon.png | ✅ 200 OK (10 KB) |
| logo.png | ✅ 200 OK (10 KB) |
| /privacy.html | ✅ 200 OK |
| /terms.html | ✅ 200 OK |
| /favicon.ico | ❌ 404 Not Found |
| Google Play link | ❌ Ausente (app pendiente publicación) |
| App Store link | ❌ Ausente (iOS pendiente) |

**Nota:** c2g-icon.png y logo.png parecen ser el mismo archivo (ambos 10,095 bytes). Verificar que no son duplicados.

### 7. Rendimiento y Core Web Vitals

- **Time to First Byte (TTFB):** ~239ms — excelente (Firebase Hosting CDN en Madrid)
- **Cache-Control:** max-age=3600 — solo 1 hora. Para una landing estática se podría aumentar a 86400 (1 día) o más
- **Compresión:** Brotli activo (ETag incluye "-br")
- **HTTP/3:** Disponible (Alt-Svc: h3=":443")
- **HSTS:** ✅ Activo (max-age=31556926 ≈ 1 año)
- **Tamaño HTML:** ~89KB — aceptable, aunque tiene todo inline

### 8. Google Analytics 4

- **Tag en producción:** G-97MNMCDEG2 ✅ Instalado correctamente
- **Tag en archivo local:** G-WMHZQ52NS2 ⚠️ El archivo local `website/index.html` tiene un tag diferente (G-WMHZQ52NS2). El local está desactualizado respecto a producción.
- **Propiedad en METRICS.md:** macrolens-ai-4c482 (ID 532155665) — necesita verificar si G-97MNMCDEG2 corresponde a esta propiedad.
- **Datos recibidos:** Pendiente confirmación. Anteriormente se reportaban 0 usuarios (tag no instalado), pero ahora el tag G-97MNMCDEG2 SÍ está en producción.

---

## 🔑 Análisis de Keywords

### Keywords objetivo (por volumen estimado y relevancia)

#### EN INGLÉS
| Keyword | Volumen est. | Competencia | Cals2Gains ranking | Notas |
|---------|-------------|-------------|-------------------|-------|
| calorie tracker app | Alto (100K+) | MUY ALTA | No rankea | Dominado por MFP, Lose It |
| AI nutrition app | Medio (10K) | MEDIA | No rankea | Oportunidad emergente |
| macro tracker app | Medio (30K) | ALTA | No rankea | Dominado por Cronometer |
| AI calorie counter | Medio (10K) | MEDIA-ALTA | No rankea | Creciendo con IA |
| nutrition coach app | Bajo-Medio | MEDIA | No rankea | Nicho accesible |
| weekly nutrition coach | Bajo | BAJA | No rankea | **Long tail con oportunidad** |
| AI meal analysis | Bajo | BAJA | No rankea | **Long tail con oportunidad** |

#### EN ESPAÑOL
| Keyword | Volumen est. | Competencia | Cals2Gains ranking | Notas |
|---------|-------------|-------------|-------------------|-------|
| app nutrición IA | Medio | MEDIA | No rankea | Creciendo |
| contador calorías IA | Bajo-Medio | MEDIA | No rankea | **Oportunidad** |
| app contar calorías | Medio | ALTA | No rankea | Dominado por Yazio/MyFitnessPal |
| tracker macros app | Bajo | MEDIA | No rankea | Long tail |
| mejor app nutrición | Medio | ALTA | No rankea | Competitivo |
| coach nutricional IA | Bajo | BAJA | No rankea | **Oportunidad clara** |
| escanear comida IA | Bajo | BAJA | No rankea | **Unique selling point** |

### Keywords de cola larga recomendadas (atacar primero)

Estos términos tienen menor competencia y son más asequibles para un dominio nuevo:

1. **"AI nutrition coach app"** — diferenciador clave vs competidores
2. **"weekly AI nutrition coach"** — única funcionalidad de Cals2Gains
3. **"scan food with AI app"** / **"escanear comida con IA app"**
4. **"adaptive macro tracker"** / **"app macros adaptativos"**
5. **"nutrition app without ads"** / **"app nutrición sin publicidad"** — diferenciador
6. **"GPT-4 nutrition app"** — tech-savvy audience

---

## 🏆 Comparativa con Competidores

| Característica | Cals2Gains | MyFitnessPal | Yazio | Lifesum | FatSecret |
|----------------|-----------|-------------|-------|---------|-----------|
| DA/DR estimado | Muy bajo (nuevo) | ~85 | ~60 | ~55 | ~50 |
| Contenido blog | No | Sí (extenso) | Sí | Sí | Sí |
| Páginas indexadas | ~3 | Miles | Cientos | Cientos | Miles |
| App store links en web | No (pendiente) | ✅ | ✅ | ✅ | ✅ |
| Schema FAQ | No | Sí | Sí | Parcial | No |
| Twitter cards | No | Sí | Sí | Sí | Sí |
| Favicon | No | ✅ | ✅ | ✅ | ✅ |
| IA como diferenciador | ✅ SÍ | Básica | Básica | Básica | No |
| Sin publicidad | ✅ SÍ | No | No | No | No |

**Brecha principal:** Los competidores tienen años de dominio authority, blog con miles de artículos, y backlinks institucionales. Cals2Gains necesita construir contenido y authority gradualmente.

---

## 🚨 Problemas Prioritarios a Corregir

### URGENTE (esta semana)

1. **❌ Favicon 404** — `/favicon.ico` retorna error. Afecta a la experiencia de usuario y a señales de calidad. Crear y subir favicon.ico (o favicon.png).

2. **❌ Twitter Card meta tags ausentes en producción** — Las etiquetas `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` no están en el HTML del sitio en producción. Importantes para compartición en X/Twitter y en algunas previsualizaciones de LinkedIn.

3. **❌ FAQPage Schema ausente** — El sitio tiene 6+ preguntas bien redactadas en la sección FAQ pero no hay `@type: FAQPage` en el structured data. Añadirlo podría generar "rich snippets" en Google con las preguntas desplegables, mejorando visibilidad y CTR sin necesidad de mejorar el ranking.

4. **⚠️ Archivo local desactualizado** — `website/index.html` tiene el GA tag antiguo (G-WMHZQ52NS2). Aunque no afecta a producción, mantiene confusión en el repo. Sincronizar el repositorio local con producción.

### IMPORTANTE (próximas 2 semanas)

5. **⚠️ Schema description en inglés** — La propiedad `description` del MobileApplication schema dice "Nutrition tracking app powered by AI" en inglés para una página principalmente en español.

6. **⚠️ H1 sin keywords** — El H1 actual es atractivo para humanos pero invisible para SEO. Considerar variantes que incluyan términos clave.

7. **⚠️ Sin links a app stores** — Normal mientras la app no esté publicada, pero hay que tenerlo preparado para añadir en cuanto se publique en Google Play y App Store.

### A LARGO PLAZO

8. **Crear contenido de blog** — Necesario para posicionar en keywords de volumen medio.
9. **Estrategia de link building** — Sin backlinks externos de calidad es muy difícil rankear.
10. **Google Search Console** — Verificar que los datos llegan correctamente y revisar errores de indexación semanalmente.

---

## ✏️ Cambios Realizados Esta Semana

**Ningún cambio en código** — Esta es la primera auditoría (línea base). Los problemas detectados se documentan para acción en las siguientes iteraciones.

Nota: Los archivos HTML en `C:/Users/Judit/Documents/Cals2Gains/website/` están desactualizados respecto al sitio en producción (diferentes GA tags, posiblemente otras diferencias). Antes de editar el HTML local, verificar cuál es la fuente de verdad para el despliegue.

---

## 📈 Métricas SEO de Seguimiento

| Métrica | Sem 1 (13 abr 2026) | Sem 2 | Sem 3 | Sem 4 |
|---------|--------------------|----|----|----|
| Páginas indexadas (site:) | ~3 | — | — | — |
| DA/DR estimado | <5 (nuevo) | — | — | — |
| Keywords en top 100 | 0 | — | — | — |
| Keywords en top 20 | 0 | — | — | — |
| Backlinks externos | 0-1 (IG) | — | — | — |
| Tráfico orgánico (GA4) | Sin datos* | — | — | — |
| Twitter Card implementado | ❌ | — | — | — |
| FAQPage Schema | ❌ | — | — | — |
| Favicon | ❌ | — | — | — |

*GA4 tag G-97MNMCDEG2 instalado en producción — verificar si llegan datos en Search Console.

---

## 🗓️ Recomendaciones Priorizadas

### Semana 1-2 (Quick wins técnicos)
- [ ] Añadir favicon.ico y/o favicon.png al hosting de Firebase
- [ ] Añadir Twitter Card meta tags al HTML de producción
- [ ] Añadir FAQPage schema al structured data (copy/paste desde las preguntas ya existentes)
- [ ] Corregir `description` del Schema a español
- [ ] Sincronizar `website/index.html` local con producción

### Mes 1 (Fundamentos de contenido)
- [ ] Crear primera página de blog: "¿Cómo contar calorías con IA?" (keyword: "contar calorías IA app")
- [ ] Crear landing page en inglés separada o sección EN para capturar tráfico EN
- [ ] Registrar en Google Search Console y verificar indexación
- [ ] Añadir links a Google Play / App Store en cuanto se publique la app

### Mes 2-3 (Growth SEO)
- [ ] 4-6 artículos de blog en español (keywords long tail identificadas)
- [ ] 4-6 artículos en inglés
- [ ] Conseguir primeros backlinks: press releases, guest posts en blogs de nutrición/fitness
- [ ] Crear página de comparación: "Cals2Gains vs MyFitnessPal" (keyword de alta intención)
- [ ] Optimizar metadatos ASO cuando la app esté en stores

---

## 📦 ASO (App Store Optimization)

**Estado actual:** No aplica — app aún no publicada en ningún store.

**Para cuando se publique (preparación):**
- **Título Android:** "Cals2Gains: AI Nutrition & Macros" (incluye keyword "AI Nutrition")
- **Título iOS:** "Cals2Gains — AI Nutrition Coach"
- **Keywords cortas para tag field (iOS):** calorie,macro,tracker,nutrition,AI,coach,diet,food,scan,weight
- **Short description Android (80 chars):** "Track nutrition with AI. Scan food, get weekly coaching & adaptive macros."
- **Keywords a incluir en descripción larga:** calorie tracker, macro tracker, nutrition coach, AI food scan, weekly coach, adaptive TDEE

---

## 🔗 Estrategia de Link Building

**Oportunidades inmediatas (coste cero):**
1. **Perfil de Instagram @cals2gains** → link en bio ya presente (IG → web)
2. **Product Hunt** — Lanzar cuando la app esté en stores. Puede generar tráfico y backlinks DA 90+
3. **Reddit:** r/fitness, r/nutrition, r/apps — participar con valor antes de auto-promover
4. **Crunchbase / AngelList** — Perfiles gratuitos con backlink dofollow
5. **Directorios de apps:** AlternativeTo, AppAdvice, SimilarWeb listing
6. **HARO (Help A Reporter Out)** — Responder queries sobre nutrición/IA para conseguir menciones en prensa

---

## 📅 Próxima Auditoría
**Fecha:** 20 abril 2026 (lunes)
**Foco:**
- Verificar si se implementó el favicon
- Verificar si Twitter Cards y FAQPage schema están activos
- Comprobar primeros datos en GA4 (Search Console)
- Revisar si la app se ha publicado en Google Play



---

## ⚠️ ALERTA CRÍTICA: Archivos locales NO coinciden con producción

Durante la auditoría se detectó una discrepancia mayor entre los archivos locales y el sitio desplegado en Firebase:

| Archivo | Tamaño | GA Tag | Estado |
|---------|--------|--------|--------|
| website/index.html (local) | ~47 KB | G-WMHZQ52NS2 (antiguo) | DESACTUALIZADO |
| website/cals2gains-landing.html (local) | ~43 KB | Sin verificar | Posiblemente desactualizado |
| Producción en cals2gains.com | ~89 KB | G-97MNMCDEG2 (activo) | Versión ACTUAL |

El sitio en producción tiene casi el doble de contenido que cualquier archivo local. Esto indica que el código fuente desplegado no está guardado en el repositorio local.

**Riesgo real:** Si se ejecuta firebase deploy desde los archivos locales, se sobreescribirá la versión actual de producción con una versión más antigua y sin las mejoras recientes.

**Acción requerida ANTES de cualquier corrección SEO:**
1. Localizar el archivo fuente actual del deploy (puede estar en otra carpeta o en un branch diferente de Git)
2. O descargar la producción: curl https://cals2gains.com -o website/index-prod.html
3. Aplicar las correcciones SEO (favicon, FAQPage schema, Twitter cards) SOLO sobre el archivo correcto
4. NO ejecutar firebase deploy desde los archivos locales actuales sin revisar primero


---

## ✅ CAMBIOS APLICADOS (13 abril 2026 — Auditoría automática)

Los siguientes problemas han sido **corregidos en `public/index.html`** (el archivo de deploy real):

| Fix | Estado | Detalle |
|-----|--------|---------|
| Twitter Card meta tags | ✅ APLICADO | twitter:card, twitter:site, twitter:creator, twitter:title, twitter:description, twitter:image |
| Favicon | ✅ APLICADO | `<link rel="icon" type="image/png" href="/c2g-icon.png">` + apple-touch-icon |
| FAQPage Schema | ✅ APLICADO | 5 preguntas FAQ con markup @type:FAQPage para rich snippets en Google |
| Schema description en español | ✅ APLICADO | Cambiado de "Nutrition tracking app powered by AI" a descripción completa en español |

### 🔴 Pendiente deploy manual

Los archivos están corregidos en `C:\Users\Judit\Documents\Cals2Gains\public\index.html`.
Las credenciales de Firebase han expirado. Para publicar los cambios, ejecuta:

```
deploy-seo-fixes.bat
```

(Está en `C:\Users\Judit\Documents\Cals2Gains\deploy-seo-fixes.bat`)

O manualmente desde terminal en esa carpeta:
```
firebase login --reauth
firebase deploy --only hosting
```

### ℹ️ Nota sobre archivos locales

El directorio de deploy real es `public/` (según `firebase.json`), no `website/`.
- `public/index.html` → ✅ Actualizado con todos los fixes SEO
- `website/index.html` → ⚠️ También actualizado (copia de respaldo con mismos cambios)
- `public/index.old.html` → Versión anterior guardada como backup
