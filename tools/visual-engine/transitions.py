"""
Cals2Gains - Professional Transitions v1.0
=============================================
Cinema-grade scene transitions for reel composition.

Available transitions:
- crossfade: Standard opacity crossfade (smooth, safe)
- zoom_cut: Quick zoom-in to cut point (top performer 2026)
- whip_pan: Horizontal motion blur wipe (high energy)
- luma_fade: Fade through luminance (shadows first)
- flash_white: Quick flash to white (data reveals)
- directional_wipe: Soft directional wipe (left/right/up/down)
- zoom_punch_in: Zoom punch into next scene
- fade_black: Standard fade through black

All transition functions take two numpy frame arrays (outgoing, incoming)
and a progress value (0.0 = fully outgoing, 1.0 = fully incoming).
Returns a blended numpy frame array.
"""

import numpy as np
from PIL import Image, ImageFilter
from typing import Literal


TransitionType = Literal[
    "crossfade", "zoom_cut", "whip_pan", "luma_fade",
    "flash_white", "directional_wipe", "zoom_punch_in",
    "fade_black", "cut",
]


def blend_transition(
    frame_out: np.ndarray,
    frame_in: np.ndarray,
    progress: float,
    transition: TransitionType = "crossfade",
    direction: str = "left",
) -> np.ndarray:
    """Apply a transition between two frames.

    Args:
        frame_out: Outgoing scene frame (RGB uint8 numpy array)
        frame_in: Incoming scene frame (RGB uint8 numpy array)
        progress: 0.0 = fully outgoing, 1.0 = fully incoming
        transition: Transition type
        direction: Direction for directional transitions
    """
    progress = float(np.clip(progress, 0.0, 1.0))

    if transition == "cut":
        return frame_in if progress >= 0.5 else frame_out
    elif transition == "crossfade":
        return _crossfade(frame_out, frame_in, progress)
    elif transition == "zoom_cut":
        return _zoom_cut(frame_out, frame_in, progress)
    elif transition == "whip_pan":
        return _whip_pan(frame_out, frame_in, progress, direction)
    elif transition == "luma_fade":
        return _luma_fade(frame_out, frame_in, progress)
    elif transition == "flash_white":
        return _flash_white(frame_out, frame_in, progress)
    elif transition == "directional_wipe":
        return _directional_wipe(frame_out, frame_in, progress, direction)
    elif transition == "zoom_punch_in":
        return _zoom_punch_in(frame_out, frame_in, progress)
    elif transition == "fade_black":
        return _fade_black(frame_out, frame_in, progress)
    else:
        return _crossfade(frame_out, frame_in, progress)


# ═══════════════════════════════════════════════════════════════════════════
# EASING FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def _ease_in_out_cubic(t: float) -> float:
    """Cubic ease-in-out for smooth transitions."""
    if t < 0.5:
        return 4 * t * t * t
    return 1 - (-2 * t + 2) ** 3 / 2


def _ease_in_quad(t: float) -> float:
    return t * t


def _ease_out_quad(t: float) -> float:
    return 1 - (1 - t) ** 2


def _ease_out_expo(t: float) -> float:
    return 1.0 if t >= 1.0 else 1 - 2 ** (-10 * t)


# ═══════════════════════════════════════════════════════════════════════════
# TRANSITION IMPLEMENTATIONS
# ═══════════════════════════════════════════════════════════════════════════

def _crossfade(out: np.ndarray, inp: np.ndarray, t: float) -> np.ndarray:
    """Standard crossfade with eased timing."""
    t = _ease_in_out_cubic(t)
    return (out.astype(np.float32) * (1 - t) + inp.astype(np.float32) * t).astype(np.uint8)


