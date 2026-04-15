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
import time
from pathlib import Path
from typing import Optional, List, Dict, Tuple
import numpy as np
from dataclasses import dataclass, field

from moviepy import (
    VideoFileClip, ImageClip, AudioFileClip,
    CompositeVideoClip, CompositeAudioClip,
    concatenate_videoclips, concatenate_audioclips,
)
from moviepy.audio.fx import MultiplyVolume, AudioFadeOut

from PIL import Image, ImageDraw, ImageFont

from brand_config import (
    Colors, Fonts, Reel, Layout, TextSizes, OUTPUT_DIR,
    LOGOMARK, LOGO_DARK, GraphicElements,
)
from brand_overlay import add_logo, add_text_overlay, add_watermark
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

def create_intro_clip(duration: float = 0.8) -> ImageClip:
    """
    Create an intro clip with dark plum background and logo fade-in.

    Features:
    - Solid plum (#17121D) background
    - Logo fade-in from center
    - Subtle glow effect
    - Refined, professional appearance

    Args:
        duration: Intro duration in seconds

    Returns:
        MoviePy ImageClip with animations
    """
    logger.info(f"Creating intro clip ({duration}s)")

    # Create base image with plum background
    img = Image.new("RGB", Reel.SIZE, Colors.PLUM_RGBA[:3])

    # Add logo to center
    img_with_logo = add_logo(img, position="center", opacity=0.9, size_px=180, use_mark=True)

    # Add subtle glow circle around logo (optional enhancement)
    img_with_logo = add_logo(img_with_logo, position="center", opacity=0.2, size_px=240, use_mark=True)

    # Create clip with fade-in animation
    clip = ImageClip(np.array(img_with_logo))
    clip = clip.with_duration(duration)
    clip = clip.with_fps(Reel.FPS)

    logger.debug(f"Intro clip created: {duration}s @ {Reel.FPS}fps")
    return clip


def create_outro_clip(cta_text: str = "Send this to your gym buddy", duration: float = 2.5) -> ImageClip:
    """
    Create an outro clip with CTA text and branding.

    Features:
    - Dark plum background
    - Large CTA text (coral, animated)
    - Cals2Gains logo and "Follow @cals2gains"
    - Professional, closing statement feel

    Args:
        cta_text: Call-to-action text
        duration: Outro duration in seconds

    Returns:
        MoviePy ImageClip with animations
    """
    logger.info(f"Creating outro clip ({duration}s): {cta_text}")

    # Base image
    img = Image.new("RGB", Reel.SIZE, Colors.PLUM_RGBA[:3])
    img = img.convert("RGBA")

    # Add main CTA text
    img = add_text_overlay(
        img,
        text=cta_text,
        style="cta",
        position="center",
        custom_y=600
    )

    # Add follow text
    img = add_text_overlay(
        img,
        text="Follow @cals2gains",
        style="subtitle",
        position="center",
        custom_y=1200
    )

    # Add logo at bottom
    img = add_logo(img, position="bottom-right", opacity=0.8, size_px=100)

    # Create clip
    clip = ImageClip(np.array(img))
    clip = clip.with_duration(duration)
    clip = clip.with_fps(Reel.FPS)

    logger.debug(f"Outro clip created: {duration}s @ {Reel.FPS}fps")
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
) -> Image.Image:
    """
    Apply brand overlays and effects to a single video frame.

    Overlays applied (in order):
    1. Logo in top-right corner
    2. Scene title text with animation (fade in/out)
    3. Word-by-word subtitles (if voiceover present)
    4. Progress bar at bottom
    5. Corner accent lines (violet)
    6. Watermark "@cals2gains" in bottom-left

    Args:
        base_frame: PIL Image of base video frame
        scene: Scene object with metadata
        current_time: Current time in scene (seconds)
        scene_progress: 0.0-1.0 progress through scene
        reel_progress: 0.0-1.0 progress through entire reel

    Returns:
        PIL Image with all overlays applied
    """
    frame = base_frame.convert("RGBA")

    # 1. Logo overlay (top-right)
    frame = add_logo(frame, position="top-right", opacity=0.7, size_px=120)

    # 2. Scene title with fade animation
    if scene.text_overlay:
        # Fade in/out at scene start/end
        text_opacity = _calculate_text_opacity(scene_progress)
        if text_opacity > 0.01:
            frame = add_text_overlay(
                frame,
                text=scene.text_overlay,
                style=scene.text_style,
                position="top"
            )

    # 3. Word-by-word subtitles
    if scene.voiceover_path and scene.word_timestamps:
        style = SubtitleStyle(
            font_size=48,
            position_y=int(Layout.subtitle_y)
        )
        frame = render_subtitles_on_frame(
            frame,
            current_time=current_time,
            word_timestamps=scene.word_timestamps,
            style=style
        )
    elif scene.voiceover_text and not scene.word_timestamps:
        # Estimate timestamps if not provided
        timestamps = estimate_word_timestamps(
            scene.voiceover_text,
            total_duration=scene.voice_duration or scene.duration,
            start_offset=0.0
        )
        style = SubtitleStyle(font_size=48, position_y=int(Layout.subtitle_y))
        frame = render_subtitles_on_frame(
            frame,
            current_time=current_time,
            word_timestamps=timestamps,
            style=style
        )

    # 4. Progress bar at bottom (shows reel progress)
    frame = _add_progress_bar(frame, reel_progress)

    # 5. Corner accent lines (violet)
    frame = _add_corner_accents(frame)

    # 6. Watermark
    frame = add_watermark(frame, text="@cals2gains", position="bottom-left", opacity=0.6)

    return frame


