"""
Generación de imágenes de fondo para slides del carrusel.

Cadena de prioridad:
  1. DALL-E 3 (OpenAI HD) — fotorrealista, alta fidelidad
  2. Fallback procedural — gradientes + bokeh numpy, sin API

DALL-E 3 genera 1024×1792 (portrait más cercano a 4:5).
Hacemos center-crop a 1080×1350 tras la descarga.
"""
from __future__ import annotations

import base64
import io
import logging
from pathlib import Path
from typing import Optional

import httpx
import numpy as np
from PIL import Image, ImageFilter

from brand_config import OPENAI_API_KEY, Colors, Carousel

log = logging.getLogger("carousel.imggen")


# ─────────────────────────────────────────────────────────────────────────────
# DALL-E 3
# ─────────────────────────────────────────────────────────────────────────────

def _center_crop(img: Image.Image, tw: int, th: int) -> Image.Image:
    """Escala y recorta el centro de la imagen al tamaño objetivo."""
    sw, sh = img.size
    if sw / sh > tw / th:
        # Más ancha: ajustar altura, recortar ancho
        new_h = th
        new_w = int(sw * th / sh)
    else:
        # Más alta: ajustar ancho, recortar alto
        new_w = tw
        new_h = int(sh * tw / sw)

    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - tw) // 2
    top  = (new_h - th) // 2
    return img.crop((left, top, left + tw, top + th))


def generate_dalle3(
    prompt: str,
    output_path: Path,
    quality: str = "hd",
) -> Path:
    """
    Genera una imagen de fondo con DALL-E 3 (tamaño 1024×1792, portrait).
    Hace center-crop a 1080×1350 y guarda como PNG.

    Coste aprox: $0.08 por imagen en calidad 'hd', $0.04 en 'standard'.
    """
    if not OPENAI_API_KEY:
        raise RuntimeError(
            "EXPO_PUBLIC_OPENAI_API_KEY no encontrada en el entorno. "
            "Asegúrate de que el archivo .env esté cargado."
        )

    # Sufijo de seguridad para evitar texto/logos en la imagen
    safe_suffix = (
        " Fotografía profesional editorial en orientación vertical portrait. "
        "Iluminación cinematográfica moody. Sin texto, sin logos, sin marcas de agua. "
        "Fondo oscuro atmosférico de alta calidad."
    )
    full_prompt = prompt.strip() + safe_suffix

    log.info("Llamando DALL-E 3 [%s] para: %.60s…", quality, prompt)

    resp = httpx.post(
        "https://api.openai.com/v1/images/generations",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model":           "dall-e-3",
            "prompt":          full_prompt,
            "n":               1,
            "size":            "1024x1792",
            "quality":         quality,
            "response_format": "b64_json",
        },
        timeout=120,
    )
    resp.raise_for_status()

    b64_data = resp.json()["data"][0]["b64_json"]
    raw = Image.open(io.BytesIO(base64.b64decode(b64_data))).convert("RGB")

    # Crop a 4:5 (1080×1350)
    img = _center_crop(raw, Carousel.WIDTH, Carousel.HEIGHT)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(output_path), "PNG", optimize=False)

    size_kb = output_path.stat().st_size // 1024
    log.info("Imagen guardada → %s (%d KB)", output_path.name, size_kb)
    return output_path


# ─────────────────────────────────────────────────────────────────────────────
# Fondos procedurales (fallback sin API)
# ─────────────────────────────────────────────────────────────────────────────

# Temas de gradiente por tipo de slide
_GRAD_THEMES: dict[str, list[tuple[float, tuple[int, int, int]]]] = {
    "cover": [
        (0.0, (18, 14, 24)),
        (0.6, (30, 20, 42)),
        (1.0, Colors.dark_rgb),
    ],
    "myth": [
        (0.0, Colors.dark_rgb),
        (0.4, (65, 22, 22)),
        (1.0, (85, 28, 18)),
    ],
    "reality": [
        (0.0, Colors.dark_rgb),
        (0.5, (22, 40, 68)),
        (1.0, (15, 35, 60)),
    ],
    "science": [
        (0.0, (18, 14, 32)),
        (0.5, (35, 28, 72)),
        (1.0, (25, 20, 55)),
    ],
    "stats": [
        (0.0, Colors.dark_rgb),
        (0.4, (28, 24, 56)),
        (1.0, (20, 16, 48)),
    ],
    "quote": [
        (0.0, Colors.dark_rgb),
        (0.5, (52, 44, 8)),
        (1.0, (62, 52, 10)),
    ],
    "educational": [
        (0.0, Colors.dark_rgb),
        (0.4, (12, 44, 62)),
        (1.0, (10, 38, 55)),
    ],
    "practical": [
        (0.0, Colors.dark_rgb),
        (0.5, (55, 24, 18)),
        (1.0, (70, 28, 18)),
    ],
    "cta": [
        (0.0, (48, 18, 14)),
        (0.5, (35, 25, 65)),
        (1.0, Colors.dark_rgb),
    ],
    "default": [
        (0.0, Colors.dark_rgb),
        (1.0, (38, 30, 52)),
    ],
}


