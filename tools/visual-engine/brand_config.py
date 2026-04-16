"""
Cals2Gains - Brand Configuration
=================================
Single source of truth for ALL visual output.
Extracted from theme.ts / Canva Brand Kit (kAHGZdocW3k).
Every module in the visual-engine MUST import from here.
"""

from pathlib import Path
import os

# -- Paths -----------------------------------------------------------------
ENGINE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = ENGINE_DIR.parent.parent          # .../Cals2Gains
FONTS_DIR = ENGINE_DIR / "fonts"
MUSIC_DIR = ENGINE_DIR / "music"
OUTPUT_DIR = ENGINE_DIR / "output"
LOGO_DARK = ENGINE_DIR / "C2G-Logo-Dark.png"    # Full logo (text + mark) on dark bg
LOGOMARK = ENGINE_DIR / "C2G-Logomark-2048.png" # Mark-only, square

# Ensure output dir exists
OUTPUT_DIR.mkdir(exist_ok=True)

# -- .env loader -----------------------------------------------------------
from dotenv import load_dotenv
load_dotenv(PROJECT_DIR / ".env")

OPENAI_API_KEY = os.getenv("EXPO_PUBLIC_OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
# Muapi API key (gratis en muapi.ai) — backend open-source de Higgsfield
MUAPI_API_KEY = os.getenv("MUAPI_API_KEY", "")
# Alias heredado para compatibilidad con código existente
HIGGSFIELD_API_KEY = MUAPI_API_KEY
HIGGSFIELD_DEFAULT_MODEL = "kling-v2.6-pro-t2v"

# -- Color Palette (from theme.ts) -----------------------------------------
class Colors:
    # Primary brand
    plum       = "#17121D"   # Carbon Plum - backgrounds
    violet     = "#9C8CFF"   # Soft Violet - primary accent
    coral      = "#FF6A4D"   # Signal Coral - secondary accent
    bone       = "#F7F2EA"   # Bone - text on dark

    # UI surfaces
    card       = "#1E1829"
    card_hover = "#2A2235"

    # Text
    text_primary   = "#F7F2EA"
    text_secondary = "rgba(247,242,234,0.6)"
    text_muted     = "rgba(247,242,234,0.35)"

    # Status
    success = "#4ADE80"
    warning = "#FBBF24"
    error   = "#F87171"

    # Macros (for data overlays)
    macro_protein = "#9C8CFF"
    macro_carbs   = "#F7F2EA"
    macro_fat     = "#FF6A4D"

    # Helpers - RGBA tuples for Pillow
    @staticmethod
    def hex_to_rgba(hex_color: str, alpha: int = 255) -> tuple:
        h = hex_color.lstrip("#")
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)

    # Pre-computed RGBA tuples
    PLUM_RGBA       = (23, 18, 29, 255)
    VIOLET_RGBA     = (156, 140, 255, 255)
    CORAL_RGBA      = (255, 106, 77, 255)
    BONE_RGBA       = (247, 242, 234, 255)
    SHADOW_RGBA     = (0, 0, 0, 180)

# -- Typography ------------------------------------------------------------
class Fonts:
    # Display / Headings
    display_family = "Outfit"
    display_bold   = FONTS_DIR / "Outfit-Bold.ttf"
    display_regular = FONTS_DIR / "Outfit-Regular.ttf"

    # Body / UI
    body_family    = "Instrument Sans"
    body_regular   = FONTS_DIR / "InstrumentSans-Regular.ttf"
    body_bold      = FONTS_DIR / "InstrumentSans-Bold.ttf"
    body_italic    = FONTS_DIR / "InstrumentSans-Italic.ttf"

    # Data / Numbers
    data_family    = "Geist Mono"
    data_regular   = FONTS_DIR / "GeistMono-Regular.ttf"
    data_bold      = FONTS_DIR / "GeistMono-Bold.ttf"

# -- Reel Canvas -----------------------------------------------------------
class Reel:
    WIDTH  = 1080
    HEIGHT = 1920
    SIZE   = (WIDTH, HEIGHT)
    FPS    = 30
    CODEC  = "libx264"
    AUDIO_CODEC = "aac"
    AUDIO_BITRATE = "192k"

    # Loudness targets
    TARGET_LUFS = -14.0
    MUSIC_DUCK_DB = -12  # dB reduction when voice is present

# -- Text Sizes (scaled for 1080x1920) — viral impersonal format 2026 -----
# Regla principal: el texto es el protagonista. Tamaños grandes, pesos 700-900.
class TextSizes:
    hook     = 110   # Título hook (pantalla completa, zoom-punch)
    hero     = 96    # Texto grande alternativo
    title    = 78    # Títulos escena value (pill coral)
    subtitle_active = 72   # Palabra karaoke activa (gold)
    subtitle_idle   = 60   # Palabras karaoke pasivas (bone)
    subtitle = 60    # Alias heredado
    body     = 44    # Texto cuerpo
    caption  = 32    # Captions / small text
    stat     = 180   # Números grandes / estadísticas
    cta      = 78    # Call-to-action text
    watermark = 28   # @cals2gains watermark

# -- Margins & Padding -----------------------------------------------------
class Layout:
    margin_x     = 60   # Horizontal margin
    margin_y     = 80   # Vertical margin
    padding      = 40   # General padding
    logo_size    = 120  # Logo overlay size (px height)
    logo_margin  = 40   # Logo distance from edge
    gradient_h   = 300  # Gradient bar height
    subtitle_y   = 1600 # Subtitle vertical position (from top)

