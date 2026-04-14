# META API SETUP — Cals2Gains

> Guía paso a paso para conectar la Meta Business Suite API con Cals2Gains y habilitar la publicación automática en Instagram y Facebook.
>
> Última actualización: 14 de abril de 2026

---

## 1. Requisitos Previos

### Cuentas necesarias

- **Cuenta de Instagram Profesional**: La cuenta de Cals2Gains debe ser Business o Creator (no personal). Se cambia desde Ajustes > Cuenta > Cambiar a cuenta profesional.
- **Página de Facebook vinculada**: La cuenta de Instagram debe estar conectada a una Facebook Page. Esto se hace desde Meta Business Suite > Configuración > Cuentas vinculadas.
- **Meta Business Suite / Business Manager**: Tener un portfolio de negocio en business.facebook.com con la Page y la cuenta de Instagram añadidas como activos.
- **Business Verification**: Meta requiere verificar el negocio para acceder a permisos avanzados. Necesitas: nombre legal del negocio, dirección, número de teléfono, documento oficial (ej. CIF de Cals2Gains o Civiltek). Este proceso tarda entre 2 días y 2 semanas.
- **Page Publishing Authorization (PPA)**: Algunas cuentas requieren completar PPA antes de poder publicar vía API. Se solicita en Business Settings > Security Center.

### Requisitos técnicos

- Servidor o servicio backend (Node.js, Python, etc.) para manejar tokens y llamadas API
- Dominio válido con HTTPS para el redirect URI del OAuth
- Almacenamiento seguro para tokens y secrets (nunca en frontend)

---

## 2. APIs Necesarias

### Instagram Graph API

Es la API principal para publicar contenido en Instagram. Permite:

- Publicar **fotos** individuales al Feed
- Publicar **vídeos/Reels** (hasta 90 segundos, algunos cuentas hasta 60s)
- Publicar **Carruseles** (hasta 10 elementos: fotos y/o vídeos, pero NO Reels dentro de carruseles)
- Publicar **Stories** (fotos y vídeos, sin stickers interactivos)

**Base URL**: `https://graph.facebook.com/v25.0/`

### Facebook Pages API

Para publicar contenido en la Facebook Page de Cals2Gains:

- Publicar **posts con texto e imágenes**
- Publicar **vídeos**
- **Programar posts** con `published=false` + `scheduled_publish_time` (timestamp UNIX futuro)
- Publicar **links con preview**

**Endpoint principal**: `POST /{page-id}/feed` y `POST /{page-id}/photos`

---

## 3. Crear la Meta App — Paso a Paso

### Paso 1: Acceder al portal de desarrolladores

