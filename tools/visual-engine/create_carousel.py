"""
Cals2Gains - Create Carousel
===============================
Generates branded Instagram carousel posts (multi-slide static images).
Loads viral format specs from TEMPLATE-SPECS.json when available.

Viral rules (VIRAL-FORMAT-BIBLE 2026):
- 4:5 portrait (1080x1350) is default — max screen real estate.
- 8 slides default for educational; 5-7 for quick tips.
- Hook slide (slide 1): curiosity gap, max 10 words, stop-scroll.
- screenshot_card type: self-contained saveable card (high save rate in fitness).
- CTA slide: ALWAYS save-bait + DM-bait (DM shares weighted 3-5x by algo).
- Swipe cues + fraction counter (1/8) increase STR.

Usage:
    python create_carousel.py --demo
    python create_carousel.py --script carousel.json
    python create_carousel.py --topic "5 high-protein snacks" --lang en --slides 8
"""

import argparse
import json
import time
import sys
from pathlib import Path
from PIL import Image as PILImage, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))

from brand_config import (
    OUTPUT_DIR, Colors, Reel, Fonts, TextSizes, Layout,
    OPENAI_API_KEY, LOGO_DARK, LOGOMARK, BRAND_STYLE_SUFFIX,
)
from image_generator import generate_dalle3
from brand_overlay import (
    apply_full_brand, add_logo, add_text_overlay,
    add_gradient_bar_fast, add_watermark,
    add_glass_panel, add_accent_line, add_corner_marks,
    add_glow_circle, add_radial_gradient,
)
from post_processing import grade_carousel_slide
from template_loader import (
    load_specs, get_carousel_specs, apply_carousel_specs_to_slides,
    get_cta_text,
)


# -- Carousel canvas (default 4:5, overridable by specs) -------------------
class Carousel:
    WIDTH = 1080
    HEIGHT = 1350
    SIZE = (WIDTH, HEIGHT)


def generate_carousel_script(topic: str, lang: str = "en", n_slides: int = 8) -> dict:
    """Auto-generate a carousel script from a topic using GPT-4o."""
    import httpx

    car_specs = get_carousel_specs()
    max_slides = car_specs.get("optimal_slides", 8)
    headline_max = car_specs.get("text_overlay", {}).get("headline_max_words", 7)
    body_max = car_specs.get("text_overlay", {}).get("max_words_per_slide", 20)
    slide_types = list(car_specs.get("slide_types", {}).keys())
    cta_texts = get_cta_text(car_specs, lang=lang, format_type="carousel")

    system_prompt = f"""You are a creative director for Cals2Gains, a premium fitness/nutrition app.
Create a {n_slides}-slide Instagram carousel post.
Brand: Dark premium aesthetic, colors plum #17121D, violet #9C8CFF, coral #FF6A4D, bone #F7F2EA.
Target: Fitness enthusiasts who want to track macros easily.
Tone: Confident, modern, educational, value-packed.
Language: {"Spanish" if lang == "es" else "English"}

VIRAL CAROUSEL FORMAT (VIRAL-FORMAT-BIBLE 2026 — mandatory rules):
- Slide 1 = HOOK: max {headline_max} words, curiosity gap, make them NEED to swipe. High contrast, bold.
- Slides 2-{n_slides-1} = VALUE: 1 clear idea per slide, max {body_max} words, use data/numbers.
- Last slide = CTA with BOTH signals:
  * Save-bait: "{cta_texts.get('save', 'Save this')}"
  * DM-bait: "{cta_texts.get('dm_bait', 'Send this to a friend who needs it')}"
  (DM shares are weighted 3-5x more than likes by the IG algorithm in 2026)
- Available slide types: {', '.join(slide_types)}
- Use "screenshot_card" for workout/exercise/recipe slides — each must work as a self-contained saveable card (no context needed from other slides)
- Headlines: max {headline_max} words, bold, readable even as a feed thumbnail
- Body text: max {body_max} words, no paragraphs, use bullet points or numbers

Return ONLY valid JSON:
{{"title":"Carousel title","lang":"{lang}","slides":[{{"type":"hook","prompt":"AI image prompt (English, cinematic, dark premium, plum/violet/coral palette)","headline":"Bold stop-scroll text","body":"","text_style":"hero"}},{{"type":"solution","prompt":"...","headline":"...","body":"...","text_style":"title"}},{{"type":"cta","prompt":"...","headline":"{cta_texts.get('save', 'Save this')}","body":"{cta_texts.get('dm_bait', 'Send this to a friend who needs it')}","text_style":"cta"}}]}}
Text styles: hero, title, subtitle, cta, stat
Each slide must deliver standalone value. Use numbers and data. Hook must stop the scroll."""

    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    payload = {"model": "gpt-4o", "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Create a carousel about: {topic}"},
    ], "temperature": 0.8, "max_tokens": 3000}
    with httpx.Client(timeout=60) as client:
        resp = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("`"):
            content = content.split("\n", 1)[1]
            if content.endswith("`"): content = content[:-3]
            content = content.strip()
        return json.loads(content)


