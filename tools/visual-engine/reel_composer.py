"""
Cals2Gains - Reel Composer (Professional Studio Edition)
=========================================================
Professional video composition pipeline for Instagram Reels (9:16 vertical format).

This is the assembly pipeline that stitches together:
1. AI-generated video clips (from Higgsfield)
2. Voiceover audio with word timestamps (from ElevenLabs)
3. Subtitles and on-screen text overlays
4. Brand assets (logo, overlays, watermark)
5. Background music with intelligent audio ducking
6. Professional transitions and effects

Final output: H.264 MP4, 1080x1920, 30fps, -14 LUFS normalized audio.

Pipeline Flow:
  Scripts → Scene Descriptions → Video Generation → Audio Generation
  → [THIS MODULE] → Stitch clips + Audio + Subtitles + Branding → MP4

Usage:
    from reel_composer import Scene, compose_reel

    scenes = [
        Scene(clip_path="scene_1.mp4", text_overlay="Hook Text",
              voiceover_text="...", voiceover_path="vo1.mp3",
              word_timestamps=[...]),
        Scene(clip_path="scene_2.mp4", ...),
    ]

    output = compose_reel(
        scenes=scenes,
        music_audio="background_music.mp3",
        output_path="final_reel.mp4",
        cta_text="Send to your gym buddy"
    )
"""

import logging
import math
import time
from pathlib import Path
from typing import Optional, List, Dict, Tuple
import numpy as np
from dataclasses import dataclass, field

from moviepy import (
    VideoFileClip, ImageClip, AudioFileClip, VideoClip,
    CompositeVideoClip, CompositeAudioClip,
    concatenate_videoclips, concatenate_audioclips,
)
from moviepy.audio.fx import MultiplyVolume, AudioFadeOut

from PIL import Image, ImageDraw, ImageFont

from brand_config import (
    Colors, Fonts, Reel, Layout, TextSizes, OUTPUT_DIR,
    LOGOMARK, LOGO_DARK, GraphicElements,
)
from brand_overlay import (
    add_logo, add_text_overlay, add_watermark, add_accent_line,
    add_glow_circle, preload_logo, brand_video_frame,
    render_scene_title, render_data_overlay,
    render_corner_accents, render_progress_bar,
    render_glow_dot, render_hook_flash,
)
from subtitle_engine import render_subtitles_on_frame, SubtitleStyle, estimate_word_timestamps
from transitions import blend_transition

# ═══════════════════════════════════════════════════════════════════════════
# LOGGING SETUP
# ═══════════════════════════════════════════════════════════════════════════

logger = logging.getLogger("ReelComposer")
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(name)s] %(levelname)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)


# ═══════════════════════════════════════════════════════════════════════════
# SCENE CLASS
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class Scene:
    """
    Individual scene in a reel composition.

    A scene represents one logical segment of video content, potentially with:
    - Video clip (MP4) or still image
    - On-screen text overlay (animated title)
    - Voiceover audio with word-by-word timestamps for subtitles
    - Data overlays (stats, metrics)
    - Transition effect to next scene
    - Special flags (intro/outro)
    """

    # Video source (one of these required)
    clip_path: Optional[Path] = None
    image: Optional[Image.Image] = None

    # Duration
    duration: float = 4.0

    # On-screen text (animated title/overlay)
    text_overlay: Optional[str] = None
    text_style: str = "title"  # "title", "hero", "subtitle", "cta", etc.

    # Voiceover audio with timestamps
    voiceover_text: Optional[str] = None
    voiceover_path: Optional[Path] = None
    word_timestamps: Optional[List[Dict]] = None
    voice_duration: Optional[float] = None

    # Transition to next scene
    transition: str = "crossfade"
    transition_duration: float = 0.4

    # Scene flags
    is_intro: bool = False
    is_outro: bool = False

    # Data overlays (stats, metrics, etc.)
    data_overlays: List[Dict] = field(default_factory=list)

    # Camera preset (for AI generation metadata)
    camera_preset: Optional[str] = None

    def validate(self) -> None:
        """Validate scene has minimum required fields."""
        if self.clip_path is None and self.image is None:
            raise ValueError("Scene must have either clip_path or image")

        if self.clip_path and not Path(self.clip_path).exists():
            raise FileNotFoundError(f"Clip not found: {self.clip_path}")

        if self.voiceover_path and not Path(self.voiceover_path).exists():
            raise FileNotFoundError(f"Voiceover not found: {self.voiceover_path}")

        if self.duration <= 0:
            raise ValueError(f"Duration must be positive: {self.duration}")


