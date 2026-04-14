#!/usr/bin/env python3
"""
Cals2Gains Instagram Post Generator
Generates 12 professional Spanish-language Instagram posts at 1080x1080px
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import math
from typing import Tuple, List

# Brand Colors
CORAL = "#FF6A4D"
VIOLET = "#9C8CFF"
INDIGO = "#6366F1"
ORANGE = "#FF9800"
DARK_BG = "#17121D"
LIGHT_TEXT = "#F7F2EA"
WHITE = "#FFFFFF"
BLACK = "#000000"
DARK_PURPLE = "#2D1B3D"
ACCENT_GREEN = "#4ADE80"
ACCENT_RED = "#EF4444"

# Dimensions
SIZE = 1080
PADDING = 50
FONT_PATH_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_PATH_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# Output directory
OUTPUT_DIR = "/sessions/nice-quirky-cerf/mnt/macrolens/instagram/posts_es"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_gradient_bg(image: Image.Image, color1: str, color2: str, direction: str = "vertical"):
    """Create a gradient background."""
    pixels = image.load()
    width, height = image.size

    c1 = hex_to_rgb(color1)
    c2 = hex_to_rgb(color2)

    if direction == "vertical":
        for y in range(height):
            ratio = y / height
            r = int(c1[0] + (c2[0] - c1[0]) * ratio)
            g = int(c1[1] + (c2[1] - c1[1]) * ratio)
            b = int(c1[2] + (c2[2] - c1[2]) * ratio)
            for x in range(width):
                pixels[x, y] = (r, g, b)
    elif direction == "horizontal":
        for x in range(width):
            ratio = x / width
            r = int(c1[0] + (c2[0] - c1[0]) * ratio)
            g = int(c1[1] + (c2[1] - c1[1]) * ratio)
            b = int(c1[2] + (c2[2] - c1[2]) * ratio)
            for y in range(height):
                pixels[x, y] = (r, g, b)
    elif direction == "diagonal":
        for y in range(height):
            for x in range(width):
                ratio = (x + y) / (width + height)
                r = int(c1[0] + (c2[0] - c1[0]) * ratio)
                g = int(c1[1] + (c2[1] - c1[1]) * ratio)
                b = int(c1[2] + (c2[2] - c1[2]) * ratio)
                pixels[x, y] = (r, g, b)


def add_watermark(draw: ImageDraw.ImageDraw, font_size: int = 36):
    """Add @cals2gains watermark."""
    try:
        font = ImageFont.truetype(FONT_PATH_BOLD, font_size)
    except:
        font = ImageFont.load_default()

    text = "@cals2gains"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    x = SIZE - text_width - 40
    y = SIZE - 80

    # Draw text with slight shadow
    draw.text((x + 2, y + 2), text, fill=hex_to_rgb(DARK_BG), font=font)
    draw.text((x, y), text, fill=hex_to_rgb(CORAL), font=font)


def add_accent_circle(draw: ImageDraw.ImageDraw, x: int, y: int, radius: int, color: str, fill: bool = False):
    """Add a decorative circle."""
    rgb = hex_to_rgb(color)
    width = 3
    draw.ellipse([x - radius, y - radius, x + radius, y + radius],
                 outline=rgb, width=width)
    if fill:
        draw.ellipse([x - radius + width, y - radius + width,
                      x + radius - width, y + radius - width],
                     fill=rgb)


def add_accent_box(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, height: int, color: str):
    """Add a decorative box."""
    rgb = hex_to_rgb(color)
    draw.rectangle([x, y, x + width, y + height], outline=rgb, width=3)


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> str:
    """Wrap text to fit within max_width."""
    words = text.split()
    lines = []
    current_line = []

    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(' '.join(current_line))
            current_line = [word]

    if current_line:
        lines.append(' '.join(current_line))

    return '\n'.join(lines)


def post_1_searching_foods():
    """Post 1: ¿Sigues buscando alimentos a mano en 2026?"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_BG, DARK_PURPLE, "diagonal")
    draw = ImageDraw.Draw(img)

    # Decorative elements
    add_accent_circle(draw, 150, 150, 80, CORAL, fill=False)
    add_accent_circle(draw, SIZE - 150, SIZE - 150, 100, VIOLET, fill=False)

    # Main headline
    try:
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 72)
        font_body = ImageFont.truetype(FONT_PATH_REGULAR, 48)
    except:
        font_headline = font_body = ImageFont.load_default()

    headline = "¿Sigues buscando\nalimentos a mano\nen 2026?"
    draw.text((PADDING, 300), headline, fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)

    # Camera emoji simulation with box
    add_accent_box(draw, SIZE - 250, 200, 150, 150, CORAL)
    draw.text((SIZE - 220, 280), "📷", fill=hex_to_rgb(CORAL), font=font_body)

    # Footer text
    footer = "Hay una mejor forma..."
    draw.text((PADDING, SIZE - 150), footer, fill=hex_to_rgb(CORAL), font=font_body)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/01_searching_foods.png")
    print("✓ Post 1: Searching foods")