# -- Title Animation -------------------------------------------------------
class TitleAnimation:
    STYLE = "slide_up"       # slide_up | scale_up | typewriter
    DURATION_S = 0.4         # Animation duration in seconds
    OFFSET_PX = 30           # Slide distance for slide_up
    EASING = "ease_out_cubic" # Easing function
    HOLD_S = None            # None = hold for entire scene duration

# -- Graphic Elements ------------------------------------------------------
class GraphicElements:
    # Corner accent lines
    CORNER_LINE_LENGTH = 40
    CORNER_LINE_WIDTH = 2
    CORNER_LINE_OPACITY = 0.20
    CORNER_LINE_COLOR = "#9C8CFF"  # Violet

    # Progress bar (bottom of frame)
    PROGRESS_BAR_HEIGHT = 3
    PROGRESS_BAR_COLOR = "#FF6A4D"  # Coral
    PROGRESS_BAR_BG_OPACITY = 0.15

    # Animated glow dot
    GLOW_DOT_SIZE = 10
    GLOW_DOT_COLOR = "#FF6A4D"
    GLOW_DOT_PULSE_PERIOD = 2.0   # Seconds for full breath cycle
    GLOW_DOT_MIN_SCALE = 0.8
    GLOW_DOT_MAX_SCALE = 1.2

    # Hook flash (scene 1)
    HOOK_FLASH_OPACITY = 0.15
    HOOK_FLASH_DURATION = 0.2

# -- Data Overlay Config ---------------------------------------------------
class DataOverlayConfig:
    # Card dimensions
    CARD_PADDING_X = 28
    CARD_PADDING_Y = 20
    CARD_CORNER_RADIUS = 16
    CARD_BG_OPACITY = 0.65
    CARD_BORDER_OPACITY = 0.25

    # Counter animation
    COUNTER_DURATION_S = 0.8   # Time to count from 0 to final value

    # Font sizes
    STAT_FONT_SIZE = 96
    LABEL_FONT_SIZE = 32

    # Timing
    FADE_IN_S = 0.3
    FADE_OUT_S = 0.2

    # Stacking
    STACK_GAP = 16

# -- Brand Prompt Suffix (appended to every AI image prompt) ---------------
BRAND_STYLE_SUFFIX = (
    "dark premium aesthetic, studio moody lighting, deep plum (#17121D) background "
    "with violet (#9C8CFF) color accents and warm coral (#FF6A4D) rim highlights, "
    "fitness and wellness mood, clean modern editorial composition, "
    "shot on Arri Alexa with anamorphic prime lens, shallow depth of field f/1.4, "
    "professional Hollywood color grading, 9:16 vertical format"
)

# Appended to every AI video prompt — defines the baseline visual quality bar.
# IMPORTANTE: reels impersonales son TEXT-FORWARD. El vídeo es B-roll bajo texto,
# por eso pedimos composición con espacio negativo (top-third y bottom-third oscuros).
BRAND_VIDEO_SUFFIX = (
    "cinematic 4K studio quality, dark premium aesthetic, "
    "deep plum and violet shadow tones, warm coral and gold rim highlights, "
    "shallow depth of field f/1.4, professional Hollywood color grade, "
    "ultra-modern black steel gym with violet LED strips "
    "OR high-end Calacatta marble kitchen with brushed brass hardware, "
    "slow intentional camera movement, "
    "composition leaves dark negative space in top-third and bottom-third for text overlay, "
    "no subject looking directly at camera, no dialogue, no mouth movement, "
    "B-roll style cinematic fitness content, Instagram Reels vertical 9:16"
)

# Hook scene — maximum visual impact, must stop the scroll in under 0.5 seconds.
# Text-forward: el vídeo bajo el hook necesita contraste alto pero NO competir con el texto.
BRAND_VIDEO_SUFFIX_HOOK = (
    "EXTREME VISUAL IMPACT: dramatic slow-motion macro close-up, "
    "single top-right key light creating deep shadow on the opposite side, "
    "violet rim light tracing the subject silhouette, "
    "ultra-shallow depth of field f/0.95, dark plum background with violet bokeh, "
    "focus on a single cinematic detail (hands lifting barbell, dumbbell hitting floor, "
    "protein powder dust cloud, water droplets on skin, sweat drop at 500fps), "
    "composition leaves dark empty center-vertical band for large text overlay, "
    "NO face in frame, NO mouth movement, pure abstract cinematic fitness B-roll, 9:16 vertical"
)

# CTA scene — warm, aspirational, invites engagement.
# Preferir flat-lays o still-life sobre personas mirando a cámara (evita competir con texto CTA).
BRAND_VIDEO_SUFFIX_CTA = (
    "elegant cinematic flat-lay OR macro still-life, cinematic 4K, "
    "smartphone showing fitness app next to dumbbells and protein jar on dark plum wood surface "
    "OR lifestyle shot of premium gym equipment with warm coral side-light, "
    "coral and gold warm tones, violet LED rim light, "
    "shallow depth of field, soft violet bokeh background, "
    "slow zoom-in toward phone screen, invites viewer action, "
    "editorial product lifestyle photography, NO face looking at camera, 9:16 vertical"
)