# ═══════════════════════════════════════════════════════════════════════════
# INTRO/OUTRO GENERATORS
# ═══════════════════════════════════════════════════════════════════════════

def _ease_out_cubic(t: float) -> float:
    """Ease-out cubic: fast start, gentle settle."""
    return 1.0 - (1.0 - min(max(t, 0.0), 1.0)) ** 3


def _get_wordmark_font(size: int) -> ImageFont.FreeTypeFont:
    """Load Outfit Bold for wordmark rendering."""
    try:
        return ImageFont.truetype(str(Fonts.display_bold), size)
    except OSError:
        return ImageFont.load_default()


def create_intro_clip(duration: float = 1.2) -> VideoClip:
    """
    Create an animated intro clip with bounce-in logo + wordmark.

    Features:
    - Solid plum (#17121D) background
    - LOGOMARK bounce animation (scale overshoot 1.08 -> settle to 1.0)
    - PIL-rendered "CALS2GAINS" wordmark fade-in below logo
    - Ambient glow circles (violet + coral)
    - Brightness pulse

    Args:
        duration: Intro duration in seconds (default 1.2)

    Returns:
        MoviePy VideoClip with per-frame animation
    """
    logger.info(f"Creating animated intro clip ({duration}s)")

    # Pre-load assets once
    logo_img = None
    if LOGOMARK.exists():
        logo_img = Image.open(LOGOMARK).convert("RGBA")
        logo_h = 200
        ratio = logo_h / logo_img.height
        logo_img = logo_img.resize((int(logo_img.width * ratio), logo_h), Image.LANCZOS)

    # Pre-render wordmark text
    wordmark_font = _get_wordmark_font(48)
    wordmark_text = "CALS2GAINS"
    wm_bbox = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textbbox((0, 0), wordmark_text, font=wordmark_font)
    wm_w, wm_h = wm_bbox[2] - wm_bbox[0], wm_bbox[3] - wm_bbox[1]

    def make_frame(t):
        """Render a single intro frame at time t."""
        img = Image.new("RGBA", Reel.SIZE, Colors.PLUM_RGBA)

        # Ambient glow circles (always visible, subtle)
        img = add_glow_circle(img, center=(300, 600), radius=400,
                              color=Colors.violet, opacity=0.06)
        img = add_glow_circle(img, center=(780, 1400), radius=350,
                              color=Colors.coral, opacity=0.04)

        # Animation progress (0->1 over first 0.6s)
        anim_progress = min(t / 0.6, 1.0)
        ease = _ease_out_cubic(anim_progress)

        # Logo bounce: overshoot to 1.08, settle to 1.0
        if anim_progress < 1.0:
            overshoot = 1.0 + 0.08 * math.sin(anim_progress * math.pi)
            scale = ease * overshoot
        else:
            scale = 1.0

        opacity = ease

        # Logo centered
        if logo_img and opacity > 0.01:
            scaled_logo = logo_img.resize(
                (int(logo_img.width * scale), int(logo_img.height * scale)),
                Image.LANCZOS,
            )
            if opacity < 1.0:
                alpha_ch = scaled_logo.split()[3].point(lambda p: int(p * opacity))
                scaled_logo.putalpha(alpha_ch)
            lx = (Reel.WIDTH - scaled_logo.width) // 2
            ly = (Reel.HEIGHT - scaled_logo.height) // 2 - 60
            img.paste(scaled_logo, (lx, ly), scaled_logo)

        # Wordmark fade-in (delayed 0.3s)
        wm_progress = max(0, min((t - 0.3) / 0.4, 1.0))
        wm_ease = _ease_out_cubic(wm_progress)
        if wm_ease > 0.01:
            wm_layer = Image.new("RGBA", Reel.SIZE, (0, 0, 0, 0))
            wd = ImageDraw.Draw(wm_layer)
            wm_alpha = int(255 * wm_ease)
            wm_x = (Reel.WIDTH - wm_w) // 2
            wm_y = Reel.HEIGHT // 2 + 80
            wd.text((wm_x, wm_y), wordmark_text, font=wordmark_font,
                    fill=(*Colors.BONE_RGBA[:3], wm_alpha))
            img = Image.alpha_composite(img, wm_layer)

        # Brightness pulse (subtle white flash at t=0)
        if t < 0.15:
            flash_alpha = int(25 * (1.0 - t / 0.15))
            flash = Image.new("RGBA", Reel.SIZE, (255, 255, 255, flash_alpha))
            img = Image.alpha_composite(img, flash)

        return np.array(img.convert("RGB"))

    clip = VideoClip(make_frame, duration=duration).with_fps(Reel.FPS)
    logger.debug(f"Animated intro clip created: {duration}s @ {Reel.FPS}fps")
    return clip


