#!/usr/bin/env python3
"""
Generate professional Instagram post images for Cals2Gains English account
1080x1080px with dark mode aesthetic, modern fitness/tech feel
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os

# Brand colors
CORAL = "#FF6A4D"
VIOLET = "#9C8CFF"
INDIGO = "#6366F1"
ORANGE = "#FF9800"
DARK_BG = "#17121D"
BONE = "#F7F2EA"
WHITE = "#FFFFFF"
BLACK = "#000000"
LIGHT_GRAY = "#E0E0E0"
DARK_GRAY = "#333333"

# Output directory
OUTPUT_DIR = "/sessions/nice-quirky-cerf/mnt/macrolens/instagram/posts_en"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Standard Instagram size
SIZE = 1080
HALF = SIZE // 2

# Font sizes
TITLE_SIZE = 80
SUBTITLE_SIZE = 60
BODY_SIZE = 48
SMALL_SIZE = 36

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_gradient_background(size, color1, color2, direction="vertical"):
    """Create a gradient background"""
    img = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(img)

    c1 = hex_to_rgb(color1)
    c2 = hex_to_rgb(color2)

    if direction == "vertical":
        for y in range(size):
            ratio = y / size
            r = int(c1[0] * (1 - ratio) + c2[0] * ratio)
            g = int(c1[1] * (1 - ratio) + c2[1] * ratio)
            b = int(c1[2] * (1 - ratio) + c2[2] * ratio)
            draw.line([(0, y), (size, y)], fill=(r, g, b))
    else:  # horizontal
        for x in range(size):
            ratio = x / size
            r = int(c1[0] * (1 - ratio) + c2[0] * ratio)
            g = int(c1[1] * (1 - ratio) + c2[1] * ratio)
            b = int(c1[2] * (1 - ratio) + c2[2] * ratio)
            draw.line([(x, 0), (x, size)], fill=(r, g, b))

    return img

def add_watermark(img, text="@cals2gains"):
    """Add watermark text to bottom right"""
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", SMALL_SIZE)
    except:
        font = ImageFont.load_default()

    text_color = hex_to_rgb(CORAL)
    margin = 30
    draw.text((SIZE - 280, SIZE - 60), text, font=font, fill=text_color)

def add_text_with_shadow(img, text, position, font_size, color, max_width=None, shadow=True):
    """Add text with optional drop shadow"""
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()

    text_color = hex_to_rgb(color)

    # Add shadow
    if shadow:
        shadow_color = hex_to_rgb(BLACK)
        draw.text((position[0] + 3, position[1] + 3), text, font=font, fill=shadow_color)

    # Add main text
    draw.text(position, text, font=font, fill=text_color)

def draw_circle(draw, center, radius, outline_color, width=3):
    """Draw a circle outline"""
    color = hex_to_rgb(outline_color)
    bbox = [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius]
    draw.ellipse(bbox, outline=color, width=width)

def draw_rectangle(draw, bbox, outline_color, width=3, fill_color=None):
    """Draw a rectangle"""
    color = hex_to_rgb(outline_color)
    fill = hex_to_rgb(fill_color) if fill_color else None
    draw.rectangle(bbox, outline=color, width=width, fill=fill)

# ============================================================================
# POST 1: "Still logging food manually in 2026?"
# ============================================================================
def create_post_1():
    img = create_gradient_background(SIZE, DARK_BG, INDIGO)
    draw = ImageDraw.Draw(img)

    # Add geometric elements
    draw_circle(draw, (SIZE * 0.75, 200), 120, CORAL, width=4)
    draw_rectangle(draw, [100, 350, 400, 650], VIOLET, width=3)

    # Main text
    add_text_with_shadow(img, "Still logging", (60, 280), TITLE_SIZE, CORAL)
    add_text_with_shadow(img, "food manually", (80, 370), TITLE_SIZE, CORAL)
    add_text_with_shadow(img, "in 2026?", (140, 460), TITLE_SIZE, CORAL)

    # Supporting text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", BODY_SIZE)
    except:
        font = ImageFont.load_default()
    draw.text((80, 750), "Time for a smarter way", font=font, fill=hex_to_rgb(BONE))

    add_watermark(img)
    return img

# ============================================================================
# POST 2: "Your app says 1800 kcal. But WHERE does that number come from?"
# ============================================================================
def create_post_2():
    img = create_gradient_background(SIZE, DARK_BG, DARK_BG)
    draw = ImageDraw.Draw(img)

    # Large black box for "black box" metaphor
    draw_rectangle(draw, [150, 200, 930, 800], CORAL, width=4, fill_color=DARK_BG)

    # Question mark in center
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 200)
    except:
        font_large = ImageFont.load_default()
    draw.text((450, 380), "?", font=font_large, fill=hex_to_rgb(CORAL))

    # Text
    add_text_with_shadow(img, "WHERE does that", (100, 850), SUBTITLE_SIZE, CORAL)
    add_text_with_shadow(img, "number come from?", (80, 950), SUBTITLE_SIZE, CORAL)

    add_watermark(img)
    return img

# ============================================================================
# POST 3: "MYTH: Carbs Make You Fat"
# ============================================================================
def create_post_3():
    img = create_gradient_background(SIZE, DARK_BG, INDIGO)
    draw = ImageDraw.Draw(img)

    # Large X mark
    draw.line([(250, 250), (830, 830)], fill=hex_to_rgb(CORAL), width=8)
    draw.line([(830, 250), (250, 830)], fill=hex_to_rgb(CORAL), width=8)

    # Title
    add_text_with_shadow(img, "MYTH", (320, 200), TITLE_SIZE, VIOLET)
    add_text_with_shadow(img, "Carbs Make You Fat", (150, 350), SUBTITLE_SIZE, CORAL)

    # Fact section
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", BODY_SIZE)
    except:
        font = ImageFont.load_default()
    draw.text((150, 800), "FACT: Your CALORIES determine that", font=font, fill=hex_to_rgb(BONE))

    add_watermark(img)
    return img

# ============================================================================
# POST 4: "How many apps do you need to track nutrition?"
# ============================================================================
def create_post_4():
    img = create_gradient_background(SIZE, DARK_BG, DARK_BG)
    draw = ImageDraw.Draw(img)

    # Left side: 4 boxes (multiple apps)
    box_positions = [(100, 250), (400, 250), (100, 550), (400, 550)]
    for i, pos in enumerate(box_positions):
        draw_rectangle(draw, [pos[0], pos[1], pos[0] + 220, pos[1] + 220], CORAL, width=3)
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
        except:
            font = ImageFont.load_default()
        draw.text((pos[0] + 80, pos[1] + 90), str(i+1), font=font, fill=hex_to_rgb(CORAL))

    # Arrow in middle
    arrow_x = 650
    draw.line([(630, 460), (730, 460)], fill=hex_to_rgb(VIOLET), width=6)
    draw.polygon([(730, 460), (700, 440), (700, 480)], fill=hex_to_rgb(VIOLET))

    # Right side: 1 big box (unified app)
    draw_rectangle(draw, [750, 300, 970, 620], INDIGO, width=4)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
    except:
        font = ImageFont.load_default()
    draw.text((830, 430), "1", font=font, fill=hex_to_rgb(VIOLET))

    # Text
    add_text_with_shadow(img, "You need just ONE", (150, 900), BODY_SIZE, BONE)

    add_watermark(img)
    return img

# ============================================================================
# POST 5: "You don't count to suffer. You count to KNOW."
# ============================================================================
def create_post_5():
    img = create_gradient_background(SIZE, INDIGO, VIOLET)
    draw = ImageDraw.Draw(img)

    # Add glow effect circles
    draw_circle(draw, (150, 150), 200, CORAL, width=2)
    draw_circle(draw, (930, 930), 150, CORAL, width=2)

    # Main motivational text
    add_text_with_shadow(img, "You don't count", (80, 320), TITLE_SIZE, BONE)
    add_text_with_shadow(img, "to suffer.", (150, 430), TITLE_SIZE, BONE)

    # Emphasis text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 100)
    except:
        font = ImageFont.load_default()
    draw.text((200, 600), "You count", font=font, fill=hex_to_rgb(CORAL))

    add_text_with_shadow(img, "to KNOW.", (200, 720), TITLE_SIZE, CORAL)

    add_watermark(img)
    return img

# ============================================================================
# POST 6: "CALS2GAINS — Welcome to the Future of Tracking"
# ============================================================================
def create_post_6():
    img = create_gradient_background(SIZE, DARK_BG, INDIGO)
    draw = ImageDraw.Draw(img)

    # Decorative elements
    for i in range(5):
        draw_circle(draw, (100 + i * 200, 150), 60 - i * 8, CORAL, width=2)

    # Main title
    try:
        font_huge = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 120)
    except:
        font_huge = ImageFont.load_default()
    draw.text((80, 280), "CALS2GAINS", font=font_huge, fill=hex_to_rgb(CORAL))

    # Subtitle
    add_text_with_shadow(img, "Welcome to the Future", (100, 520), SUBTITLE_SIZE, VIOLET)
    add_text_with_shadow(img, "of Tracking", (200, 600), SUBTITLE_SIZE, VIOLET)

    # Feature callouts
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", BODY_SIZE)
    except:
        font = ImageFont.load_default()
    draw.text((100, 800), "AI • Photo Recognition • Insights", font=font, fill=hex_to_rgb(BONE))

    add_watermark(img)
    return img

# ============================================================================
# POST 7: "Your App vs Cals2Gains"
# ============================================================================
def create_post_7():
    img = create_gradient_background(SIZE, DARK_BG, DARK_BG)
    draw = ImageDraw.Draw(img)

    # Left side - red/bad
    draw_rectangle(draw, [80, 200, 480, 900], CORAL, width=4, fill_color=DARK_BG)
    add_text_with_shadow(img, "Your App", (150, 250), SUBTITLE_SIZE, CORAL)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
    except:
        font = ImageFont.load_default()
    text_color = hex_to_rgb(LIGHT_GRAY)
    draw.text((100, 400), "× Manual entry\n× No insights\n× Generic goals\n× Static tracking\n× One-size-fits-all",
              font=font, fill=text_color)

    # Right side - green/good
    draw_rectangle(draw, [600, 200, 1000, 900], ORANGE, width=4, fill_color=DARK_BG)
    add_text_with_shadow(img, "Cals2Gains", (650, 250), SUBTITLE_SIZE, ORANGE)
    draw.text((620, 400), "✓ AI Recognition\n✓ Deep Insights\n✓ Smart Goals\n✓ Adaptive\n✓ Personalized",
              font=font, fill=hex_to_rgb(BONE))

    add_watermark(img)
    return img

# ============================================================================
# POST 8: "📸 Photo → Macros in 3 Seconds"
# ============================================================================
def create_post_8():
    img = create_gradient_background(SIZE, DARK_BG, INDIGO)
    draw = ImageDraw.Draw(img)

    # Three sections with arrows
    # Camera icon placeholder
    draw_circle(draw, (220, 450), 100, CORAL, width=4)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
    except:
        font = ImageFont.load_default()
    draw.text((190, 410), "📷", font=font, fill=hex_to_rgb(CORAL))

    # Arrow 1
    draw.line([(350, 450), (450, 450)], fill=hex_to_rgb(VIOLET), width=5)
    draw.polygon([(450, 450), (420, 430), (420, 470)], fill=hex_to_rgb(VIOLET))

    # Food plate icon
    draw_circle(draw, (570, 450), 100, VIOLET, width=4)
    draw.text((540, 410), "🍗", font=font, fill=hex_to_rgb(VIOLET))

    # Arrow 2
    draw.line([(700, 450), (800, 450)], fill=hex_to_rgb(ORANGE), width=5)
    draw.polygon([(800, 450), (770, 430), (770, 470)], fill=hex_to_rgb(ORANGE))

    # Macros icon
    draw_circle(draw, (920, 450), 100, ORANGE, width=4)
    draw.text((870, 410), "⚡", font=font, fill=hex_to_rgb(ORANGE))

    # Title and subtitle
    add_text_with_shadow(img, "Photo → Macros", (150, 200), TITLE_SIZE, BONE)
    add_text_with_shadow(img, "in 3 Seconds", (220, 290), TITLE_SIZE, CORAL)

    add_text_with_shadow(img, "Instant AI-powered food recognition", (120, 850), BODY_SIZE, BONE)

    add_watermark(img)
    return img

# ============================================================================
# POST 9: "AI Coach That Adapts to YOU"
# ============================================================================
def create_post_9():
    img = create_gradient_background(SIZE, VIOLET, INDIGO)
    draw = ImageDraw.Draw(img)

    # Brain/AI visual - concentric circles
    center = (HALF, 350)
    for i in range(5, 0, -1):
        draw_circle(draw, center, i * 80, CORAL if i % 2 == 1 else ORANGE, width=3)

    # Lightning bolt for AI
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 100)
    except:
        font = ImageFont.load_default()
    draw.text((HALF - 40, 300), "⚡", font=font, fill=hex_to_rgb(CORAL))

    # Main text
    add_text_with_shadow(img, "AI Coach", (250, 600), TITLE_SIZE, BONE)
    add_text_with_shadow(img, "Adapts to YOU", (200, 690), TITLE_SIZE, CORAL)

    # Feature text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", BODY_SIZE)
    except:
        font = ImageFont.load_default()
    draw.text((150, 850), "Smart suggestions based on YOUR data", font=font, fill=hex_to_rgb(BONE))

    add_watermark(img)
    return img

# ============================================================================
# POST 10: "5 Goal Modes: Which One is Yours?"
# ============================================================================
def create_post_10():
    img = create_gradient_background(SIZE, DARK_BG, DARK_BG)
    draw = ImageDraw.Draw(img)

    # Title
    add_text_with_shadow(img, "5 Goal Modes", (220, 80), TITLE_SIZE, CORAL)

    # Grid of 5 goal modes
    goals = ["Recomp", "Mini Cut", "Lean Bulk", "Deficit", "Maintain"]
    positions = [
        (100, 300), (450, 300), (800, 300),
        (275, 650), (625, 650)
    ]

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except:
        font = ImageFont.load_default()

    for i, (goal, pos) in enumerate(zip(goals, positions)):
        colors = [CORAL, VIOLET, ORANGE, INDIGO, BONE]
        draw_rectangle(draw, [pos[0], pos[1], pos[0] + 200, pos[1] + 200], colors[i], width=3)
        text_color = hex_to_rgb(colors[i])
        draw.text((pos[0] + 20, pos[1] + 80), goal, font=font, fill=text_color)

    # Bottom text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", BODY_SIZE)
    except:
        font = ImageFont.load_default()
    draw.text((150, 950), "Which one is your path?", font=font, fill=hex_to_rgb(BONE))

    add_watermark(img)
    return img

# ============================================================================
# POST 11: "Your Week in 30 Seconds"
# ============================================================================
def create_post_11():
    img = create_gradient_background(SIZE, INDIGO, DARK_BG)
    draw = ImageDraw.Draw(img)

    # Title
    add_text_with_shadow(img, "Your Week", (220, 150), TITLE_SIZE, CORAL)
    add_text_with_shadow(img, "in 30 Seconds", (200, 250), TITLE_SIZE, BONE)

    # Simple bar chart visualization
    chart_x = 150
    chart_y = 450
    bar_width = 100
    bars = [5, 7, 4, 8, 6, 9, 7]  # Relative heights (M-Su)
    days = ["M", "T", "W", "Th", "F", "Sa", "Su"]

    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except:
        font = ImageFont.load_default()

    for i, (bar_h, day) in enumerate(zip(bars, days)):
        x = chart_x + i * 110
        height = bar_h * 40
        # Draw bar
        draw_rectangle(draw, [x, chart_y - height, x + 80, chart_y], CORAL if i % 2 == 0 else VIOLET, width=2)
        # Draw day label
        draw.text((x + 20, chart_y + 20), day, font=font, fill=hex_to_rgb(BONE))

    # Bottom text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", BODY_SIZE)
    except:
        font = ImageFont.load_default()
    draw.text((150, 900), "Weekly recap with actionable insights", font=font, fill=hex_to_rgb(BONE))

    add_watermark(img)
    return img

# ============================================================================
# POST 12: "Coming Soon"
# ============================================================================
def create_post_12():
    img = create_gradient_background(SIZE, DARK_BG, INDIGO)
    draw = ImageDraw.Draw(img)

    # Large "Coming Soon" text
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 100)
    except:
        font = ImageFont.load_default()
    draw.text((150, 300), "Coming", font=font, fill=hex_to_rgb(CORAL))
    draw.text((200, 420), "Soon", font=font, fill=hex_to_rgb(VIOLET))

    # App store badge placeholders
    draw_rectangle(draw, [150, 650, 450, 750], CORAL, width=3)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    except:
        font = ImageFont.load_default()
    draw.text((180, 680), "App Store", font=font, fill=hex_to_rgb(DARK_BG))

    draw_rectangle(draw, [630, 650, 930, 750], ORANGE, width=3)
    draw.text((650, 680), "Google Play", font=font, fill=hex_to_rgb(DARK_BG))

    # Bottom CTA
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", BODY_SIZE)
    except:
        font = ImageFont.load_default()
    draw.text((150, 850), "Subscribe to get early access", font=font, fill=hex_to_rgb(BONE))

    add_watermark(img)
    return img

# ============================================================================
# Generate all posts
# ============================================================================
def main():
    posts = [
        ("01_manual_logging.png", create_post_1),
        ("02_black_box.png", create_post_2),
        ("03_myth_carbs.png", create_post_3),
        ("04_multiple_apps.png", create_post_4),
        ("05_motivational.png", create_post_5),
        ("06_big_reveal.png", create_post_6),
        ("07_comparison.png", create_post_7),
        ("08_photo_macros.png", create_post_8),
        ("09_ai_coach.png", create_post_9),
        ("10_goal_modes.png", create_post_10),
        ("11_weekly_recap.png", create_post_11),
        ("12_coming_soon.png", create_post_12),
    ]

    print(f"Generating {len(posts)} Instagram posts...")

    for filename, creator_func in posts:
        filepath = os.path.join(OUTPUT_DIR, filename)
        img = creator_func()
        img.save(filepath, quality=95)
        print(f"✓ Created: {filepath}")

    print(f"\nAll {len(posts)} posts generated successfully!")
    print(f"Output directory: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