def _create_slide_image(
    slide: dict, index: int, total: int,
    car_specs: dict, work_dir: Path,
) -> PILImage.Image:
    """Generate and brand a single carousel slide."""
    prompt = slide.get("prompt", "")
    headline = slide.get("headline", "")
    body = slide.get("body", "")
    text_style = slide.get("text_style", "title")
    stype = slide.get("type", "solution")
    layout = slide.get("_layout", "")  # "card" for screenshot_card
    resolution = car_specs.get("resolution", [1080, 1350])
    size = tuple(resolution)

    # Generate AI background image
    try:
        img_path = work_dir / f"slide_{index+1:02d}_raw.png"
        bg = generate_dalle3(prompt, size=f"{size[0]}x{size[1]}", output_path=img_path)
        if bg.size != size:
            bg = bg.resize(size, PILImage.LANCZOS)
    except Exception as e:
        print(f"  [WARN] Image gen failed for slide {index+1}: {e}")
        bg = PILImage.new("RGB", size, Colors.PLUM_RGBA[:3])

    # Convert to RGBA for overlay compositing
    bg = bg.convert("RGBA")

    # --- SCREENSHOT CARD layout: self-contained saveable card ---
    if stype == "screenshot_card" or layout == "card":
        # Apply studio post-processing to base image first
        bg = grade_carousel_slide(bg.convert("RGB")).convert("RGBA")
        bg = _render_screenshot_card(bg, slide, size, car_specs)
        bg = add_logo(bg, position="top_left", size_px=60, use_mark=True)
        bg = add_watermark(bg, text="@cals2gains")
        return bg.convert("RGB")

    # --- Standard layouts ---
    # Apply studio post-processing to base image
    bg = grade_carousel_slide(bg.convert("RGB")).convert("RGBA")

    # Gradient overlay for text readability
    if stype in ("hook", "cta"):
        bg = add_gradient_bar_fast(bg, position="full", color=Colors.plum, height=size[1], opacity=0.6)
    else:
        bg = add_gradient_bar_fast(bg, position="bottom", color=Colors.plum, height=int(size[1] * 0.5), opacity=0.7)
        bg = add_gradient_bar_fast(bg, position="top", color=Colors.plum, height=int(size[1] * 0.2), opacity=0.5)

    # Logo (top left)
    bg = add_logo(bg, position="top_left", size_px=80, use_mark=True)

    # Slide counter (top right) — fraction style "3/8"
    counter_cfg = car_specs.get("slide_counter", {})
    if counter_cfg.get("enabled", True):
        counter_text = f"{index+1}/{total}"
        bg = add_text_overlay(bg, counter_text, style="caption", position="top_right")

    # Headline text
    if headline:
        if stype == "hook":
            bg = add_text_overlay(bg, headline, style="hero", position="center")
        elif stype == "cta":
            bg = add_text_overlay(bg, headline, style="cta", position="center")
        elif stype in ("stat", "proof"):
            bg = add_text_overlay(bg, headline, style="stat", position="center")
        else:
            y_headline = int(size[1] * 0.52)
            bg = add_text_overlay(bg, headline, style="title", custom_y=y_headline)

    # Body text (below headline)
    if body:
        if stype == "cta":
            # DM-bait in coral, below the save-bait headline
            y_body = int(size[1] * 0.65)
        elif stype == "hook":
            y_body = int(size[1] * 0.64)
        else:
            y_body = int(size[1] * 0.70)
        bg = add_text_overlay(bg, body, style="subtitle", custom_y=y_body, max_width=size[0] - 120)

    # Swipe cue (→) in violet — not on last slide
    if slide.get("swipe_cue"):
        swipe_text = car_specs.get("swipe_cues", {}).get("text", "→")
        bg = add_text_overlay(bg, swipe_text, style="caption", position="bottom_right",
                              color_override=Colors.VIOLET_RGBA)

    # Watermark
    bg = add_watermark(bg, text="@cals2gains")

    return bg.convert("RGB")