def post_2_black_box():
    """Post 2: Tu app te dice 1800 kcal. ¿De dónde sale?"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_PURPLE, DARK_BG, "vertical")
    draw = ImageDraw.Draw(img)

    # Large "?" symbol
    try:
        font_huge = ImageFont.truetype(FONT_PATH_BOLD, 200)
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 56)
        font_body = ImageFont.truetype(FONT_PATH_REGULAR, 40)
    except:
        font_huge = font_headline = font_body = ImageFont.load_default()

    # Black box visual
    add_accent_box(draw, 150, 150, 780, 350, "#333333")
    draw.rectangle([155, 155, 925, 495], fill=hex_to_rgb("#1a1a1a"))
    draw.text((400, 280), "?", fill=hex_to_rgb(CORAL), font=font_huge)

    # Question text
    headline = "Tu app te dice\n1800 kcal\n¿De dónde sale?"
    draw.text((PADDING, 600), headline, fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)

    # Footer
    footer = "Cals2Gains es transparente"
    draw.text((PADDING, SIZE - 150), footer, fill=hex_to_rgb(ORANGE), font=font_body)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/02_black_box.png")
    print("✓ Post 2: Black box question")


def post_3_myth_carbs():
    """Post 3: MITO: Los Carbohidratos Engordan"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_BG, INDIGO, "vertical")
    draw = ImageDraw.Draw(img)

    try:
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 80)
        font_label = ImageFont.truetype(FONT_PATH_BOLD, 48)
        font_body = ImageFont.truetype(FONT_PATH_REGULAR, 36)
    except:
        font_headline = font_label = font_body = ImageFont.load_default()

    # Left side - MITO (Myth)
    draw.rectangle([50, 150, 450, 750], outline=hex_to_rgb(ACCENT_RED), width=4)
    draw.text((80, 200), "MITO", fill=hex_to_rgb(ACCENT_RED), font=font_label)
    draw.text((100, 350), "Los Carbohidratos\nEngordan", fill=hex_to_rgb(LIGHT_TEXT), font=font_body)

    # Big X mark
    draw.line([(100, 550), (400, 650)], fill=hex_to_rgb(ACCENT_RED), width=8)
    draw.line([(400, 550), (100, 650)], fill=hex_to_rgb(ACCENT_RED), width=8)

    # Right side - FACT
    draw.rectangle([630, 150, 1030, 750], outline=hex_to_rgb(ACCENT_GREEN), width=4)
    draw.text((660, 200), "HECHO", fill=hex_to_rgb(ACCENT_GREEN), font=font_label)
    draw.text((660, 350), "Los Carbohidratos\nson energía\n(Come con sentido)",
              fill=hex_to_rgb(LIGHT_TEXT), font=font_body)

    # Checkmark
    draw.line([(700, 580), (780, 650)], fill=hex_to_rgb(ACCENT_GREEN), width=8)
    draw.line([(780, 650), (950, 500)], fill=hex_to_rgb(ACCENT_GREEN), width=8)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/03_myth_carbs.png")
    print("✓ Post 3: Myth - Carbs")


