"""
Motor de templates para el carrusel Cals2Gains.

Define los tipos de slide soportados, sus parámetros y las reglas de diseño
que aplica carousel_composer.py al renderizar cada uno.

Tipos de slide:
  cover       — Portada: imagen hero + titular grande + bridge
  problem     — El problema: identifica el pain point del lector (estructura de 7 slides del doc)
  solution    — La solución: promesa/respuesta al problema
  myth        — El mito: etiqueta roja + cita grande
  reality     — La realidad / ciencia: etiqueta violeta + titular + cuerpo
  science     — Datos científicos: etiqueta + titular + cuerpo + stat callout
  value       — Contenido de valor: tip, dato o insight accionable
  stats       — Tabla de datos: etiqueta + filas label/valor
  quote       — Cita de estudio: comillas decorativas + texto + fuente
  educational — Educativo: etiqueta + titular + lista de bullets
  practical   — Práctico: etiqueta + lista de niveles (icon + título + desc)
  reflection  — Reflexión / práctica: pregunta o acción que el lector puede hacer hoy
  cta         — CTA final: save-bait + CTAs + logo + handle
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# SlideSpec — especificación completa de un slide
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class SlideSpec:
    """Especificación completa de un slide individual."""

    # Identidad
    type: str         = "content"   # Ver tipos arriba
    slide_num: int    = 1
    total_slides: int = 8
    accent_color: str = "coral"     # coral | violet | gold | orange

    # Texto principal
    label: Optional[str]    = None  # Píldora de etiqueta (p.ej. "EL MITO")
    headline: Optional[str] = None  # Titular principal (soporta \n)
    subhead: Optional[str]  = None  # Subtítulo / deck
    body: Optional[str]     = None  # Párrafo de cuerpo

    # Contenido estructurado (según tipo)
    quote: Optional[str]    = None  # Cita textual
    source: Optional[str]   = None  # Fuente de la cita
    stat: Optional[str]     = None  # Callout de estadística
    stats: list[dict]        = field(default_factory=list)  # [{label, value, bar_pct?}]
    bullets: list[str]       = field(default_factory=list)  # Lista de puntos
    tiers: list[dict]        = field(default_factory=list)  # [{icon, title, desc}]

    # Slide de CTA
    cta_primary: Optional[str]   = None
    cta_secondary: Optional[str] = None
    bridge: Optional[str]        = None  # "Desliza →" en portada

    # Marca
    handle: str = "@cals2gains_es"

    # Fondo
    bg_prompt: Optional[str] = None   # Prompt DALL-E 3; None → procedural

    # Overrides de layout
    headline_align: str = "left"      # left | center | right
    theme: str = "dark"               # dark | light | violet


# ─────────────────────────────────────────────────────────────────────────────
# Template registry — metadatos por tipo de slide
# ─────────────────────────────────────────────────────────────────────────────

TEMPLATE_META = {
    "problem": {
        "description": "El problema: identifica el pain point del lector (slide 2 de la estructura 7)",
        "overlay":     "solid_dark",
        "label_bg":    "coral",
        "headline_align": "left",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "solution": {
        "description": "La solución / promesa: responde al problema planteado (slide 3)",
        "overlay":     "solid_dark",
        "label_bg":    "violet",
        "headline_align": "left",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "value": {
        "description": "Contenido de valor: tip, dato o insight accionable (slide 4)",
        "overlay":     "solid_dark",
        "label_bg":    "violet",
        "headline_align": "left",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "reflection": {
        "description": "Reflexión / práctica: pregunta o acción que el lector puede hacer hoy (slide 6)",
        "overlay":     "solid_dark",
        "label_bg":    "gold",
        "headline_align": "center",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "cover": {
        "description": "Portada: imagen hero, titular grande centrado, bridge",
        "overlay":     "gradient_full",      # gradiente oscuro completo
        "label_bg":    "coral",
        "headline_align": "center",
        "has_bridge":  True,
        "has_handle":  False,
    },
    "myth": {
        "description": "El mito: etiqueta pill roja + cita grande",
        "overlay":     "solid_dark",
        "label_bg":    "coral",
        "headline_align": "left",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "reality": {
        "description": "La realidad: etiqueta violeta + titular + cuerpo",
        "overlay":     "solid_dark",
        "label_bg":    "violet",
        "headline_align": "left",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "science": {
        "description": "Ciencia: etiqueta + titular + cuerpo + stat callout",
        "overlay":     "solid_dark",
        "label_bg":    "violet",
        "headline_align": "left",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "stats": {
        "description": "Datos: etiqueta + tabla de filas label/valor",
        "overlay":     "solid_heavy",
        "label_bg":    "violet",
        "headline_align": "left",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "quote": {
        "description": "Cita de estudio: comillas decorativas + texto + fuente",
        "overlay":     "solid_dark",
        "label_bg":    "gold",
        "headline_align": "center",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "educational": {
        "description": "Educativo: etiqueta + titular + bullets",
        "overlay":     "solid_dark",
        "label_bg":    "violet",
        "headline_align": "left",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "practical": {
        "description": "Práctico: etiqueta + lista de niveles",
        "overlay":     "solid_dark",
        "label_bg":    "coral",
        "headline_align": "left",
        "has_bridge":  False,
        "has_handle":  False,
    },
    "cta": {
        "description": "CTA: save-bait + CTAs + logo + handle",
        "overlay":     "gradient_full",
        "label_bg":    "coral",
        "headline_align": "center",
        "has_bridge":  False,
        "has_handle":  True,
    },
}


def get_meta(slide_type: str) -> dict:
    """Devuelve los metadatos del template, con fallback a 'science'."""
    return TEMPLATE_META.get(slide_type, TEMPLATE_META["science"])


# ─────────────────────────────────────────────────────────────────────────────
# Colores de etiqueta (pill) por nombre
# ─────────────────────────────────────────────────────────────────────────────

LABEL_COLORS = {
    "coral": {
        "bg":   (255, 106,  77, 40),
        "text": (255, 106,  77, 240),
        "outline": (255, 106, 77, 100),
    },
    "violet": {
        "bg":   (156, 140, 255, 40),
        "text": (156, 140, 255, 240),
        "outline": (156, 140, 255, 100),
    },
    "gold": {
        "bg":   (255, 215,   0, 40),
        "text": (255, 215,   0, 240),
        "outline": (255, 215, 0, 100),
    },
    "orange": {
        "bg":   (255, 152,   0, 40),
        "text": (255, 152,   0, 240),
        "outline": (255, 152, 0, 100),
    },
}


def get_label_colors(accent: str) -> dict:
    return LABEL_COLORS.get(accent, LABEL_COLORS["coral"])


# ─────────────────────────────────────────────────────────────────────────────
# Parseo de spec dict → SlideSpec
# ─────────────────────────────────────────────────────────────────────────────

def parse_slide(
    raw: dict,
    slide_num: int,
    total_slides: int,
    default_handle: str = "@cals2gains_es",
) -> SlideSpec:
    """
    Convierte un dict (de un JSON spec) en un SlideSpec tipado.
    Soporta tanto el formato legacy del pipeline como el nuevo formato del motor.
    """
    slide_type = raw.get("type", "science")
    accent = raw.get("accent_color", raw.get("accent", "coral"))

    return SlideSpec(
        type          = slide_type,
        slide_num     = slide_num,
        total_slides  = total_slides,
        accent_color  = accent,

        label         = raw.get("label"),
        headline      = raw.get("headline"),
        subhead       = raw.get("subhead"),
        body          = raw.get("body"),

        quote         = raw.get("quote"),
        source        = raw.get("source"),
        stat          = raw.get("stat"),
        stats         = raw.get("stats", []),
        bullets       = raw.get("bullets", []),
        tiers         = raw.get("tiers", []),

        cta_primary   = raw.get("cta_primary"),
        cta_secondary = raw.get("cta_secondary"),
        bridge        = raw.get("bridge"),

        handle        = raw.get("handle", default_handle),
        bg_prompt     = raw.get("bg_prompt"),
        headline_align= raw.get("headline_align", get_meta(slide_type)["headline_align"]),
        theme         = raw.get("theme", "dark"),
    )