def _zoom_cut(out: np.ndarray, inp: np.ndarray, t: float) -> np.ndarray:
    """Zoom into outgoing frame, then cut to incoming.

    Top-performing transition for fitness content (2026).
    Creates a punchy, energetic feel.
    """
    cut_point = 0.55  # Cut slightly past midpoint for impact

    if t < cut_point:
        # Zoom into outgoing frame
        zoom_t = _ease_in_quad(t / cut_point)
        scale = 1.0 + zoom_t * 0.35  # Zoom up to 135%
        return _zoom_frame(out, scale)
    else:
        # Incoming frame fades in from slight zoom
        fade_t = _ease_out_expo((t - cut_point) / (1 - cut_point))
        scale = 1.08 - 0.08 * fade_t  # 108% -> 100%
        zoomed = _zoom_frame(inp, scale)
        # Brief opacity blend at the cut point
        if t < cut_point + 0.1:
            blend = (t - cut_point) / 0.1
            return (out.astype(np.float32) * (1 - blend) + zoomed.astype(np.float32) * blend).astype(np.uint8)
        return zoomed


def _whip_pan(out: np.ndarray, inp: np.ndarray, t: float, direction: str = "left") -> np.ndarray:
    """Horizontal motion blur whip pan.

    Simulates a fast camera pan — outgoing blurs and slides out,
    incoming slides in from the opposite side with blur.
    """
    h, w = out.shape[:2]
    t_eased = _ease_in_out_cubic(t)

    # Motion blur intensity peaks at midpoint
    blur_amount = int(30 * (1 - abs(2 * t - 1)))  # 0 -> 30 -> 0

    if direction == "left":
        offset = int(w * t_eased)
    else:
        offset = int(-w * t_eased)

    canvas = np.zeros_like(out)

    # Place outgoing frame (sliding out)
    if direction == "left":
        if w - offset > 0:
            canvas[:, :max(0, w - offset)] = out[:, min(w, offset):]
    else:
        abs_off = abs(offset)
        if w - abs_off > 0:
            canvas[:, min(w, abs_off):] = out[:, :max(0, w - abs_off)]

    # Place incoming frame (sliding in)
    if direction == "left":
        if offset > 0:
            canvas[:, max(0, w - offset):] = inp[:, :min(w, offset)]
    else:
        abs_off = abs(offset)
        if abs_off > 0:
            canvas[:, :min(w, abs_off)] = inp[:, max(0, w - abs_off):]

    # Apply directional motion blur
    if blur_amount > 1:
        pil = Image.fromarray(canvas)
        # Horizontal motion blur via box blur
        kernel_w = blur_amount * 2 + 1
        pil = pil.filter(ImageFilter.BoxBlur(blur_amount // 2))
        canvas = np.array(pil)

    return canvas


def _luma_fade(out: np.ndarray, inp: np.ndarray, t: float) -> np.ndarray:
    """Fade through luminance — shadows transition first, highlights last.

    Creates an organic, cinematic dissolve effect.
    """
    t = _ease_in_out_cubic(t)

    out_f = out.astype(np.float32) / 255.0
    inp_f = inp.astype(np.float32) / 255.0

    # Calculate luminance of outgoing frame
    luma = 0.299 * out_f[:, :, 0] + 0.587 * out_f[:, :, 1] + 0.114 * out_f[:, :, 2]

    # Create per-pixel transition progress based on luminance
    # Dark areas transition first (t spreads from 0 upward)
    threshold = t * 1.4  # Slightly over-range for smooth completion
    blend = np.clip((threshold - luma) / 0.3, 0, 1)
    blend = blend[:, :, np.newaxis]

    result = out_f * (1 - blend) + inp_f * blend
    return (result * 255).clip(0, 255).astype(np.uint8)


def _flash_white(out: np.ndarray, inp: np.ndarray, t: float) -> np.ndarray:
    """Quick flash to white, then reveal incoming frame.

    Great for data reveals, stat displays, and impact moments.
    """
    flash_peak = 0.4  # Flash happens early for punchy feel

    if t < flash_peak:
        # Outgoing -> white
        flash_t = _ease_in_quad(t / flash_peak)
        white = np.full_like(out, 255)
        return (out.astype(np.float32) * (1 - flash_t) + white.astype(np.float32) * flash_t).astype(np.uint8)
    else:
        # White -> incoming
        reveal_t = _ease_out_expo((t - flash_peak) / (1 - flash_peak))
        white = np.full_like(inp, 255)
        return (white.astype(np.float32) * (1 - reveal_t) + inp.astype(np.float32) * reveal_t).astype(np.uint8)


def _directional_wipe(out: np.ndarray, inp: np.ndarray, t: float, direction: str = "left") -> np.ndarray:
    """Soft directional wipe with feathered edge."""
    h, w = out.shape[:2]
    t = _ease_in_out_cubic(t)
    feather = 80  # Feather width in pixels

    if direction in ("left", "right"):
        # Create horizontal gradient mask
        x = np.arange(w).astype(np.float32)
        if direction == "left":
            edge = t * (w + feather) - feather
            mask = np.clip((x - edge) / feather, 0, 1)
            mask = 1 - mask  # Incoming from left
        else:
            edge = (1 - t) * (w + feather) - feather
            mask = np.clip((x - edge) / feather, 0, 1)
        mask = mask[np.newaxis, :, np.newaxis]  # (1, W, 1)
        mask = np.broadcast_to(mask, (h, w, 1))
    else:
        # Vertical
        y = np.arange(h).astype(np.float32)
        if direction == "up":
            edge = t * (h + feather) - feather
            mask = np.clip((y - edge) / feather, 0, 1)
            mask = 1 - mask
        else:
            edge = (1 - t) * (h + feather) - feather
            mask = np.clip((y - edge) / feather, 0, 1)
        mask = mask[:, np.newaxis, np.newaxis]
        mask = np.broadcast_to(mask, (h, w, 1))

    result = out.astype(np.float32) * mask + inp.astype(np.float32) * (1 - mask)
    return result.clip(0, 255).astype(np.uint8)


def _zoom_punch_in(out: np.ndarray, inp: np.ndarray, t: float) -> np.ndarray:
    """Zoom punch into outgoing, then incoming pops in at full scale.

    High-impact transition for reveals and data points.
    """
    if t < 0.5:
        zoom_t = _ease_in_quad(t / 0.5)
        scale = 1.0 + zoom_t * 0.5  # Zoom to 150%
        opacity = 1.0 - zoom_t * 0.3  # Slight fade
        frame = _zoom_frame(out, scale)
        return (frame.astype(np.float32) * opacity).clip(0, 255).astype(np.uint8)
    else:
        pop_t = _ease_out_expo((t - 0.5) / 0.5)
        scale = 1.15 - 0.15 * pop_t  # Pop from 115% to 100%
        return _zoom_frame(inp, scale)


def _fade_black(out: np.ndarray, inp: np.ndarray, t: float) -> np.ndarray:
    """Fade through black — classic cinematic transition."""
    t = _ease_in_out_cubic(t)

    if t < 0.5:
        # Fade out to black
        fade = 1 - t * 2
        return (out.astype(np.float32) * fade).clip(0, 255).astype(np.uint8)
    else:
        # Fade in from black
        fade = (t - 0.5) * 2
        return (inp.astype(np.float32) * fade).clip(0, 255).astype(np.uint8)


# ═══════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════════════

def _zoom_frame(frame: np.ndarray, scale: float) -> np.ndarray:
    """Zoom into the center of a frame by a scale factor."""
    h, w = frame.shape[:2]
    if abs(scale - 1.0) < 0.001:
        return frame

    new_w = int(w / scale)
    new_h = int(h / scale)
    x1 = (w - new_w) // 2
    y1 = (h - new_h) // 2

    cropped = frame[max(0, y1):y1 + new_h, max(0, x1):x1 + new_w]
    pil = Image.fromarray(cropped).resize((w, h), Image.LANCZOS)
    return np.array(pil)


def get_transition_duration(transition: TransitionType) -> float:
    """Recommended duration for each transition type."""
    durations = {
        "cut": 0.0,
        "crossfade": 0.5,
        "zoom_cut": 0.35,
        "whip_pan": 0.4,
        "luma_fade": 0.6,
        "flash_white": 0.3,
        "directional_wipe": 0.5,
        "zoom_punch_in": 0.4,
        "fade_black": 0.8,
    }
    return durations.get(transition, 0.5)
