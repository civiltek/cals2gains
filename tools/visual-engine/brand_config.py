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

# -- Text Sizes (scaled for 1080x1920) ------------------------------------
class TextSizes:
    hero     = 96    # Big hook text
    title    = 72    # Scene titles
    subtitle = 48    # Subtitles / descriptions
    body     = 36    # Body text
    caption  = 28    # Captions / small text
    stat     = 120   # Big numbers / statistics
    cta      = 56    # Call-to-action text
    watermark = 24   # @cals2gains watermark

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
    "Dark premium aesthetic, moody lighting, deep plum (#17121D) and violet (#9C8CFF) "
    "color accents, fitness/wellness mood, clean modern composition, "
    "cinematic quality, shot on RED camera look, shallow depth of field, "
    "professional color grading with warm coral (#FF6A4D) highlights"
)

BRAND_VIDEO_SUFFIX = (
    "Cinematic 4K quality, smooth camera movement, dark premium aesthetic, "
    "moody gym/fitness lighting, deep plum and violet color palette, "
    "professional color grading, shallow depth of field, "
    "fitness influencer production quality, Instagram Reels style"
)
