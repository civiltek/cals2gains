"""
Generador de specs de carrusel con GPT-4o.

Dado un topic, idioma y template, genera un JSON spec completo
listo para pasar a carousel_composer.py.

Uso:
  from script_generator import generate_carousel_spec
  spec = generate_carousel_spec("Huevos y colesterol", lang="es", template="myth-buster")
"""
from __future__ import annotations

import json
import logging
from typing import Optional

import httpx

from brand_config import OPENAI_API_KEY

log = logging.getLogger("carousel.scriptgen")

# ─────────────────────────────────────────────────────────────────────────────
# System prompt
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM = """\
Eres el generador de carruseles de Instagram para Cals2Gains, una app de nutrición con IA.

MARCA:
- Paleta: Dark #17121D · Violet #9C8CFF · Coral #FF6A4D · Bone #F7F2EA
- Tipografía: Outfit Bold para headlines, Instrument Sans para cuerpo
- Voz: cercana, motivadora, basada en ciencia, nunca condescendiente
- Handle principal: @cals2gains_es (ES) o @cals2gains (EN)

FORMATO DE SALIDA:
Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin backticks).
El JSON debe tener esta estructura exacta:

{
  "id": "C2G-[LANG]-CAR-[YYYY-MM-DD]-[NN]",
  "title": "Título del carrusel",
  "lang": "es" | "en",
  "template": "myth-buster" | "educational" | "tips-list" | "recipe",
  "account": "@cals2gains_es" | "@cals2gains",
  "slides": [
    {
      "type": "cover" | "myth" | "reality" | "science" | "stats" | "quote" | "educational" | "practical" | "cta",
      "accent_color": "coral" | "violet" | "gold" | "orange",
      "label": "ETIQUETA EN MAYÚSCULAS" | null,
      "headline": "Titular principal (puede tener \\n para forzar saltos)",
      "subhead": "Subtítulo opcional" | null,
      "body": "Párrafo de cuerpo opcional" | null,
      "quote": "Texto de cita" | null,
      "source": "Fuente de la cita" | null,
      "stat": "Callout de estadística" | null,
      "stats": [{"label": "Nutriente", "value": "Valor", "bar_pct": 0.0}],
      "bullets": ["Punto 1", "Punto 2"],
      "tiers": [{"icon": "✓", "title": "Nivel", "desc": "Descripción"}],
      "cta_primary": "CTA principal" | null,
      "cta_secondary": "CTA secundario" | null,
      "bridge": "Desliza →" | null,
      "handle": "@cals2gains_es",
      "bg_prompt": "Descripción de fondo para DALL-E 3 (fotografía editorial, sin texto)"
    }
  ]
}

REGLAS:
1. 7-10 slides (siempre terminar con tipo "cta")
2. Slide 1 siempre tipo "cover" con bridge "Desliza →"
3. Una sola idea por slide
4. Texto legible en 2 segundos (headlines ≤ 10 palabras)
5. CTA final siempre con save-bait + follow
6. bg_prompt en inglés siempre (DALL-E 3 funciona mejor en inglés)
7. El contenido del slide en el idioma especificado
8. Nunca inventar datos; si citas estudios, usa datos verificables
9. Nunca mencionar features inactivas de la app
10. Template "myth-buster": slide 2 tipo "myth", slide 3 tipo "reality" o "science"
"""

_TEMPLATE_HINTS = {
    "myth-buster": (
        "Estructura: cover → myth → reality/science × 3-4 → stats/quote → practical → cta. "
        "Usa accent_color coral para myth, violet para science/reality."
    ),
    "educational": (
        "Estructura: cover → educational × 5-7 → cta. "
        "Cada slide educational tiene 2-4 bullets concisos."
    ),
    "tips-list": (
        "Estructura: cover → practical × 5-7 → cta. "
        "Cada slide practical tiene 2-3 tiers (tips numerados)."
    ),
    "recipe": (
        "Estructura: cover → stats (macros) → educational (ingredientes) → practical (pasos) × 3-4 → cta. "
        "El slide de stats tiene los macros de la receta con bar_pct."
    ),
    "7-slides": (
        "Estructura de 7 slides (guía estándar de carruseles virales):\n"
        "  1. cover    — Hook potente: pregunta, dato sorpresa o afirmación polémica\n"
        "  2. problem  — El problema: identifica el pain point que siente el lector HOY\n"
        "  3. solution — La solución / promesa: qué van a conseguir al leer el carrusel\n"
        "  4. value    — Contenido de valor principal: el dato, insight o técnica más potente\n"
        "  5. science  — Diferenciación: por qué Cals2Gains / la ciencia lo respaldad\n"
        "  6. reflection — Reflexión práctica: una pregunta o acción que pueden hacer hoy\n"
        "  7. cta      — CTA finale: save-bait + follow + CTA claro\n"
        "Usa accent_color coral para problem, violet para solution/value/science, gold para reflection."
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# Función principal
# ─────────────────────────────────────────────────────────────────────────────

def generate_carousel_spec(
    topic: str,
    lang: str = "es",
    template: str = "myth-buster",
    n_slides: int = 8,
    account: Optional[str] = None,
    extra_instructions: Optional[str] = None,
    date: str = "2026-04-15",
) -> dict:
    """
    Genera un spec de carrusel completo usando GPT-4o.

    Args:
        topic:               Tema del carrusel (p.ej. "Huevos y colesterol")
        lang:                Idioma del contenido ('es' o 'en')
        template:            Tipo de template ('myth-buster', 'educational', 'tips-list', 'recipe')
        n_slides:            Número de slides deseado (7-10)
        account:             Override del handle (por defecto según lang)
        extra_instructions:  Instrucciones adicionales para el generador
        date:                Fecha para el ID (YYYY-MM-DD)

    Returns:
        dict con el spec completo del carrusel
    """
    if not OPENAI_API_KEY:
        raise RuntimeError(
            "EXPO_PUBLIC_OPENAI_API_KEY no encontrada. "
            "Asegúrate de cargar el archivo .env antes de llamar a esta función."
        )

    hint = _TEMPLATE_HINTS.get(template, "")
    default_account = "@cals2gains_es" if lang == "es" else "@cals2gains"
    used_account = account or default_account

    user_prompt = (
        f"Genera un carrusel de Instagram sobre: **{topic}**\n\n"
        f"- Idioma: {lang.upper()}\n"
        f"- Template: {template}\n"
        f"- Número de slides: {n_slides}\n"
        f"- Cuenta destino: {used_account}\n"
        f"- Fecha del ID: {date}\n\n"
        f"Hint de estructura para template '{template}': {hint}\n"
    )
    if extra_instructions:
        user_prompt += f"\nInstrucciones adicionales: {extra_instructions}"

    log.info("Generando spec con GPT-4o para topic: %s", topic)

    resp = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": _SYSTEM},
                {"role": "user",   "content": user_prompt},
            ],
            "temperature": 0.75,
            "max_tokens": 4096,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    resp.raise_for_status()

    raw = resp.json()["choices"][0]["message"]["content"]
    spec = json.loads(raw)
    log.info("Spec generado: %d slides", len(spec.get("slides", [])))
    return spec