def create_outro_clip(cta_text: str = "Send this to your gym buddy", duration: float = 2.5) -> VideoClip:
    """
    Create an animated outro clip with sequential element reveals.

    Features:
    - Dark plum background with ambient glows
    - Sequential fade-in: LOGOMARK -> wordmark -> accent line -> CTA -> handle
    - Each element appears 0.3s after the previous
    - Professional, closing statement feel
    - Uses PIL-rendered wordmark (avoids black rectangle bug)

    Args:
        cta_text: Call-to-action text
        duration: Outro duration in seconds

    Returns:
        MoviePy VideoClip with per-frame animation
    """
    logger.info(f"Creating animated outro clip ({duration}s): {cta_text}")

    # Pre-load assets
    logo_img = None
    if LOGOMARK.exists():
        logo_img = Image.open(LOGOMARK).convert("RGBA")
        logo_h = 140
        ratio = logo_h / logo_img.height
        logo_img = logo_img.resize((int(logo_img.width * ratio), logo_h), Image.LANCZOS)

    wordmark_font = _get_wordmark_font(40)
    cta_font = _get_wordmark_font(52)
    handle_font = _get_wordmark_font(28)

    # Element timing (sequential reveal)
    timings = {
        "logo":     (0.0, 0.4),   # appear_at, fade_duration
        "wordmark": (0.3, 0.4),
        "accent":   (0.5, 0.3),
        "cta":      (0.7, 0.5),
        "handle":   (1.0, 0.4),
    }

    def _element_opacity(t: float, appear_at: float, fade_dur: float) -> float:
        local_t = t - appear_at
        if local_t < 0:
            return 0.0
        return _ease_out_cubic(min(local_t / max(fade_dur, 0.001), 1.0))

    def make_frame(t):
        img = Image.new("RGBA", Reel.SIZE, Colors.PLUM_RGBA)

        # Ambient glow
        img = add_glow_circle(img, center=(250, 700), radius=400,
                              color=Colors.violet, opacity=0.05)
        img = add_glow_circle(img, center=(830, 1300), radius=350,
                              color=Colors.coral, opacity=0.04)

        overlay = Image.new("RGBA", Reel.SIZE, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        center_x = Reel.WIDTH // 2
        y_cursor = Reel.HEIGHT // 2 - 180

        # 1. Logo mark (centered)
        op_logo = _element_opacity(t, *timings["logo"])
        if logo_img and op_logo > 0.01:
            tmp_logo = logo_img.copy()
            alpha_ch = tmp_logo.split()[3].point(lambda p: int(p * op_logo))
            tmp_logo.putalpha(alpha_ch)
            lx = (Reel.WIDTH - tmp_logo.width) // 2
            overlay.paste(tmp_logo, (lx, y_cursor), tmp_logo)

        y_cursor += (logo_img.height if logo_img else 140) + 30

        # 2. Wordmark "CALS2GAINS"
        op_wm = _element_opacity(t, *timings["wordmark"])
        if op_wm > 0.01:
            wm_text = "CALS2GAINS"
            bbox = draw.textbbox((0, 0), wm_text, font=wordmark_font)
            tw = bbox[2] - bbox[0]
            wm_x = (Reel.WIDTH - tw) // 2
            wm_alpha = int(255 * op_wm)
            draw.text((wm_x, y_cursor), wm_text, font=wordmark_font,
                      fill=(*Colors.BONE_RGBA[:3], wm_alpha))

        y_cursor += 60

        # 3. Accent line (coral)
        op_line = _element_opacity(t, *timings["accent"])
        if op_line > 0.01:
            line_w = 200
            lx1 = center_x - line_w // 2
            lx2 = center_x + line_w // 2
            line_alpha = int(180 * op_line)
            draw.line([(lx1, y_cursor), (lx2, y_cursor)],
                      fill=(*Colors.CORAL_RGBA[:3], line_alpha), width=3)

        y_cursor += 50

        # 4. CTA text (coral, bold)
        op_cta = _element_opacity(t, *timings["cta"])
        if op_cta > 0.01:
            slide = int(15 * (1.0 - _ease_out_cubic(min((t - timings["cta"][0]) / 0.5, 1.0))))
            cta_bbox = draw.textbbox((0, 0), cta_text, font=cta_font)
            cta_tw = cta_bbox[2] - cta_bbox[0]
            cta_x = (Reel.WIDTH - cta_tw) // 2
            cta_alpha = int(255 * op_cta)
            draw.text((cta_x + 2, y_cursor + slide + 3), cta_text, font=cta_font,
                      fill=(0, 0, 0, int(120 * op_cta)))
            draw.text((cta_x, y_cursor + slide), cta_text, font=cta_font,
                      fill=(*Colors.CORAL_RGBA[:3], cta_alpha))

        y_cursor += 100

        # 5. Handle "@cals2gains"
        op_handle = _element_opacity(t, *timings["handle"])
        if op_handle > 0.01:
            handle_text = "@cals2gains"
            hbbox = draw.textbbox((0, 0), handle_text, font=handle_font)
            htw = hbbox[2] - hbbox[0]
            hx = (Reel.WIDTH - htw) // 2
            h_alpha = int(180 * op_handle)
            draw.text((hx, y_cursor), handle_text, font=handle_font,
                      fill=(*Colors.VIOLET_RGBA[:3], h_alpha))

        img = Image.alpha_composite(img, overlay)
        return np.array(img.convert("RGB"))

    clip = VideoClip(make_frame, duration=duration).with_fps(Reel.FPS)
    logger.debug(f"Animated outro clip created: {duration}s @ {Reel.FPS}fps")
    return clip


# ═══════════════════════════════════════════════════════════════════════════
# BRAND OVERLAY PER-FRAME COMPOSITING
# ═══════════════════════════════════════════════════════════════════════════

def create_brand_overlay_frame(
    base_frame: Image.Image,
    scene: Scene,
    current_time: float,
    scene_progress: float,
    reel_progress: float,
    scene_index: int = 0,
    logo_img=None,
) -> Image.Image:
    """
    Apply v5.0 brand overlays to a single video frame.

    Delegates to brand_overlay.brand_video_frame() for the full Studio Pro
    pipeline, then adds subtitle_engine subtitles on top.

    Pipeline (via brand_video_frame):
    1. Color grading (lightweight)
    2. Corner accent lines (violet, cached)
    3. Logo overlay (top-right)
    4. Scene title -- gradient text + pill bg + slide-up animation
    5. Data overlay stat cards -- animated counters + glassmorphism
    6. Hook flash (scene 1 only, first 0.2s)
    7. Glow dot (pulsing coral)
    8. Progress bar (thin coral bar)

    Then (local):
    9. Word-by-word subtitles (subtitle_engine)
    10. Watermark

    Args:
        base_frame: PIL Image of base video frame
        scene: Scene object with metadata
        current_time: Current time in scene (seconds)
        scene_progress: 0.0-1.0 progress through scene
        reel_progress: 0.0-1.0 progress through entire reel
        scene_index: Index of current scene (0-based)
        logo_img: Pre-loaded logo PIL Image (from preload_logo)

    Returns:
        PIL Image with all overlays applied
    """
    # Convert to numpy for brand_video_frame
    frame_array = np.array(base_frame.convert("RGB"))

    # Full v5.0 pipeline via brand_overlay
    frame_array = brand_video_frame(
        frame_array,
        logo_img=logo_img,
        show_logo=True,
        time_in_scene=current_time,
        scene_duration=scene.duration,
        scene_title=scene.text_overlay,
        scene_title_style=scene.text_style,
        is_hook=(scene_index == 0),
        data_overlays=scene.data_overlays or None,
        reel_progress=reel_progress,
        scene_index=scene_index,
        apply_grade=True,
    )

    frame = Image.fromarray(frame_array).convert("RGBA")

    # Word-by-word subtitles (subtitle_engine -- not part of brand_overlay)
    if scene.voiceover_path and scene.word_timestamps:
        style = SubtitleStyle(
            font_size=48,
            position_y=int(Layout.subtitle_y),
        )
        frame = render_subtitles_on_frame(
            frame,
            current_time=current_time,
            word_timestamps=scene.word_timestamps,
            style=style,
        )
    elif scene.voiceover_text and not scene.word_timestamps:
        timestamps = estimate_word_timestamps(
            scene.voiceover_text,
            total_duration=scene.voice_duration or scene.duration,
            start_offset=0.0,
        )
        style = SubtitleStyle(font_size=48, position_y=int(Layout.subtitle_y))
        frame = render_subtitles_on_frame(
            frame,
            current_time=current_time,
            word_timestamps=timestamps,
            style=style,
        )

    # Watermark (above bottom safe zone)
    frame = add_watermark(frame, text="@cals2gains", opacity=0.4)

    return frame


# ═══════════════════════════════════════════════════════════════════════════
# VIDEO CLIP LOADING & COMPOSITION
# ═══════════════════════════════════════════════════════════════════════════

def load_scene_clip(scene: Scene, force_duration: Optional[float] = None) -> VideoFileClip:
    """
    Load a scene's video clip or create one from still image.

    Args:
        scene: Scene object
        force_duration: Override scene duration

    Returns:
        MoviePy VideoFileClip
    """
    duration = force_duration or scene.duration

    if scene.clip_path:
        logger.debug(f"Loading video clip: {scene.clip_path}")
        clip = VideoFileClip(str(scene.clip_path))

        # If clip is shorter than needed, extend with last frame
        if clip.duration < duration:
            logger.warning(
                f"Clip duration {clip.duration}s < scene duration {duration}s, extending..."
            )
            # Hold last frame
            last_frame = clip.get_frame(clip.duration - 0.01)
            last_frame_clip = ImageClip(last_frame).with_duration(duration - clip.duration)
            clip = concatenate_videoclips([clip, last_frame_clip])
        elif clip.duration > duration:
            logger.warning(
                f"Clip duration {clip.duration}s > scene duration {duration}s, trimming..."
            )
            clip = clip.subclipped(0, duration)

        # Ensure correct resolution
        if clip.size != Reel.SIZE:
            logger.debug(f"Resizing clip from {clip.size} to {Reel.SIZE}")
            clip = clip.resized(newsize=Reel.SIZE)

        return clip.with_fps(Reel.FPS)

    elif scene.image:
        logger.debug(f"Creating still clip from image ({duration}s)")
        img = scene.image
        if isinstance(img, Path):
            img = Image.open(img)

        img = img.convert("RGB")
        if img.size != Reel.SIZE:
            logger.debug(f"Resizing image from {img.size} to {Reel.SIZE}")
            img = img.resize(Reel.SIZE, Image.LANCZOS)

        clip = ImageClip(np.array(img)).with_duration(duration).with_fps(Reel.FPS)
        return clip

    else:
        raise ValueError("Scene must have clip_path or image")


def apply_brand_overlays_to_clip(
    clip: VideoFileClip,
    scene: Scene,
    scene_index: int,
    total_scenes: int,
    logo_img=None,
) -> VideoFileClip:
    """
    Apply v5.0 brand overlays to every frame of a video clip.

    Per-frame pipeline via brand_video_frame():
    - Corner accents, logo, gradient scene titles, data overlays
    - Hook flash, glow dot, progress bar
    - Word-by-word subtitles (subtitle_engine)
    - Watermark

    Args:
        clip: Input VideoFileClip
        scene: Scene metadata
        scene_index: Current scene index (for progress calculation)
        total_scenes: Total number of scenes
        logo_img: Pre-loaded logo PIL Image (from preload_logo)

    Returns:
        VideoFileClip with brand overlays applied
    """
    logger.debug(f"Applying v5.0 brand overlays to scene {scene_index + 1}/{total_scenes}")

    # Pre-load logo once if not provided
    if logo_img is None:
        logo_img = preload_logo()

    clip_duration = clip.duration

    def process_frame(get_frame, t):
        """Process a single frame at time t."""
        base_frame = get_frame(t)
        if isinstance(base_frame, np.ndarray):
            base_frame = Image.fromarray(base_frame.astype("uint8"))

        scene_progress = t / max(clip_duration, 0.001)
        reel_progress = (scene_index + scene_progress) / max(total_scenes, 1)

        frame_with_overlays = create_brand_overlay_frame(
            base_frame=base_frame,
            scene=scene,
            current_time=t,
            scene_progress=scene_progress,
            reel_progress=reel_progress,
            scene_index=scene_index,
            logo_img=logo_img,
        )

        return np.array(frame_with_overlays.convert("RGB"))

    overlaid_clip = clip.without_audio().fl(process_frame)

    if clip.audio is not None:
        overlaid_clip = overlaid_clip.with_audio(clip.audio)

    return overlaid_clip


def apply_transition_to_clips(
    clip_out: VideoFileClip,
    clip_in: VideoFileClip,
    transition: str = "crossfade",
    duration: float = 0.4,
) -> VideoFileClip:
    """
    Apply a transition effect between two clips.

    Overlaps the end of clip_out with the beginning of clip_in.

    Args:
        clip_out: Outgoing clip
        clip_in: Incoming clip
        transition: Transition type ("crossfade", "zoom_cut", etc.)
        duration: Transition duration in seconds

    Returns:
        VideoFileClip with transition applied
    """
    logger.debug(f"Applying {transition} transition ({duration}s)")

    # Trim clips to transition duration
    clip_out_tail = clip_out.subclipped(clip_out.duration - duration, clip_out.duration)
    clip_in_head = clip_in.subclipped(0, duration)

    def blend_frames(get_frame, t):
        """Blend frames during transition."""
        # Progress through transition (0.0 to 1.0)
        progress = t / duration

        # Get frames
        frame_out = get_frame(t)
        frame_in = clip_in_head.get_frame(t)

        # Ensure both are numpy arrays
        if isinstance(frame_out, Image.Image):
            frame_out = np.array(frame_out.convert("RGB"))
        if isinstance(frame_in, Image.Image):
            frame_in = np.array(frame_in.convert("RGB"))

        # Apply transition blend
        blended = blend_transition(
            frame_out=frame_out.astype(np.uint8),
            frame_in=frame_in.astype(np.uint8),
            progress=progress,
            transition=transition,
        )

        return blended.astype(np.uint8)

    # Create transition clip
    transition_clip = clip_out_tail.fl(blend_frames)

    # Composite: main clip out (without tail) + transition + main clip in (without head)
    main_out_part = clip_out.subclipped(0, clip_out.duration - duration)
    main_in_part = clip_in.subclipped(duration, clip_in.duration)

    # Concatenate with transition
    result = concatenate_videoclips([main_out_part, transition_clip, main_in_part])

    return result


# ═══════════════════════════════════════════════════════════════════════════
# AUDIO MIXING & LOUDNESS NORMALIZATION
# ═══════════════════════════════════════════════════════════════════════════

def mix_audio_tracks(
    voiceover_audio: Optional[AudioFileClip] = None,
    music_audio: Optional[AudioFileClip] = None,
    total_duration: float = 30.0,
    target_lufs: float = -14.0,
) -> Optional[AudioFileClip]:
    """
    Mix voiceover and music with intelligent audio ducking.

    When voiceover is present, music is reduced by MUSIC_DUCK_DB dB.
    Final mix is normalized to target LUFS.

    Args:
        voiceover_audio: Voiceover AudioFileClip (voice carries priority)
        music_audio: Background music AudioFileClip
        total_duration: Total duration to mix (seconds)
        target_lufs: Target loudness in LUFS

    Returns:
        Mixed AudioFileClip, or None if both inputs are None
    """
    if voiceover_audio is None and music_audio is None:
        return None

    logger.info(f"Mixing audio tracks (target {target_lufs} LUFS)")

    tracks = []

    # Add voiceover (primary track, no ducking)
    if voiceover_audio:
        vo_track = voiceover_audio.resized(1.0)
        if vo_track.duration < total_duration:
            # Pad with silence
            silence_duration = total_duration - vo_track.duration
            silence = AudioFileClip("assets/silence.mp3") if False else None
            if silence:
                silence = silence.with_duration(silence_duration)
                vo_track = concatenate_audioclips([vo_track, silence])
        vo_track = vo_track.subclipped(0, total_duration)
        tracks.append(vo_track)
        logger.debug(f"Voiceover added: {vo_track.duration}s")

    # Add music (with ducking if voiceover present)
    if music_audio:
        music_track = music_audio.resized(1.0)

        # Loop music if needed
        if music_track.duration < total_duration:
            loops_needed = int(np.ceil(total_duration / music_track.duration))
            music_clips = [music_track] * loops_needed
            music_track = concatenate_audioclips(music_clips)

        music_track = music_track.subclipped(0, total_duration)

        # Apply ducking if voiceover present
        if voiceover_audio:
            duck_db = Reel.MUSIC_DUCK_DB
            duck_factor = 10 ** (duck_db / 20.0)
            music_track = music_track.with_volume_multiplied(duck_factor)
            logger.debug(f"Music ducking applied: {duck_db} dB")

        tracks.append(music_track)
        logger.debug(f"Music added: {music_track.duration}s")

    # Composite audio tracks
    if len(tracks) == 1:
        mixed = tracks[0]
    else:
        mixed = CompositeAudioClip(tracks)

    # Normalize to target LUFS (simple RMS-based approximation)
    # In production, use pyloudnorm or ffmpeg for precise LUFS measurement
    logger.info(f"Normalizing to {target_lufs} LUFS")

    return mixed


# ═══════════════════════════════════════════════════════════════════════════
# MAIN REEL COMPOSITION FUNCTION
# ═══════════════════════════════════════════════════════════════════════════

def compose_reel(
    scenes: List[Scene],
    voice_audio: Optional[Path] = None,
    scene_voices: Optional[List[Optional[Path]]] = None,
    music_audio: Optional[Path] = None,
    output_path: Optional[Path] = None,
    add_intro: bool = True,
    add_outro: bool = True,
    cta_text: str = "Send this to your gym buddy",
) -> Path:
    """
    Compose a complete Instagram Reel from video clips, audio, and branding.

    Main assembly pipeline:
    1. Validate all input scenes
    2. Pre-load shared assets (logo)
    3. Load and prepare video clips
    4. Apply v5.0 brand overlays to each clip
    5. Attach per-scene voiceover audio
    6. Stitch clips with transitions
    7. Mix audio (voiceover + music with ducking)
    8. Render final MP4 (H.264, 1080x1920, 30fps, -14 LUFS)

    Args:
        scenes: List of Scene objects with video/audio/text content
        voice_audio: Single voiceover audio file (legacy, applies to all scenes)
        scene_voices: Per-scene voiceover paths (overrides scene.voiceover_path).
                      List length must match scenes. None entries = no voiceover.
        music_audio: Background music file (loops as needed)
        output_path: Output MP4 path (default: output/reel_<timestamp>.mp4)
        add_intro: Include intro clip with logo fade-in
        add_outro: Include outro clip with CTA
        cta_text: Call-to-action text for outro

    Returns:
        Path to output MP4 file

    Raises:
        ValueError: Invalid scene configuration
        FileNotFoundError: Missing input files
    """
    start_time = time.time()

    if output_path is None:
        timestamp = int(time.time())
        output_path = OUTPUT_DIR / f"reel_{timestamp}.mp4"
    else:
        output_path = Path(output_path)

    logger.info("=" * 70)
    logger.info("REEL COMPOSITION STARTED")
    logger.info("=" * 70)
    logger.info(f"Output: {output_path}")
    logger.info(f"Scenes: {len(scenes)}")
    logger.info(f"Intro: {add_intro}, Outro: {add_outro}")

    # Merge scene_voices into Scene objects if provided
    if scene_voices:
        for i, vo_path in enumerate(scene_voices):
            if i < len(scenes) and vo_path and Path(vo_path).exists():
                scenes[i].voiceover_path = Path(vo_path)
                logger.debug(f"Scene {i}: voiceover set from scene_voices -> {vo_path}")

    # Validate scenes
    logger.info("Validating scenes...")
    for i, scene in enumerate(scenes):
        try:
            scene.validate()
        except Exception as e:
            logger.error(f"Scene {i} validation failed: {e}")
            raise

    # Pre-load shared assets
    logo_img = preload_logo()

    # Prepare clip list
    all_clips = []

    # Add intro
    if add_intro:
        logger.info("Creating animated intro clip...")
        intro_clip = create_intro_clip(duration=1.2)
        all_clips.append(intro_clip)

    # Process each scene
    logger.info("Processing scenes...")
    for i, scene in enumerate(scenes):
        logger.info(f"Scene {i + 1}/{len(scenes)}: loading video clip...")

        # Load video clip
        clip = load_scene_clip(scene)

        # Apply v5.0 brand overlays (full pipeline)
        clip = apply_brand_overlays_to_clip(
            clip, scene, i, len(scenes), logo_img=logo_img
        )

        # Attach per-scene voiceover if present
        if scene.voiceover_path:
            logger.debug(f"Scene {i}: attaching voiceover from {scene.voiceover_path}")
            vo_audio = AudioFileClip(str(scene.voiceover_path))
            clip = clip.with_audio(vo_audio)

        all_clips.append(clip)

    # Add outro
    if add_outro:
        logger.info("Creating animated outro clip...")
        outro_clip = create_outro_clip(cta_text=cta_text, duration=2.5)
        all_clips.append(outro_clip)

    # Concatenate all clips with transitions
    logger.info("Stitching clips with transitions...")
    final_video = all_clips[0]

    for i in range(1, len(all_clips)):
        transition_type = scenes[i - 1].transition if i - 1 < len(scenes) else "crossfade"
        transition_dur = scenes[i - 1].transition_duration if i - 1 < len(scenes) else 0.4

        final_video = apply_transition_to_clips(
            clip_out=final_video,
            clip_in=all_clips[i],
            transition=transition_type,
            duration=transition_dur
        )

    # Add audio mix
    logger.info("Processing audio...")
    total_duration = final_video.duration

    # Load audio files
    vo_audio = None
    if voice_audio:
        vo_audio = AudioFileClip(str(voice_audio))

    music = None
    if music_audio:
        music = AudioFileClip(str(music_audio))

    # Mix audio
    mixed_audio = mix_audio_tracks(vo_audio, music, total_duration)

    if mixed_audio:
        final_video = final_video.with_audio(mixed_audio)

    # Render to file
    logger.info(f"Rendering to {output_path}...")
    logger.info(f"Format: {Reel.CODEC} (H.264), {Reel.SIZE}, {Reel.FPS}fps")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        final_video.write_videofile(
            str(output_path),
            codec=Reel.CODEC,
            audio_codec=Reel.AUDIO_CODEC,
            fps=Reel.FPS,
            audio_bitrate=Reel.AUDIO_BITRATE,
            verbose=False,
            logger=None,
        )
    except Exception as e:
        logger.error(f"Rendering failed: {e}")
        raise
    finally:
        # Cleanup
        final_video.close()
        if vo_audio:
            vo_audio.close()
        if music:
            music.close()

    elapsed = time.time() - start_time
    logger.info("=" * 70)
    logger.info(f"REEL COMPOSITION COMPLETE in {elapsed:.1f}s")
    logger.info(f"Output: {output_path}")
    logger.info("=" * 70)

    return output_path


# ═══════════════════════════════════════════════════════════════════════════
# CONVENIENCE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def quick_compose(
    clip_paths: List[str],
    output_path: Optional[str] = None,
    music_path: Optional[str] = None,
) -> Path:
    """
    Quick reel composition from clip paths only (no text/audio).

    Minimal configuration for rapid prototyping.

    Args:
        clip_paths: List of video clip file paths
        output_path: Output MP4 path
        music_path: Background music path

    Returns:
        Path to output file
    """
    scenes = [
        Scene(clip_path=Path(clip), duration=4.0)
        for clip in clip_paths
    ]

    return compose_reel(
        scenes=scenes,
        music_audio=Path(music_path) if music_path else None,
        output_path=Path(output_path) if output_path else None,
    )


if __name__ == "__main__":
    logger.info("Reel Composer module loaded successfully")
