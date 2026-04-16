"""
Utilidades de renderizado PIL de bajo nivel para el motor de carruseles.

Todo en este módulo es puro PIL — sin I/O de red, sin llamadas a APIs.
Es la capa de "primitivos visuales" sobre la que se construye carousel_composer.py.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from brand_config import Colors, Fonts, TypeScale, Carousel

# ── Caché de fuentes ──────────────────────────────────────────────────────────
_font_cache: dict[tuple, ImageFont.FreeTypeFont] = {}


def get_font(style: str = "display_bold", size: int = 48) -> ImageFont.FreeTypeFont:
    """Devuelve un PIL ImageFont cacheado. style corresponde a un atributo de Fonts."""
    key = (style, size)
    if key not in _font_cache:
        font_path: Path = getattr(Fonts, style)
        try:
            _font_cache[key] = ImageFont.truetype(str(font_path), size)
        except OSError:
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


# ── Canvas ────────────────────────────────────────────────────────────────────
def new_canvas(
    bg_color: str | tuple = Colors.dark,
    size: tuple[int, int] = Carousel.SIZE,
) -> Image.Image:
    """Crea un canvas RGBA nuevo con bg_color de fondo."""
    if isinstance(bg_color, str):
        bg_color = Colors.hex_to_rgba(bg_color)
    return Image.new("RGBA", size, bg_color)


# ── Overlays de gradiente ─────────────────────────────────────────────────────
def apply_vertical_gradient(
    img: Image.Image,
    top_alpha: int = 0,
    bottom_alpha: int = 215,
    color: tuple[int, int, int] = Colors.dark_rgb,
) -> Image.Image:
    """
    Aplica un gradiente vertical oscuro sobre la imagen.
    top_alpha=0 (transparente arriba) → bottom_alpha=215 (opaco abajo).
    Garantiza legibilidad del texto sobre fondos fotográficos.
    """
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(h):
        t = y / h
        # Curva ease-in: más peso en la parte inferior
        alpha = int(top_alpha + (bottom_alpha - top_alpha) * (t ** 1.7))
        draw.line([(0, y), (w, y)], fill=(*color, alpha))
    return Image.alpha_composite(img.convert("RGBA"), overlay)


def apply_top_gradient(
    img: Image.Image,
    top_alpha: int = 160,
    bottom_alpha: int = 0,
    height_pct: float = 0.30,
    color: tuple[int, int, int] = Colors.dark_rgb,
) -> Image.Image:
    """Gradiente oscuro en la parte superior (para handles y etiquetas)."""
    w, h = img.size
    zone_h = int(h * height_pct)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(zone_h):
        t = y / zone_h
        alpha = int(top_alpha * (1 - t ** 0.7))
        draw.line([(0, y), (w, y)], fill=(*color, alpha))
    return Image.alpha_composite(img.convert("RGBA"), overlay)


def apply_solid_overlay(
    img: Image.Image,
    color: tuple[int, int, int] = Colors.dark_rgb,
    alpha: int = 140,
) -> Image.Image:
    """Aplica un overlay sólido semitransparente (para slides de datos)."""
    overlay = Image.new("RGBA", img.size, (*color, alpha))
    return Image.alpha_composite(img.convert("RGBA"), overlay)


# ── Medición y envolvimiento de texto ────────────────────────────────────────
def measure_text(text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    """Devuelve (ancho, alto) del texto con la fuente dada."""
    dummy = Image.new("RGBA", (1, 1))
    draw = ImageDraw.Draw(dummy)
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def wrap_text(
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    """
    Envuelve texto en líneas que caben dentro de max_width px.
    Respeta \n explícitos en el texto.
    """
    dummy = Image.new("RGBA", (1, 1))
    draw = ImageDraw.Draw(dummy)

    all_lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            all_lines.append("")
            continue
        current: list[str] = []
        for word in words:
            test = " ".join(current + [word])
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] <= max_width:
                current.append(word)
            else:
                if current:
                    all_lines.append(" ".join(current))
                current = [word]
        if current:
            all_lines.append(" ".join(current))
    return all_lines


def text_block_height(
    lines: list[str],
    font: ImageFont.FreeTypeFont,
    line_spacing: float = 1.28,
) -> int:
    """Calcula la altura total de un bloque de texto multi-línea."""
    if not lines:
        return 0
    _, lh = measure_text("Ag", font)
    step = int(lh * line_spacing)
    return step * len(lines)


# ── Funciones de dibujo de texto ─────────────────────────────────────────────
def draw_text_block(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    font: ImageFont.FreeTypeFont,
    x: int,
    y: int,
    fill: tuple | str,
    line_spacing: float = 1.28,
    align: str = "left",
    canvas_width: int = Carousel.WIDTH,
    shadow: bool = True,
    shadow_color: tuple = (0, 0, 0, 145),
    shadow_offset: int = 3,
) -> int:
    """
    Dibuja un bloque de texto multilínea con sombra opcional.
    Devuelve la coordenada y final (debajo de la última línea).
    """
    _, lh = measure_text("Ag", font)
    step = int(lh * line_spacing)
    cy = y

    # Caché de medición
    dummy = Image.new("RGBA", (1, 1))
    dummy_draw = ImageDraw.Draw(dummy)

    for line in lines:
        if not line.strip():
            cy += step
            continue

        bbox = dummy_draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]

        if align == "center":
            lx = (canvas_width - lw) // 2
        elif align == "right":
            lx = canvas_width - lw - Carousel.MARGIN_H
        else:
            lx = x

        if shadow:
            draw.text((lx + shadow_offset, cy + shadow_offset), line, font=font, fill=shadow_color)
        draw.text((lx, cy), line, font=font, fill=fill)
        cy += step
    return cy


# ── Formas y decoradores ──────────────────────────────────────────────────────
def draw_rounded_rect(
    draw: ImageDraw.ImageDraw,
    bbox: tuple[int, int, int, int],
    radius: int,
    fill: tuple | str,
    outline: Optional[tuple | str] = None,
    outline_width: int = 2,
) -> None:
    draw.rounded_rectangle(
        list(bbox),
        radius=radius,
        fill=fill,
        outline=outline,
        width=outline_width if outline else 0,
    )


def draw_pill_label(
    draw: ImageDraw.ImageDraw,
    text: str,
    cx: int,
    y: int,
    font: ImageFont.FreeTypeFont,
    bg_rgba: tuple,
    text_rgba: tuple,
    pad_h: int = 32,
    pad_v: int = 14,
    radius: int = 40,
) -> tuple[int, int]:
    """
    Dibuja una etiqueta tipo píldora centrada en cx.
    Devuelve (ancho, alto) de la píldora.
    """
    tw, th = measure_text(text, font)
    pw = tw + 2 * pad_h
    ph = th + 2 * pad_v
    x0 = cx - pw // 2
    draw_rounded_rect(draw, (x0, y, x0 + pw, y + ph), radius=radius, fill=bg_rgba)
    draw.text((cx - tw // 2, y + pad_v), text, font=font, fill=text_rgba)
    return pw, ph


def draw_accent_bar(
    draw: ImageDraw.ImageDraw,
    y: int,
    color_hex: str,
    width: int = Carousel.WIDTH,
    height: int = Carousel.ACCENT_BAR_H,
) -> None:
    """Barra de acento de ancho completo."""
    rgb = Colors.hex_to_rgb(color_hex)
    draw.rectangle([(0, y), (width, y + height)], fill=(*rgb, 255))


def draw_divider(
    draw: ImageDraw.ImageDraw,
    y: int,
    x0: int,
    x1: int,
    color: tuple = (*Colors.bone_rgb, 50),
    thickness: int = 1,
) -> None:
    draw.line([(x0, y), (x1, y)], fill=color, width=thickness)


def draw_slide_dots(
    img: Image.Image,
    current: int,
    total: int,
    y: int,
    cx: int = Carousel.WIDTH // 2,
) -> Image.Image:
    """
    Dibuja indicadores de slide (punto activo = coral, inactivos = bone outline).
    Devuelve la imagen modificada.
    """
    draw = ImageDraw.Draw(img)
    r = Carousel.DOT_RADIUS
    gap = Carousel.DOT_GAP
    total_w = total * (2 * r) + (total - 1) * gap
    x_start = cx - total_w // 2

    for i in range(total):
        cx_dot = x_start + i * (2 * r + gap) + r
        cy_dot = y + r
        if i == current:
            draw.ellipse(
                [cx_dot - r, cy_dot - r, cx_dot + r, cy_dot + r],
                fill=Colors.hex_to_rgba(Colors.coral),
            )
        else:
            draw.ellipse(
                [cx_dot - r - 1, cy_dot - r - 1, cx_dot + r + 1, cy_dot + r + 1],
                outline=(*Colors.bone_rgb, 100),
                width=2,
            )
    return img


def paste_logo(
    img: Image.Image,
    logo_path: Path,
    position: str = "bottom_center",
    width: int = Carousel.LOGO_W,
    opacity: float = 0.88,
) -> Image.Image:
    """
    Pega el logo de marca en la posición indicada.
    position: 'bottom_center' | 'bottom_left' | 'bottom_right' | 'top_left' | 'top_right'
    """
    if not logo_path.exists():
        return img

    logo = Image.open(logo_path).convert("RGBA")
    aspect = logo.height / logo.width
    new_h = int(width * aspect)
    logo = logo.resize((width, new_h), Image.LANCZOS)

    if opacity < 1.0:
        alpha = logo.split()[3]
        alpha = alpha.point(lambda p: int(p * opacity))
        logo.putalpha(alpha)

    W, H = img.size
    m = Carousel.MARGIN_H

    positions = {
        "bottom_center": ((W - width) // 2, H - new_h - 40),
        "bottom_left":   (m, H - new_h - 40),
        "bottom_right":  (W - width - m, H - new_h - 40),
        "top_left":      (m, Carousel.MARGIN_V - 10),
        "top_right":     (W - width - m, Carousel.MARGIN_V - 10),
    }
    px, py = positions.get(position, positions["bottom_center"])

    base = img.convert("RGBA")
    base.paste(logo, (px, py), logo)
    return base


def draw_handle(
    draw: ImageDraw.ImageDraw,
    handle: str,
    y: int,
    canvas_width: int = Carousel.WIDTH,
    align: str = "right",
) -> None:
    """Dibuja el @handle en tipografía micro."""
    font = get_font("display_regular", TypeScale.micro)
    tw, _ = measure_text(handle, font)
    if align == "center":
        x = (canvas_width - tw) // 2
    elif align == "right":
        x = canvas_width - tw - Carousel.MARGIN_H
    else:
        x = Carousel.MARGIN_H
    draw.text((x, y), handle, font=font, fill=(*Colors.bone_rgb, 110))


# ── Elementos visuales especiales ─────────────────────────────────────────────
def draw_stat_bar_row(
    draw: ImageDraw.ImageDraw,
    label: str,
    value: str,
    y: int,
    x: int,
    content_w: int,
    label_color: tuple,
    value_color: tuple,
    bar_pct: float = 0.0,
    bar_color: Optional[tuple] = None,
) -> int:
    """
    Fila de estadística: [label ... value] con barra de relleno opcional.
    Devuelve la coordenada y tras el elemento.
    """
    lf = get_font("body_regular", TypeScale.caption)
    vf = get_font("display_bold", TypeScale.subtitle)

    draw.text((x, y), label.upper(), font=lf, fill=label_color)
    vw, vh = measure_text(value, vf)
    draw.text((x + content_w - vw, y + 4), value, font=vf, fill=value_color)
    y += vh + 10

    if bar_pct > 0 and bar_color:
        bar_w = int(content_w * min(bar_pct, 1.0))
        # Fondo
        draw.rectangle([(x, y), (x + content_w, y + 5)], fill=(*Colors.dark_rgb, 100))
        # Relleno
        draw.rectangle([(x, y), (x + bar_w, y + 5)], fill=bar_color)
        y += 22
    else:
        y += 14
    return y


def draw_bullet_list(
    draw: ImageDraw.ImageDraw,
    items: list[str],
    y: int,
    x: int,
    content_w: int,
    font_style: str = "body_regular",
    font_size: int = TypeScale.body,
    text_color: tuple = Colors.bone_rgb,
    bullet_color: tuple = Colors.coral_rgb,
    line_spacing: float = 1.35,
    bullet_char: str = "·",
    indent: int = 32,
) -> int:
    """
    Dibuja una lista de bullets con wrap automático.
    Devuelve y tras el último elemento.
    """
    font = get_font(font_style, font_size)
    bfont = get_font("display_bold", font_size)
    _, lh = measure_text("Ag", font)
    step = int(lh * line_spacing)

    for item in items:
        # Bullet
        draw.text((x, y), bullet_char, font=bfont, fill=(*bullet_color, 230))
        bw, _ = measure_text(bullet_char + " ", bfont)

        # Texto con wrap
        wrapped = wrap_text(item, font, content_w - indent)
        first = True
        for line in wrapped:
            lx = x + indent if first else x + indent
            draw.text((lx, y), line, font=font, fill=(*text_color, 220))
            y += step
            first = False
        y += 4  # espacio extra entre bullets

    return y


def draw_tier_list(
    draw: ImageDraw.ImageDraw,
    img: Image.Image,
    tiers: list[dict],
    y: int,
    x: int,
    content_w: int,
    accent_hex: str = Colors.coral,
) -> int:
    """
    Lista de niveles: [icono] Título / descripción.
    Tiers: [{icon, title, desc}]
    Devuelve y tras el último elemento.
    """
    title_font = get_font("display_bold", TypeScale.body + 2)
    desc_font  = get_font("body_regular", TypeScale.caption + 2)
    icon_font  = get_font("display_bold", TypeScale.title)
    accent_rgb = Colors.hex_to_rgb(accent_hex)
    _, title_h = measure_text("Ag", title_font)
    _, desc_h  = measure_text("Ag", desc_font)

    for tier in tiers:
        icon  = tier.get("icon", "·")
        title = tier.get("title", "")
        desc  = tier.get("desc", "")

        # Ícono en círculo pequeño
        iw, ih = measure_text(icon, icon_font)
        circle_r = 32
        cx_icon = x + circle_r
        cy_icon = y + circle_r
        draw.ellipse(
            [cx_icon - circle_r, cy_icon - circle_r, cx_icon + circle_r, cy_icon + circle_r],
            fill=(*accent_rgb, 35),
            outline=(*accent_rgb, 120),
            width=2,
        )
        draw.text(
            (cx_icon - iw // 2, cy_icon - ih // 2 + 2),
            icon,
            font=icon_font,
            fill=(*accent_rgb, 220),
        )

        # Texto a la derecha del ícono
        tx = x + circle_r * 2 + 20
        tw = content_w - circle_r * 2 - 20

        draw.text((tx, y + 4), title, font=title_font, fill=(*Colors.bone_rgb, 240))

        desc_lines = wrap_text(desc, desc_font, tw)
        dy = y + title_h + 8
        for line in desc_lines:
            draw.text((tx, dy), line, font=desc_font, fill=(*Colors.bone_rgb, 150))
            dy += int(desc_h * 1.3)

        y = max(dy, cy_icon + circle_r) + 28

    return y


def draw_quote_marks(
    img: Image.Image,
    x: int,
    y: int,
    size: int = 120,
    color_rgba: tuple = (*Colors.violet_rgb, 40),
) -> Image.Image:
    """Dibuja comillas decorativas grandes de fondo."""
    font = get_font("display_bold", size)
    draw = ImageDraw.Draw(img)
    draw.text((x, y), "\u201c\u201d", font=font, fill=color_rgba)
    return img


def add_film_grain(img: Image.Image, intensity: float = 0.025) -> Image.Image:
    """Añade grano cinematográfico sutil para calidad de estudio."""
    arr = np.array(img.convert("RGBA"), dtype=np.float32)
    noise = np.random.normal(0, intensity * 255, arr.shape[:2])
    for c in range(3):
        arr[:, :, c] = np.clip(arr[:, :, c] + noise, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))