def _render_screenshot_card(
    bg: PILImage.Image, slide: dict, size: tuple, car_specs: dict
) -> PILImage.Image:
    """Render a premium Screenshot-Friendly Card (2026 high-save-rate format).

    Studio-grade features:
    - Glassmorphism (frosted glass) panel instead of flat overlay
    - Violet accent bar with gradient
    - Corner marks for premium framing
    - Glow accent behind panel
    - Structured typography hierarchy
    - Save reminder in coral
    """
    headline = slide.get("headline", "")
    body = slide.get("body", "")
    w, h = size

    # Panel dimensions
    panel_left = 50
    panel_right = w - 50
    panel_top = int(h * 0.26)
    panel_bottom = int(h * 0.90)

    # Add subtle glow behind where the panel will be
    bg = add_glow_circle(bg, center=(w // 2, (panel_top + panel_bottom) // 2),
                         radius=500, color=Colors.violet, opacity=0.06)

    # Glassmorphism panel (frosted glass effect)
    bg = add_glass_panel(
        bg,
        rect=(panel_left, panel_top, panel_right, panel_bottom),
        blur_radius=25,
        tint_color=Colors.plum,
        tint_opacity=0.55,
        border_opacity=0.12,
        border_width=1,
        corner_radius=28,
    )

    # Violet accent bar (gradient from violet to coral)
    accent_h = 5
    overlay = PILImage.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    # Gradient accent bar
    for x in range(panel_left + 28, panel_right - 28):
        t = (x - panel_left) / (panel_right - panel_left)
        r = int(156 + (255 - 156) * t)  # violet -> coral
        g = int(140 + (106 - 140) * t)
        b = int(255 + (77 - 255) * t)
        draw.line([(x, panel_top + 2), (x, panel_top + 2 + accent_h)],
                  fill=(r, g, b, 220))
    bg = PILImage.alpha_composite(bg, overlay)

    # Corner marks for premium framing
    bg = add_corner_marks(
        bg,
        rect=(panel_left + 16, panel_top + 16, panel_right - 16, panel_bottom - 16),
        color=Colors.violet, size=20, width=1, opacity=0.3,
    )

    # Headline (exercise/tip name) — bold, Outfit
    if headline:
        y_headline = panel_top + 42
        bg = add_text_overlay(
            bg, headline, style="title",
            custom_y=y_headline,
            max_width=panel_right - panel_left - 60,
        )

    # Accent line separator below headline
    bg = add_accent_line(bg, y=panel_top + 130, color=Colors.violet,
                         width=1, margin_x=panel_left + 40, opacity=0.3)

    # Body rows — structured content
    if body:
        y_body = panel_top + 155
        bg = add_text_overlay(
            bg, body, style="subtitle",
            custom_y=y_body,
            max_width=panel_right - panel_left - 60,
        )

    # "Save this" micro-reminder in coral at bottom of panel
    bg = add_text_overlay(
        bg, "Save this", style="caption",
        custom_y=panel_bottom - 55,
        color_override=Colors.coral,
    )

    return bg


def create_carousel(script: dict, output_dir=None) -> list:
    """Full pipeline: generate all slides for a carousel post."""
    title = script.get("title", "carousel")
    slides = script.get("slides", [])

    # Load and apply viral format specs
    specs = load_specs()
    car_specs = get_carousel_specs(specs)
    slides = apply_carousel_specs_to_slides(slides, car_specs)

    resolution = car_specs.get("resolution", [1080, 1350])

    ts = int(time.time())
    safe = "".join(c for c in title if c.isalnum() or c in " _-")[:30].strip().replace(" ", "_")
    work_dir = OUTPUT_DIR / f"carousel_{safe}_{ts}"
    work_dir.mkdir(parents=True, exist_ok=True)
    if output_dir is None:
        output_dir = work_dir

    print(f"\n{'='*60}")
    print(f"  CALS2GAINS CAROUSEL PIPELINE")
    print(f"  Title: {title}")
    print(f"  Slides: {len(slides)}")
    print(f"  Resolution: {resolution[0]}x{resolution[1]}")
    print(f"  Template specs: {'loaded' if specs else 'defaults'}")
    print(f"  Optimal slides (specs): {car_specs.get('optimal_slides', 8)}")
    print(f"  Output: {output_dir}")
    print(f"{'='*60}\n")

    output_paths = []
    for i, slide in enumerate(slides):
        print(f"\n  Slide {i+1}/{len(slides)} [{slide.get('type','?')}]: {slide.get('headline', '')[:40]}...")
        try:
            img = _create_slide_image(slide, i, len(slides), car_specs, work_dir)
            out_path = Path(output_dir) / f"slide_{i+1:02d}.png"
            img.save(str(out_path), "PNG", quality=95)
            output_paths.append(out_path)
            print(f"  [OK] Slide {i+1}: {out_path.name} ({out_path.stat().st_size // 1024}KB)")
        except Exception as e:
            print(f"  [FAIL] Slide {i+1}: {e}")

    # Save script alongside
    (Path(output_dir) / "carousel_script.json").write_text(
        json.dumps(script, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"\n{'='*60}")
    print(f"  [DONE] CAROUSEL: {len(output_paths)} slides in {output_dir}")
    print(f"{'='*60}\n")

    return output_paths


# ===================================================================
# DEMO CAROUSEL — Screenshot-Friendly Workout Card format (2026)
# ===================================================================

DEMO_CAROUSEL = {
    "title": "5 High-Protein Snacks Under 200 Cal",
    "lang": "en",
    "slides": [
        {
            "type": "hook",
            "prompt": "Dramatic dark food photography of colorful protein snacks arranged artistically on a dark marble surface with moody purple lighting, 4:5 vertical format",
            "headline": "5 Snacks That\nActually Build Muscle",
            "body": "",
            "text_style": "hero",
        },
        {
            "type": "screenshot_card",
            "prompt": "Greek yogurt parfait with berries and granola, dark moody food photography, purple accent lighting, 4:5 vertical",
            "headline": "1. Greek Yogurt Parfait",
            "body": "20g protein · 180 kcal\nAdd berries for antioxidants\nMix in: granola + drizzle honey",
            "text_style": "title",
        },
        {
            "type": "screenshot_card",
            "prompt": "Beef jerky and mixed nuts arranged on dark slate, dramatic side lighting, premium food photography, 4:5 vertical",
            "headline": "2. Jerky + Almonds",
            "body": "18g protein · 190 kcal\nBest on-the-go combo\nNo cooking, no excuses",
            "text_style": "title",
        },
        {
            "type": "screenshot_card",
            "prompt": "Cottage cheese bowl with sliced peaches on dark background, moody overhead shot, violet light accents, 4:5 vertical",
            "headline": "3. Cottage Cheese Bowl",
            "body": "24g protein · 160 kcal\nAdd fruit for sweetness\nHigh in casein = slow-release",
            "text_style": "title",
        },
        {
            "type": "screenshot_card",
            "prompt": "Hard boiled eggs sliced on dark plate with spices, cinematic food photography, warm coral accent light, 4:5 vertical",
            "headline": "4. Hard-Boiled Eggs",
            "body": "12g protein · 140 kcal\nPrep a batch every Sunday\nAdd hot sauce for flavor",
            "text_style": "title",
        },
        {
            "type": "screenshot_card",
            "prompt": "Protein shake in a premium dark shaker bottle, gym background with purple neon, dramatic lighting, 4:5 vertical",
            "headline": "5. Protein Shake",
            "body": "25g protein · 150 kcal\nBlend with ice + almond milk\nPost-workout window: 30 min",
            "text_style": "title",
        },
        {
            "type": "cta",
            "prompt": "Sleek smartphone showing a dark-themed nutrition app with macro tracking dashboard, floating in space with purple glow particles, 4:5 vertical",
            "headline": "Save this for your next snack run",
            "body": "Send this to a gym buddy who\nstill eats chips between sets 😂",
            "text_style": "cta",
        },
    ],
}


def main():
    parser = argparse.ArgumentParser(description="Cals2Gains Carousel Creator")
    parser.add_argument("--script", type=str, help="Path to JSON carousel script file")
    parser.add_argument("--topic", type=str, help="Auto-generate carousel from topic")
    parser.add_argument("--lang", type=str, default="en")
    parser.add_argument("--slides", type=int, default=8, help="Number of slides (default 8)")
    parser.add_argument("--output", type=str, help="Output directory")
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()

    if args.script:
        script = json.loads(Path(args.script).read_text())
    elif args.topic:
        print(f"Generating carousel for: {args.topic}")
        script = generate_carousel_script(args.topic, lang=args.lang, n_slides=args.slides)
    elif args.demo:
        script = DEMO_CAROUSEL
    else:
        print("No input specified, running demo.")
        script = DEMO_CAROUSEL

    create_carousel(script=script, output_dir=Path(args.output) if args.output else None)


if __name__ == "__main__":
    main()
