# Integracion Brevo en cals2gains.com — Subscriber Box

> Fecha: 2026-04-14
> Para: Judith / Desarrollo web

---

## Opcion 1: Iframe de Brevo (ya funciona — sin API)

El formulario de Brevo ya esta integrado en `website/link/index.html` con iframe:

```html
<iframe
  width="540" height="305"
  src="https://e16073f5.sibforms.com/serve/MUIFANJ7cd06Veo9bk942kJaC6WCiR3GdgciKExwgfSQDvL4iiBcp6BuMqcae5eZ1R0QWDYdi287h7arB48ys5WCUK0fw_4UO6oLAigE3MSjn35XTnn9SN_eq5SSorSeENj_iWLIyUHeOXFhk11t5wQDqaUSrBKw_HnWOZWpICGrjdVaHM6iOrkXsRQiCu0XaDml9P57J6f1Q-lncg=="
  frameborder="0" scrolling="auto" allowfullscreen
  style="display:block;margin:0 auto;max-width:100%;width:100%;border-radius:0 0 14px 14px">
</iframe>
```

Se puede pegar en cualquier pagina. No requiere API ni API key.

---

## Opcion 2: Formulario nativo con Brevo API (recomendado para la web principal)

Esta opcion crea un formulario bonito integrado directamente en el diseño de la web (sin iframe, sin dependencias externas). Usa la API de Brevo para crear el contacto.

### Paso 1: Obtener la API Key de Brevo

1. Ir a https://app.brevo.com/settings/keys/api
2. Copiar la **API key v3** (empieza por `xkeysib-...`)
3. **IMPORTANTE:** Esta key NO debe ir en el frontend. Necesitas un backend/serverless function.

### Paso 2: Cloud Function (Firebase) para proxy seguro

Crear en `functions/src/brevo-subscribe.ts` (o `.js`):

```typescript
import * as functions from 'firebase-functions';

export const brevoSubscribe = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', 'https://cals2gains.com');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, firstName } = req.body;

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Email invalido' });
    return;
  }

  const BREVO_API_KEY = functions.config().brevo.apikey;
  // IDs de las listas: Main List = 3, Lead Magnet = 4
  const LIST_IDS = [3, 4];

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        email: email,
        attributes: { FIRSTNAME: firstName || '' },
        listIds: LIST_IDS,
        updateEnabled: true,
      }),
    });

    if (response.ok || response.status === 204) {
      // Enviar email de confirmacion DOI
      await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        body: JSON.stringify({
          email: email,
          attributes: { FIRSTNAME: firstName || '' },
          includeListIds: LIST_IDS,
          templateId: 2,  // Plantilla DOI predeterminada
          redirectionUrl: 'https://cals2gains.com/gracias',
        }),
      });
      res.status(200).json({ success: true });
    } else {
      const data = await response.json();
      // Si el contacto ya existe, no es error
      if (data.code === 'duplicate_parameter') {
        res.status(200).json({ success: true, message: 'Ya estas suscrito' });
      } else {
        res.status(400).json({ error: data.message || 'Error al suscribir' });
      }
    }
  } catch (error) {
    console.error('Brevo API error:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});
```

### Paso 3: Configurar la API key en Firebase

```bash
firebase functions:config:set brevo.apikey="xkeysib-TU-API-KEY-AQUI"
firebase deploy --only functions
```

### Paso 4: Componente HTML del formulario (para la web)

Pegar este bloque donde quieras el subscriber box en cals2gains.com:

```html
<!-- ===== SUBSCRIBER BOX CALS2GAINS ===== -->
<div id="c2g-subscribe" style="max-width:500px;margin:40px auto;padding:0;font-family:'Instrument Sans',-apple-system,sans-serif;">
  <div style="background:#17121D;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
    <!-- Header -->
    <div style="padding:24px 28px 16px;text-align:center;">
      <div style="font-family:'Outfit',sans-serif;font-size:1.3rem;font-weight:700;color:#FFFFFF;margin-bottom:6px;">
        Guia de Macros <span style="color:#FF6A4D;">Gratis</span>
      </div>
      <p style="color:rgba(247,242,234,0.6);font-size:0.85rem;margin:0;line-height:1.4;">
        Suscribete y recibe tu guia para calcular tus macros ideales.
      </p>
    </div>
    <!-- Accent bar -->
    <div style="height:3px;background:linear-gradient(90deg,#F9644A 0%,#9587F8 100%);"></div>
    <!-- Form -->
    <div style="padding:20px 28px 24px;">
      <form id="c2g-form" onsubmit="return c2gSubscribe(event)">
        <input type="text" id="c2g-name" placeholder="Tu nombre (opcional)"
          style="width:100%;padding:12px 16px;border:1px solid rgba(156,140,255,0.25);border-radius:8px;background:rgba(255,255,255,0.08);color:#F7F2EA;font-size:0.9rem;margin-bottom:10px;box-sizing:border-box;outline:none;"
          onfocus="this.style.borderColor='#9C8CFF'" onblur="this.style.borderColor='rgba(156,140,255,0.25)'">
        <input type="email" id="c2g-email" placeholder="tu@email.com" required
          style="width:100%;padding:12px 16px;border:1px solid rgba(156,140,255,0.25);border-radius:8px;background:rgba(255,255,255,0.08);color:#F7F2EA;font-size:0.9rem;margin-bottom:14px;box-sizing:border-box;outline:none;"
          onfocus="this.style.borderColor='#9C8CFF'" onblur="this.style.borderColor='rgba(156,140,255,0.25)'">
        <button type="submit" id="c2g-btn"
          style="width:100%;padding:14px;background:#FF6A4D;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:background 0.3s;"
          onmouseover="this.style.background='#e55a42'" onmouseout="this.style.background='#FF6A4D'">
          Quiero mi guia gratis
        </button>
      </form>
      <div id="c2g-msg" style="text-align:center;margin-top:12px;font-size:0.82rem;display:none;"></div>
      <p style="color:rgba(247,242,234,0.35);font-size:0.7rem;text-align:center;margin:12px 0 0;">
        Sin spam. Solo contenido de valor. Puedes darte de baja en cualquier momento.
      </p>
    </div>
  </div>
</div>

<script>
async function c2gSubscribe(e) {
  e.preventDefault();
  const btn = document.getElementById('c2g-btn');
  const msg = document.getElementById('c2g-msg');
  const email = document.getElementById('c2g-email').value.trim();
  const name = document.getElementById('c2g-name').value.trim();

  btn.disabled = true;
  btn.textContent = 'Enviando...';
  btn.style.background = '#999';
  msg.style.display = 'none';

  try {
    // OPCION A: Con Firebase Cloud Function (recomendado)
    const res = await fetch('https://us-central1-TU-PROYECTO.cloudfunctions.net/brevoSubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName: name }),
    });

    // OPCION B: Sin backend (directo a Brevo — solo si usas la version iframe abajo)
    // Descomenta esto si no tienes Cloud Functions:
    // const res = { ok: true }; // placeholder

    if (res.ok) {
      msg.style.display = 'block';
      msg.style.color = '#9C8CFF';
      msg.textContent = 'Revisa tu email para confirmar y recibir tu guia.';
      document.getElementById('c2g-form').style.display = 'none';
    } else {
      throw new Error('Error de servidor');
    }
  } catch (err) {
    msg.style.display = 'block';
    msg.style.color = '#FF6A4D';
    msg.textContent = 'Hubo un error. Intentalo de nuevo.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Quiero mi guia gratis';
    btn.style.background = '#FF6A4D';
  }
  return false;
}
</script>
<!-- ===== FIN SUBSCRIBER BOX ===== -->
```

---

## Opcion 3: Sin backend — Usar el formulario de Brevo embebido (mas sencillo)

Si no quieres montar Cloud Functions, puedes usar un formulario que envie directamente a Brevo usando su endpoint de formularios (no requiere API key en el frontend):

```html
<!-- Formulario directo a Brevo (sin API key en frontend) -->
<form action="https://e16073f5.sibforms.com/serve/MUIFANJ7cd06Veo9bk942kJaC6WCiR3GdgciKExwgfSQDvL4iiBcp6BuMqcae5eZ1R0QWDYdi287h7arB48ys5WCUK0fw_4UO6oLAigE3MSjn35XTnn9SN_eq5SSorSeENj_iWLIyUHeOXFhk11t5wQDqaUSrBKw_HnWOZWpICGrjdVaHM6iOrkXsRQiCu0XaDml9P57J6f1Q-lncg==" method="POST">
  <input type="email" name="EMAIL" placeholder="tu@email.com" required>
  <input type="text" name="FIRSTNAME" placeholder="Tu nombre">
  <button type="submit">Suscribirme</button>
</form>
```

**Nota:** Esta opcion redirige a la pagina de confirmacion de Brevo. Para una experiencia mas fluida, usa la Opcion 2 con Cloud Functions.

---

## Resumen de configuracion necesaria

| Recurso | Valor |
|---------|-------|
| API Brevo v3 | https://app.brevo.com/settings/keys/api |
| Main List ID | 3 |
| Lead Magnet List ID | 4 |
| Form ID | 69de7eb6b4688d18b6773e15 |
| sibforms domain | e16073f5.sibforms.com |
| DOI Template ID | 2 (predeterminada) |
| Sender | info@cals2gains.com / Cals2Gains |
| Automation ID | 1 |
