"""
Cals2Gains - Post-Processing Pipeline v1.0
============================================
Cinema-grade post-processing for images and video frames.
Transforms raw AI output into professional studio-quality visuals.

Effects:
- Cinematic color grading (lift/gamma/gain, film emulation)
- Vignette (natural lens falloff)
- Film grain (organic texture)
- Sharpening (selective high-pass)
- Bloom / glow (highlight bleed)
- Contrast curves (S-curve, filmic)
- Color temperature shift
- Chromatic aberration (subtle, for cinematic feel)

All functions accept and return PIL Images or numpy arrays
for seamless integration with the video pipeline.
"""

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from typing import Literal

from brand_config import Colors


# ═══════════════════════════════════════════════════════════════════════════
# CINEMATIC COLOR GRADING
# ═══════════════════════════════════════════════════════════════════════════

def color_grade(
    image: Image.Image,
    preset: Literal[
        "cals2gains", "dark_cinematic", "warm_fitness",
        "cool_tech", "moody_violet", "high_contrast",
    ] = "cals2gains",
) -> Image.Image:
    """Apply cinematic color grading using lift/gamma/gain adjustments.

    Presets are tuned for fitness/nutrition content on the
    Cals2Gains dark premium aesthetic.
    """
    img = np.array(image.convert("RGB")).astype(np.float32) / 255.0

    presets = {
        "cals2gains": {
            # Signature look: deep plum shadows, violet mids, warm coral highlights
            "lift": np.array([0.02, 0.01, 0.04]),      # Push shadows toward plum
            "gamma": np.array([0.98, 0.96, 1.04]),      # Mids: slight violet shift
            "gain": np.array([1.02, 0.98, 0.96]),        # Highlights: warm coral
            "saturation": 1.10,
            "contrast": 1.08,
        },
        "dark_cinematic": {
            "lift": np.array([0.01, 0.01, 0.03]),
            "gamma": np.array([0.95, 0.95, 1.02]),
            "gain": np.array([1.05, 1.00, 0.95]),
            "saturation": 0.90,
            "contrast": 1.15,
        },
        "warm_fitness": {
            "lift": np.array([0.03, 0.01, 0.00]),
            "gamma": np.array([1.02, 0.99, 0.96]),
            "gain": np.array([1.05, 1.00, 0.92]),
            "saturation": 1.15,
            "contrast": 1.10,
        },
        "cool_tech": {
            "lift": np.array([0.00, 0.01, 0.04]),
            "gamma": np.array([0.96, 0.99, 1.03]),
            "gain": np.array([0.95, 1.00, 1.05]),
            "saturation": 0.95,
            "contrast": 1.12,
        },
        "moody_violet": {
            # Heavily pushed toward brand violet
            "lift": np.array([0.03, 0.01, 0.06]),
            "gamma": np.array([0.97, 0.94, 1.06]),
            "gain": np.array([1.00, 0.96, 1.02]),
            "saturation": 1.05,
            "contrast": 1.12,
        },
        "high_contrast": {
            "lift": np.array([0.00, 0.00, 0.00]),
            "gamma": np.array([1.00, 1.00, 1.00]),
            "gain": np.array([1.00, 1.00, 1.00]),
            "saturation": 1.20,
            "contrast": 1.25,
        },
    }

    p = presets.get(preset, presets["cals2gains"])

    # Lift/Gamma/Gain (standard color grading model)
    # output = gain * (gamma * (input + lift))
    img = img + p["lift"]
    img = np.power(np.clip(img, 0, 1), 1.0 / p["gamma"])
    img = img * p["gain"]
    img = np.clip(img, 0, 1)

    result = Image.fromarray((img * 255).astype(np.uint8))

    # Saturation
    if p["saturation"] != 1.0:
        result = ImageEnhance.Color(result).enhance(p["saturation"])

    # Contrast
    if p["contrast"] != 1.0:
        result = ImageEnhance.Contrast(result).enhance(p["contrast"])

    return result


# ═══════════════════════════════════════════════════════════════════════════
# S-CURVE CONTRAST
# ═══════════════════════════════════════════════════════════════════════════