def post_4_how_many_apps():
    """Post 4: ¿Cuántas apps necesitas?"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_PURPLE, DARK_BG, "horizontal")
    draw = ImageDraw.Draw(img)

    try:
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 68)
        font_label = ImageFont.truetype(FONT_PATH_BOLD, 36)
    except:
        font_headline = font_label = ImageFont.load_default()

    # Headline
    draw.text((PADDING, 100), "¿Cuántas apps\nnecesitas?",
              fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)

    # Left side - 4 apps
    draw.text((80, 350), "4️⃣ Apps", fill=hex_to_rgb(LIGHT_TEXT), font=font_label)
    positions = [(120, 450), (280, 450), (120, 610), (280, 610)]
    for i, (x, y) in enumerate(positions):
        add_accent_box(draw, x, y, 100, 100, CORAL)
        draw.text((x + 30, y + 30), "App", fill=hex_to_rgb(CORAL), font=font_label)

    # VS in middle
    draw.text((520, 520), "VS", fill=hex_to_rgb(VIOLET), font=font_headline)

    # Right side - 1 unified app
    draw.text((750, 350), "1️⃣ App", fill=hex_to_rgb(LIGHT_TEXT), font=font_label)
    add_accent_circle(draw, 850, 550, 110, VIOLET, fill=False)
    draw.text((800, 520), "C2G", fill=hex_to_rgb(VIOLET), font=font_headline)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/04_how_many_apps.png")
    print("✓ Post 4: How many apps")


def post_5_count_to_know():
    """Post 5: No cuentas para sufrir. Cuentas para SABER."""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_BG, DARK_PURPLE, "vertical")
    draw = ImageDraw.Draw(img)

    try:
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 64)
        font_body = ImageFont.truetype(FONT_PATH_REGULAR, 48)
    except:
        font_headline = font_body = ImageFont.load_default()

    # Decorative circles with glow effect
    add_accent_circle(draw, 200, 200, 60, CORAL)
    add_accent_circle(draw, 900, 800, 80, VIOLET)

    # Main text
    text1 = "No cuentas\npara sufrir."
    text2 = "Cuentas para"
    text3 = "SABER"

    draw.text((PADDING, 250), text1, fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)
    draw.text((PADDING, 550), text2, fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)
    draw.text((PADDING, 650), text3, fill=hex_to_rgb(CORAL), font=font_headline)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/05_count_to_know.png")
    print("✓ Post 5: Count to know")


def post_6_big_reveal():
    """Post 6: CALS2GAINS — Bienvenido al futuro del tracking"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))

    # More dramatic gradient
    pixels = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            ratio_y = y / SIZE
            ratio_x = x / SIZE

            if ratio_y < 0.5:
                r = int(hex_to_rgb(INDIGO)[0] * (1 - ratio_y) + hex_to_rgb(DARK_BG)[0] * ratio_y)
                g = int(hex_to_rgb(INDIGO)[1] * (1 - ratio_y) + hex_to_rgb(DARK_BG)[1] * ratio_y)
                b = int(hex_to_rgb(INDIGO)[2] * (1 - ratio_y) + hex_to_rgb(DARK_BG)[2] * ratio_y)
            else:
                r = int(hex_to_rgb(CORAL)[0] * (ratio_y - 0.5) + hex_to_rgb(DARK_BG)[0] * (1 - ratio_y + 0.5))
                g = int(hex_to_rgb(CORAL)[1] * (ratio_y - 0.5) + hex_to_rgb(DARK_BG)[1] * (1 - ratio_y + 0.5))
                b = int(hex_to_rgb(CORAL)[2] * (ratio_y - 0.5) + hex_to_rgb(DARK_BG)[2] * (1 - ratio_y + 0.5))

            pixels[x, y] = (r, g, b)

    draw = ImageDraw.Draw(img)

    try:
        font_huge = ImageFont.truetype(FONT_PATH_BOLD, 120)
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 56)
        font_body = ImageFont.truetype(FONT_PATH_REGULAR, 44)
    except:
        font_huge = font_headline = font_body = ImageFont.load_default()

    # Big logo/text
    draw.text((150, 200), "CALS2GAINS", fill=hex_to_rgb(LIGHT_TEXT), font=font_huge)

    # Underline
    draw.line([(150, 380), (930, 380)], fill=hex_to_rgb(CORAL), width=6)

    # Subtitle
    draw.text((PADDING, 500), "Bienvenido al futuro", fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)
    draw.text((PADDING, 600), "del tracking", fill=hex_to_rgb(CORAL), font=font_headline)

    # Color accents
    add_accent_circle(draw, 300, 750, 40, ORANGE)
    add_accent_circle(draw, 800, 850, 50, VIOLET)
    add_accent_circle(draw, 900, 300, 35, ORANGE)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/06_big_reveal.png")
    print("✓ Post 6: Big reveal")


