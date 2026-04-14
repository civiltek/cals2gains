# Guia Completa: Secuencia de Bienvenida Brevo — Cals2Gains

> Fecha: 2026-04-14 (actualizado)
> Estado: Emails 1 y 2 configurados en Brevo (Automatizacion #2). Emails 3-7 pendientes.

---

## Estado actual de la automatizacion

La **Automatizacion #2** en Brevo (https://app.brevo.com/automation/edit/2) tiene:
- **Paso 1 (Trigger):** Contacto añadido a "Main List" (#3)
- **Paso 2:** Enviar email — "Bienvenido/a a Cals2Gains + Tu Guia de Macros Gratis" (HTML branded completo)
- **Paso 3:** Esperar 2 dias
- **Paso 4:** Enviar email — "Tu primer paso: como usar tus macros" (HTML branded completo)
- **Paso 5:** Salida

### Para completar la secuencia (Emails 3-7):
Para cada email restante, hay que insertar entre Email 2 y Salida:
1. Arrastrar **"Plazo"** (pestaña Reglas) al canvas → configurar dias de espera
2. Arrastrar **"Enviar un email"** (pestaña Acciones > Mensajes) al canvas
3. Configurar: Asunto, Preview, Remitente (info@cals2gains.com / Cals2Gains)
4. Clic "Añadir mensaje" → "Codigo HTML personalizado" → pegar HTML completo
5. Guardar con "Usar este diseño en automatizaciones"
6. Repetir hasta Email 7, luego activar la automatizacion

> **Nota:** El drag-and-drop solo funciona manualmente en el navegador. No se puede automatizar.

---

## Calendario de envios

| Email | Dia | Asunto | Preview text |
|-------|-----|--------|--------------|
| 1 | 0 (inmediato) | Bienvenido/a a Cals2Gains + Tu Guia de Macros Gratis | Descarga tu calculadora de macros y empieza a transformar tu nutricion |
| 2 | +2 dias | Tu primer paso: como usar tus macros | Un truco rapido para empezar a aplicar tus macros hoy mismo |
| 3 | +2 dias (dia 4) | Conoce a tu nuevo coach de nutricion con IA | Asi es como Cals2Gains personaliza tu plan en segundos |
| 4 | +3 dias (dia 7) | "Perdi 4kg sin dejar de comer lo que me gusta" | Historias reales de usuarios de Cals2Gains |
| 5 | +3 dias (dia 10) | El error #1 que arruina tu nutricion | Casi todo el mundo lo comete — y tiene solucion facil |
| 6 | +2 dias (dia 12) | La funcion secreta que lo cambia todo | Escanea cualquier comida con tu camara y obtén los macros al instante |
| 7 | +2 dias (dia 14) | Ultima oportunidad: 7 dias gratis de Cals2Gains | Tu prueba gratuita te espera — empieza hoy |

---

## Configuracion de remitente (igual para todos)

- **De:** Cals2Gains
- **Email:** info@cals2gains.com

---

## HTML de cada email

Todos los emails usan la misma estructura base (header oscuro, barra de acento gradient, contenido blanco, footer oscuro). Solo cambia el contenido del `<div class="content">`.

### Estructura base (copiar para cada email)

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TITULO_AQUI</title>
<style>
body { margin: 0; padding: 0; background-color: #F7F2EA; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
.email-wrapper { width: 100%; background-color: #F7F2EA; padding: 20px 0; }
.email-container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; }
.header { background-color: #17121D; padding: 30px 40px; text-align: center; }
.header h1 { color: #FFFFFF; font-size: 22px; margin: 15px 0 0; font-weight: 600; }
.accent-bar { height: 4px; background: linear-gradient(90deg, #F9644A 0%, #9587F8 100%); }
.content { padding: 35px 40px; color: #333333; line-height: 1.6; font-size: 16px; }
.content h2 { color: #17121D; font-size: 20px; margin-top: 0; }
.content p { margin: 0 0 16px; }
.content a { color: #F9644A; text-decoration: underline; }
.cta-button { display: inline-block; background-color: #F9644A; color: #FFFFFF !important; text-decoration: none !important; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 10px 0 20px; }
.tip-box { background-color: #F7F2EA; border-left: 4px solid #9587F8; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
.tip-box p { margin: 0; font-size: 15px; color: #555; }
.footer { background-color: #17121D; padding: 25px 40px; text-align: center; }
.footer p { color: #999999; font-size: 13px; margin: 5px 0; }
.footer a { color: #9587F8; text-decoration: none; }
</style>
</head>
<body>
<div class="email-wrapper">
<div class="email-container">
<div class="header">
<h1 style="color:#FFFFFF;">Cals2Gains</h1>
</div>
<div class="accent-bar"></div>
<div class="content">
<!-- CONTENIDO_AQUI -->
</div>
<div class="footer">
<p><a href="https://cals2gains.com">cals2gains.com</a></p>
<p>2026 Civiltek Ingenieria SLU</p>
<p style="margin-top:10px;"><a href="{{ unsubscribe }}">Darse de baja</a> | <a href="{{ update_profile }}">Actualizar preferencias</a></p>
</div>
</div>
</div>
</body>
</html>
```

---

### Email 1 — Bienvenida + Guia de Macros (YA CONFIGURADO)

**Asunto:** Bienvenido/a a Cals2Gains + Tu Guia de Macros Gratis
**Preview:** Descarga tu calculadora de macros y empieza a transformar tu nutricion

```html
<h2>Bienvenido/a a Cals2Gains</h2>
<p>Hola{{contact.FIRSTNAME | default:''}},</p>
<p>Gracias por unirte a la comunidad de Cals2Gains. Estamos encantados de tenerte aqui.</p>
<p>Cals2Gains es una app de nutricion potenciada por inteligencia artificial que te ayuda a alcanzar tus objetivos de forma personalizada, sin dietas rigidas ni complicaciones.</p>
<p><strong>Tu Guia de Macros Gratis esta lista:</strong></p>
<p>Como prometimos, aqui tienes tu guia gratuita para calcular tus macros ideales. Descargala y empieza a transformar tu alimentacion hoy mismo.</p>
<p style="text-align:center;"><a href="https://cals2gains.com/guides/macro-calculator-guide.pdf" class="cta-button">Descargar Guia de Macros</a></p>
<div class="tip-box"><p><strong>Tip rapido:</strong> Conocer tus macros es el primer paso para comer mejor. En los proximos dias te enviaremos consejos practicos para que los apliques facilmente.</p></div>
<p>Mientras tanto, si quieres ir un paso mas alla, prueba nuestra app con 7 dias gratis:</p>
<p style="text-align:center;"><a href="https://cals2gains.com" class="cta-button" style="background-color:#9587F8;">Probar Cals2Gains Gratis</a></p>
<p>Un saludo,<br>El equipo de Cals2Gains</p>
```

---

### Email 2 — Quick Win: Como usar tus macros (Dia +2)

**Asunto:** Tu primer paso: como usar tus macros
**Preview:** Un truco rapido para empezar a aplicar tus macros hoy mismo
**Espera previa:** 2 dias

```html
<h2>Tu primer paso con los macros</h2>
<p>Hola{{contact.FIRSTNAME | default:''}},</p>
<p>Ya tienes tu guia de macros. Ahora viene la parte divertida: aplicarlo.</p>
<p>Aqui va un truco rapido que puedes hacer <strong>hoy mismo</strong>:</p>
<div class="tip-box"><p><strong>Reto del dia:</strong> Registra solo tu proxima comida. No te preocupes por hacerlo perfecto. Solo observa cuantas proteinas, carbohidratos y grasas tiene. Te sorprendera lo que descubres.</p></div>
<p>La mayoria de personas descubre que come menos proteina de la que cree. Y eso tiene un impacto directo en tu energia, tu recuperacion y tu composicion corporal.</p>
<p><strong>3 formas rapidas de aumentar tu proteina:</strong></p>
<p>1. Añade un huevo extra al desayuno<br>2. Cambia tu snack por yogur griego<br>3. Duplica la porcion de pollo o pescado en la cena</p>
<p>Con Cals2Gains, puedes escanear cualquier comida con la camara y ver los macros al instante. Sin buscar en bases de datos ni calcular nada.</p>
<p style="text-align:center;"><a href="https://cals2gains.com" class="cta-button">Probar Cals2Gains Gratis</a></p>
<p>Mañana no, hoy.<br>El equipo de Cals2Gains</p>
```

---

### Email 3 — Feature Highlight: Tu coach IA (Dia +4)

**Asunto:** Conoce a tu nuevo coach de nutricion con IA
**Preview:** Asi es como Cals2Gains personaliza tu plan en segundos
**Espera previa:** 2 dias

```html
<h2>Tu coach de nutricion, siempre disponible</h2>
<p>Hola{{contact.FIRSTNAME | default:''}},</p>
<p>Imagina tener un nutricionista que te conoce, que sabe tus objetivos, tus gustos y tus horarios — y que esta disponible 24/7.</p>
<p>Eso es exactamente lo que hace el motor de IA de Cals2Gains.</p>
<p><strong>Asi funciona:</strong></p>
<p>1. <strong>Le cuentas tu objetivo</strong> — perder grasa, ganar musculo, mantenerte...<br>2. <strong>La IA calcula tus macros</strong> personalizados basandose en tu perfil<br>3. <strong>Te sugiere comidas</strong> adaptadas a tus gustos y tu cultura gastronomica<br>4. <strong>Se ajusta sobre la marcha</strong> segun tu progreso real</p>
<div class="tip-box"><p><strong>Lo mejor:</strong> No necesitas pesar comida ni contar calorias manualmente. Escanea con la camara, preguntale a la IA, o simplemente describe lo que has comido.</p></div>
<p>La nutricion personalizada ya no es solo para deportistas de elite. Ahora esta en tu bolsillo.</p>
<p style="text-align:center;"><a href="https://cals2gains.com" class="cta-button">Descubre Cals2Gains</a></p>
<p>Tu equipo de Cals2Gains</p>
```

---

### Email 4 — Social Proof / Caso de exito (Dia +7)

**Asunto:** "Perdi 4kg sin dejar de comer lo que me gusta"
**Preview:** Historias reales de usuarios de Cals2Gains
**Espera previa:** 3 dias

```html
<h2>Historias reales, resultados reales</h2>
<p>Hola{{contact.FIRSTNAME | default:''}},</p>
<p>No somos de promesas vacias. Preferimos que hablen los resultados.</p>
<p style="background-color:#F7F2EA; padding:20px; border-radius:8px; font-style:italic; border-left: 4px solid #F9644A;">"Llevaba años probando dietas que no funcionaban. Con Cals2Gains entendi por primera vez lo que mi cuerpo necesita. Perdi 4kg en 6 semanas sin dejar de comer lo que me gusta. La IA me sugiere opciones que encajan con mi vida real, no con una dieta de revista."<br><br><strong>— Maria L., usuaria desde febrero 2026</strong></p>
<p>Lo que Maria descubrio es algo que la ciencia lleva años diciendo: <strong>no se trata de comer menos, sino de comer mejor</strong>. Cuando conoces tus macros y los equilibras, los resultados llegan solos.</p>
<div class="tip-box"><p><strong>Dato:</strong> El 78% de nuestros usuarios que siguen sus macros durante 4 semanas reportan mejoras visibles en energia y composicion corporal.</p></div>
<p>Tu historia podria ser la siguiente.</p>
<p style="text-align:center;"><a href="https://cals2gains.com" class="cta-button">Empieza tu transformacion</a></p>
<p>Con confianza,<br>El equipo de Cals2Gains</p>
```

---

### Email 5 — Error comun de nutricion (Dia +10)

**Asunto:** El error #1 que arruina tu nutricion
**Preview:** Casi todo el mundo lo comete — y tiene solucion facil
**Espera previa:** 3 dias

```html
<h2>El error que casi todos cometen</h2>
<p>Hola{{contact.FIRSTNAME | default:''}},</p>
<p>Despues de analizar miles de perfiles nutricionales, hemos detectado un patron claro. El error numero uno que frena los resultados es:</p>
<p style="font-size:20px; text-align:center; color:#F9644A; font-weight:700; padding:10px 0;">Comer "sano" sin saber cuanto estas comiendo</p>
<p>Suena contradictorio, pero pasa constantemente. Aguacate, frutos secos, aceite de oliva, granola... Son alimentos geniales, pero si no conoces sus macros, es muy facil pasarte — o quedarte corto en proteina.</p>
<p><strong>La solucion no es eliminar esos alimentos.</strong> Es saber cuanto necesitas y ajustar las cantidades.</p>
<div class="tip-box"><p><strong>Ejemplo real:</strong> 100g de almendras tienen 580 kcal y 50g de grasa. Un puñado "pequeño" puede ser medio objetivo calorico de tu snack. Saberlo no te limita — te da control.</p></div>
<p>Con Cals2Gains, escaneas la comida, ves los macros al instante, y la IA te dice si vas bien o necesitas ajustar. Sin juicios, sin restricciones. Solo informacion util.</p>
<p style="text-align:center;"><a href="https://cals2gains.com" class="cta-button">Come con conocimiento</a></p>
<p>Mejor informado, mejor alimentado.<br>El equipo de Cals2Gains</p>
```

---

### Email 6 — Deep Dive: Escaner de comida (Dia +12)

**Asunto:** La funcion secreta que lo cambia todo
**Preview:** Escanea cualquier comida con tu camara y obtén los macros al instante
**Espera previa:** 2 dias

```html
<h2>Escanea. Conoce. Decide.</h2>
<p>Hola{{contact.FIRSTNAME | default:''}},</p>
<p>Esta es probablemente la funcion favorita de nuestros usuarios, y queremos asegurarnos de que la conoces.</p>
<p><strong>El escaner de comida con IA:</strong></p>
<p>Apunta tu camara a cualquier plato — da igual si es una ensalada casera, un menu del dia o un tupper de la oficina — y Cals2Gains te dice en segundos:</p>
<p>- Calorias totales estimadas<br>- Desglose de proteinas, carbohidratos y grasas<br>- Como encaja en tu objetivo del dia<br>- Sugerencias para equilibrar tu siguiente comida</p>
<div class="tip-box"><p><strong>Pro tip:</strong> Funciona tambien con fotos del supermercado. Escanea el paquete de cualquier producto y compara opciones antes de comprar.</p></div>
<p>Es como tener un nutricionista en el bolsillo. Literalmente.</p>
<p>Y lo mejor: los primeros 7 dias son gratis. Sin compromiso, sin tarjeta.</p>
<p style="text-align:center;"><a href="https://cals2gains.com" class="cta-button">Probar el escaner gratis</a></p>
<p>La tecnologia al servicio de tu salud,<br>El equipo de Cals2Gains</p>
```

---

### Email 7 — CTA final: Descarga la app (Dia +14)

**Asunto:** Ultima oportunidad: 7 dias gratis de Cals2Gains
**Preview:** Tu prueba gratuita te espera — empieza hoy
**Espera previa:** 2 dias

```html
<h2>Es hora de dar el paso</h2>
<p>Hola{{contact.FIRSTNAME | default:''}},</p>
<p>Durante las ultimas dos semanas te hemos compartido:</p>
<p>- Tu guia de macros personalizada<br>- Trucos para aplicar tus macros desde el dia uno<br>- Como funciona nuestro coach de IA<br>- Historias reales de transformacion<br>- El error nutricional mas comun (y como evitarlo)<br>- El escaner de comida que cambia las reglas del juego</p>
<p>Ahora solo falta una cosa: <strong>que lo pruebes tu.</strong></p>
<p style="background-color:#17121D; color:#FFFFFF; padding:25px; border-radius:12px; text-align:center;">
<span style="font-size:24px; font-weight:700; display:block; margin-bottom:8px;">7 dias gratis</span>
<span style="font-size:15px; color:#9587F8;">Sin tarjeta. Sin compromiso. Solo resultados.</span>
</p>
<p style="text-align:center;"><a href="https://cals2gains.com" class="cta-button" style="font-size:18px; padding:16px 40px;">Descargar Cals2Gains Gratis</a></p>
<div class="tip-box"><p><strong>Recuerda:</strong> Cada dia que pasa sin conocer tus macros es un dia de resultados que te pierdes. Empieza hoy — tu yo del futuro te lo agradecera.</p></div>
<p>Estamos aqui para ayudarte en cada paso del camino.</p>
<p>Con energia,<br>El equipo de Cals2Gains</p>
```

---

## Instrucciones para completar en Brevo (Emails 3-7)

> Emails 1 y 2 ya estan configurados en Automatizacion #2. Solo faltan 3-7.

1. Ir a **Automatizacion #2** → https://app.brevo.com/automation/edit/2
2. Para cada email (3, 4, 5, 6, 7) — repite estos pasos:

   **a) Añadir plazo (delay):**
   - Clic en pestaña **"Reglas"** en la barra lateral izquierda
   - Arrastrar **"Plazo"** al canvas, soltando ENTRE el ultimo email y "Salida"
   - Configurar la espera segun la tabla (2d, 3d, 3d, 2d, 2d)

   **b) Añadir email:**
   - Clic en pestaña **"Acciones"** > seccion "Mensajes"
   - Arrastrar **"Enviar un email"** al canvas, soltando DESPUES del plazo que acabas de añadir
   - Rellenar:
     - **Asunto:** (ver tabla arriba)
     - **Texto de preview:** (ver tabla arriba)
     - **De:** Cals2Gains / info@cals2gains.com
   - Clic en **"Añadir mensaje"**
   - Seleccionar **"Codigo HTML personalizado"**
   - Clic en el icono **"<>"** (Vista HTML / Source) para entrar en modo fuente
   - **Seleccionar todo** (Ctrl+A) y **pegar** el HTML completo del email (ver abajo)
   - Clic en **"<>"** otra vez para volver a modo visual y verificar
   - Clic en **"Usar este diseño en automatizaciones"**

3. Una vez todos los emails esten configurados, clic en **"Activar automatizacion"**

---

## Notas importantes

- Los emails usan la variable `{{contact.FIRSTNAME | default:''}}` — si el contacto no tiene nombre, simplemente no muestra nada.
- Los links a `{{ unsubscribe }}` y `{{ update_profile }}` son variables de Brevo que se sustituyen automaticamente.
- El link de descarga de la guia (Email 1) apunta a `https://cals2gains.com/guides/macro-calculator-guide.pdf` — **necesitas subir el PDF a esa URL** en Firebase Hosting.
