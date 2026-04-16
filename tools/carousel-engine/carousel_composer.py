"""
Motor de composición de carruseles Cals2Gains.

Toma un SlideSpec y produce un PNG 1080×1350 de calidad de estudio.

Capas por slide (de fondo a frente):
  1. Fondo (DALL-E 3 o procedural)
  2. Overlay de gradiente (legibilidad de texto)
  3. Barra de acento superior (5 px)
  4. Etiqueta tipo píldora
  5. Titular principal + subheadline
  6. Contenido del tipo (bullets, stats, quote, tiers…)
  7. Indicadores de slide (dots)
  8. Logo de marca
  9. Grano cinematográfico
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFilter

from brand_config import Assets, Carousel, Colors, TypeScale
from image_generator import get_background
from slide_renderer import (
    add_film_grain,
    apply_solid_overlay,
    apply_top_gradient,
    apply_vertical_gradient,
    draw_accent_bar,
    draw_bullet_list,
    draw_divider,
    draw_handle,
    draw_pill_label,
    draw_quote_marks,
    draw_rounded_rect,
    draw_slide_dots,
    draw_stat_bar_row,
    draw_text_block,
    draw_tier_list,
    get_font,
    measure_text,
    new_canvas,
    paste_logo,
    wrap_text,
)
from template_engine import SlideSpec, get_label_colors, get_meta

log = logging.getLogger("carousel.composer")

W = Carousel.WIDTH
H = Carousel.HEIGHT
MH = Carousel.MARGIN_H
MV = Carousel.MARGIN_V
CW = Carousel.CONTENT_W


# ─────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────────────────

def _accent_hex(spec: SlideSpec) -> str:
    mapping = {
        "coral":  Colors.coral,
        "violet": Colors.violet,
        "gold":   Colors.gold,
        "orange": Colors.orange,
    }
    return mapping.get(spec.accent_color, Colors.coral)


def _accent_rgb(spec: SlideSpec) -> tuple[int, int, int]:
    return Colors.hex_to_rgb(_accent_hex(spec))


def _bone_rgba(alpha: int = 230) -> tuple[int, int, int, int]:
    return (*Colors.bone_rgb, alpha)


def _build_base(spec: SlideSpec, bg_dir: Path) -> Image.Image:
    """Paso 1+2: fondo + overlay de gradiente."""
    bg_path = bg_dir / f"bg_s{spec.slide_num:02d}.png"

    bg = get_background(
        prompt       = spec.bg_prompt,
        slide_type   = spec.type,
        accent_color = spec.accent_color,
        slide_num    = spec.slide_num,
        total_slides = spec.total_slides,
        output_path  = bg_path,
        use_ai       = bool(spec.bg_prompt),
    )

    meta = get_meta(spec.type)
    overlay_type = meta.get("overlay", "solid_dark")

    if overlay_type == "gradient_full":
        img = apply_vertical_gradient(bg, top_alpha=30, bottom_alpha=220)
        img = apply_top_gradient(img, top_alpha=170, bottom_alpha=0, height_pct=0.28)
    elif overlay_type == "solid_heavy":
        img = apply_solid_overlay(bg, Colors.dark_rgb, alpha=175)
    else:  # solid_dark
        img = apply_solid_overlay(bg, Colors.dark_rgb, alpha=148)

    return img.convert("RGBA")


def _draw_accent_and_handle(
    img: Image.Image,
    spec: SlideSpec,
    draw: ImageDraw.ImageDraw,
) -> None:
    """Paso 3: barra de acento superior y @handle."""
    draw_accent_bar(draw, y=0, color_hex=_accent_hex(spec))

    meta = get_meta(spec.type)
    if not meta.get("has_handle", False):
        # Handle pequeño en esquina superior derecha
        draw_handle(draw, spec.handle, y=Carousel.ZONE_HANDLE, align="right")


def _draw_label_pill(
    img: Image.Image,
    spec: SlideSpec,
    draw: ImageDraw.ImageDraw,
) -> None:
    """Paso 4: etiqueta tipo píldora si está especificada."""
    if not spec.label:
        return

    meta = get_meta(spec.type)
    lc = get_label_colors(meta.get("label_bg", spec.accent_color))

    font = get_font("body_bold", TypeScale.caption)
    if spec.headline_align == "center":
        cx = W // 2
    else:
        # Alineada a la izquierda: centro calculado desde margen
        tw, _ = measure_text(spec.label, font)
        cx = MH + tw // 2 + 28  # 28 = pad_h de la píldora

    draw_pill_label(
        draw,
        text      = spec.label.upper(),
        cx        = cx if spec.headline_align == "center" else W // 2 - CW // 2 + tw // 2 + 32,
        y         = Carousel.ZONE_LABEL,
        font      = font,
        bg_rgba   = lc["bg"],
        text_rgba = lc["text"],
    )


def _draw_headline(
    img: Image.Image,
    spec: SlideSpec,
    draw: ImageDraw.ImageDraw,
    y_start: Optional[int] = None,
) -> int:
    """Paso 5: titular principal. Devuelve y tras el bloque."""
    if not spec.headline:
        return y_start or Carousel.ZONE_HEADLINE

    # Elegir tamaño de fuente según longitud
    hl = spec.headline.replace("\n", " ")
    if len(hl) <= 30:
        size = TypeScale.display
    elif len(hl) <= 60:
        size = TypeScale.title
    else:
        size = TypeScale.subtitle

    font = get_font("display_bold", size)
    lines = wrap_text(spec.headline, font, CW)

    y = y_start or Carousel.ZONE_HEADLINE
    y = draw_text_block(
        draw, lines, font,
        x            = MH,
        y            = y,
        fill         = _bone_rgba(245),
        line_spacing = 1.22,
        align        = spec.headline_align,
        canvas_width = W,
        shadow       = True,
        shadow_offset= 3,
    )
    return y + 24


def _draw_subhead(
    draw: ImageDraw.ImageDraw,
    spec: SlideSpec,
    y: int,
) -> int:
    if not spec.subhead:
        return y
    font = get_font("body_regular", TypeScale.body)
    lines = wrap_text(spec.subhead, font, CW)
    y = draw_text_block(
        draw, lines, font,
        x            = MH,
        y            = y,
        fill         = _bone_rgba(170),
        line_spacing = 1.3,
        align        = spec.headline_align,
        canvas_width = W,
        shadow       = True,
        shadow_offset= 2,
    )
    return y + 20


def _draw_body(
    draw: ImageDraw.ImageDraw,
    spec: SlideSpec,
    y: int,
) -> int:
    if not spec.body:
        return y
    font = get_font("body_regular", TypeScale.body - 2)
    lines = wrap_text(spec.body, font, CW)
    y = draw_text_block(
        draw, lines, font,
        x            = MH,
        y            = y,
        fill         = _bone_rgba(175),
        line_spacing = 1.38,
        align        = "left",
        canvas_width = W,
        shadow       = True,
        shadow_offset= 2,
    )
    return y + 20


# ─────────────────────────────────────────────────────────────────────────────
# Renderizadores por tipo de slide
# ─────────────────────────────────────────────────────────────────────────────

def _render_cover(img: Image.Image, spec: SlideSpec) -> Image.Image:
    draw = ImageDraw.Draw(img)
    _draw_accent_and_handle(img, spec, draw)

    # Número de slide en esquina superior izquierda
    page_font = get_font("display_regular", TypeScale.micro)
    draw.text(
        (MH, Carousel.ZONE_HANDLE),
        f"{spec.slide_num}/{spec.total_slides}",
        font=page_font,
        fill=(*Colors.bone_rgb, 90),
    )

    # Headline centrado con tamaño hero
    hl = spec.headline or ""
    size = TypeScale.hero if len(hl.replace("\n", "")) <= 35 else TypeScale.display
    font = get_font("display_bold", size)
    lines = wrap_text(hl, font, CW)

    # Centrar verticalmente entre 1/3 y 2/3 de la imagen
    from slide_renderer import text_block_height
    block_h = text_block_height(lines, font, 1.22)
    y_center = int(H * 0.40) - block_h // 2

    y = draw_text_block(
        draw, lines, font,
        x            = MH,
        y            = y_center,
        fill         = _bone_rgba(252),
        line_spacing = 1.22,
        align        = "center",
        canvas_width = W,
        shadow       = True,
        shadow_offset= 4,
    )

    # Subhead
    if spec.subhead:
        sfont = get_font("body_regular", TypeScale.body)
        slines = wrap_text(spec.subhead, sfont, CW - 60)
        draw_text_block(
            draw, slines, sfont,
            x            = MH + 30,
            y            = y + 16,
            fill         = _bone_rgba(165),
            line_spacing = 1.3,
            align        = "center",
            canvas_width = W - 60,
            shadow       = True,
            shadow_offset= 2,
        )

    # Línea de acento decorativa bajo el texto
    line_y = y + 28 + (40 if spec.subhead else 0)
    line_w = min(CW // 2, 240)
    lx = (W - line_w) // 2
    draw.rectangle(
        [(lx, line_y), (lx + line_w, line_y + 3)],
        fill=Colors.hex_to_rgba(_accent_hex(spec), 180),
    )

    # Bridge text ("Desliza →")
    if spec.bridge:
        bf = get_font("display_bold", TypeScale.caption + 2)
        bw, _ = measure_text(spec.bridge, bf)
        draw.text(
            ((W - bw) // 2, line_y + 24),
            spec.bridge,
            font=bf,
            fill=Colors.hex_to_rgba(_accent_hex(spec), 200),
        )

    return img


def _render_myth(img: Image.Image, spec: SlideSpec) -> Image.Image:
    draw = ImageDraw.Draw(img)
    _draw_accent_and_handle(img, spec, draw)

    # Etiqueta con ✗ incorporado
    label_text = f"✗  {spec.label.upper()}" if spec.label else "✗  EL MITO"
    _draw_label_pill(img, spec, draw)

    # Línea de etiqueta manual (no usa píldora para este tipo)
    font_label = get_font("display_bold", TypeScale.caption + 2)
    lc = get_label_colors("coral")
    draw.text((MH, Carousel.ZONE_LABEL + 4), label_text, font=font_label, fill=lc["text"])

    # Headline en comillas
    y = Carousel.ZONE_HEADLINE
    # Comillas decorativas de fondo
    qf = get_font("display_bold", 110)
    draw.text((MH - 8, y - 30), "\u201c", font=qf, fill=(*Colors.coral_rgb, 35))

    if spec.headline:
        size = TypeScale.title if len(spec.headline) <= 70 else TypeScale.subtitle
        font = get_font("display_bold", size)
        lines = wrap_text(spec.headline, font, CW)
        y = draw_text_block(
            draw, lines, font,
            x=MH, y=y,
            fill=_bone_rgba(245),
            line_spacing=1.25,
            align="left",
            canvas_width=W,
            shadow=True, shadow_offset=3,
        )
        y += 28

    # Separador
    draw_divider(draw, y, MH, W - MH, color=(*Colors.bone_rgb, 45))
    y += 28

    # Body
    y = _draw_body(draw, spec, y)

    return img


def _render_science(img: Image.Image, spec: SlideSpec) -> Image.Image:
    draw = ImageDraw.Draw(img)
    _draw_accent_and_handle(img, spec, draw)

    # Etiqueta
    y = Carousel.ZONE_LABEL
    if spec.label:
        font_label = get_font("body_bold", TypeScale.caption)
        lc = get_label_colors(spec.accent_color)
        draw.text((MH, y), spec.label.upper(), font=font_label, fill=lc["text"])
        y += 44

    # Headline
    y = Carousel.ZONE_HEADLINE
    y = _draw_headline(img, spec, draw, y_start=y)

    # Separador fino
    draw_divider(draw, y, MH, W - MH, color=(*_accent_rgb(spec), 60))
    y += 24

    # Body
    y = _draw_body(draw, spec, y)

    # Stat callout en card
    if spec.stat:
        y += 16
        stat_font = get_font("display_bold", TypeScale.body + 4)
        stat_lines = wrap_text(spec.stat, stat_font, CW - 40)
        block_h = len(stat_lines) * int(TypeScale.body * 1.25) + 36
        draw_rounded_rect(
            draw,
            (MH, y, W - MH, y + block_h),
            radius=16,
            fill=(*_accent_rgb(spec), 20),
            outline=(*_accent_rgb(spec), 80),
            outline_width=2,
        )
        draw_text_block(
            draw, stat_lines, stat_font,
            x=MH + 20, y=y + 18,
            fill=_bone_rgba(220),
            line_spacing=1.25,
            shadow=True,
        )

    return img


def _render_stats(img: Image.Image, spec: SlideSpec) -> Image.Image:
    draw = ImageDraw.Draw(img)
    _draw_accent_and_handle(img, spec, draw)

    # Etiqueta central (nombre del alimento o categoría)
    if spec.label:
        font_label = get_font("display_bold", TypeScale.title)
        lw, _ = measure_text(spec.label.upper(), font_label)
        draw.text(
            ((W - lw) // 2, Carousel.ZONE_LABEL + 12),
            spec.label.upper(),
            font=font_label,
            fill=(*_accent_rgb(spec), 240),
        )

    # Headline (opcional, debajo de la etiqueta)
    if spec.headline:
        hf = get_font("display_regular", TypeScale.caption + 2)
        hw, _ = measure_text(spec.headline, hf)
        draw.text(
            ((W - hw) // 2, Carousel.ZONE_LABEL + 80),
            spec.headline,
            font=hf,
            fill=_bone_rgba(130),
        )

    # Separador
    sep_y = Carousel.ZONE_HEADLINE - 20
    draw_divider(draw, sep_y, MH, W - MH, color=(*Colors.bone_rgb, 35))

    # Filas de estadísticas
    y = sep_y + 32
    for stat in spec.stats:
        label  = stat.get("label", "")
        value  = stat.get("value", "")
        bar    = stat.get("bar_pct", 0.0)
        # Color de barra por macro
        macro_colors = {
            "proteína": Colors.violet_rgb,
            "protein":  Colors.violet_rgb,
            "grasa":    Colors.coral_rgb,
            "fat":      Colors.coral_rgb,
            "carbs":    Colors.bone_rgb,
            "carbohidratos": Colors.bone_rgb,
        }
        bar_c = next(
            (v for k, v in macro_colors.items() if k in label.lower()),
            _accent_rgb(spec),
        )
        y = draw_stat_bar_row(
            draw, label, value, y, MH, CW,
            label_color=(*Colors.bone_rgb, 150),
            value_color=_bone_rgba(240),
            bar_pct=bar,
            bar_color=(*bar_c, 200) if bar > 0 else None,
        )
        draw_divider(draw, y - 2, MH, W - MH, color=(*Colors.bone_rgb, 22))

    # Extra info (vitaminas, etc.)
    if spec.body:
        ef = get_font("body_regular", TypeScale.caption)
        elines = wrap_text(spec.body, ef, CW)
        draw_text_block(
            draw, elines, ef,
            x=MH, y=y + 20,
            fill=(*Colors.bone_rgb, 110),
            line_spacing=1.4,
            align="center",
            canvas_width=W,
        )

    return img


def _render_quote(img: Image.Image, spec: SlideSpec) -> Image.Image:
    draw = ImageDraw.Draw(img)
    _draw_accent_and_handle(img, spec, draw)

    # Etiqueta
    if spec.label:
        font_label = get_font("body_bold", TypeScale.caption)
        lc = get_label_colors(spec.accent_color)
        tw, _ = measure_text(spec.label.upper(), font_label)
        draw.text(
            ((W - tw) // 2, Carousel.ZONE_LABEL + 8),
            spec.label.upper(),
            font=font_label,
            fill=lc["text"],
        )

    # Comillas de fondo
    qf = get_font("display_bold", 130)
    draw.text((MH - 10, Carousel.ZONE_HEADLINE - 60), "\u201c", font=qf, fill=(*Colors.gold_rgb, 28))

    # Texto de la cita
    if spec.quote:
        qtext = spec.quote
        size = TypeScale.subtitle if len(qtext) <= 120 else TypeScale.body + 4
        qfont = get_font("display_bold", size)
        qlines = wrap_text(qtext, qfont, CW)

        from slide_renderer import text_block_height
        block_h = text_block_height(qlines, qfont, 1.3)
        y_q = max(Carousel.ZONE_HEADLINE, H // 2 - block_h // 2)

        y = draw_text_block(
            draw, qlines, qfont,
            x=MH, y=y_q,
            fill=_bone_rgba(235),
            line_spacing=1.3,
            align="center",
            canvas_width=W,
            shadow=True, shadow_offset=3,
        )
        y += 32
    else:
        y = Carousel.ZONE_BODY

    # Línea decorativa
    line_w = 80
    lx = (W - line_w) // 2
    draw.rectangle(
        [(lx, y), (lx + line_w, y + 3)],
        fill=(*Colors.gold_rgb, 140),
    )
    y += 20

    # Fuente
    if spec.source:
        sf = get_font("body_regular", TypeScale.caption - 2)
        sw, _ = measure_text(spec.source, sf)
        draw.text(
            ((W - sw) // 2, y),
            spec.source,
            font=sf,
            fill=(*Colors.bone_rgb, 120),
        )

    return img


def _render_educational(img: Image.Image, spec: SlideSpec) -> Image.Image:
    draw = ImageDraw.Draw(img)
    _draw_accent_and_handle(img, spec, draw)

    # Etiqueta
    if spec.label:
        font_label = get_font("body_bold", TypeScale.caption)
        lc = get_label_colors(spec.accent_color)
        draw.text((MH, Carousel.ZONE_LABEL + 6), spec.label.upper(), font=font_label, fill=lc["text"])

    # Headline
    y = Carousel.ZONE_HEADLINE
    y = _draw_headline(img, spec, draw, y_start=y)

    # Separador
    draw_divider(draw, y - 4, MH, W - MH, color=(*_accent_rgb(spec), 50))
    y += 20

    # Body
    y = _draw_body(draw, spec, y)

    # Lista de bullets
    if spec.bullets:
        y = draw_bullet_list(
            draw,
            items        = spec.bullets,
            y            = y,
            x            = MH,
            content_w    = CW,
            font_style   = "body_regular",
            font_size    = TypeScale.body - 2,
            text_color   = Colors.bone_rgb,
            bullet_color = _accent_rgb(spec),
            line_spacing = 1.35,
        )

    return img


def _render_practical(img: Image.Image, spec: SlideSpec) -> Image.Image:
    draw = ImageDraw.Draw(img)
    _draw_accent_and_handle(img, spec, draw)

    # Etiqueta
    if spec.label:
        font_label = get_font("display_bold", TypeScale.subtitle)
        tw, _ = measure_text(spec.label.upper(), font_label)
        lc = get_label_colors(spec.accent_color)
        draw.text(
            ((W - tw) // 2, Carousel.ZONE_LABEL + 8),
            spec.label.upper(),
            font=font_label,
            fill=lc["text"],
        )

    # Separador
    draw_divider(
        draw,
        Carousel.ZONE_HEADLINE - 16,
        MH + 80, W - MH - 80,
        color=(*_accent_rgb(spec), 45),
    )

    # Lista de niveles
    if spec.tiers:
        y = Carousel.ZONE_HEADLINE + 8
        draw_tier_list(
            draw, img,
            tiers      = spec.tiers,
            y          = y,
            x          = MH,
            content_w  = CW,
            accent_hex = _accent_hex(spec),
        )

    return img


def _render_cta(img: Image.Image, spec: SlideSpec) -> Image.Image:
    draw = ImageDraw.Draw(img)

    # Barra de acento superior
    draw_accent_bar(draw, y=0, color_hex=_accent_hex(spec))

    # Headline (centrado, grande)
    if spec.headline:
        size = TypeScale.title if len(spec.headline) <= 50 else TypeScale.subtitle
        font = get_font("display_bold", size)
        lines = wrap_text(spec.headline, font, CW - 40)
        from slide_renderer import text_block_height
        block_h = text_block_height(lines, font, 1.22)
        y_hl = int(H * 0.28) - block_h // 2

        draw_text_block(
            draw, lines, font,
            x=MH + 20, y=y_hl,
            fill=_bone_rgba(248),
            line_spacing=1.22,
            align="center",
            canvas_width=W - 40,
            shadow=True, shadow_offset=3,
        )

    # CTA principal en card
    if spec.cta_primary:
        cf = get_font("display_bold", TypeScale.body + 6)
        clines = wrap_text(spec.cta_primary, cf, CW - 60)
        block_h = len(clines) * int((TypeScale.body + 6) * 1.22) + 44
        card_y = int(H * 0.50)
        draw_rounded_rect(
            draw,
            (MH, card_y, W - MH, card_y + block_h),
            radius=20,
            fill=(*_accent_rgb(spec), 38),
            outline=(*_accent_rgb(spec), 120),
            outline_width=2,
        )
        draw_text_block(
            draw, clines, cf,
            x=MH + 30, y=card_y + 22,
            fill=(*_accent_rgb(spec), 240),
            line_spacing=1.22,
            align="center",
            canvas_width=W - 60,
            shadow=True,
        )

    # CTA secundario
    if spec.cta_secondary:
        sf = get_font("body_regular", TypeScale.caption + 2)
        slines = wrap_text(spec.cta_secondary, sf, CW - 40)
        sec_y = int(H * 0.50) + block_h + 24 if spec.cta_primary else int(H * 0.62)
        draw_text_block(
            draw, slines, sf,
            x=MH + 20, y=sec_y,
            fill=_bone_rgba(140),
            line_spacing=1.3,
            align="center",
            canvas_width=W - 40,
        )

    # Handle @
    hf = get_font("display_bold", TypeScale.body)
    hw, _ = measure_text(spec.handle, hf)
    draw.text(
        ((W - hw) // 2, int(H * 0.80)),
        spec.handle,
        font=hf,
        fill=(*Colors.bone_rgb, 190),
    )

    return img


# ─────────────────────────────────────────────────────────────────────────────
# Mapa de renderizadores
# ─────────────────────────────────────────────────────────────────────────────

_RENDERERS = {
    "cover":       _render_cover,
    "myth":        _render_myth,
    "problem":     _render_myth,       # mismo layout que myth (pain point destacado)
    "reality":     _render_science,
    "science":     _render_science,
    "solution":    _render_educational, # promesa + bullets de beneficios
    "value":       _render_educational, # tip/dato accionable + bullets
    "stats":       _render_stats,
    "quote":       _render_quote,
    "reflection":  _render_quote,      # pregunta reflexiva centrada
    "educational": _render_educational,
    "practical":   _render_practical,
    "cta":         _render_cta,
}


# ─────────────────────────────────────────────────────────────────────────────
# Función pública: render_slide
# ─────────────────────────────────────────────────────────────────────────────

def render_slide(
    spec: SlideSpec,
    output_path: Path,
    bg_dir: Optional[Path] = None,
) -> Path:
    """
    Renderiza un slide completo y lo guarda como PNG en output_path.

    Args:
        spec:        SlideSpec con todo el contenido del slide.
        output_path: Ruta de destino del PNG (se crea si no existe).
        bg_dir:      Directorio temporal para cachear los fondos generados por IA.

    Returns:
        output_path con el slide renderizado.
    """
    if bg_dir is None:
        bg_dir = output_path.parent / "bg_cache"
    bg_dir.mkdir(parents=True, exist_ok=True)

    log.info(
        "Renderizando slide %d/%d [%s] → %s",
        spec.slide_num, spec.total_slides, spec.type, output_path.name,
    )

    # ── Paso 1+2: fondo + overlay ─────────────────────────────────────────
    img = _build_base(spec, bg_dir)

    # ── Paso 5→8: contenido según tipo ───────────────────────────────────
    renderer = _RENDERERS.get(spec.type, _render_science)
    img = renderer(img, spec)

    # ── Paso 7: indicadores de slide (dots) ───────────────────────────────
    img = draw_slide_dots(img, spec.slide_num - 1, spec.total_slides, Carousel.ZONE_DOTS)

    # ── Paso 8: logo ──────────────────────────────────────────────────────
    logo_path = Assets.logo_dark if spec.type != "cta" else Assets.logo_dark
    img = paste_logo(img, logo_path, position="bottom_center", width=Carousel.LOGO_W)

    # ── Paso 9: grano cinematográfico (sutil) ─────────────────────────────
    img = add_film_grain(img, intensity=0.018)

    # ── Guardar PNG de alta calidad ───────────────────────────────────────
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final = img.convert("RGB")
    final.save(str(output_path), "PNG", optimize=False)

    size_kb = output_path.stat().st_size // 1024
    log.info("  → %d KB", size_kb)
    if size_kb < 200:
        log.warning("  Slide %d tiene solo %d KB (objetivo: ≥300 KB)", spec.slide_num, size_kb)

    return output_path


# ─────────────────────────────────────────────────────────────────────────────
# Función pública: render_carousel
# ─────────────────────────────────────────────────────────────────────────────

def render_carousel(
    specs: list[SlideSpec],
    output_dir: Path,
    carousel_id: str = "carousel",
) -> list[Path]:
    """
    Renderiza todos los slides de un carrusel y devuelve sus rutas.

    Args:
        specs:       Lista de SlideSpec en orden.
        output_dir:  Directorio de salida para los PNGs.
        carousel_id: Prefijo para los nombres de archivo.

    Returns:
        Lista de Path a los PNGs generados, en orden.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    bg_dir = output_dir / "_bg_cache"
    bg_dir.mkdir(exist_ok=True)

    paths: list[Path] = []
    for spec in specs:
        filename = f"{carousel_id}_slide_{spec.slide_num:02d}.png"
        out_path = output_dir / filename
        render_slide(spec, out_path, bg_dir=bg_dir)
        paths.append(out_path)

    log.info("Carrusel completo: %d slides en %s", len(paths), output_dir)
    return paths