def apply_s_curve(
    image: Image.Image,
    strength: float = 0.5,
) -> Image.Image:
    """Apply an S-curve for filmic contrast.

    Crushes blacks and rolls off highlights naturally,
    avoiding the harsh clipping of linear contrast.
    """
    img = np.array(image.convert("RGB")).astype(np.float32) / 255.0

    # Attempt sigmoidal contrast: more strength = steeper S-curve
    midpoint = 0.5
    k = 4.0 + strength * 8.0  # steepness
    img = 1.0 / (1.0 + np.exp(-k * (img - midpoint)))

    # Re-normalize to ensure full range
    img = (img - img.min()) / (img.max() - img.min() + 1e-8)

    return Image.fromarray((img * 255).astype(np.uint8))


# ═══════════════════════════════════════════════════════════════════════════
# VIGNETTE
# ═══════════════════════════════════════════════════════════════════════════

def add_vignette(
    image: Image.Image,
    strength: float = 0.4,
    radius: float = 0.85,
) -> Image.Image:
    """Add a natural lens vignette (darkened corners).

    Args:
        strength: 0.0 = no vignette, 1.0 = heavy vignette
        radius: Size of the bright center (0.5 = tight, 1.0 = wide)
    """
    w, h = image.size
    img = np.array(image.convert("RGB")).astype(np.float32)

    # Create radial gradient
    Y, X = np.ogrid[:h, :w]
    cx, cy = w / 2, h / 2
    # Normalized distance from center (elliptical for non-square)
    dist = np.sqrt(((X - cx) / (w / 2)) ** 2 + ((Y - cy) / (h / 2)) ** 2)

    # Smooth falloff using cosine
    mask = np.clip((dist - radius) / (1.0 - radius + 1e-8), 0, 1)
    mask = 0.5 * (1 - np.cos(mask * np.pi))  # smooth cosine falloff
    vignette = 1.0 - strength * mask[:, :, np.newaxis]

    result = (img * vignette).clip(0, 255).astype(np.uint8)
    return Image.fromarray(result)


# ═══════════════════════════════════════════════════════════════════════════
# FILM GRAIN
# ═══════════════════════════════════════════════════════════════════════════

def add_film_grain(
    image: Image.Image,
    intensity: float = 0.03,
    grain_size: int = 1,
) -> Image.Image:
    """Add organic film grain texture.

    Args:
        intensity: 0.0 = none, 0.05 = subtle, 0.15 = heavy
        grain_size: 1 = fine (35mm), 2 = medium (16mm), 3+ = coarse
    """
    img = np.array(image.convert("RGB")).astype(np.float32)
    h, w = img.shape[:2]

    if grain_size > 1:
        gh, gw = h // grain_size, w // grain_size
        grain = np.random.normal(0, 1, (gh, gw, 1)).astype(np.float32)
        grain = np.array(Image.fromarray(
            ((grain + 3) / 6 * 255).clip(0, 255).astype(np.uint8)[:, :, 0]
        ).resize((w, h), Image.BILINEAR)).astype(np.float32)
        grain = (grain / 255.0 - 0.5) * 2
        grain = grain[:, :, np.newaxis]
    else:
        grain = np.random.normal(0, 1, (h, w, 1)).astype(np.float32)

    # Apply grain: brighter areas get less grain (natural film response)
    luminance = (0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]) / 255.0
    grain_mask = 1.0 - 0.5 * luminance  # Darker areas = more grain
    grain_mask = grain_mask[:, :, np.newaxis]

    result = img + grain * intensity * 255.0 * grain_mask
    return Image.fromarray(result.clip(0, 255).astype(np.uint8))


# ═══════════════════════════════════════════════════════════════════════════
# BLOOM / HIGHLIGHT GLOW
# ═══════════════════════════════════════════════════════════════════════════

