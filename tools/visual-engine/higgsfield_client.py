"""
Cals2Gains - Higgsfield AI Cloud API Client
============================================
Wraps Higgsfield (cloud.higgsfield.ai) for video generation, upscaling,
lip sync, and social optimization. Primary video generation backend with
fallback to OpenAI Sora 2 and Ken Burns image effect.

Higgsfield Features:
  - 12+ video models: Sora 2, Kling 3.0, Veo 3.1, etc.
  - 70+ camera presets (cinematic, drone, tracking, etc.)
  - 4K-8K upscaler with motion compensation
  - Automatic lip sync for video + audio
  - Social media optimization (Instagram, TikTok, YouTube Shorts)
  - Native 9:16 vertical video (perfect for reels)
  - Image-to-video capability
  - Max 15 seconds per clip (chain multiple for longer content)

REST API Reference (cloud.higgsfield.ai v1):
  POST /v1/videos/generate       - Create video generation job
  GET  /v1/videos/{job_id}       - Poll async job status
  GET  /v1/videos/{job_id}/download - Download completed video
  POST /v1/videos/image-to-video - Convert static image to video
  POST /v1/videos/upscale        - 4K-8K upscaling
  POST /v1/videos/lip-sync       - Lip sync audio to video
  POST /v1/videos/optimize       - Optimize for social platforms

Fallback Strategy:
  1. Try Higgsfield (primary) - best quality, fastest
  2. Fallback to Sora 2 (OpenAI Videos API)
  3. Fallback to DALL-E 3 + Ken Burns (image + pan/zoom effect)
"""

import httpx
import json
import time
import os
from pathlib import Path
from typing import Literal, Optional
from dataclasses import dataclass
from enum import Enum

from brand_config import (
    OPENAI_API_KEY, BRAND_VIDEO_SUFFIX, Reel, OUTPUT_DIR
)

# Load Higgsfield API key from environment
HIGGSFIELD_API_KEY = os.getenv("HIGGSFIELD_API_KEY", "")

TIMEOUT = httpx.Timeout(600.0, connect=30.0)
MAX_RETRIES = 3
POLL_INTERVAL = 5         # seconds between status checks
POLL_MAX_WAIT = 900       # 15 minutes max wait for video generation


# ===================================================================
# CAMERA PRESETS - 70+ available, hardcoding most popular ones
# ===================================================================

class CameraPresets(str, Enum):
    """Popular camera movement presets for cinematic video generation."""
    CINEMATIC_SLOW_ZOOM = "cinematic_slow_zoom"
    ORBIT_360 = "orbit_360"
    DOLLY_IN = "dolly_in"
    CRANE_UP = "crane_up"
    TRACKING_SHOT = "tracking_shot"
    HANDHELD_NATURAL = "handheld_natural"
    DRONE_AERIAL = "drone_aerial"
    STATIC_LOCKED = "static_locked"
    PARALLAX = "parallax"
    WHIP_PAN = "whip_pan"


# ===================================================================
# STYLE PRESETS - Common aesthetic presets
# ===================================================================

class StylePresets(str, Enum):
    """Style/mood presets for video generation."""
    FITNESS_GYM = "fitness_gym"
    FOOD_PHOTOGRAPHY = "food_photography"
    DARK_MOODY = "dark_moody"
    BRIGHT_CLEAN = "bright_clean"
    CINEMATIC_4K = "cinematic_4k"


# ===================================================================
# DATA CLASSES FOR API RESPONSES
# ===================================================================

@dataclass
class VideoJobStatus:
    """Status of a Higgsfield video generation job."""
    job_id: str
    status: str  # queued, in_progress, completed, failed
    progress: int  # 0-100
    estimated_remaining_s: Optional[int] = None
    error_message: Optional[str] = None
    download_url: Optional[str] = None


# ===================================================================
# HIGGSFIELD CLIENT
# ===================================================================