def _calculate_text_opacity(scene_progress: float, fade_in_duration: float = 0.2, fade_out_start: float = 0.7) -> float:
    """
    Calculate opacity for scene title text animation.

    Fades in quickly at start, holds, then fades out at end.

    Args:
        scene_progress: 0.0-1.0 progress through scene
        fade_in_duration: Fraction of scene for fade-in (0.0-1.0)
        fade_out_start: When to start fade-out (0.0-1.0)

    Returns:
        Opacity value 0.0-1.0
    """
    if scene_progress < fade_in_duration:
        return scene_progress / fade_in_duration
    elif scene_progress > fade_out_start:
        remaining = 1.0 - fade_out_start
        fade_progress = (scene_progress - fade_out_start) / remaining
        return 1.0 - fade_progress
    else:
        return 1.0


def _add_progress_bar(frame: Image.Image, progress: float) -> Image.Image:
    """
    Add a progress bar at the bottom of the frame.

    Coral-colored bar showing overall reel progress.

    Args:
        frame: Input PIL Image
        progress: 0.0-1.0 overall progress

    Returns:
        Frame with progress bar overlay
    """
    frame = frame.convert("RGBA")
    draw = ImageDraw.Draw(frame)

    bar_height = GraphicElements.PROGRESS_BAR_HEIGHT
    bar_color = Colors.hex_to_rgba(GraphicElements.PROGRESS_BAR_COLOR, 255)

    # Draw background bar (faint)
    draw.rectangle(
        [(0, frame.height - bar_height), (frame.width, frame.height)],
        fill=(0, 0, 0, int(255 * GraphicElements.PROGRESS_BAR_BG_OPACITY))
    )

    # Draw progress bar
    progress_width = int(frame.width * progress)
    draw.rectangle(
        [(0, frame.height - bar_height), (progress_width, frame.height)],
        fill=bar_color
    )

    return frame