def add_bloom(
    image: Image.Image,
    threshold: float = 0.7,
    intensity: float = 0.3,
    radius: int = 40,
) -> Image.Image:
    """Add bloom/glow to bright areas (highlight bleed).

    Creates that premium cinematic look where bright areas
    softly bleed into surrounding pixels.
    """
    img = np.array(image.convert("RGB")).astype(np.float32) / 255.0

    # Extract bright areas
    luminance = 0.299 * img[:, :, 0] + 0.587 * img[:, :, 1] + 0.114 * img[:, :, 2]
    bright_mask = np.clip((luminance - threshold) / (1.0 - threshold + 1e-8), 0, 1)
    bright_mask = bright_mask[:, :, np.newaxis]

    bright = img * bright_mask

    # Blur the bright areas
    bright_img = Image.fromarray((bright * 255).astype(np.uint8))
    blurred = bright_img.filter(ImageFilter.GaussianBlur(radius=radius))
    blurred_arr = np.array(blurred).astype(np.float32) / 255.0

    # Additive blend
    result = img + blurred_arr * intensity
    return Image.fromarray((result.clip(0, 1) * 255).astype(np.uint8))


# ═══════════════════════════════════════════════════════════════════════════
# SHARPENING (HIGH-PASS)
# ═══════════════════════════════════════════════════════════════════════════

def sharpen(
    image: Image.Image,
    amount: float = 0.5,
    radius: int = 2,
) -> Image.Image:
    """Selective high-pass sharpening.

    Args:
        amount: 0.0 = none, 0.5 = subtle, 1.0 = strong
        radius: Blur radius for high-pass extraction
    """
    img = np.array(image.convert("RGB")).astype(np.float32)
    blurred = np.array(
        image.filter(ImageFilter.GaussianBlur(radius=radius))
    ).astype(np.float32)

    # High-pass = original - blurred
    high_pass = img - blurred

    # Add back scaled high-pass
    result = img + high_pass * amount
    return Image.fromarray(result.clip(0, 255).astype(np.uint8))


# ═══════════════════════════════════════════════════════════════════════════
# COLOR TEMPERATURE
# ═══════════════════════════════════════════════════════════════════════════

def adjust_temperature(
    image: Image.Image,
    warmth: float = 0.0,
) -> Image.Image:
    """Shift color temperature.

    Args:
        warmth: -1.0 = cool (blue), 0.0 = neutral, 1.0 = warm (orange)
    """
    img = np.array(image.convert("RGB")).astype(np.float32)

    # Warm: boost red, reduce blue. Cool: opposite.
    shift = warmth * 15.0
    img[:, :, 0] = np.clip(img[:, :, 0] + shift, 0, 255)       # Red
    img[:, :, 2] = np.clip(img[:, :, 2] - shift * 0.7, 0, 255)  # Blue

    return Image.fromarray(img.astype(np.uint8))


# ═══════════════════════════════════════════════════════════════════════════
# CHROMATIC ABERRATION (subtle)
# ═══════════════════════════════════════════════════════════════════════════

def chromatic_aberration(
    image: Image.Image,
    shift_px: int = 2,
) -> Image.Image:
    """Add subtle chromatic aberration (RGB channel offset).

    Simulates real lens behavior — more shift toward edges.
    Very subtle shift_px (1-3) adds premium cinematic feel.
    """
    img = np.array(image.convert("RGB"))
    h, w = img.shape[:2]
    result = img.copy()

    # Shift red channel outward, blue inward
    if shift_px > 0:
        # Red: shift right
        result[:, shift_px:, 0] = img[:, :-shift_px, 0]
        # Blue: shift left
        result[:, :-shift_px, 2] = img[:, shift_px:, 2]

    return Image.fromarray(result)


# ═══════════════════════════════════════════════════════════════════════════
# FULL STUDIO PIPELINE
# ═══════════════════════════════════════════════════════════════════════════