def _interp_stops(
    stops: list[tuple[float, tuple[int, int, int]]],
    t: float,
) -> tuple[float, float, float]:
    """Interpola entre paradas de gradiente multi-stop."""
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t0 <= t <= t1:
            f = (t - t0) / max(t1 - t0, 1e-6)
            return tuple(c0[j] + f * (c1[j] - c0[j]) for j in range(3))
    return tuple(float(c) for c in stops[-1][1])


def _add_bokeh(
    arr: np.ndarray,
    W: int,
    H: int,
    accent_rgb: tuple[int, int, int],
    rng: np.random.Generator,
    n_glows: int = 4,
) -> None:
    """Añade manchas de luz (bokeh) difusas al array numpy."""
    for _ in range(n_glows):
        cx = rng.uniform(0.05, 0.95)
        cy = rng.uniform(0.05, 0.95)
        radius = rng.uniform(80, 320)
        intensity = rng.uniform(0.04, 0.12)

        ys, xs = np.mgrid[0:H, 0:W]
        dist = np.sqrt((xs - cx * W) ** 2 + (ys - cy * H) ** 2)
        mask = np.exp(-0.5 * (dist / radius) ** 2) * intensity

        for c, val in enumerate(accent_rgb):
            arr[:, :, c] = np.clip(arr[:, :, c] + mask * val, 0, 255)


def generate_procedural(
    slide_type: str = "content",
    accent_color: str = "coral",
    slide_num: int = 1,
    total_slides: int = 8,
    add_bokeh: bool = True,
    add_grain: bool = True,
    output_path: Optional[Path] = None,
) -> Image.Image:
    """
    Genera un fondo de alta calidad mediante gradientes + bokeh + grano.
    No requiere ninguna API. Siempre devuelve Image 1080×1350 RGBA.
    Si se proporciona output_path, también guarda el PNG.
    """
    W, H = Carousel.SIZE
    stops = _GRAD_THEMES.get(slide_type, _GRAD_THEMES["default"])

    # Gradiente vertical base
    arr = np.zeros((H, W, 3), dtype=np.float32)
    for y in range(H):
        color = _interp_stops(stops, y / H)
        arr[y, :] = color

    # Bokeh con semilla determinista (reproducible por número de slide)
    rng = np.random.default_rng(seed=slide_num * 137 + 42)
    accent_rgb = Colors.ACCENT_RGB.get(accent_color, Colors.coral_rgb)
    if add_bokeh:
        _add_bokeh(arr, W, H, accent_rgb, rng, n_glows=rng.integers(3, 6))

    arr = np.clip(arr, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr).convert("RGBA")

    # Suavizado
    img = img.filter(ImageFilter.GaussianBlur(radius=1.0))

    # Grano cinematográfico
    if add_grain:
        arr2 = np.array(img, dtype=np.float32)
        grain = np.random.normal(0, 5.5, (H, W))
        for c in range(3):
            arr2[:, :, c] = np.clip(arr2[:, :, c] + grain, 0, 255)
        img = Image.fromarray(arr2.astype(np.uint8))

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(str(output_path), "PNG", optimize=False)

    return img.convert("RGBA")


# ─────────────────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────────────────

def get_background(
    prompt: Optional[str],
    slide_type: str,
    accent_color: str,
    slide_num: int,
    total_slides: int,
    output_path: Path,
    use_ai: bool = True,
) -> Image.Image:
    """
    Obtiene o genera el fondo de un slide.

    Intenta DALL-E 3 primero si use_ai=True y hay prompt.
    Cae a procedural ante cualquier error de API.
    Siempre devuelve Image RGBA 1080×1350.
    """
    if use_ai and prompt and OPENAI_API_KEY:
        try:
            generate_dalle3(prompt, output_path)
            return Image.open(str(output_path)).convert("RGBA")
        except Exception as exc:
            log.warning(
                "DALL-E 3 falló (%s) — usando fondo procedural para slide %d",
                exc,
                slide_num,
            )

    img = generate_procedural(
        slide_type=slide_type,
        accent_color=accent_color,
        slide_num=slide_num,
        total_slides=total_slides,
        output_path=output_path,
    )
    return img