def post_7_comparison():
    """Post 7: Tu app vs Cals2Gains"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_BG, DARK_PURPLE, "horizontal")
    draw = ImageDraw.Draw(img)

    try:
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 64)
        font_label = ImageFont.truetype(FONT_PATH_BOLD, 48)
        font_item = ImageFont.truetype(FONT_PATH_REGULAR, 32)
    except:
        font_headline = font_label = font_item = ImageFont.load_default()

    # Title
    draw.text((PADDING, 50), "Tu app vs Cals2Gains", fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)

    # Left column (bad)
    draw.text((80, 200), "Otros", fill=hex_to_rgb(ACCENT_RED), font=font_label)
    items_bad = ["❌ Lento", "❌ Confuso", "❌ Manual", "❌ Aislado"]
    y = 300
    for item in items_bad:
        draw.text((100, y), item, fill=hex_to_rgb(LIGHT_TEXT), font=font_item)
        y += 80

    # Divider
    draw.line([(540, 150), (540, 900)], fill=hex_to_rgb(VIOLET), width=3)

    # Right column (good)
    draw.text((620, 200), "Cals2Gains", fill=hex_to_rgb(ACCENT_GREEN), font=font_label)
    items_good = ["✓ Rápido", "✓ Claro", "✓ IA", "✓ Integrado"]
    y = 300
    for item in items_good:
        draw.text((620, y), item, fill=hex_to_rgb(LIGHT_TEXT), font=font_item)
        y += 80

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/07_comparison.png")
    print("✓ Post 7: Comparison")


def post_8_photo_to_macros():
    """Post 8: 📸 Foto → Macros en 3 segundos"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_PURPLE, DARK_BG, "vertical")
    draw = ImageDraw.Draw(img)

    try:
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 72)
        font_label = ImageFont.truetype(FONT_PATH_BOLD, 48)
    except:
        font_headline = font_label = ImageFont.load_default()

    # Main headline
    draw.text((PADDING, 150), "Foto → Macros\nen 3 segundos",
              fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)

    # Step 1: Camera
    add_accent_box(draw, 80, 450, 120, 120, CORAL)
    draw.text((105, 485), "📸", fill=hex_to_rgb(CORAL), font=font_label)
    draw.text((100, 600), "Foto", fill=hex_to_rgb(LIGHT_TEXT), font=font_label)

    # Arrow
    draw.line([(230, 510), (330, 510)], fill=hex_to_rgb(VIOLET), width=6)
    draw.polygon([(330, 510), (310, 490), (310, 530)], fill=hex_to_rgb(VIOLET))

    # Step 2: Food
    add_accent_box(draw, 370, 450, 120, 120, ORANGE)
    draw.text((395, 485), "🍗", fill=hex_to_rgb(ORANGE), font=font_label)
    draw.text((380, 600), "Comida", fill=hex_to_rgb(LIGHT_TEXT), font=font_label)

    # Arrow
    draw.line([(530, 510), (630, 510)], fill=hex_to_rgb(VIOLET), width=6)
    draw.polygon([(630, 510), (610, 490), (610, 530)], fill=hex_to_rgb(VIOLET))

    # Step 3: Macros
    add_accent_box(draw, 660, 450, 120, 120, ACCENT_GREEN)
    draw.text((680, 480), "P C G", fill=hex_to_rgb(ACCENT_GREEN), font=font_label)
    draw.text((655, 600), "Macros", fill=hex_to_rgb(LIGHT_TEXT), font=font_label)

    # Bottom text
    draw.text((PADDING, 850), "Con IA de Cals2Gains", fill=hex_to_rgb(CORAL), font=font_label)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/08_photo_to_macros.png")
    print("✓ Post 8: Photo to macros")