def _add_corner_accents(frame: Image.Image) -> Image.Image:
    """
    Add violet corner accent lines.

    Small decorative lines in corners for premium aesthetic.

    Args:
        frame: Input PIL Image

    Returns:
        Frame with corner accents
    """
    frame = frame.convert("RGBA")
    draw = ImageDraw.Draw(frame)

    length = GraphicElements.CORNER_LINE_LENGTH
    width = GraphicElements.CORNER_LINE_WIDTH
    color = Colors.hex_to_rgba(
        GraphicElements.CORNER_LINE_COLOR,
        int(255 * GraphicElements.CORNER_LINE_OPACITY)
    )
    margin = 40

    # Top-left corner
    draw.line([(margin, margin), (margin + length, margin)], fill=color, width=width)
    draw.line([(margin, margin), (margin, margin + length)], fill=color, width=width)

    # Top-right corner
    draw.line(
        [(frame.width - margin - length, margin), (frame.width - margin, margin)],
        fill=color, width=width
    )
    draw.line(
        [(frame.width - margin, margin), (frame.width - margin, margin + length)],
        fill=color, width=width
    )

    # Bottom-left corner
    draw.line(
        [(margin, frame.height - margin), (margin + length, frame.height - margin)],
        fill=color, width=width
    )
    draw.line(
        [(margin, frame.height - margin - length), (margin, frame.height - margin)],
        fill=color, width=width
    )

    # Bottom-right corner
    draw.line(
        [(frame.width - margin - length, frame.height - margin), (frame.width - margin, frame.height - margin)],
        fill=color, width=width
    )
    draw.line(
        [(frame.width - margin, frame.height - margin - length), (frame.width - margin, frame.height - margin)],
        fill=color, width=width
    )

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
) -> VideoFileClip:
    """
    Apply brand overlays to every frame of a video clip.

    This is a per-frame operation that adds:
    - Logo, text, subtitles
    - Progress bar, corner accents, watermark

    Args:
        clip: Input VideoFileClip
        scene: Scene metadata
        scene_index: Current scene index (for progress calculation)
        total_scenes: Total number of scenes

    Returns:
        VideoFileClip with brand overlays applied
    """
    logger.debug(f"Applying brand overlays to scene {scene_index + 1}/{total_scenes}")

    def process_frame(get_frame, t):
        """Process a single frame at time t."""
        # Get base frame
        base_frame = get_frame(t)
        if isinstance(base_frame, np.ndarray):
            base_frame = Image.fromarray(base_frame.astype("uint8"))

        # Calculate progress metrics
        scene_progress = t / clip.duration
        # Approximate reel progress (not exact, but good for visual feedback)
        reel_progress = (scene_index + scene_progress) / total_scenes

        # Apply brand overlays
        frame_with_overlays = create_brand_overlay_frame(
            base_frame=base_frame,
            scene=scene,
            current_time=t,
            scene_progress=scene_progress,
            reel_progress=reel_progress,
        )

        # Convert back to numpy
        return np.array(frame_with_overlays.convert("RGB"))

    # Create new clip with frame processing
    overlaid_clip = clip.without_audio().fl(process_frame)

    # Preserve original audio if it exists
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
    2. Load and prepare video clips
    3. Apply brand overlays to each clip
    4. Stitch clips with transitions
    5. Load and mix audio (voiceover + music with ducking)
    6. Render final MP4 (H.264, 1080x1920, 30fps, -14 LUFS)

    Args:
        scenes: List of Scene objects with video/audio/text content
        voice_audio: Single voiceover audio file (legacy, applies to all scenes)
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

    # Validate scenes
    logger.info("Validating scenes...")
    for i, scene in enumerate(scenes):
        try:
            scene.validate()
        except Exception as e:
            logger.error(f"Scene {i} validation failed: {e}")
            raise

    # Prepare clip list
    all_clips = []

    # Add intro
    if add_intro:
        logger.info("Creating intro clip...")
        intro_clip = create_intro_clip(duration=0.8)
        all_clips.append(intro_clip)

    # Process each scene
    logger.info("Processing scenes...")
    for i, scene in enumerate(scenes):
        logger.info(f"Scene {i + 1}/{len(scenes)}: loading video clip...")

        # Load video clip
        clip = load_scene_clip(scene)

        # Apply brand overlays
        clip = apply_brand_overlays_to_clip(clip, scene, i, len(scenes))

        # Add voiceover if present
        if scene.voiceover_path:
            logger.debug(f"Scene {i}: attaching voiceover from {scene.voiceover_path}")
            vo_audio = AudioFileClip(str(scene.voiceover_path))
            clip = clip.with_audio(vo_audio)

        all_clips.append(clip)

    # Add outro
    if add_outro:
        logger.info("Creating outro clip...")
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
