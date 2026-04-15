"""
Cals2Gains - Brand Overlay Engine v5.0 (Studio Pro)
=====================================================
Professional studio-grade brand compositing for images and video frames.

Features:
- Logo overlay with opacity and positioning
- Gradient text scene titles with pill backgrounds and slide-up animation
- Data overlay stat cards with animated counters and glassmorphism
- Decorative elements: corner accents, glow dot, progress bar
- Hook screen special treatment (scene 1)
- Safe zone enforcement (TEMPLATE-SPECS.json)
- Watermark with subtle animation support

ALL visual output MUST pass through this module before final render.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
from functools import lru_cache
import numpy as np
import math
import re

from brand_config import (
    Colors, Fonts, Reel, TextSizes, Layout,
    LOGO_DARK, LOGOMARK,
    TitleAnimation, GraphicElements, DataOverlayConfig,
)

# Safe zones from TEMPLATE-SPECS.json
SAFE_ZONE = {
    "top_margin": 210,
    "bottom_margin": 310,
    "left_margin": 84,
    "right_margin": 84,
    "hook_y_start": 200,
    "hook_y_end": 600,
    "body_y_start": 600,
    "body_y_end": 1350,
    "cta_y_start": 1350,
    "cta_y_end": 1450,
    "subtitle_y_start": 1200,
    "subtitle_y_end": 1400,
}

_font_cache: dict = {}

def _get_font(font_path: Path, size: int) -> ImageFont.FreeTypeFont:
    key = f"{font_path}:{size}"
    if key not in _font_cache:
        try:
            _font_cache[key] = ImageFont.truetype(str(font_path), size)
        except OSError:
            print(f"[Overlay] Font not found: {font_path}, using default")
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


# ═══════════════════════════════════════════════════════════════════════════
# LOGO OVERLAY
# ═══════════════════════════════════════════════════════════════════════════

def add_logo(
    image: Image.Image, position: str = "top-right",
    opacity: float = 0.8, size_px: int | None = None, use_mark: bool = False,
) -> Image.Image:
    """Overlay the Cals2Gains logo onto an image."""
    image = image.convert("RGBA")
    logo_path = LOGOMARK if use_mark else LOGO_DARK
    if not logo_path.exists():
        print(f"[Overlay] Logo not found: {logo_path}")
        return image
    logo = Image.open(logo_path).convert("RGBA")
    target_h = size_px or Layout.logo_size
    ratio = target_h / logo.height
    target_w = int(logo.width * ratio)
    logo = logo.resize((target_w, target_h), Image.LANCZOS)
    if opacity < 1.0:
        alpha = logo.split()[3].point(lambda p: int(p * opacity))
        logo.putalpha(alpha)
    margin = Layout.logo_margin
    positions = {
        "top-left": (margin, SAFE_ZONE["top_margin"] + 10),
        "top-right": (image.width - target_w - margin, SAFE_ZONE["top_margin"] + 10),
        "bottom-left": (margin, image.height - target_h - SAFE_ZONE["bottom_margin"] - 10),
        "bottom-right": (image.width - target_w - margin, image.height - target_h - SAFE_ZONE["bottom_margin"] - 10),
        "center": ((image.width - target_w) // 2, (image.height - target_h) // 2),
    }
    x, y = positions.get(position, positions["top-right"])
    result = image.copy()
    result.paste(logo, (x, y), logo)
    return result


# ═══════════════════════════════════════════════════════════════════════════
# TEXT OVERLAYS (with shadow, glow, outline effects)
# ═══════════════════════════════════════════════════════════════════════════

def add_text_overlay(
    image: Image.Image, text: str, style: str = "title",
    position: str = "center", custom_y: int | None = None,
    max_width: int | None = None, color_override: str | None = None,
) -> Image.Image:
    """Add branded text overlay with shadow/glow/outline effects."""
    image = image.convert("RGBA")
    style_map = {
        "hero":      {"font": Fonts.display_bold, "size": TextSizes.hero, "color": Colors.bone, "shadow": True, "glow": True, "glow_color": Colors.VIOLET_RGBA[:3], "outline": True, "outline_width": 3, "align": "center"},
        "title":     {"font": Fonts.display_bold, "size": TextSizes.title, "color": Colors.bone, "shadow": True, "glow": False, "outline": True, "outline_width": 2, "align": "center"},
        "subtitle":  {"font": Fonts.body_regular, "size": TextSizes.subtitle, "color": Colors.bone, "shadow": True, "glow": False, "outline": False, "align": "center"},
        "cta":       {"font": Fonts.display_bold, "size": TextSizes.cta, "color": Colors.coral, "shadow": True, "glow": True, "glow_color": Colors.CORAL_RGBA[:3], "outline": True, "outline_width": 2, "align": "center"},
        "stat":      {"font": Fonts.data_bold, "size": TextSizes.stat, "color": Colors.violet, "shadow": True, "glow": True, "glow_color": Colors.VIOLET_RGBA[:3], "outline": False, "align": "center"},
        "caption":   {"font": Fonts.body_regular, "size": TextSizes.caption, "color": Colors.bone, "shadow": True, "glow": False, "outline": False, "align": "center"},
        "watermark": {"font": Fonts.body_regular, "size": TextSizes.watermark, "color": Colors.bone, "shadow": False, "glow": False, "outline": False, "align": "center"},
    }
    preset = style_map.get(style, style_map["title"])
    font = _get_font(preset["font"], preset["size"])
    text_color = color_override or preset["color"]
    text_rgba = Colors.hex_to_rgba(text_color) if text_color.startswith("#") else Colors.BONE_RGBA

    mw = max_width or (image.width - 2 * SAFE_ZONE["left_margin"])
    lines = _wrap_text(text, font, mw)

    txt_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(txt_layer)

    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_heights.append(bbox[3] - bbox[1])
    line_spacing = int(preset["size"] * 0.3)
    total_h = sum(line_heights) + line_spacing * (len(lines) - 1) if lines else 0

    # Position calculation respecting safe zones
    if custom_y is not None:
        start_y = custom_y
    elif position == "center":
        start_y = (image.height - total_h) // 2
    elif position == "top":
        start_y = SAFE_ZONE["top_margin"] + 20
    elif position == "hook":
        start_y = SAFE_ZONE["hook_y_start"] + 50
    elif position == "bottom":
        start_y = image.height - total_h - SAFE_ZONE["bottom_margin"] - 20
    elif position == "subtitle_area":
        start_y = SAFE_ZONE["subtitle_y_start"]
    elif position == "cta":
        start_y = SAFE_ZONE["cta_y_start"]
    else:
        start_y = (image.height - total_h) // 2

    # Shadow layer
    if preset.get("shadow"):
        so = max(2, preset["size"] // 20)
        sl = Image.new("RGBA", image.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(sl)
        y = start_y
        for i, line in enumerate(lines):
            bbox = sd.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
            x = (image.width - tw) // 2 if preset["align"] == "center" else SAFE_ZONE["left_margin"]
            sd.text((x + so, y + so), line, font=font, fill=(0, 0, 0, 160))
            y += line_heights[i] + line_spacing
        sl = sl.filter(ImageFilter.GaussianBlur(radius=so * 2))
        txt_layer = Image.alpha_composite(txt_layer, sl)
        draw = ImageDraw.Draw(txt_layer)

    # Glow layer
    if preset.get("glow"):
        gl = Image.new("RGBA", image.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(gl)
        gc = preset.get("glow_color", Colors.VIOLET_RGBA[:3])
        y = start_y
        for i, line in enumerate(lines):
            bbox = gd.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
            x = (image.width - tw) // 2 if preset["align"] == "center" else SAFE_ZONE["left_margin"]
            gd.text((x, y), line, font=font, fill=(*gc, 80))
            y += line_heights[i] + line_spacing
        gl = gl.filter(ImageFilter.GaussianBlur(radius=15))
        txt_layer = Image.alpha_composite(txt_layer, gl)
        draw = ImageDraw.Draw(txt_layer)

    # Outline layer (bold stroke effect - viral 2026)
    if preset.get("outline"):
        ow = preset.get("outline_width", 3)
        ol = Image.new("RGBA", image.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(ol)
        outline_color = (0, 0, 0, 220)
        y = start_y
        for i, line in enumerate(lines):
            bbox = od.textbbox((0, 0), line, font=font)
            tw = bbox[2] - bbox[0]
            x = (image.width - tw) // 2 if preset["align"] == "center" else SAFE_ZONE["left_margin"]
            # Draw text at offsets for outline effect
            for dx in range(-ow, ow + 1):
                for dy in range(-ow, ow + 1):
                    if dx * dx + dy * dy <= ow * ow:
                        od.text((x + dx, y + dy), line, font=font, fill=outline_color)
            y += line_heights[i] + line_spacing
        txt_layer = Image.alpha_composite(txt_layer, ol)
        draw = ImageDraw.Draw(txt_layer)

    # Main text layer
    y = start_y
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        x = (image.width - tw) // 2 if preset["align"] == "center" else SAFE_ZONE["left_margin"]
        draw.text((x, y), line, font=font, fill=text_rgba)
        y += line_heights[i] + line_spacing

    return Image.alpha_composite(image, txt_layer)


# ═══════════════════════════════════════════════════════════════════════════
# GRADIENT TEXT RENDERING (Professional 2026 style)
# ═══════════════════════════════════════════════════════════════════════════

_gradient_cache: dict = {}

def _render_gradient_text(
    text: str, font: ImageFont.FreeTypeFont,
    color_top: tuple = None, color_bottom: tuple = None,
    size: tuple = None,
) -> Image.Image:
    """Render text with a vertical gradient fill. Returns RGBA image.

    Creates text as a mask, generates a vertical gradient, and composites.
    Cached for identical text+font+colors to avoid per-frame recomputation.
    """
    color_top = color_top or Colors.BONE_RGBA
    color_bottom = color_bottom or Colors.VIOLET_RGBA

    # Measure text
    dummy = Image.new("RGBA", (1, 1))
    dd = ImageDraw.Draw(dummy)
    bbox = dd.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    if tw <= 0 or th <= 0:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    # Text as alpha mask (white text on black)
    mask_img = Image.new("L", (tw + 4, th + 4), 0)
    mask_draw = ImageDraw.Draw(mask_img)
    mask_draw.text((-bbox[0] + 2, -bbox[1] + 2), text, font=font, fill=255)

    # Vertical gradient
    gradient = np.zeros((th + 4, tw + 4, 4), dtype=np.uint8)
    for c in range(3):
        col = np.linspace(color_top[c], color_bottom[c], th + 4).astype(np.uint8)
        gradient[:, :, c] = col[:, np.newaxis]
    gradient[:, :, 3] = np.array(mask_img)

    return Image.fromarray(gradient, "RGBA")


def _ease_out_cubic(t: float) -> float:
    """Ease-out cubic: fast start, gentle settle."""
    return 1.0 - (1.0 - min(max(t, 0.0), 1.0)) ** 3


# ═══════════════════════════════════════════════════════════════════════════
# SCENE TITLE — Professional pill + gradient text + animation
# ═══════════════════════════════════════════════════════════════════════════

_title_cache: dict = {}

def render_scene_title(
    image: Image.Image,
    text: str,
    style: str = "title",
    time_in_scene: float = 0.0,
    scene_duration: float = 4.0,
    is_hook: bool = False,
    title_position: str = "top",
) -> Image.Image:
    """Render animated scene title with pill background and gradient text.

    Professional 2026 viral reel style:
    - Gradient text (White→Violet or Violet→Coral depending on style)
    - Dark pill background with glassmorphism border
    - Slide-up + fade-in animation (configurable)
    - Hook scenes get extra-large bold treatment
    """
    if not text:
        return image

    image = image.convert("RGBA")

    # Animation timing
    anim_dur = TitleAnimation.DURATION_S
    anim_progress = min(time_in_scene / max(anim_dur, 0.001), 1.0)
    ease = _ease_out_cubic(anim_progress)

    # Opacity: fade in, hold for scene, no explicit fade-out (scene transition handles it)
    opacity = ease

    if opacity < 0.01:
        return image

    # Style presets
    style_presets = {
        "hero":  {"font": Fonts.display_bold, "size": 120 if is_hook else 96,
                  "grad_top": Colors.BONE_RGBA, "grad_bot": Colors.VIOLET_RGBA, "uppercase": is_hook},
        "title": {"font": Fonts.display_bold, "size": 72,
                  "grad_top": Colors.BONE_RGBA, "grad_bot": Colors.VIOLET_RGBA, "uppercase": False},
        "stat":  {"font": Fonts.data_bold, "size": 96,
                  "grad_top": Colors.VIOLET_RGBA, "grad_bot": Colors.CORAL_RGBA, "uppercase": False},
        "cta":   {"font": Fonts.display_bold, "size": 64,
                  "grad_top": Colors.CORAL_RGBA, "grad_bot": Colors.BONE_RGBA, "uppercase": False},
    }
    preset = style_presets.get(style, style_presets["title"])

    display_text = text.upper() if preset["uppercase"] else text
    font = _get_font(preset["font"], preset["size"])

    # Wrap text to fit
    max_w = image.width - 2 * SAFE_ZONE["left_margin"] - 60
    lines = _wrap_text(display_text, font, max_w)

    # Measure all lines
    dummy = Image.new("RGBA", (1, 1))
    dd = ImageDraw.Draw(dummy)
    line_metrics = []
    for line in lines:
        bbox = dd.textbbox((0, 0), line, font=font)
        line_metrics.append((bbox[2] - bbox[0], bbox[3] - bbox[1]))

    line_spacing = int(preset["size"] * 0.25)
    total_text_h = sum(m[1] for m in line_metrics) + line_spacing * max(len(lines) - 1, 0)
    max_line_w = max((m[0] for m in line_metrics), default=0)

    # Pill background dimensions
    pad_x, pad_y = 32, 20
    pill_w = max_line_w + 2 * pad_x
    pill_h = total_text_h + 2 * pad_y

    # Position
    pill_x = (image.width - pill_w) // 2
    if title_position == "center":
        pill_y = (image.height - pill_h) // 2
    elif title_position == "lower_third":
        pill_y = int(image.height * 0.65)
    else:  # "top" — default
        pill_y = SAFE_ZONE["hook_y_start"] + 40

    # Slide-up offset
    slide_offset = int(TitleAnimation.OFFSET_PX * (1.0 - ease))
    pill_y += slide_offset

    # Build the overlay
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Pill background (dark with glassmorphism border)
    bg_alpha = int(180 * opacity)
    draw.rounded_rectangle(
        [(pill_x, pill_y), (pill_x + pill_w, pill_y + pill_h)],
        radius=24, fill=(23, 18, 29, bg_alpha),
    )
    # Violet border (glassmorphism)
    border_alpha = int(80 * opacity)
    draw.rounded_rectangle(
        [(pill_x, pill_y), (pill_x + pill_w, pill_y + pill_h)],
        radius=24, outline=(156, 140, 255, border_alpha), width=1,
    )

    # Accent bar (thin coral line above pill)
    accent_alpha = int(180 * opacity)
    bar_y = pill_y - 8
    bar_margin = 40
    draw.line(
        [(pill_x + bar_margin, bar_y), (pill_x + pill_w - bar_margin, bar_y)],
        fill=(255, 106, 77, accent_alpha), width=3,
    )

    # Render gradient text lines
    text_y = pill_y + pad_y
    for i, line in enumerate(lines):
        lw, lh = line_metrics[i]
        text_x = pill_x + (pill_w - lw) // 2

        # Shadow
        shadow_alpha = int(160 * opacity)
        so = max(2, preset["size"] // 24)
        shadow_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow_layer)
        sd.text((text_x + so, text_y + so), line, font=font, fill=(0, 0, 0, shadow_alpha))
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=so * 1.5))
        overlay = Image.alpha_composite(overlay, shadow_layer)
        draw = ImageDraw.Draw(overlay)

        # Glow behind text (Violet, soft)
        glow_layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow_layer)
        glow_alpha = int(60 * opacity)
        gd.text((text_x, text_y), line, font=font, fill=(156, 140, 255, glow_alpha))
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=12))
        overlay = Image.alpha_composite(overlay, glow_layer)
        draw = ImageDraw.Draw(overlay)

        # Gradient text
        grad_img = _render_gradient_text(
            line, font,
            color_top=preset["grad_top"], color_bottom=preset["grad_bot"],
        )
        # Apply opacity
        if opacity < 1.0:
            alpha_ch = grad_img.split()[3].point(lambda p: int(p * opacity))
            grad_img.putalpha(alpha_ch)
        overlay.paste(grad_img, (text_x, text_y), grad_img)

        text_y += lh + line_spacing

    return Image.alpha_composite(image, overlay)


# ═══════════════════════════════════════════════════════════════════════════
# DATA OVERLAY STAT CARDS (Professional animated overlays)
# ═══════════════════════════════════════════════════════════════════════════

def render_data_overlay(
    image: Image.Image,
    overlay_def: dict,
    time_in_scene: float,
) -> Image.Image:
    """Render a data overlay stat card with animated counter and glassmorphism.

    overlay_def keys:
        text (str): The text/number to display
        style (str): stat_big | stat_small | comparison | label
        position (str): center | top-left | top-right | bottom-left | bottom-right | center-left | center-right
        appear_at (float): Seconds from scene start
        duration (float): How long the overlay is visible
    """
    text = overlay_def.get("text", "")
    style = overlay_def.get("style", "label")
    position = overlay_def.get("position", "center")
    appear_at = overlay_def.get("appear_at", 0.0)
    duration = overlay_def.get("duration", 2.0)

    if not text:
        return image

    # Timing
    local_t = time_in_scene - appear_at
    if local_t < 0 or local_t > duration:
        return image

    fade_in = DataOverlayConfig.FADE_IN_S
    fade_out = DataOverlayConfig.FADE_OUT_S

    if local_t < fade_in:
        opacity = _ease_out_cubic(local_t / max(fade_in, 0.001))
        scale = 0.9 + 0.1 * opacity
    elif local_t > duration - fade_out:
        opacity = max(0, (duration - local_t) / max(fade_out, 0.001))
        scale = 1.0
    else:
        opacity = 1.0
        scale = 1.0

    if opacity < 0.01:
        return image

    image = image.convert("RGBA")

    # Animated counter for numbers
    display_text = text
    number_match = re.match(r'^([\d,]+\.?\d*)', text.replace(' ', ''))
    if number_match and local_t < DataOverlayConfig.COUNTER_DURATION_S:
        try:
            final_num = float(number_match.group(1).replace(',', ''))
            counter_progress = _ease_out_cubic(local_t / DataOverlayConfig.COUNTER_DURATION_S)
            current_num = final_num * counter_progress
            # Preserve original formatting
            if '.' in number_match.group(1):
                formatted = f"{current_num:.1f}"
            else:
                formatted = str(int(current_num))
            display_text = text.replace(number_match.group(1), formatted)
        except (ValueError, TypeError):
            pass

    # Style definitions
    styles = {
        "stat_big":   {"font": Fonts.data_bold, "size": DataOverlayConfig.STAT_FONT_SIZE,
                       "color": Colors.BONE_RGBA, "label_color": Colors.VIOLET_RGBA},
        "stat_small": {"font": Fonts.data_bold, "size": 40,
                       "color": Colors.BONE_RGBA, "label_color": Colors.VIOLET_RGBA},
        "comparison": {"font": Fonts.body_bold, "size": 36,
                       "color": Colors.BONE_RGBA, "label_color": Colors.CORAL_RGBA, "prefix": "≈ "},
        "label":      {"font": Fonts.body_regular, "size": 32,
                       "color": Colors.BONE_RGBA, "label_color": Colors.VIOLET_RGBA},
    }
    preset = styles.get(style, styles["label"])
    final_text = preset.get("prefix", "") + display_text

    font_size = int(preset["size"] * scale)
    font = _get_font(preset["font"], font_size)

    dummy = Image.new("RGBA", (1, 1))
    dd = ImageDraw.Draw(dummy)
    bbox = dd.textbbox((0, 0), final_text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    # Card dimensions
    pad_x = DataOverlayConfig.CARD_PADDING_X
    pad_y = DataOverlayConfig.CARD_PADDING_Y
    card_w = tw + 2 * pad_x
    card_h = th + 2 * pad_y

    # Position mapping
    margin = SAFE_ZONE["left_margin"] + 20
    positions = {
        "center":       ((image.width - card_w) // 2, (image.height - card_h) // 2),
        "top-left":     (margin, SAFE_ZONE["hook_y_start"] + 120),
        "top-right":    (image.width - card_w - margin, SAFE_ZONE["hook_y_start"] + 120),
        "bottom-left":  (margin, SAFE_ZONE["subtitle_y_start"] - card_h - 60),
        "bottom-right": (image.width - card_w - margin, SAFE_ZONE["subtitle_y_start"] - card_h - 60),
        "center-left":  (margin, (image.height - card_h) // 2),
        "center-right": (image.width - card_w - margin, (image.height - card_h) // 2),
    }
    cx, cy = positions.get(position, positions["center"])

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Glassmorphism card background
    bg_alpha = int(255 * DataOverlayConfig.CARD_BG_OPACITY * opacity)
    draw.rounded_rectangle(
        [(cx, cy), (cx + card_w, cy + card_h)],
        radius=DataOverlayConfig.CARD_CORNER_RADIUS,
        fill=(23, 18, 29, bg_alpha),
    )
    # Subtle border
    border_alpha = int(255 * DataOverlayConfig.CARD_BORDER_OPACITY * opacity)
    draw.rounded_rectangle(
        [(cx, cy), (cx + card_w, cy + card_h)],
        radius=DataOverlayConfig.CARD_CORNER_RADIUS,
        outline=(247, 242, 234, border_alpha), width=1,
    )

    # Colored accent dot (left side of card)
    dot_color = preset["label_color"]
    dot_alpha = int(dot_color[3] * opacity) if len(dot_color) > 3 else int(255 * opacity)
    dot_r = 4
    dot_x = cx + 14
    dot_y = cy + card_h // 2
    draw.ellipse(
        [(dot_x - dot_r, dot_y - dot_r), (dot_x + dot_r, dot_y + dot_r)],
        fill=(*dot_color[:3], dot_alpha),
    )

    # Text
    text_x = cx + pad_x
    text_y = cy + pad_y
    text_alpha = int(255 * opacity)
    text_color = (*preset["color"][:3], text_alpha)

    # Shadow
    draw.text((text_x + 1, text_y + 2), final_text, font=font, fill=(0, 0, 0, int(100 * opacity)))
    # Main text
    draw.text((text_x, text_y), final_text, font=font, fill=text_color)

    return Image.alpha_composite(image, overlay)


# ═══════════════════════════════════════════════════════════════════════════
# DECORATIVE ELEMENTS — Corner accents, glow dot, progress bar
# ═══════════════════════════════════════════════════════════════════════════

_static_decorations_cache: dict = {}

def render_corner_accents(image: Image.Image, opacity: float = 1.0) -> Image.Image:
    """Add thin L-shaped corner accent lines in Violet. Cached for performance."""
    cache_key = f"corners_{image.size}_{opacity:.2f}"
    if cache_key not in _static_decorations_cache:
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        ge = GraphicElements
        c = Colors.hex_to_rgba(ge.CORNER_LINE_COLOR, alpha=int(255 * ge.CORNER_LINE_OPACITY * opacity))
        w = ge.CORNER_LINE_WIDTH
        s = ge.CORNER_LINE_LENGTH
        m = SAFE_ZONE["left_margin"]
        mt = SAFE_ZONE["top_margin"]
        mb = image.height - SAFE_ZONE["bottom_margin"]
        mr = image.width - SAFE_ZONE["right_margin"]

        # Top-left
        draw.line([(m, mt), (m + s, mt)], fill=c, width=w)
        draw.line([(m, mt), (m, mt + s)], fill=c, width=w)
        # Bottom-right
        draw.line([(mr, mb), (mr - s, mb)], fill=c, width=w)
        draw.line([(mr, mb), (mr, mb - s)], fill=c, width=w)

        _static_decorations_cache[cache_key] = overlay

    return Image.alpha_composite(image.convert("RGBA"), _static_decorations_cache[cache_key])


def render_progress_bar(
    image: Image.Image, progress: float, opacity: float = 1.0,
) -> Image.Image:
    """Render a thin progress bar at the bottom of the frame."""
    image = image.convert("RGBA")
    ge = GraphicElements
    h = ge.PROGRESS_BAR_HEIGHT
    w = image.width
    bar_y = image.height - h

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Background track
    bg_alpha = int(255 * ge.PROGRESS_BAR_BG_OPACITY * opacity)
    draw.rectangle([(0, bar_y), (w, bar_y + h)], fill=(247, 242, 234, bg_alpha))

    # Filled portion
    fill_w = int(w * min(max(progress, 0), 1.0))
    if fill_w > 0:
        fill_alpha = int(255 * opacity)
        cr, cg, cb, _ = Colors.hex_to_rgba(ge.PROGRESS_BAR_COLOR)
        draw.rectangle([(0, bar_y), (fill_w, bar_y + h)], fill=(cr, cg, cb, fill_alpha))

    return Image.alpha_composite(image, overlay)


def render_glow_dot(
    image: Image.Image, time_in_scene: float, opacity: float = 1.0,
) -> Image.Image:
    """Render a pulsing glow dot in the top-right area."""
    image = image.convert("RGBA")
    ge = GraphicElements

    # Pulse: sine wave between min and max scale
    phase = (time_in_scene % ge.GLOW_DOT_PULSE_PERIOD) / ge.GLOW_DOT_PULSE_PERIOD
    pulse = ge.GLOW_DOT_MIN_SCALE + (ge.GLOW_DOT_MAX_SCALE - ge.GLOW_DOT_MIN_SCALE) * (0.5 + 0.5 * math.sin(2 * math.pi * phase))
    radius = int(ge.GLOW_DOT_SIZE * pulse)

    cx = image.width - SAFE_ZONE["right_margin"] - 30
    cy = SAFE_ZONE["top_margin"] + 30

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    cr, cg, cb, _ = Colors.hex_to_rgba(ge.GLOW_DOT_COLOR)
    dot_alpha = int(200 * opacity)

    # Outer glow
    glow_r = radius * 3
    glow_overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_overlay)
    gd.ellipse(
        [(cx - glow_r, cy - glow_r), (cx + glow_r, cy + glow_r)],
        fill=(cr, cg, cb, int(40 * opacity)),
    )
    glow_overlay = glow_overlay.filter(ImageFilter.GaussianBlur(radius=glow_r // 2))
    overlay = Image.alpha_composite(overlay, glow_overlay)
    draw = ImageDraw.Draw(overlay)

    # Core dot
    draw.ellipse(
        [(cx - radius, cy - radius), (cx + radius, cy + radius)],
        fill=(cr, cg, cb, dot_alpha),
    )

    return Image.alpha_composite(image, overlay)


def render_hook_flash(image: Image.Image, time_in_scene: float) -> Image.Image:
    """Brief white flash on the first frame of hook scenes."""
    ge = GraphicElements
    if time_in_scene > ge.HOOK_FLASH_DURATION:
        return image

    progress = time_in_scene / max(ge.HOOK_FLASH_DURATION, 0.001)
    flash_opacity = ge.HOOK_FLASH_OPACITY * (1.0 - progress)

    if flash_opacity < 0.01:
        return image

    image = image.convert("RGBA")
    flash = Image.new("RGBA", image.size, (255, 255, 255, int(255 * flash_opacity)))
    return Image.alpha_composite(image, flash)


# ═══════════════════════════════════════════════════════════════════════════
# LEGACY STUBS — no-op, kept only so old imports don't break
# ═══════════════════════════════════════════════════════════════════════════

def render_word_highlight_subtitle(image: Image.Image, *a, **kw) -> Image.Image:
    """Deprecated — subtitles removed in v5.0. Returns image unchanged."""
    return image

def render_karaoke_subtitle(image: Image.Image, *a, **kw) -> Image.Image:
    """Deprecated — subtitles removed in v5.0. Returns image unchanged."""
    return image

def render_subtitle_frame(frame_array: np.ndarray, *a, **kw) -> np.ndarray:
    """Deprecated — subtitles removed in v5.0. Returns frame unchanged."""
    return frame_array


# ═══════════════════════════════════════════════════════════════════════════
# HIGHLIGHT BOX TEXT (for key points / bullets)
# ═══════════════════════════════════════════════════════════════════════════

def add_highlight_box_text(
    image: Image.Image,
    text: str,
    x: int, y: int,
    font_size: int = 46,
    bg_color: str = None,
    text_color: str = "#FFFFFF",
    padding: int = 14,
    radius: int = 8,
) -> Image.Image:
    """Add text with a solid color highlight box behind it."""
    image = image.convert("RGBA")
    bg_color = bg_color or Colors.coral

    font = _get_font(Fonts.display_bold, font_size)
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    bg_rgba = Colors.hex_to_rgba(bg_color, alpha=230)
    draw.rounded_rectangle(
        [(x - padding, y - padding), (x + tw + padding, y + th + padding)],
        radius=radius,
        fill=bg_rgba,
    )

    text_rgba = Colors.hex_to_rgba(text_color)
    draw.text((x, y), text, font=font, fill=text_rgba)

    return Image.alpha_composite(image, overlay)


# ═══════════════════════════════════════════════════════════════════════════
# GRADIENT BARS
# ═══════════════════════════════════════════════════════════════════════════

def add_gradient_bar_fast(
    image: Image.Image, position: str = "bottom",
    color: str | None = None, height: int | None = None, opacity: float = 0.85,
    color_end: str | None = None,
) -> Image.Image:
    """Add a gradient bar overlay using numpy for speed.

    Supports multi-color gradients when color_end is provided.
    Position can be: bottom, top, full (covers entire image).
    """
    image = image.convert("RGBA")
    w = image.width

    if position == "full":
        h = image.height
    else:
        h = height or Layout.gradient_h

    hex_c = color or Colors.plum
    r, g, b, _ = Colors.hex_to_rgba(hex_c)

    if color_end:
        r2, g2, b2, _ = Colors.hex_to_rgba(color_end)
    else:
        r2, g2, b2 = r, g, b

    t = np.linspace(0, 1, h).astype(np.float32)
    alphas = (t * 255 * opacity).astype(np.uint8)
    if position == "top":
        alphas = alphas[::-1]
        t = t[::-1]

    gradient = np.zeros((h, w, 4), dtype=np.uint8)
    gradient[:, :, 0] = (r + (r2 - r) * t[:, np.newaxis]).astype(np.uint8)
    gradient[:, :, 1] = (g + (g2 - g) * t[:, np.newaxis]).astype(np.uint8)
    gradient[:, :, 2] = (b + (b2 - b) * t[:, np.newaxis]).astype(np.uint8)
    gradient[:, :, 3] = alphas[:, np.newaxis]

    grad_img = Image.fromarray(gradient, "RGBA")
    result = image.copy()

    if position == "full":
        result = Image.alpha_composite(result, grad_img)
    else:
        y_pos = image.height - h if position == "bottom" else 0
        result.paste(grad_img, (0, y_pos), grad_img)
    return result


def add_radial_gradient(
    image: Image.Image,
    center: tuple[float, float] = (0.5, 0.45),
    color_inner: str | None = None,
    color_outer: str | None = None,
    opacity: float = 0.6,
    radius: float = 0.8,
) -> Image.Image:
    """Add a radial gradient overlay (spotlight / focus effect).

    Args:
        center: Normalized (x, y) center point (0-1)
        color_inner: Inner color (default: transparent/none)
        color_outer: Outer color (default: plum)
        opacity: Maximum opacity at outer edge
        radius: Radius of the clear center (0-1, relative to image diagonal)
    """
    image = image.convert("RGBA")
    w, h = image.size

    hex_outer = color_outer or Colors.plum
    ro, go, bo, _ = Colors.hex_to_rgba(hex_outer)

    cx, cy = center[0] * w, center[1] * h
    diag = np.sqrt(w ** 2 + h ** 2)

    Y, X = np.ogrid[:h, :w]
    dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2) / (diag * 0.5)

    # Smooth falloff
    mask = np.clip((dist - radius) / (1.0 - radius + 1e-8), 0, 1)
    mask = mask ** 1.5  # Gentle power curve for smooth falloff
    alphas = (mask * 255 * opacity).astype(np.uint8)

    gradient = np.zeros((h, w, 4), dtype=np.uint8)
    gradient[:, :, 0] = ro
    gradient[:, :, 1] = go
    gradient[:, :, 2] = bo
    gradient[:, :, 3] = alphas

    grad_img = Image.fromarray(gradient, "RGBA")
    return Image.alpha_composite(image, grad_img)


# ═══════════════════════════════════════════════════════════════════════════
# WATERMARK
# ═══════════════════════════════════════════════════════════════════════════

def add_watermark(image: Image.Image, text: str = "@cals2gains", opacity: float = 0.4) -> Image.Image:
    """Add a subtle watermark, respecting bottom safe zone."""
    image = image.convert("RGBA")
    font = _get_font(Fonts.body_regular, TextSizes.watermark)
    wm = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(wm)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (image.width - tw) // 2
    # Place above the bottom exclusion zone
    y = image.height - SAFE_ZONE["bottom_margin"] - th - 10
    alpha = int(255 * opacity)
    draw.text((x, y), text, font=font, fill=(*Colors.BONE_RGBA[:3], alpha))
    return Image.alpha_composite(image, wm)


# ═══════════════════════════════════════════════════════════════════════════
# GLASSMORPHISM PANEL (Premium 2026 style)
# ═══════════════════════════════════════════════════════════════════════════

def add_glass_panel(
    image: Image.Image,
    rect: tuple[int, int, int, int],
    blur_radius: int = 20,
    tint_color: str | None = None,
    tint_opacity: float = 0.25,
    border_opacity: float = 0.15,
    border_width: int = 1,
    corner_radius: int = 24,
) -> Image.Image:
    """Add a glassmorphism (frosted glass) panel.

    Premium UI effect: blurred background with semi-transparent tint
    and subtle border. Used for cards, panels, and info overlays.
    """
    image = image.convert("RGBA")
    x1, y1, x2, y2 = rect
    pw, ph = x2 - x1, y2 - y1

    # Extract and blur the region behind the panel
    region = image.crop((x1, y1, x2, y2))
    blurred = region.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # Create tinted overlay
    tc = tint_color or Colors.plum
    tr, tg, tb, _ = Colors.hex_to_rgba(tc)
    tint = Image.new("RGBA", (pw, ph), (tr, tg, tb, int(255 * tint_opacity)))

    # Composite: blurred bg + tint
    panel = Image.alpha_composite(blurred.convert("RGBA"), tint)

    # Apply rounded corner mask
    mask = Image.new("L", (pw, ph), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([(0, 0), (pw, ph)], radius=corner_radius, fill=255)
    panel.putalpha(mask)

    # Add subtle border
    if border_width > 0:
        border_layer = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
        bd = ImageDraw.Draw(border_layer)
        border_alpha = int(255 * border_opacity)
        bd.rounded_rectangle(
            [(0, 0), (pw - 1, ph - 1)],
            radius=corner_radius,
            outline=(*Colors.BONE_RGBA[:3], border_alpha),
            width=border_width,
        )
        panel = Image.alpha_composite(panel, border_layer)

    # Paste panel onto image
    result = image.copy()
    result.paste(panel, (x1, y1), panel)
    return result


# ═══════════════════════════════════════════════════════════════════════════
# DECORATIVE ELEMENTS
# ═══════════════════════════════════════════════════════════════════════════

def add_accent_line(
    image: Image.Image,
    y: int,
    color: str | None = None,
    width: int = 3,
    margin_x: int = 120,
    opacity: float = 0.7,
) -> Image.Image:
    """Add a horizontal accent line (divider/separator)."""
    image = image.convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    c = color or Colors.violet
    r, g, b, _ = Colors.hex_to_rgba(c)
    alpha = int(255 * opacity)
    draw.line(
        [(margin_x, y), (image.width - margin_x, y)],
        fill=(r, g, b, alpha), width=width,
    )
    return Image.alpha_composite(image, overlay)


def add_corner_marks(
    image: Image.Image,
    rect: tuple[int, int, int, int] | None = None,
    color: str | None = None,
    size: int = 30,
    width: int = 2,
    opacity: float = 0.5,
) -> Image.Image:
    """Add corner bracket marks (premium framing effect)."""
    image = image.convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    c = color or Colors.violet
    r, g, b, _ = Colors.hex_to_rgba(c)
    alpha = int(255 * opacity)
    fill = (r, g, b, alpha)

    if rect is None:
        m = 80
        rect = (m, m, image.width - m, image.height - m)
    x1, y1, x2, y2 = rect

    # Top-left
    draw.line([(x1, y1), (x1 + size, y1)], fill=fill, width=width)
    draw.line([(x1, y1), (x1, y1 + size)], fill=fill, width=width)
    # Top-right
    draw.line([(x2, y1), (x2 - size, y1)], fill=fill, width=width)
    draw.line([(x2, y1), (x2, y1 + size)], fill=fill, width=width)
    # Bottom-left
    draw.line([(x1, y2), (x1 + size, y2)], fill=fill, width=width)
    draw.line([(x1, y2), (x1, y2 - size)], fill=fill, width=width)
    # Bottom-right
    draw.line([(x2, y2), (x2 - size, y2)], fill=fill, width=width)
    draw.line([(x2, y2), (x2, y2 - size)], fill=fill, width=width)

    return Image.alpha_composite(image, overlay)


def add_glow_circle(
    image: Image.Image,
    center: tuple[int, int],
    radius: int = 200,
    color: str | None = None,
    opacity: float = 0.15,
) -> Image.Image:
    """Add a soft glowing circle (ambient light / accent glow)."""
    image = image.convert("RGBA")
    w, h = image.size
    c = color or Colors.violet
    cr, cg, cb, _ = Colors.hex_to_rgba(c)

    Y, X = np.ogrid[:h, :w]
    dist = np.sqrt((X - center[0]) ** 2 + (Y - center[1]) ** 2)
    mask = np.clip(1.0 - dist / radius, 0, 1) ** 2
    alphas = (mask * 255 * opacity).astype(np.uint8)

    glow = np.zeros((h, w, 4), dtype=np.uint8)
    glow[:, :, 0] = cr
    glow[:, :, 1] = cg
    glow[:, :, 2] = cb
    glow[:, :, 3] = alphas

    glow_img = Image.fromarray(glow, "RGBA")
    return Image.alpha_composite(image, glow_img)


# ═══════════════════════════════════════════════════════════════════════════
# FULL BRAND TREATMENT
# ═══════════════════════════════════════════════════════════════════════════

def apply_full_brand(
    image: Image.Image, text: str | None = None, text_style: str = "title",
    cta: str | None = None, logo_position: str = "top-right",
    include_watermark: bool = True, include_gradient: bool = True,
    studio_post_process: bool = True,
    include_glow: bool = False,
) -> Image.Image:
    """Apply the complete professional brand treatment to an image.

    Studio pipeline:
    1. Fit to reel canvas
    2. Post-processing (color grading, vignette, grain) if enabled
    3. Gradient overlays (bottom + top)
    4. Optional ambient glow accents
    5. Text overlays with shadow/glow/outline
    6. Logo + watermark
    """
    result = image.convert("RGBA")
    if result.size != Reel.SIZE:
        result = _fit_to_reel(result)

    # Studio post-processing on the base image
    if studio_post_process:
        try:
            from post_processing import studio_grade
            rgb = result.convert("RGB")
            rgb = studio_grade(rgb, preset="cals2gains",
                               vignette_strength=0.30, grain_intensity=0.02,
                               bloom_intensity=0.18, sharpen_amount=0.25)
            result = rgb.convert("RGBA")
        except ImportError:
            pass

    if include_gradient:
        result = add_gradient_bar_fast(result, position="bottom", opacity=0.85)
        result = add_gradient_bar_fast(result, position="top", height=280, opacity=0.65)

    # Ambient glow accents (subtle brand color light sources)
    if include_glow:
        result = add_glow_circle(result, center=(200, 400), radius=350,
                                 color=Colors.violet, opacity=0.08)
        result = add_glow_circle(result, center=(880, 1500), radius=300,
                                 color=Colors.coral, opacity=0.06)

    if text:
        result = add_text_overlay(result, text, style=text_style)
    if cta:
        result = add_text_overlay(result, cta, style="cta", custom_y=SAFE_ZONE["cta_y_start"])
    result = add_logo(result, position=logo_position)
    if include_watermark:
        result = add_watermark(result)
    return result


# ═══════════════════════════════════════════════════════════════════════════
# VIDEO FRAME BRANDING (per-frame for video clips)
# ═══════════════════════════════════════════════════════════════════════════

def brand_video_frame(
    frame_array, logo_img=None, show_logo=True,
    time_in_scene: float = 0.0,
    scene_duration: float = 4.0,
    scene_title: str = None,
    scene_title_style: str = "title",
    is_hook: bool = False,
    data_overlays: list = None,
    reel_progress: float = 0.0,
    scene_index: int = 0,
    apply_grade: bool = True,
):
    """Apply professional brand overlay to a single video frame.

    v5.0 Studio Pro pipeline per frame:
    1. Color grading (lightweight, video-optimized)
    2. Corner accent lines (static, cached)
    3. Logo overlay (top-right)
    4. Scene title — gradient text + pill background + slide-up animation
    5. Data overlay stat cards — animated counters + glassmorphism
    6. Hook flash (scene 1 only, first 0.2s)
    7. Glow dot (pulsing coral, top-right)
    8. Progress bar (thin coral bar at bottom)
    """
    if apply_grade:
        try:
            from post_processing import grade_reel_frame
            frame_array = grade_reel_frame(frame_array)
        except ImportError:
            pass

    frame = Image.fromarray(frame_array).convert("RGBA")

    # 1. Corner accents (cached — nearly free after first call)
    frame = render_corner_accents(frame)

    # 2. Logo
    if show_logo and logo_img:
        margin = Layout.logo_margin
        tw, th = logo_img.size
        x = frame.width - tw - margin
        y = SAFE_ZONE["top_margin"] + 10
        frame.paste(logo_img, (x, y), logo_img)

    # 3. Scene title
    if scene_title:
        frame = render_scene_title(
            frame, scene_title, style=scene_title_style,
            time_in_scene=time_in_scene,
            scene_duration=scene_duration,
            is_hook=is_hook,
            title_position="center" if is_hook else "top",
        )

    # 4. Data overlays
    if data_overlays:
        for ov_def in data_overlays:
            frame = render_data_overlay(frame, ov_def, time_in_scene=time_in_scene)

    # 5. Hook flash (scene 1 only)
    if is_hook:
        frame = render_hook_flash(frame, time_in_scene)

    # 6. Glow dot
    frame = render_glow_dot(frame, time_in_scene)

    # 7. Progress bar
    if reel_progress > 0:
        frame = render_progress_bar(frame, progress=reel_progress)

    return np.array(frame.convert("RGB"))


def preload_logo(position: str = "top-right", size_px: int | None = None):
    """Pre-load and resize logo for fast per-frame compositing."""
    if not LOGOMARK.exists():
        return None
    logo = Image.open(LOGOMARK).convert("RGBA")
    target_h = size_px or Layout.logo_size
    ratio = target_h / logo.height
    target_w = int(logo.width * ratio)
    logo = logo.resize((target_w, target_h), Image.LANCZOS)
    alpha = logo.split()[3].point(lambda p: int(p * 0.7))
    logo.putalpha(alpha)
    return logo


# ═══════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════════════

def _wrap_text(text: str, font, max_width: int) -> list:
    words = text.split()
    lines, current = [], ""
    dummy = Image.new("RGBA", (1, 1))
    draw = ImageDraw.Draw(dummy)
    for word in words:
        test = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = test
        else:
            if current: lines.append(current)
            current = word
    if current: lines.append(current)
    return lines


def _fit_to_reel(image: Image.Image) -> Image.Image:
    """Resize/crop image to fit reel dimensions."""
    tw, th = Reel.SIZE
    ir = image.width / image.height
    tr = tw / th
    if ir > tr:
        nh = th; nw = int(image.width * (th / image.height))
    else:
        nw = tw; nh = int(image.height * (tw / image.width))
    resized = image.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))


if __name__ == "__main__":
    from brand_config import OUTPUT_DIR

    # Test full brand overlay
    test = Image.new("RGBA", Reel.SIZE, Colors.PLUM_RGBA)
    result = apply_full_brand(test, text="Track Your\nMacros Easily", text_style="hero", cta="Download Now")
    result.save(str(OUTPUT_DIR / "test_brand_overlay.png"))

    # Test word-by-word subtitle
    test2 = Image.new("RGBA", Reel.SIZE, Colors.PLUM_RGBA)
    test2 = render_word_highlight_subtitle(
        test2,
        words=["The", "protein", "myth", "nobody", "talks", "about"],
        highlight_index=2,
        highlight_color=Colors.coral,
    )
    test2.save(str(OUTPUT_DIR / "test_subtitle_highlight.png"))

    print(f"Saved test overlays -> {OUTPUT_DIR}")