class HiggsFieldClient:
    """
    Wraps Higgsfield AI Cloud API for video generation and processing.

    Handles:
      - Video generation from text prompts
      - Image-to-video conversion
      - 4K-8K upscaling
      - Lip sync (video + audio)
      - Social media optimization
      - Async polling with exponential backoff
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Higgsfield client.

        Args:
            api_key: Higgsfield API key. If not provided, uses HIGGSFIELD_API_KEY env var.

        Raises:
            RuntimeError: If no API key is available.
        """
        self.api_key = api_key or HIGGSFIELD_API_KEY
        if not self.api_key:
            raise RuntimeError(
                "HIGGSFIELD_API_KEY not set. Set via env var or pass api_key parameter."
            )
        self.base_url = "https://api.cloud.higgsfield.ai/v1"

    def _log(self, msg: str) -> None:
        """Log with [Higgsfield] prefix."""
        print(f"[Higgsfield] {msg}")

    def _headers(self) -> dict:
        """Build authorization headers."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _retry_with_backoff(self, fn, max_attempts: int = MAX_RETRIES):
        """
        Retry function with exponential backoff.

        Args:
            fn: Callable to retry
            max_attempts: Maximum number of attempts

        Returns:
            Result of fn() on success

        Raises:
            Exception: If all attempts fail
        """
        for attempt in range(max_attempts):
            try:
                return fn()
            except Exception as e:
                if attempt < max_attempts - 1:
                    wait_time = 2 ** attempt
                    self._log(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise

    def _poll_job(self, job_id: str, timeout_s: int = POLL_MAX_WAIT) -> VideoJobStatus:
        """
        Poll a job until completion or timeout.

        Args:
            job_id: Job ID to poll
            timeout_s: Max seconds to wait

        Returns:
            VideoJobStatus with final status and optional download URL

        Raises:
            RuntimeError: If job fails or times out
        """
        start_time = time.time()

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_s:
                raise RuntimeError(f"Job {job_id} timed out after {timeout_s}s")

            try:
                with httpx.Client(timeout=TIMEOUT) as client:
                    resp = client.get(
                        f"{self.base_url}/videos/{job_id}",
                        headers=self._headers(),
                    )
                    resp.raise_for_status()
                    data = resp.json()

                    status = VideoJobStatus(
                        job_id=job_id,
                        status=data.get("status", "unknown"),
                        progress=data.get("progress", 0),
                        estimated_remaining_s=data.get("estimated_remaining_s"),
                        error_message=data.get("error_message"),
                        download_url=data.get("download_url"),
                    )

                    if status.status == "completed":
                        self._log(f"Job {job_id} completed. Download URL: {status.download_url}")
                        return status

                    if status.status == "failed":
                        raise RuntimeError(f"Job failed: {status.error_message}")

                    self._log(
                        f"Job {job_id}: {status.status} "
                        f"({status.progress}% - ~{status.estimated_remaining_s}s remaining)"
                    )
                    time.sleep(POLL_INTERVAL)

            except httpx.HTTPError as e:
                if elapsed < timeout_s / 2:
                    time.sleep(POLL_INTERVAL)
                else:
                    raise RuntimeError(f"Failed to poll job {job_id}: {e}")

    def _download_video(self, job_id: str, output_path: Path) -> Path:
        """
        Download completed video from Higgsfield.

        Args:
            job_id: Job ID to download
            output_path: Where to save the video

        Returns:
            Path to saved video

        Raises:
            RuntimeError: If download fails
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                with client.stream(
                    "GET",
                    f"{self.base_url}/videos/{job_id}/download",
                    headers=self._headers(),
                ) as resp:
                    resp.raise_for_status()
                    with open(output_path, "wb") as f:
                        for chunk in resp.iter_bytes(chunk_size=8192):
                            f.write(chunk)

            self._log(f"Downloaded video to {output_path}")
            return output_path

        except Exception as e:
            raise RuntimeError(f"Failed to download video: {e}")

    def generate_video(
        self,
        prompt: str,
        duration_s: int = 8,
        aspect_ratio: Literal["9:16", "16:9", "1:1"] = "9:16",
        model: str = "sora-2",
        camera_preset: Optional[CameraPresets] = None,
        style_preset: Optional[StylePresets] = None,
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Generate a video clip from a text prompt.

        Args:
            prompt: Text description of desired video
            duration_s: Duration in seconds (1-15, default 8)
            aspect_ratio: "9:16" (portrait/reels), "16:9" (landscape), "1:1" (square)
            model: Video model (default "sora-2", also: "kling-3.0", "veo-3.1", etc.)
            camera_preset: Camera movement preset (e.g., CINEMATIC_SLOW_ZOOM)
            style_preset: Visual style preset (e.g., FITNESS_GYM)
            output_path: Where to save output MP4. If None, uses OUTPUT_DIR.

        Returns:
            Path to generated MP4 video

        Raises:
            RuntimeError: If generation fails
        """
        if output_path is None:
            output_path = OUTPUT_DIR / f"higgsfield_video_{int(time.time())}.mp4"

        # Clamp duration
        duration_s = max(1, min(15, int(duration_s)))

        # Build prompt with brand suffix
        full_prompt = f"{prompt}. {BRAND_VIDEO_SUFFIX}"

        payload = {
            "prompt": full_prompt,
            "duration_seconds": duration_s,
            "aspect_ratio": aspect_ratio,
            "model": model,
        }

        if camera_preset:
            payload["camera_preset"] = camera_preset.value

        if style_preset:
            payload["style_preset"] = style_preset.value

        self._log(f"Generating video: {prompt[:80]}...")
        self._log(f"  Duration: {duration_s}s | Aspect: {aspect_ratio} | Model: {model}")
        if camera_preset:
            self._log(f"  Camera: {camera_preset.value}")
        if style_preset:
            self._log(f"  Style: {style_preset.value}")

        def create_job():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.base_url}/videos/generate",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(create_job)
        job_id = job_data.get("job_id")

        if not job_id:
            raise RuntimeError(f"No job_id in response: {job_data}")

        self._log(f"Job created: {job_id}")

        # Poll until completion
        status = self._poll_job(job_id)

        # Download video
        return self._download_video(job_id, output_path)

    def image_to_video(
        self,
        image_path: Path,
        prompt: Optional[str] = None,
        duration_s: int = 8,
        aspect_ratio: Literal["9:16", "16:9", "1:1"] = "9:16",
        camera_preset: Optional[CameraPresets] = None,
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Convert a static image to video with motion.

        Args:
            image_path: Path to input image (JPG, PNG, WebP)
            prompt: Optional text description to guide the motion
            duration_s: Video duration in seconds (1-15)
            aspect_ratio: Output aspect ratio
            camera_preset: Camera movement preset
            output_path: Where to save output MP4

        Returns:
            Path to generated video

        Raises:
            RuntimeError: If conversion fails or image not found
        """
        image_path = Path(image_path)
        if not image_path.exists():
            raise RuntimeError(f"Image not found: {image_path}")

        if output_path is None:
            output_path = OUTPUT_DIR / f"higgsfield_i2v_{int(time.time())}.mp4"

        # Read image as base64
        with open(image_path, "rb") as f:
            import base64
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

        payload = {
            "image_base64": image_b64,
            "duration_seconds": max(1, min(15, int(duration_s))),
            "aspect_ratio": aspect_ratio,
        }

        if prompt:
            payload["motion_prompt"] = f"{prompt}. {BRAND_VIDEO_SUFFIX}"

        if camera_preset:
            payload["camera_preset"] = camera_preset.value

        self._log(f"Converting image to video: {image_path.name}")
        if prompt:
            self._log(f"  Motion prompt: {prompt[:60]}...")

        def create_job():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.base_url}/videos/image-to-video",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(create_job)
        job_id = job_data.get("job_id")

        if not job_id:
            raise RuntimeError(f"No job_id in response: {job_data}")

        self._log(f"Job created: {job_id}")
        status = self._poll_job(job_id)
        return self._download_video(job_id, output_path)

    def upscale_video(
        self,
        video_path: Path,
        target_resolution: Literal["2K", "4K", "8K"] = "4K",
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Upscale a video to higher resolution with motion compensation.

        Args:
            video_path: Path to input video (MP4, WebM)
            target_resolution: "2K" (2560x1440), "4K" (3840x2160), "8K" (7680x4320)
            output_path: Where to save upscaled video

        Returns:
            Path to upscaled video

        Raises:
            RuntimeError: If upscaling fails
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise RuntimeError(f"Video not found: {video_path}")

        if output_path is None:
            output_path = OUTPUT_DIR / f"upscaled_{target_resolution}_{int(time.time())}.mp4"

        with open(video_path, "rb") as f:
            import base64
            video_b64 = base64.b64encode(f.read()).decode("utf-8")

        payload = {
            "video_base64": video_b64,
            "target_resolution": target_resolution,
        }

        self._log(f"Upscaling video to {target_resolution}: {video_path.name}")

        def create_job():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.base_url}/videos/upscale",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(create_job)
        job_id = job_data.get("job_id")

        if not job_id:
            raise RuntimeError(f"No job_id in response: {job_data}")

        self._log(f"Job created: {job_id}")
        status = self._poll_job(job_id, timeout_s=1800)  # 30 min timeout for upscaling
        return self._download_video(job_id, output_path)

    def add_lip_sync(
        self,
        video_path: Path,
        audio_path: Path,
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Add lip sync to a video using audio track.

        Args:
            video_path: Path to input video (MP4, WebM)
            audio_path: Path to audio file (MP3, WAV, AAC)
            output_path: Where to save lip-synced video

        Returns:
            Path to lip-synced video

        Raises:
            RuntimeError: If lip sync fails
        """
        video_path = Path(video_path)
        audio_path = Path(audio_path)

        if not video_path.exists():
            raise RuntimeError(f"Video not found: {video_path}")
        if not audio_path.exists():
            raise RuntimeError(f"Audio not found: {audio_path}")

        if output_path is None:
            output_path = OUTPUT_DIR / f"lipsynced_{int(time.time())}.mp4"

        with open(video_path, "rb") as f:
            import base64
            video_b64 = base64.b64encode(f.read()).decode("utf-8")

        with open(audio_path, "rb") as f:
            import base64
            audio_b64 = base64.b64encode(f.read()).decode("utf-8")

        payload = {
            "video_base64": video_b64,
            "audio_base64": audio_b64,
        }

        self._log(f"Adding lip sync: {video_path.name} + {audio_path.name}")

        def create_job():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.base_url}/videos/lip-sync",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(create_job)
        job_id = job_data.get("job_id")

        if not job_id:
            raise RuntimeError(f"No job_id in response: {job_data}")

        self._log(f"Job created: {job_id}")
        status = self._poll_job(job_id)
        return self._download_video(job_id, output_path)

    def optimize_for_social(
        self,
        video_path: Path,
        platform: Literal["instagram", "tiktok", "youtube_shorts"] = "instagram",
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Optimize video for social media platform (auto-crop, color grade, etc.).

        Args:
            video_path: Path to input video
            platform: Target platform ("instagram", "tiktok", "youtube_shorts")
            output_path: Where to save optimized video

        Returns:
            Path to optimized video

        Raises:
            RuntimeError: If optimization fails
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise RuntimeError(f"Video not found: {video_path}")

        if output_path is None:
            output_path = OUTPUT_DIR / f"optimized_{platform}_{int(time.time())}.mp4"

        with open(video_path, "rb") as f:
            import base64
            video_b64 = base64.b64encode(f.read()).decode("utf-8")

        payload = {
            "video_base64": video_b64,
            "platform": platform,
        }

        self._log(f"Optimizing video for {platform}: {video_path.name}")

        def create_job():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.base_url}/videos/optimize",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(create_job)
        job_id = job_data.get("job_id")

        if not job_id:
            raise RuntimeError(f"No job_id in response: {job_data}")

        self._log(f"Job created: {job_id}")
        status = self._poll_job(job_id)
        return self._download_video(job_id, output_path)


# ===================================================================
# CONVENIENCE FUNCTION: Scene Clip Generation with Fallback
# ===================================================================

def generate_scene_clip(
    prompt: str,
    duration: int = 8,
    output_path: Optional[Path] = None,
    prefer: Literal["higgsfield", "sora", "image"] = "higgsfield",
    kb_effect: bool = False,
) -> Path:
    """
    Generate a scene clip with automatic fallback strategy.

    Tries generation in order of preference, falling back through:
      1. Higgsfield (primary) - best quality, fastest, 70+ models
      2. Sora 2 (OpenAI Videos API) - fast, reliable
      3. DALL-E 3 + Ken Burns effect - image-based fallback with pan/zoom

    Args:
        prompt: Text description of desired scene
        duration: Clip duration in seconds (1-15)
        output_path: Where to save output. If None, uses OUTPUT_DIR.
        prefer: Preferred primary method ("higgsfield", "sora", or "image")
        kb_effect: If True and using image fallback, apply Ken Burns pan/zoom

    Returns:
        Path to generated video clip (MP4)

    Raises:
        RuntimeError: If all fallback methods fail
    """
    if output_path is None:
        output_path = OUTPUT_DIR / f"scene_clip_{int(time.time())}.mp4"

    output_path = Path(output_path)

    # Determine fallback order based on preference
    if prefer == "higgsfield":
        methods = ["higgsfield", "sora", "image"]
    elif prefer == "sora":
        methods = ["sora", "higgsfield", "image"]
    else:  # prefer == "image"
        methods = ["image", "sora", "higgsfield"]

    for method in methods:
        try:
            if method == "higgsfield":
                if not HIGGSFIELD_API_KEY:
                    print("[Scene] Higgsfield API key not set, skipping...")
                    continue

                client = HiggsFieldClient()
                print(f"[Scene] Trying Higgsfield...")
                video_path = client.generate_video(
                    prompt=prompt,
                    duration_s=duration,
                    aspect_ratio="9:16",
                    model="sora-2",
                    camera_preset=CameraPresets.CINEMATIC_SLOW_ZOOM,
                    style_preset=StylePresets.CINEMATIC_4K,
                    output_path=output_path,
                )
                print(f"[Scene] Higgsfield OK -> {video_path}")
                return video_path

            elif method == "sora":
                if not OPENAI_API_KEY:
                    print("[Scene] OpenAI API key not set, skipping Sora...")
                    continue

                print(f"[Scene] Trying Sora 2...")
                from video_generator import generate_sora
                video_path = generate_sora(
                    prompt=prompt,
                    duration=duration,
                    size="720x1280",
                    output_path=output_path,
                )
                print(f"[Scene] Sora 2 OK -> {video_path}")
                return video_path

            elif method == "image":
                if not OPENAI_API_KEY:
                    print("[Scene] OpenAI API key not set, cannot generate image...")
                    continue

                print(f"[Scene] Trying DALL-E 3 + Ken Burns...")
                from image_generator import generate_dalle3
                from post_processing import apply_ken_burns_effect

                # Generate base image
                image = generate_dalle3(prompt=prompt)

                # Apply Ken Burns if requested
                if kb_effect:
                    print("[Scene] Applying Ken Burns effect...")
                    video_path = apply_ken_burns_effect(
                        image=image,
                        duration_s=duration,
                        output_path=output_path,
                    )
                else:
                    # Just convert image to video (static)
                    import tempfile
                    temp_image = Path(tempfile.gettempdir()) / f"temp_image_{int(time.time())}.png"
                    image.save(str(temp_image))
                    # Placeholder: would need image-to-video conversion
                    print(f"[Scene] Image saved (no video conversion): {temp_image}")
                    return temp_image

                print(f"[Scene] Ken Burns OK -> {video_path}")
                return video_path

        except Exception as e:
            print(f"[Scene] {method} failed: {e}")
            continue

    raise RuntimeError(
        f"All scene generation methods failed. "
        f"Tried: {', '.join(methods)}"
    )


if __name__ == "__main__":
    # Example usage (requires HIGGSFIELD_API_KEY env var)
    try:
        client = HiggsFieldClient()

        # Test video generation
        prompt = "Fit woman doing kettlebell swings in a modern gym with moody lighting"
        video = client.generate_video(
            prompt=prompt,
            duration_s=8,
            aspect_ratio="9:16",
            camera_preset=CameraPresets.TRACKING_SHOT,
            style_preset=StylePresets.FITNESS_GYM,
        )
        print(f"Generated video: {video}")

    except RuntimeError as e:
        print(f"Error: {e}")
        print("Make sure HIGGSFIELD_API_KEY is set in your .env file")