def studio_grade(
    image: Image.Image,
    preset: str = "cals2gains",
    vignette_strength: float = 0.35,
    grain_intensity: float = 0.025,
    bloom_intensity: float = 0.2,
    sharpen_amount: float = 0.3,
) -> Image.Image:
    """Apply the full professional studio post-processing pipeline.

    This is the standard pipeline for all Cals2Gains visual output.
    Transforms AI-generated images into cinema-quality branded visuals.

    Pipeline order:
    1. Color grading (lift/gamma/gain + saturation/contrast)
    2. S-curve contrast (filmic roll-off)
    3. Bloom (highlight glow)
    4. Vignette (lens falloff)
    5. Film grain (organic texture)
    6. Final sharpen (crisp details)
    """
    result = image.convert("RGB")

    # 1. Color grade
    result = color_grade(result, preset=preset)

    # 2. Gentle S-curve
    result = apply_s_curve(result, strength=0.25)

    # 3. Bloom on highlights
    if bloom_intensity > 0:
        result = add_bloom(result, intensity=bloom_intensity, threshold=0.72)

    # 4. Vignette
    if vignette_strength > 0:
        result = add_vignette(result, strength=vignette_strength)

    # 5. Film grain
    if grain_intensity > 0:
        result = add_film_grain(result, intensity=grain_intensity)

    # 6. Final sharpen
    if sharpen_amount > 0:
        result = sharpen(result, amount=sharpen_amount)

    return result


def studio_grade_frame(
    frame_array: np.ndarray,
    preset: str = "cals2gains",
    vignette_strength: float = 0.30,
    grain_intensity: float = 0.02,
    bloom_intensity: float = 0.15,
    sharpen_amount: float = 0.25,
) -> np.ndarray:
    """Apply studio post-processing to a video frame (numpy array).

    Lighter settings than static images for smoother video playback.
    Grain uses a lower intensity to avoid flicker between frames.
    """
    img = Image.fromarray(frame_array)
    result = studio_grade(
        img, preset=preset,
        vignette_strength=vignette_strength,
        grain_intensity=grain_intensity,
        bloom_intensity=bloom_intensity,
        sharpen_amount=sharpen_amount,
    )
    return np.array(result)


# ═══════════════════════════════════════════════════════════════════════════
# QUICK PRESETS FOR DIFFERENT CONTENT TYPES
# ═══════════════════════════════════════════════════════════════════════════

def grade_reel_frame(frame_array: np.ndarray) -> np.ndarray:
    """Optimized post-processing for reel video frames."""
    return studio_grade_frame(
        frame_array, preset="cals2gains",
        vignette_strength=0.25, grain_intensity=0.015,
        bloom_intensity=0.15, sharpen_amount=0.2,
    )


def grade_carousel_slide(image: Image.Image) -> Image.Image:
    """Optimized post-processing for carousel slides."""
    return studio_grade(
        image, preset="cals2gains",
        vignette_strength=0.30, grain_intensity=0.025,
        bloom_intensity=0.20, sharpen_amount=0.35,
    )


def grade_story_image(image: Image.Image) -> Image.Image:
    """Optimized post-processing for Instagram stories."""
    return studio_grade(
        image, preset="warm_fitness",
        vignette_strength=0.40, grain_intensity=0.03,
        bloom_intensity=0.25, sharpen_amount=0.3,
    )


if __name__ == "__main__":
    from brand_config import OUTPUT_DIR, Reel

    # Test with a gradient image
    w, h = Reel.SIZE
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    # Create a branded test gradient
    for y in range(h):
        t = y / h
        arr[y, :, 0] = int(23 + (255 - 23) * t * 0.7)   # R: plum -> coral
        arr[y, :, 1] = int(18 + (106 - 18) * t * 0.5)    # G
        arr[y, :, 2] = int(29 + (77 - 29) * t * 0.3)     # B

    test_img = Image.fromarray(arr)

    # Test each effect
    color_grade(test_img, "cals2gains").save(str(OUTPUT_DIR / "pp_colorgrade.png"))
    add_vignette(test_img, 0.5).save(str(OUTPUT_DIR / "pp_vignette.png"))
    add_film_grain(test_img, 0.05).save(str(OUTPUT_DIR / "pp_grain.png"))
    add_bloom(test_img, intensity=0.4).save(str(OUTPUT_DIR / "pp_bloom.png"))
    studio_grade(test_img).save(str(OUTPUT_DIR / "pp_studio_full.png"))

    print(f"[PostProc] Test images saved to {OUTPUT_DIR}")