def post_9_ai_coach():
    """Post 9: Coach IA que se adapta a TI"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_BG, INDIGO, "diagonal")
    draw = ImageDraw.Draw(img)

    try:
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 76)
        font_body = ImageFont.truetype(FONT_PATH_REGULAR, 44)
    except:
        font_headline = font_body = ImageFont.load_default()

    # Brain/AI visual (circles)
    add_accent_circle(draw, 540, 300, 100, VIOLET)
    add_accent_circle(draw, 450, 200, 50, CORAL)
    add_accent_circle(draw, 630, 200, 50, CORAL)
    add_accent_circle(draw, 450, 400, 50, CORAL)
    add_accent_circle(draw, 630, 400, 50, CORAL)

    # Connection lines
    draw.line([(450, 250), (540, 300)], fill=hex_to_rgb(VIOLET), width=3)
    draw.line([(630, 250), (540, 300)], fill=hex_to_rgb(VIOLET), width=3)
    draw.line([(450, 350), (540, 300)], fill=hex_to_rgb(VIOLET), width=3)
    draw.line([(630, 350), (540, 300)], fill=hex_to_rgb(VIOLET), width=3)

    # Text
    draw.text((PADDING, 550), "Coach IA", fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)
    draw.text((PADDING, 680), "que se adapta\na TI", fill=hex_to_rgb(CORAL), font=font_headline)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/09_ai_coach.png")
    print("✓ Post 9: AI coach")


def post_10_five_modes():
    """Post 10: 5 modos de objetivo: ¿Cuál es el tuyo?"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_BG, DARK_PURPLE, "vertical")
    draw = ImageDraw.Draw(img)

    try:
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 56)
        font_label = ImageFont.truetype(FONT_PATH_BOLD, 32)
        font_mode = ImageFont.truetype(FONT_PATH_REGULAR, 28)
    except:
        font_headline = font_label = font_mode = ImageFont.load_default()

    # Title
    draw.text((PADDING, 50), "5 MODOS DE OBJETIVO", fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)
    draw.text((PADDING, 130), "¿Cuál es el tuyo?", fill=hex_to_rgb(CORAL), font=font_label)

    # 5 mode boxes
    modes = ["Recomposición", "Mini Corte", "Volumen\nLimpio", "Déficit", "Mantenimiento"]
    colors = [CORAL, ORANGE, VIOLET, INDIGO, ACCENT_GREEN]

    box_width = 140
    box_height = 200
    start_x = 110
    start_y = 280
    spacing = 160

    for i, (mode, color) in enumerate(zip(modes, colors)):
        x = start_x + i * spacing
        y = start_y

        # Box
        add_accent_box(draw, x, y, box_width, box_height, color)

        # Text inside
        draw.text((x + 10, y + 80), mode, fill=hex_to_rgb(color), font=font_mode)

    # Bottom CTA
    draw.text((PADDING, SIZE - 150), "¿Listo para tu cambio?", fill=hex_to_rgb(LIGHT_TEXT), font=font_label)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/10_five_modes.png")
    print("✓ Post 10: Five modes")