Ve a [developers.facebook.com](https://developers.facebook.com). Inicia sesión con la cuenta de Facebook que administra la Page de Cals2Gains. Verás el dashboard de Meta for Developers con un botón "My Apps" en la esquina superior derecha.

### Paso 2: Crear nueva app

Haz clic en **"Create App"**. Verás un formulario:

- **App Name**: `Cals2Gains Publisher` (o similar)
- **App Contact Email**: `info@civiltek.es`
- **Business Portfolio**: Selecciona el portfolio de negocio de Cals2Gains/Civiltek

Haz clic en "Create App". Verás el dashboard de la nueva app con un menú lateral de configuración.

### Paso 3: Añadir productos

En el dashboard de la app, busca la sección **"Add Products"**. Necesitas añadir:

1. **Facebook Login for Business**: Haz clic en "Set Up". Esto habilita el flujo OAuth.
2. **Instagram Graph API**: Aparecerá en la lista de productos. Haz clic en "Set Up".

### Paso 4: Configurar Facebook Login

En el menú lateral, ve a **Facebook Login > Settings**:

- **Valid OAuth Redirect URIs**: Introduce tu URL de callback (ej. `https://tudominio.com/auth/callback`)
- **Deauthorize Callback URL**: URL para manejar desconexiones
- **Client OAuth Login**: Activado
- **Web OAuth Login**: Activado

### Paso 5: Obtener credenciales

Ve a **App Settings > Basic** en el menú lateral. Aquí verás:

- **App ID**: Número público que identifica tu app (ej. `123456789012345`)
- **App Secret**: Clave secreta — haz clic en "Show" para verla. **NUNCA la expongas en frontend.**

Guarda ambos valores de forma segura.

### Paso 6: Configurar permisos

Ve a **App Review > Permissions and Features**. Aquí solicitas los permisos necesarios (detallados en la sección 4).

---

## 4. Permisos Necesarios

### Para Instagram (publicación)

| Permiso | Descripción | Requiere App Review |
|---------|-------------|---------------------|
| `instagram_basic` | Acceso básico a perfil de Instagram | Sí |
| `instagram_content_publish` | Publicar contenido (posts, reels, stories, carruseles) | Sí |
| `instagram_manage_comments` | Leer y responder comentarios | Sí |
| `instagram_manage_insights` | Acceso a métricas e insights | Sí |
| `pages_show_list` | Ver lista de Pages del usuario | Sí |
| `pages_read_engagement` | Leer engagement de Pages | Sí |

### Para Facebook Page (publicación)

| Permiso | Descripción | Requiere App Review |
|---------|-------------|---------------------|
| `pages_manage_posts` | Crear, editar y eliminar posts en Pages | Sí |
| `pages_read_engagement` | Leer engagement de la Page | Sí |
| `pages_manage_metadata` | Gestionar metadata de la Page | Sí |

### Para programación de contenido

| Permiso | Descripción | Requiere App Review |
|---------|-------------|---------------------|
| `publish_video` | Publicar vídeos en Pages | Sí |
| `business_management` | Gestión del Business Manager | Sí |

### Proceso de App Review

Para cada permiso marcado con "Sí", necesitas enviar una solicitud de revisión que incluya: una descripción clara de cómo se usará, un screencast o capturas mostrando el flujo de tu app, y un usuario de prueba para que Meta pueda verificar. El review tarda entre 1 y 5 días laborables.

---

## 5. Flujo OAuth para Obtener Tokens

### Paso 1: Redirigir al usuario para autorización

```
https://www.facebook.com/v25.0/dialog/oauth?
  client_id={APP_ID}&
  redirect_uri={REDIRECT_URI}&
  scope=instagram_basic,instagram_content_publish,pages_manage_posts,pages_read_engagement&
  response_type=code
```

Judith verá la pantalla de Facebook pidiéndole que inicie sesión (si no lo está) y luego un diálogo mostrando qué permisos solicita la app. Al aceptar, redirige a la URI con un `code`.

### Paso 2: Intercambiar code por short-lived token

```
GET https://graph.facebook.com/v25.0/oauth/access_token?
  client_id={APP_ID}&
  redirect_uri={REDIRECT_URI}&
  client_secret={APP_SECRET}&
  code={CODE_RECIBIDO}
```

Respuesta:
```json
{
  "access_token": "EAABs...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

Este token dura **1 hora**.

### Paso 3: Intercambiar por long-lived token

```
GET https://graph.facebook.com/v25.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id={APP_ID}&
  client_secret={APP_SECRET}&
  fb_exchange_token={SHORT_LIVED_TOKEN}
```

Respuesta:
```json
{
  "access_token": "EAABs...(token largo)...",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

Este token dura **60 días**. Hay que renovarlo antes de que expire.

### Paso 4: Obtener Page Access Token (long-lived)

```
GET https://graph.facebook.com/v25.0/me/accounts?access_token={LONG_LIVED_USER_TOKEN}
```

Esto devuelve las Pages con sus page access tokens. Si el user token es long-lived, el page token **no expira** (es permanente).

### Paso 5: Obtener Instagram Business Account ID

```
GET https://graph.facebook.com/v25.0/{PAGE_ID}?
  fields=instagram_business_account&
  access_token={PAGE_ACCESS_TOKEN}
```

Respuesta:
```json
{
  "instagram_business_account": {
    "id": "17841400123456789"
  }
}
```

---

## 6. Tokens e IDs a Guardar

| Dato | Ejemplo | Dónde obtenerlo | Expira |
|------|---------|-----------------|--------|
| App ID | `123456789012345` | App Settings > Basic | No |
| App Secret | `abc123def456...` | App Settings > Basic | No |
| Long-lived User Token | `EAABs...` | OAuth flow Paso 3 | 60 días |
| Page Access Token | `EAABs...(page)...` | `/me/accounts` | No expira* |
| Page ID | `109876543210` | `/me/accounts` | No |
| IG Business Account ID | `17841400123456789` | `/{page_id}?fields=instagram_business_account` | No |

*El Page Access Token derivado de un long-lived user token no expira, pero puede invalidarse si Judith cambia su contraseña de Facebook o desconecta la app.

**Almacenamiento recomendado**: Variables de entorno en el servidor o un servicio de secretos (AWS Secrets Manager, .env cifrado). Nunca en código fuente ni en frontend.

---

## 7. Cómo Publicar Contenido vía API

### 7.1 Publicar foto en Instagram

```
# Paso 1: Crear contenedor
POST https://graph.facebook.com/v25.0/{IG_USER_ID}/media
  image_url={URL_IMAGEN_PUBLICA}&
  caption={TEXTO_DEL_POST}&
  access_token={PAGE_TOKEN}

# Respuesta: {"id": "container_id"}

# Paso 2: Publicar
POST https://graph.facebook.com/v25.0/{IG_USER_ID}/media_publish
  creation_id={CONTAINER_ID}&
  access_token={PAGE_TOKEN}
```

### 7.2 Publicar Reel en Instagram

```
# Paso 1: Crear contenedor de vídeo
POST https://graph.facebook.com/v25.0/{IG_USER_ID}/media
  media_type=REELS&
  video_url={URL_VIDEO_PUBLICA}&
  caption={TEXTO}&
  access_token={PAGE_TOKEN}

# Paso 2: Esperar procesamiento (polling)
GET https://graph.facebook.com/v25.0/{CONTAINER_ID}?fields=status_code

# Paso 3: Publicar cuando status_code = "FINISHED"
POST https://graph.facebook.com/v25.0/{IG_USER_ID}/media_publish
  creation_id={CONTAINER_ID}&
  access_token={PAGE_TOKEN}
```

### 7.3 Publicar Carrusel en Instagram

```
# Paso 1: Crear contenedores individuales (hasta 10)
POST /{IG_USER_ID}/media
  image_url={URL_1}&is_carousel_item=true&access_token={TOKEN}
# → item_container_1

POST /{IG_USER_ID}/media
  image_url={URL_2}&is_carousel_item=true&access_token={TOKEN}
# → item_container_2

# Paso 2: Crear contenedor del carrusel
POST /{IG_USER_ID}/media
  media_type=CAROUSEL&
  children={item_container_1},{item_container_2}&
  caption={TEXTO}&
  access_token={TOKEN}

# Paso 3: Publicar
POST /{IG_USER_ID}/media_publish
  creation_id={CAROUSEL_CONTAINER_ID}&
  access_token={TOKEN}
```

### 7.4 Publicar Story en Instagram

```
POST /{IG_USER_ID}/media
  media_type=STORIES&
  image_url={URL_IMAGEN}&
  access_token={TOKEN}

# Luego publicar con media_publish
```

### 7.5 Publicar en Facebook Page

```
# Post con texto e imagen
POST /{PAGE_ID}/photos
  url={URL_IMAGEN}&
  message={TEXTO}&
  access_token={PAGE_TOKEN}

# Post programado
POST /{PAGE_ID}/feed
  message={TEXTO}&
  published=false&
  scheduled_publish_time={UNIX_TIMESTAMP_FUTURO}&
  access_token={PAGE_TOKEN}
```

---

## 8. Qué PUEDE y Qué NO PUEDE Hacer la API

### SÍ se puede

- Publicar fotos individuales en Feed de Instagram
- Publicar Reels (hasta 90 segundos) en Instagram
- Publicar Carruseles (hasta 10 items: fotos y vídeos) en Instagram
- Publicar Stories (fotos y vídeos) en Instagram
- Publicar posts con texto, fotos, vídeos y links en Facebook Page
- Programar posts en Facebook Page (con `scheduled_publish_time`)
- Leer métricas e insights
- Gestionar comentarios

### NO se puede

- **Programar posts en Instagram directamente vía API**: No hay parámetro `scheduled_publish_time` en la Instagram Graph API. La programación debe hacerse desde tu backend (cron job, task scheduler).
- **Publicar Reels dentro de Carruseles**: Los Reels no son soportados como items de carrusel.
- **Publicar Stories con stickers interactivos**: No se pueden añadir stickers de encuesta, link, ubicación ni countdown vía API.
- **Publicar en cuentas personales**: Solo funciona con Business o Creator accounts.
- **Publicar sin URL pública de la imagen/vídeo**: Los archivos deben estar alojados en una URL accesible públicamente (no se puede subir directamente desde disco local).
- **Editar posts ya publicados vía API**: No se puede modificar el caption de un post existente en Instagram.
- **Publicar más de 100 posts/día**: Límite estricto de 100 publicaciones por cuenta en 24 horas.
- **Trial Reels vía API**: Aunque Meta añadió Trial Reels, la disponibilidad vía API puede ser limitada.

---

## 9. MCP Existente: Resultado de Búsqueda

Se buscó en el registro de MCPs con las keywords `["meta", "instagram", "facebook", "social media"]`.

**Resultado: No existe un MCP oficial ni comunitario en el registro.** Existe un proyecto open-source `meta-mcp` por exileum en GitHub/Glama, pero no está en el registro oficial de Cowork/Claude Code.

---

## 10. Propuesta: Arquitectura de MCP para Meta/Instagram

### Nombre: `meta-social-publisher`

### Tools que expondría

```
meta_authenticate
  → Inicia el flujo OAuth, devuelve URL de autorización
  → Input: redirect_uri, scopes
  → Output: auth_url

meta_exchange_token
  → Intercambia code por long-lived token
  → Input: code, redirect_uri
  → Output: access_token, expires_in

meta_get_accounts
  → Lista Pages e IG accounts vinculadas
  → Input: user_access_token
  → Output: [{page_id, page_name, ig_account_id}]

instagram_publish_photo
  → Publica una foto en Instagram Feed
  → Input: ig_user_id, image_url, caption, access_token
  → Output: media_id, permalink

instagram_publish_reel
  → Publica un Reel en Instagram
  → Input: ig_user_id, video_url, caption, access_token
  → Output: media_id, permalink

instagram_publish_carousel
  → Publica un carrusel en Instagram
  → Input: ig_user_id, items[{type, url}], caption, access_token
  → Output: media_id, permalink

instagram_publish_story
  → Publica una Story en Instagram
  → Input: ig_user_id, media_url, media_type (IMAGE|VIDEO), access_token
  → Output: media_id

facebook_publish_post
  → Publica un post en Facebook Page
  → Input: page_id, message, image_url?, link?, access_token
  → Output: post_id, permalink

facebook_schedule_post
  → Programa un post en Facebook Page
  → Input: page_id, message, scheduled_time (ISO 8601), image_url?, access_token
  → Output: post_id, scheduled_time

meta_get_insights
  → Obtiene métricas de un post o cuenta
  → Input: media_id | ig_user_id, metrics[], period, access_token
  → Output: {metric: value}[]

meta_refresh_token
  → Renueva un long-lived token antes de que expire
  → Input: current_token
  → Output: new_token, expires_in
```

### Stack técnico recomendado

- **Lenguaje**: TypeScript (MCP SDK) o Python (FastMCP)
- **Almacenamiento de tokens**: Variables de entorno o secret manager
- **Hosting de medios**: Subir primero a un bucket público (S3, Cloudflare R2) ya que la API requiere URLs públicas
- **Cron para tokens**: Job que renueve el long-lived user token cada 50 días
- **Cron para publicación programada en IG**: Como Instagram no soporta scheduling nativo, un scheduler (cron/Celery/Bull) que ejecute la publicación en la hora programada

---

## 11. Timeline Estimado de Setup

| Fase | Tiempo estimado |
|------|-----------------|
| Crear cuenta de desarrollador y app | 30 minutos |
| Configurar OAuth y obtener tokens de desarrollo | 1-2 horas |
| Business Verification de Meta | 2-14 días |
| App Review (solicitud de permisos) | 1-5 días laborables |
| Desarrollo del MCP | 3-5 días |
| Testing e integración con Cals2Gains | 2-3 días |
| **Total estimado** | **2-4 semanas** |

---

## 12. Checklist Rápido

- [ ] Cuenta de Instagram de Cals2Gains en modo Business/Creator
- [ ] Facebook Page vinculada a la cuenta de Instagram
- [ ] Business Portfolio creado en business.facebook.com
- [ ] Business Verification completada
- [ ] Meta App creada en developers.facebook.com
- [ ] Facebook Login configurado con redirect URI
- [ ] Permisos solicitados y aprobados en App Review
- [ ] OAuth flow implementado y tokens obtenidos
- [ ] Page Access Token e IG Business Account ID guardados
- [ ] MCP desarrollado y conectado a Cals2Gains
- [ ] Test de publicación en cada formato (foto, reel, carrusel, story)
- [ ] Cron de renovación de tokens configurado

---

## Fuentes

- [Meta Content Publishing Documentation](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Instagram Graph API Media Reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/)
- [Meta Permissions Reference](https://developers.facebook.com/docs/permissions/)
- [Facebook Pages API Posts](https://developers.facebook.com/docs/pages-api/posts/)
- [Instagram Graph API Access Tokens](https://developers.facebook.com/docs/instagram-platform/reference/access_token/)
- [Schedule Facebook Posts via API (2026)](https://zernio.com/blog/schedule-facebook-posts-via-api)
- [Instagram Graph API Developer Guide 2026](https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/)
- [Instagram Reels API Guide](https://www.getphyllo.com/post/a-complete-guide-to-the-instagram-reels-api)


---

## 13. Configuración de Modelos OpenAI (actualizado abril 2026)

> Plan: OpenAI Business · Modelos disponibles: GPT-5.4 y GPT-5.4-pro · API key: la misma del `.env`

### Asignación de modelos por subagente de marketing

| Subagente | Modelo | Tier | Justificación |
|-----------|--------|------|---------------|
| `viral-strategist` | **GPT-5.4-pro** | Máximo rendimiento | Cerebro estratégico del pipeline; un brief excelente reduce errores downstream |
| `brand-reviewer` | **GPT-5.4-pro** | Máximo rendimiento | Última barrera de calidad; evalúa múltiples restricciones simultáneamente |
| `performance-analyzer` | **GPT-5.4-pro** | Máximo rendimiento | Cierra el ciclo de aprendizaje; insights de alta calidad mejoran todo el sistema |
| `hook-writer` | GPT-5.4 | Estándar (volumen) | Alto volumen (3 variantes/pieza); creatividad suficiente con modelo estándar |
| `caption-hashtag` | GPT-5.4 | Estándar (volumen) | Alto volumen (captions × 3 cuentas); validado downstream por brand-reviewer |
| `reels-scriptwriter` | GPT-5.4 | Estándar | Trabajo estructurado siguiendo patrones del benchmark |
| `carousel-designer` | GPT-5.4 | Estándar | Specs pautadas por brief + AIDA + paleta BRAND |
| `trend-scout` | GPT-5.4 | Estándar | Bottleneck es la búsqueda web, no el razonamiento del modelo |

### Nota de migración
Todos los subagentes usaban anteriormente GPT-4o (o GPT-4 en versiones tempranas). Desde abril 2026, se migra a GPT-5.4 / GPT-5.4-pro según la tabla anterior. La API key no cambia.
