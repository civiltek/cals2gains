"""
Configuración de marca para el motor de carruseles Cals2Gains.
Fuente de verdad única: colores, tipografías, dimensiones y rutas de assets.
"""
from __future__ import annotations

import os
from pathlib import Path

# ── Rutas base ────────────────────────────────────────────────────────────────
ENGINE_DIR = Path(__file__).parent.resolve()


def _find_project_root() -> Path:
    """
    Sube el árbol de directorios buscando el .env del proyecto.
    Funciona tanto en el worktree (.claude/worktrees/frosty-antonelli/…)
    como en la instalación principal (Cals2Gains/tools/carousel-engine/).
    """
    candidate = ENGINE_DIR
    for _ in range(8):
        if (candidate / ".env").exists() and (candidate / "marketing").exists():
            return candidate
        candidate = candidate.parent
    # Fallback: dos niveles arriba (comportamiento original)
    return ENGINE_DIR.parent.parent


REPO_ROOT = _find_project_root()
BRAND_DIR = REPO_ROOT / "marketing" / "brand_temp"
OUTPUT_DIR = ENGINE_DIR / "output"
SPECS_DIR  = ENGINE_DIR / "specs"

OUTPUT_DIR.mkdir(exist_ok=True)
SPECS_DIR.mkdir(exist_ok=True)

# Cargar .env tan pronto como encontremos el root (antes de leer las API keys)
_env_file = REPO_ROOT / ".env"
if _env_file.exists():
    try:
        from dotenv import load_dotenv as _load_dotenv
        _load_dotenv(str(_env_file), override=False)
    except ImportError:
        pass  # python-dotenv no instalado; las vars deben estar ya en el entorno

# ── Dimensiones del canvas ────────────────────────────────────────────────────
class Carousel:
    WIDTH  = 1080
    HEIGHT = 1350
    SIZE   = (1080, 1350)
    FORMAT = "PNG"

    # Márgenes seguros (px desde el borde)
    MARGIN_H = 72    # horizontal (lados)
    MARGIN_V = 88    # vertical (superior)
    CONTENT_W = WIDTH - 2 * MARGIN_H   # 936 px

    # Elementos de identidad visual
    LOGO_W          = 180   # Logo completo en slides
    LOGOMARK_SIZE   = 52    # Marca pequeña en esquina
    DOT_RADIUS      = 6     # Radio de puntos de indicador de slide
    DOT_GAP         = 16    # Separación entre puntos
    ACCENT_BAR_H    = 5     # Alto de barra de acento

    # Zonas verticales (px desde arriba)
    ZONE_HANDLE     = 72    # @handle y nro de página
    ZONE_LABEL      = 168   # Píldora de etiqueta
    ZONE_HEADLINE   = 295   # Headline principal
    ZONE_BODY       = 720   # Texto secundario / datos
    ZONE_FOOTER     = 1238  # Indicadores + logo
    ZONE_DOTS       = 1262
    ZONE_LOGO       = 1288


# ── Paleta de colores ─────────────────────────────────────────────────────────
class Colors:
    # Primarios
    dark   = "#17121D"   # Carbon Plum – fondo
    violet = "#9C8CFF"   # Soft Violet – acento principal
    coral  = "#FF6A4D"   # Signal Coral – acento secundario
    bone   = "#F7F2EA"   # Bone – texto sobre oscuro
    orange = "#FF9800"
    gold   = "#FFD700"

    # RGB (para Pillow / numpy)
    dark_rgb   = (23,  18,  29)
    violet_rgb = (156, 140, 255)
    coral_rgb  = (255, 106,  77)
    bone_rgb   = (247, 242, 234)
    orange_rgb = (255, 152,   0)
    gold_rgb   = (255, 215,   0)

    # Mapa por nombre de acento
    ACCENT_RGB: dict[str, tuple[int, int, int]] = {
        "coral":  (255, 106,  77),
        "violet": (156, 140, 255),
        "gold":   (255, 215,   0),
        "orange": (255, 152,   0),
    }

    @staticmethod
    def hex_to_rgb(h: str) -> tuple[int, int, int]:
        h = h.lstrip("#")
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

    @staticmethod
    def hex_to_rgba(h: str, a: int = 255) -> tuple[int, int, int, int]:
        r, g, b = Colors.hex_to_rgb(h)
        return (r, g, b, a)


# ── Tipografía ────────────────────────────────────────────────────────────────
class Fonts:
    # Outfit — headlines y display (voz principal de marca)
    display_bold    = BRAND_DIR / "Outfit-Bold.ttf"
    display_regular = BRAND_DIR / "Outfit-Regular.ttf"
    # Instrument Sans — body y captions
    body_bold       = BRAND_DIR / "InstrumentSans-Bold.ttf"
    body_regular    = BRAND_DIR / "InstrumentSans-Regular.ttf"

    @classmethod
    def check(cls) -> list[str]:
        missing = []
        for name in ("display_bold", "display_regular", "body_bold", "body_regular"):
            p: Path = getattr(cls, name)
            if not p.exists():
                missing.append(str(p))
        return missing


# ── Escala tipográfica (px a 72 DPI, canvas de 1080 px) ─────────────────────
class TypeScale:
    hero     = 94   # Portadas, estadísticas grandes
    display  = 72   # Headlines principales
    title    = 56   # Títulos de sección
    subtitle = 42   # Subtítulos, pull quotes
    body     = 34   # Cuerpo de texto
    caption  = 27   # Etiquetas, captions
    micro    = 22   # Footer, handles


# ── Assets de marca ───────────────────────────────────────────────────────────
class Assets:
    logo_dark  = BRAND_DIR / "C2G-Logo-Dark.png"
    logo_light = BRAND_DIR / "C2G-Logo-Light.png"
    logomark   = BRAND_DIR / "C2G-Logomark-2048.png"
    logomark_sm= BRAND_DIR / "C2G-Mark-512.png"

    @classmethod
    def check(cls) -> list[str]:
        missing = []
        for name in ("logo_dark", "logo_light", "logomark", "logomark_sm"):
            p: Path = getattr(cls, name)
            if not p.exists():
                missing.append(str(p))
        return missing


# ── Credenciales API ──────────────────────────────────────────────────────────
OPENAI_API_KEY = (
    os.getenv("EXPO_PUBLIC_OPENAI_API_KEY") or
    os.getenv("OPENAI_API_KEY", "")
)
MUAPI_API_KEY  = (
    os.getenv("MUAPI_API_KEY") or
    os.getenv("MUAPI_KEY", "")
)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID", "")