def post_11_weekly_recap():
    """Post 11: Tu semana en 30 segundos"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))
    create_gradient_bg(img, DARK_PURPLE, DARK_BG, "horizontal")
    draw = ImageDraw.Draw(img)

    try:
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 68)
        font_label = ImageFont.truetype(FONT_PATH_BOLD, 44)
        font_stat = ImageFont.truetype(FONT_PATH_REGULAR, 32)
    except:
        font_headline = font_label = font_stat = ImageFont.load_default()

    # Title
    draw.text((PADDING, 80), "Tu semana\nen 30 segundos", fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)

    # Dashboard visualization with bars and stats
    stats = [
        ("Lun", 85, CORAL),
        ("Mar", 92, ORANGE),
        ("Mié", 78, VIOLET),
        ("Jue", 88, INDIGO),
        ("Vie", 95, ACCENT_GREEN),
        ("Sáb", 80, CORAL),
        ("Dom", 90, ORANGE),
    ]

    bar_width = 100
    bar_start_x = 100
    bar_start_y = 500
    bar_spacing = 130
    max_height = 200

    for i, (day, score, color) in enumerate(stats):
        x = bar_start_x + i * bar_spacing
        y_top = bar_start_y - (score / 100 * max_height)

        # Bar
        draw.rectangle([x, y_top, x + bar_width, bar_start_y], fill=hex_to_rgb(color))

        # Label
        draw.text((x + 20, bar_start_y + 20), day, fill=hex_to_rgb(color), font=font_stat)

    # Summary stat boxes
    draw.text((PADDING, SIZE - 120), "Promedio: 87.4% | Racha: 7 días",
              fill=hex_to_rgb(LIGHT_TEXT), font=font_label)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/11_weekly_recap.png")
    print("✓ Post 11: Weekly recap")


def post_12_coming_soon():
    """Post 12: Disponible próximamente"""
    img = Image.new('RGB', (SIZE, SIZE), hex_to_rgb(DARK_BG))

    # Gradient with emphasis
    pixels = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            ratio = y / SIZE
            r = int(hex_to_rgb(INDIGO)[0] * ratio + hex_to_rgb(DARK_BG)[0] * (1 - ratio))
            g = int(hex_to_rgb(INDIGO)[1] * ratio + hex_to_rgb(DARK_BG)[1] * (1 - ratio))
            b = int(hex_to_rgb(INDIGO)[2] * ratio + hex_to_rgb(DARK_BG)[2] * (1 - ratio))
            pixels[x, y] = (r, g, b)

    draw = ImageDraw.Draw(img)

    try:
        font_huge = ImageFont.truetype(FONT_PATH_BOLD, 96)
        font_headline = ImageFont.truetype(FONT_PATH_BOLD, 64)
        font_label = ImageFont.truetype(FONT_PATH_BOLD, 40)
    except:
        font_huge = font_headline = font_label = ImageFont.load_default()

    # Center large circle
    add_accent_circle(draw, SIZE // 2, 350, 120, CORAL, fill=False)
    draw.text((450, 310), "⏰", fill=hex_to_rgb(CORAL), font=font_huge)

    # Main text
    draw.text((PADDING, 550), "Disponible\npróximamente", fill=hex_to_rgb(LIGHT_TEXT), font=font_headline)

    # Accent line
    draw.line([(PADDING, 730), (SIZE - PADDING, 730)], fill=hex_to_rgb(CORAL), width=4)

    # CTA
    draw.text((PADDING, 800), "Únete a nuestro waitlist", fill=hex_to_rgb(LIGHT_TEXT), font=font_label)
    draw.text((PADDING, 870), "🔗 cals2gains.com", fill=hex_to_rgb(ORANGE), font=font_label)

    add_watermark(draw)
    img.save(f"{OUTPUT_DIR}/12_coming_soon.png")
    print("✓ Post 12: Coming soon")


def main():
    """Generate all Instagram posts."""
    print("Generating Cals2Gains Instagram Posts (Spanish)...\n")

    post_1_searching_foods()
    post_2_black_box()
    post_3_myth_carbs()
    post_4_how_many_apps()
    post_5_count_to_know()
    post_6_big_reveal()
    post_7_comparison()
    post_8_photo_to_macros()
    post_9_ai_coach()
    post_10_five_modes()
    post_11_weekly_recap()
    post_12_coming_soon()

    print(f"\n✓ All posts generated successfully!")
    print(f"✓ Saved to: {OUTPUT_DIR}")
    print(f"✓ Total posts: 12 x 1080x1080px")


if __name__ == "__main__":
    main()
