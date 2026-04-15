"""
Cals2Gains - Subtitle Engine (Word-by-Word Animated)
======================================================
Renders karaoke-style, word-by-word animated subtitles for Instagram Reels.

Features:
- Karaoke-style word highlighting (current word in brand color)
- Sliding window: max 4-5 visible words at once
- Dark shadow/outline for readability over any background
- Smooth transitions between words
- Supports variable word timings
- Fallback: estimate timestamps from text and duration
- RGBA color support for transparency effects

Usage:
    from subtitle_engine import render_subtitles_on_frame, SubtitleStyle, estimate_word_timestamps

    # Option 1: With real word timestamps from voice analysis
    timestamps = [
        {"word": "Hello", "start": 0.0, "end": 0.3},
        {"word": "world", "start": 0.3, "end": 0.6},
    ]

    # Option 2: Estimate timestamps automatically
    timestamps = estimate_word_timestamps("Hello world", total_duration=1.0, start_offset=0.0)

    # Render on frame
    style = SubtitleStyle()
    result = render_subtitles_on_frame(frame, current_time=0.15, word_timestamps=timestamps, style=style)
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
import re

from brand_config import Colors, Fonts, Reel, Layout

# ═══════════════════════════════════════════════════════════════════════════
# FONT CACHING
# ═══════════════════════════════════════════════════════════════════════════

_font_cache: dict = {}

def _get_font(font_path: Path, size: int) -> ImageFont.FreeTypeFont:
    """Get cached font instance."""
    key = f"{font_path}:{size}"
    if key not in _font_cache:
        try:
            _font_cache[key] = ImageFont.truetype(str(font_path), size)
        except OSError:
            print(f"[SubtitleEngine] Font not found: {font_path}, using default")
            _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]


def _hex_to_rgba(hex_color: str, alpha: int = 255) -> tuple:
    """Convert hex color to RGBA tuple."""
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return (255, 255, 255, alpha)
    try:
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)
    except ValueError:
        return (255, 255, 255, alpha)


# ═══════════════════════════════════════════════════════════════════════════
# SUBTITLE STYLE CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class SubtitleStyle:
    """Configuration for subtitle rendering."""

    # Font
    font_path: Path = None
    font_size: int = 48

    # Colors (hex strings)
    active_color: str = "#9C8CFF"      # Violet - current word
    inactive_color: str = "#F7F2EA"    # Bone - previous words
    shadow_color: str = "#000000"      # Black - text outline

    # Shadow/outline
    shadow_offset: int = 3             # Pixels offset for shadow

    # Position and sizing
    position_y: int = 1550             # Y position (top of subtitle area)
    max_visible_words: int = 5         # Max words visible at once

    # Background
    bg_padding: int = 12               # Padding around text
    bg_color: tuple = (0, 0, 0, 160)   # RGBA - semi-transparent black
    bg_corner_radius: int = 16         # Rounded corners

    def __post_init__(self):
        """Initialize font path with default if not provided."""
        if self.font_path is None:
            self.font_path = Fonts.display_bold


# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def estimate_word_timestamps(
    text: str,
    total_duration: float,
    start_offset: float = 0.0
) -> list:
    """
    Estimate word timestamps when real timing data is unavailable.

    Distributes words proportionally across the duration based on character length.
    Longer words get more time.

    Args:
        text: Text to split into words
        total_duration: Total duration in seconds
        start_offset: Time offset (default 0.0)

    Returns:
        List of {"word": str, "start": float, "end": float}
    """
    if not text or total_duration <= 0:
        return []

    # Split text into words, preserving original casing
    words = text.split()
    if not words:
        return []

    # Calculate character-based weight for each word
    char_counts = [len(word) for word in words]
    total_chars = sum(char_counts)

    if total_chars == 0:
        return []

    # Distribute duration proportionally
    timestamps = []
    current_time = start_offset

    for word, char_count in zip(words, char_counts):
        # Word duration proportional to character count
        word_duration = (char_count / total_chars) * total_duration

        timestamps.append({
            "word": word,
            "start": current_time,
            "end": current_time + word_duration
        })

        current_time += word_duration

    return timestamps


def _get_visible_words(word_timestamps: list, current_time: float, max_visible: int) -> tuple:
    """
    Get words visible at current_time with sliding window.

    Returns:
        (visible_words, current_word_idx)
        visible_words: list of {"word", "start", "end", "is_active"}
        current_word_idx: index of currently active word (-1 if none)
    """
    if not word_timestamps:
        return ([], -1)

    # Find current word
    current_idx = -1
    for i, ts in enumerate(word_timestamps):
        if ts["start"] <= current_time < ts["end"]:
            current_idx = i
            break

    # If no current word, find the next one
    if current_idx == -1:
        for i, ts in enumerate(word_timestamps):
            if ts["start"] >= current_time:
                current_idx = i
                break

    # If still no word found, return empty
    if current_idx == -1:
        return ([], -1)

    # Calculate visible window
    # Prefer to show current word in center if possible
    start_idx = max(0, current_idx - (max_visible // 2))
    end_idx = min(len(word_timestamps), start_idx + max_visible)

    # Adjust if we're at the end
    if end_idx - start_idx < max_visible and start_idx > 0:
        start_idx = max(0, end_idx - max_visible)

    visible_words = []
    for i in range(start_idx, end_idx):
        is_active = (i == current_idx)
        visible_words.append({
            **word_timestamps[i],
            "is_active": is_active,
            "index": i
        })

    return (visible_words, current_idx)


def _draw_rounded_rectangle(
    draw: ImageDraw.ImageDraw,
    bbox: tuple,
    fill: tuple = None,
    outline: tuple = None,
    width: int = 1,
    radius: int = 16
) -> None:
    """
    Draw a rounded rectangle on a PIL ImageDraw object.

    Args:
        draw: ImageDraw object
        bbox: (x0, y0, x1, y1) bounding box
        fill: Fill color (RGBA tuple)
        outline: Outline color (RGBA tuple)
        width: Outline width
        radius: Corner radius in pixels
    """
    x0, y0, x1, y1 = bbox

    # Corners
    radius = min(radius, (x1 - x0) // 2, (y1 - y0) // 2)

    # Draw filled rectangle with rounded corners
    if fill:
        # Draw main rectangle
        draw.rectangle((x0 + radius, y0, x1 - radius, y1), fill=fill)
        draw.rectangle((x0, y0 + radius, x1, y1 - radius), fill=fill)

        # Draw corners
        for x, y, start, end in [
            (x0 + radius, y0 + radius, 180, 270),  # top-left
            (x1 - radius, y0 + radius, 270, 360),  # top-right
            (x1 - radius, y1 - radius, 0, 90),     # bottom-right
            (x0 + radius, y1 - radius, 90, 180),   # bottom-left
        ]:
            draw.pieslice((x - radius, y - radius, x + radius, y + radius),
                         start, end, fill=fill)

    # Draw outline if specified
    if outline and width > 0:
        # Approximate rounded rectangle outline
        draw.rectangle((x0 + radius, y0, x1 - radius, y0 + width), fill=outline)
        draw.rectangle((x0 + radius, y1 - width, x1 - radius, y1), fill=outline)
        draw.rectangle((x0, y0 + radius, x0 + width, y1 - radius), fill=outline)
        draw.rectangle((x1 - width, y0 + radius, x1, y1 - radius), fill=outline)


def _apply_text_outline(
    text: str,
    position: tuple,
    font: ImageFont.FreeTypeFont,
    draw: ImageDraw.ImageDraw,
    fill_color: tuple,
    outline_color: tuple,
    outline_width: int = 3
) -> None:
    """
    Draw text with outline effect.

    Args:
        text: Text to draw
        position: (x, y) position
        font: PIL Font
        draw: ImageDraw object
        fill_color: Fill color (RGBA)
        outline_color: Outline color (RGBA)
        outline_width: Outline width in pixels
    """
    x, y = position

    # Draw outline by drawing text at offset positions
    for adj_x in range(-outline_width, outline_width + 1):
        for adj_y in range(-outline_width, outline_width + 1):
            if adj_x != 0 or adj_y != 0:
                draw.text((x + adj_x, y + adj_y), text, font=font, fill=outline_color)

    # Draw main text
    draw.text(position, text, font=font, fill=fill_color)


# ═══════════════════════════════════════════════════════════════════════════
# MAIN RENDERING FUNCTION
# ═══════════════════════════════════════════════════════════════════════════

def render_subtitles_on_frame(
    frame: Image.Image,
    current_time: float,
    word_timestamps: list,
    style: SubtitleStyle = None
) -> Image.Image:
    """
    Render word-by-word animated subtitles onto a frame.

    Karaoke-style subtitle rendering where:
    - Current word is highlighted in brand color (violet/coral)
    - Previous words shown in bone/white
    - Future words not shown
    - Max 4-5 words visible at once
    - Dark shadow/outline for readability

    Args:
        frame: PIL Image (input frame)
        current_time: Current playback time in seconds
        word_timestamps: List of {"word": str, "start": float, "end": float}
        style: SubtitleStyle config (uses defaults if None)

    Returns:
        PIL Image (frame with subtitles rendered)
    """
    # Use default style if not provided
    if style is None:
        style = SubtitleStyle()

    # Copy frame to avoid modifying original
    result = frame.copy()

    # Convert to RGBA for text rendering
    if result.mode != "RGBA":
        result = result.convert("RGBA")

    # Get font
    font = _get_font(style.font_path, style.font_size)

    # Handle empty timestamps
    if not word_timestamps:
        return result

    # Get visible words for current time
    visible_words, current_idx = _get_visible_words(
        word_timestamps,
        current_time,
        style.max_visible_words
    )

    # Nothing to render
    if not visible_words:
        return result

    # Convert colors from hex to RGBA
    active_color = _hex_to_rgba(style.active_color, 255)
    inactive_color = _hex_to_rgba(style.inactive_color, 255)
    shadow_color = _hex_to_rgba(style.shadow_color, 255)

    # Create a transparent overlay for text
    overlay = Image.new("RGBA", result.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Measure all visible words to calculate total width and position
    word_metrics = []
    for word_data in visible_words:
        bbox = draw.textbbox((0, 0), word_data["word"], font=font)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        word_metrics.append({
            **word_data,
            "width": width,
            "height": height,
            "bbox": bbox
        })

    # Calculate total width (with spacing between words)
    word_spacing = 16  # Pixels between words
    total_width = sum(m["width"] for m in word_metrics) + \
                  (len(word_metrics) - 1) * word_spacing

    # Center horizontally on frame
    frame_center_x = result.width // 2
    start_x = frame_center_x - (total_width // 2)

    # Y position
    y = style.position_y

    # Draw background if enabled
    if style.bg_color and len(style.bg_color) == 4:
        bg_padding = style.bg_padding
        min_x = start_x - bg_padding
        max_x = start_x + total_width + bg_padding
        min_y = y - bg_padding
        max_y = y + word_metrics[0]["height"] + bg_padding if word_metrics else y

        bg_rgba = style.bg_color
        _draw_rounded_rectangle(
            draw,
            (min_x, min_y, max_x, max_y),
            fill=bg_rgba,
            radius=style.bg_corner_radius
        )

    # Render each word
    current_x = start_x
    for word_data in word_metrics:
        word_text = word_data["word"]
        is_active = word_data["is_active"]

        # Choose color based on whether word is active
        word_color = active_color if is_active else inactive_color

        # Draw text with outline effect
        _apply_text_outline(
            word_text,
            (current_x, y),
            font,
            draw,
            fill_color=word_color,
            outline_color=shadow_color,
            outline_width=style.shadow_offset
        )

        # Move to next word position
        current_x += word_data["width"] + word_spacing

    # Composite overlay onto result
    result = Image.alpha_composite(result, overlay)

    # Convert back to RGB if original was RGB
    if frame.mode == "RGB":
        result = result.convert("RGB")

    return result


# ═══════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def create_subtitle_style(
    font_size: int = 48,
    active_color: str = "#9C8CFF",
    inactive_color: str = "#F7F2EA",
    position_y: int = 1550,
    max_visible_words: int = 5
) -> SubtitleStyle:
    """
    Create a SubtitleStyle with custom parameters.

    Args:
        font_size: Font size in pixels
        active_color: Hex color for active word (brand color)
        inactive_color: Hex color for inactive words
        position_y: Y position of subtitle text
        max_visible_words: Maximum words visible at once

    Returns:
        SubtitleStyle instance
    """
    return SubtitleStyle(
        font_size=font_size,
        active_color=active_color,
        inactive_color=inactive_color,
        position_y=position_y,
        max_visible_words=max_visible_words
    )
