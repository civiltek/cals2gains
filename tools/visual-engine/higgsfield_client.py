"""
Cals2Gains - Open Higgsfield / Muapi AI Client
===============================================
Uses the open-source Higgsfield project backend (muapi.ai) for video generation.
No paid Higgsfield account required — MUAPI_KEY is optional (free/anonymous tier).

Project: https://github.com/anil-matcha/Open-Higgsfield-AI
API docs: https://anil-matcha-open-higgsfield-ai.mintlify.app/

REST API (muapi.ai):
  POST https://api.muapi.ai/api/v1/{model_id}                      — Submit job
  GET  https://api.muapi.ai/api/v1/predictions/{request_id}/result — Poll status
  POST https://api.muapi.ai/api/v1/upload_file                     — Upload file (multipart)

Poll response: { status, outputs, url, output }
  success states : "completed", "succeeded", "success"
  failure states : "failed", "error"
  video URL      : outputs[0]  →  url  →  output.url

Available text-to-video models (subset):
  kling-v2.6-pro-t2v, kling-v3.0-pro-text-to-video
  openai-sora-2-text-to-video, openai-sora
  veo3.1-text-to-video, veo3-text-to-video
  wan2.6-text-to-video, seedance-v2.0-t2v
  runway-text-to-video, hunyuan-text-to-video

Fallback strategy:
  1. Open Higgsfield/Muapi (primary) — no paid account required
  2. Sora 2 via OpenAI Videos API
  3. DALL-E 3 + Ken Burns image effect
"""

import httpx
import time
import os
from pathlib import Path
from typing import Literal, Optional
from dataclasses import dataclass
from enum import Enum

from brand_config import (
    OPENAI_API_KEY, BRAND_VIDEO_SUFFIX, Reel, OUTPUT_DIR
)

# Optional Muapi API key.
# Leave unset for anonymous/free access; set MUAPI_KEY in .env for higher rate limits.
MUAPI_KEY = os.getenv("MUAPI_KEY", "")

TIMEOUT = httpx.Timeout(600.0, connect=30.0)
MAX_RETRIES = 3
POLL_INTERVAL = 2       # seconds between status checks (muapi spec: 2s)
POLL_MAX_ATTEMPTS = 900 # 900 × 2s ≈ 30 min max

# Default models
DEFAULT_T2V_MODEL = "kling-v2.6-pro-t2v"
DEFAULT_I2V_MODEL = "kling-v2.1-i2v-standard"

# Map legacy/shorthand names → muapi model IDs
MODEL_ALIASES: dict[str, str] = {
    "sora-2":    "openai-sora-2-text-to-video",
    "sora":      "openai-sora",
    "kling-3.0": "kling-v3.0-pro-text-to-video",
    "kling":     "kling-v2.6-pro-t2v",
    "veo-3.1":   "veo3.1-text-to-video",
    "veo-3":     "veo3-text-to-video",
    "wan-2.6":   "wan2.6-text-to-video",
    "wan-2.5":   "wan2.5-text-to-video",
    "runway":    "runway-text-to-video",
    "hunyuan":   "hunyuan-text-to-video",
    "seedance":  "seedance-v2.0-t2v",
}


# ===================================================================
# CAMERA PRESETS
# Kept as prompt-appended strings (muapi has no separate camera param)
# ===================================================================

class CameraPresets(str, Enum):
    """Camera movement descriptions appended to video prompts."""
    CINEMATIC_SLOW_ZOOM = "cinematic slow zoom"
    ORBIT_360           = "360 orbit camera"
    DOLLY_IN            = "dolly in"
    CRANE_UP            = "crane up"
    TRACKING_SHOT       = "tracking shot"
    HANDHELD_NATURAL    = "natural handheld camera"
    DRONE_AERIAL        = "aerial drone shot"
    STATIC_LOCKED       = "static locked camera"
    PARALLAX            = "parallax effect"
    WHIP_PAN            = "whip pan"


# ===================================================================
# STYLE PRESETS
# ===================================================================

class StylePresets(str, Enum):
    """Visual style descriptions appended to video prompts."""
    FITNESS_GYM       = "fitness gym aesthetic"
    FOOD_PHOTOGRAPHY  = "professional food photography"
    DARK_MOODY        = "dark moody cinematic"
    BRIGHT_CLEAN      = "bright clean modern"
    CINEMATIC_4K      = "cinematic 4K professional"


# ===================================================================
# DATA CLASSES
# ===================================================================

@dataclass
class VideoJobStatus:
    """Status of a muapi video generation job."""
    request_id: str
    status: str                     # completed, succeeded, failed, etc.
    video_url: Optional[str] = None
    error_message: Optional[str] = None


# ===================================================================
# OPEN HIGGSFIELD / MUAPI CLIENT
# ===================================================================

class HiggsFieldClient:
    """
    Open Higgsfield client backed by muapi.ai.

    No paid Higgsfield account required.  Set MUAPI_KEY in .env for higher
    rate limits; leave unset for anonymous/free access.

    Primary methods:
      generate_video()   — text → video
      image_to_video()   — image → video (auto-uploads image first)
    """

    BASE_URL = "https://api.muapi.ai"

    def __init__(self, api_key: Optional[str] = None):
        """
        Args:
            api_key: Muapi API key. Defaults to MUAPI_KEY env var.
                     Pass "" or None for anonymous access.
        """
        self.api_key = api_key if api_key is not None else MUAPI_KEY

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _log(self, msg: str) -> None:
        print(f"[Higgsfield] {msg}")

    def _headers(self) -> dict:
        """Return JSON request headers; omit x-api-key when no key set."""
        h: dict = {"Content-Type": "application/json"}
        if self.api_key:
            h["x-api-key"] = self.api_key
        return h

    def _resolve_model(self, model: str) -> str:
        """Resolve legacy/shorthand model name to muapi model ID."""
        return MODEL_ALIASES.get(model, model)

    def _retry_with_backoff(self, fn, max_attempts: int = MAX_RETRIES):
        """Run fn() up to max_attempts times with exponential backoff."""
        for attempt in range(max_attempts):
            try:
                return fn()
            except Exception as e:
                if attempt < max_attempts - 1:
                    wait = 2 ** attempt
                    self._log(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait}s...")
                    time.sleep(wait)
                else:
                    raise

    def _extract_video_url(self, result: dict) -> Optional[str]:
        """Extract video URL from a completed poll response."""
        outputs = result.get("outputs")
        if outputs and isinstance(outputs, list) and outputs[0]:
            return outputs[0]
        url = result.get("url")
        if url:
            return url
        output = result.get("output")
        if isinstance(output, dict):
            return output.get("url")
        if isinstance(output, str) and output.startswith("http"):
            return output
        return None

    def _poll_job(self, request_id: str, max_attempts: int = POLL_MAX_ATTEMPTS) -> VideoJobStatus:
        """
        Poll /api/v1/predictions/{request_id}/result until done.

        Raises:
            RuntimeError: on failure status or timeout.
        """
        poll_url = f"{self.BASE_URL}/api/v1/predictions/{request_id}/result"

        for attempt in range(max_attempts):
            try:
                with httpx.Client(timeout=TIMEOUT) as client:
                    resp = client.get(poll_url, headers=self._headers())
                    resp.raise_for_status()
                    data = resp.json()

                status = (data.get("status") or "").lower()

                if status in ("completed", "succeeded", "success"):
                    video_url = self._extract_video_url(data)
                    if not video_url:
                        raise RuntimeError(f"Job done but no video URL in response: {data}")
                    self._log(f"Job {request_id} complete → {video_url}")
                    return VideoJobStatus(
                        request_id=request_id,
                        status=status,
                        video_url=video_url,
                    )

                if status in ("failed", "error"):
                    msg = data.get("error") or data.get("message") or str(data)
                    raise RuntimeError(f"Job {request_id} failed: {msg}")

                self._log(
                    f"Job {request_id}: {status or 'pending'} "
                    f"(attempt {attempt + 1}/{max_attempts})"
                )
                time.sleep(POLL_INTERVAL)

            except httpx.HTTPStatusError as e:
                self._log(f"Poll HTTP error: {e} — retrying...")
                time.sleep(POLL_INTERVAL)
            except RuntimeError:
                raise
            except Exception as e:
                if attempt < max_attempts // 2:
                    time.sleep(POLL_INTERVAL)
                else:
                    raise RuntimeError(f"Failed to poll job {request_id}: {e}")

        raise RuntimeError(
            f"Job {request_id} timed out after {max_attempts * POLL_INTERVAL}s"
        )

    def _download_video(self, video_url: str, output_path: Path) -> Path:
        """
        Stream-download a video from a direct URL to disk.

        Args:
            video_url: Direct HTTPS URL to the video file
            output_path: Destination path (parent dirs created if needed)
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                with client.stream("GET", video_url) as resp:
                    resp.raise_for_status()
                    with open(output_path, "wb") as f:
                        for chunk in resp.iter_bytes(chunk_size=8192):
                            f.write(chunk)
            self._log(f"Downloaded → {output_path}")
            return output_path
        except Exception as e:
            raise RuntimeError(f"Failed to download video: {e}")

    def _upload_file(self, file_path: Path) -> str:
        """
        Upload a file to muapi.ai and return its hosted URL.

        Used for image-to-video: uploads the source image, then passes
        the returned URL to the I2V generation endpoint.
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise RuntimeError(f"File not found: {file_path}")

        upload_url = f"{self.BASE_URL}/api/v1/upload_file"
        headers: dict = {}
        if self.api_key:
            headers["x-api-key"] = self.api_key

        try:
            with open(file_path, "rb") as f:
                files = {"file": (file_path.name, f, "application/octet-stream")}
                with httpx.Client(timeout=TIMEOUT) as client:
                    resp = client.post(upload_url, headers=headers, files=files)
                    resp.raise_for_status()
                    data = resp.json()

            hosted_url = (
                data.get("url")
                or data.get("file_url")
                or (data.get("outputs") or [None])[0]
            )
            if not hosted_url:
                raise RuntimeError(f"No URL in upload response: {data}")

            self._log(f"Uploaded {file_path.name} → {hosted_url}")
            return hosted_url
        except Exception as e:
            raise RuntimeError(f"Failed to upload {file_path.name}: {e}")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_video(
        self,
        prompt: str,
        duration_s: int = 5,
        aspect_ratio: Literal["9:16", "16:9", "1:1"] = "9:16",
        model: str = DEFAULT_T2V_MODEL,
        camera_preset: Optional[CameraPresets] = None,
        style_preset: Optional[StylePresets] = None,
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Generate a video clip from a text prompt.

        Args:
            prompt: Text description of the desired video
            duration_s: Duration in seconds (default 5)
            aspect_ratio: "9:16" (portrait/reels), "16:9", or "1:1"
            model: Muapi model ID or shorthand alias (default: kling-v2.6-pro-t2v)
            camera_preset: Camera movement (appended to prompt)
            style_preset: Visual style (appended to prompt)
            output_path: Where to save the MP4. Defaults to OUTPUT_DIR.

        Returns:
            Path to generated MP4 video
        """
        if output_path is None:
            output_path = OUTPUT_DIR / f"higgsfield_video_{int(time.time())}.mp4"

        model_id = self._resolve_model(model)

        # Enrich prompt with brand suffix and optional presets
        parts = [prompt, BRAND_VIDEO_SUFFIX]
        if camera_preset:
            parts.append(camera_preset.value)
        if style_preset:
            parts.append(style_preset.value)
        full_prompt = ". ".join(parts)

        payload: dict = {
            "prompt": full_prompt,
            "aspect_ratio": aspect_ratio,
            "duration": duration_s,
        }

        self._log(f"Generating video: {prompt[:80]}...")
        self._log(f"  Model: {model_id} | {duration_s}s | {aspect_ratio}")

        def submit():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.BASE_URL}/api/v1/{model_id}",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(submit)
        request_id = (
            job_data.get("request_id")
            or job_data.get("id")
            or job_data.get("job_id")
        )
        if not request_id:
            raise RuntimeError(f"No request_id in submit response: {job_data}")

        self._log(f"Job submitted: {request_id}")
        status = self._poll_job(request_id)
        return self._download_video(status.video_url, output_path)

    def image_to_video(
        self,
        image_path: Path,
        prompt: Optional[str] = None,
        duration_s: int = 5,
        aspect_ratio: Literal["9:16", "16:9", "1:1"] = "9:16",
        camera_preset: Optional[CameraPresets] = None,
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Animate a static image into a video clip.

        Uploads the image to muapi.ai to obtain a hosted URL, then submits
        an image-to-video job with that URL.

        Args:
            image_path: Path to input image (JPG, PNG, WebP)
            prompt: Optional motion description
            duration_s: Duration in seconds
            aspect_ratio: Output aspect ratio
            camera_preset: Camera movement (appended to prompt)
            output_path: Where to save the MP4

        Returns:
            Path to generated video
        """
        image_path = Path(image_path)
        if not image_path.exists():
            raise RuntimeError(f"Image not found: {image_path}")

        if output_path is None:
            output_path = OUTPUT_DIR / f"higgsfield_i2v_{int(time.time())}.mp4"

        # Step 1: upload image → get hosted URL
        image_url = self._upload_file(image_path)

        # Step 2: build payload
        parts = []
        if prompt:
            parts.append(f"{prompt}. {BRAND_VIDEO_SUFFIX}")
        if camera_preset:
            parts.append(camera_preset.value)
        motion_prompt = ". ".join(parts) if parts else None

        payload: dict = {
            "image_url": image_url,
            "aspect_ratio": aspect_ratio,
            "duration": duration_s,
        }
        if motion_prompt:
            payload["prompt"] = motion_prompt

        self._log(f"Image-to-video: {image_path.name}")

        def submit():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.BASE_URL}/api/v1/{DEFAULT_I2V_MODEL}",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(submit)
        request_id = (
            job_data.get("request_id")
            or job_data.get("id")
            or job_data.get("job_id")
        )
        if not request_id:
            raise RuntimeError(f"No request_id in submit response: {job_data}")

        self._log(f"Job submitted: {request_id}")
        status = self._poll_job(request_id)
        return self._download_video(status.video_url, output_path)

    # ------------------------------------------------------------------
    # Stubs for Higgsfield-specific features not available in muapi
    # ------------------------------------------------------------------

    def upscale_video(
        self,
        video_path: Path,
        target_resolution: str = "4K",
        output_path: Optional[Path] = None,
    ) -> Path:
        """Not available in muapi open-source backend. Returns original video."""
        self._log("[WARN] upscale_video not supported by muapi — returning original")
        return Path(video_path)

    def add_lip_sync(
        self,
        video_path: Path,
        audio_path: Path,
        output_path: Optional[Path] = None,
    ) -> Path:
        """Not available in muapi open-source backend."""
        raise NotImplementedError(
            "Lip sync is not available in the muapi open-source backend. "
            "Use a dedicated lip-sync tool instead."
        )

    def optimize_for_social(
        self,
        video_path: Path,
        platform: str = "instagram",
        output_path: Optional[Path] = None,
    ) -> Path:
        """Not available in muapi open-source backend. Returns original video."""
        self._log("[WARN] optimize_for_social not supported by muapi — returning original")
        return Path(video_path)


# ===================================================================
# CONVENIENCE FUNCTION: Scene Clip Generation with Fallback
# ===================================================================

def generate_scene_clip(
    prompt: str,
    duration: int = 5,
    output_path: Optional[Path] = None,
    prefer: Literal["higgsfield", "video", "sora", "image"] = "higgsfield",
    kb_effect: bool = False,
) -> Path:
    """
    Generate a scene clip with automatic fallback strategy.

    Tries in order:
      1. Open Higgsfield via muapi.ai (no paid account required)
      2. Sora 2 via OpenAI Videos API (needs OPENAI key)
      3. DALL-E 3 + Ken Burns image effect (needs OPENAI key)

    Args:
        prompt: Text description of the scene
        duration: Clip duration in seconds
        output_path: Destination path. Defaults to OUTPUT_DIR.
        prefer: "higgsfield"/"video" → muapi first,
                "sora"  → Sora first,
                "image" → image first
        kb_effect: Apply Ken Burns pan/zoom when using image fallback

    Returns:
        Path to generated video/image clip
    """
    if output_path is None:
        output_path = OUTPUT_DIR / f"scene_clip_{int(time.time())}.mp4"

    output_path = Path(output_path)

    # "video" is an alias for "higgsfield" (muapi)
    if prefer in ("higgsfield", "video"):
        methods = ["higgsfield", "sora", "image"]
    elif prefer == "sora":
        methods = ["sora", "higgsfield", "image"]
    else:  # "image"
        methods = ["image", "sora", "higgsfield"]

    for method in methods:
        try:
            if method == "higgsfield":
                client = HiggsFieldClient()
                print(f"[Scene] Trying Open Higgsfield (muapi.ai)...")
                video_path = client.generate_video(
                    prompt=prompt,
                    duration_s=min(duration, 10),
                    aspect_ratio="9:16",
                    model=DEFAULT_T2V_MODEL,
                    camera_preset=CameraPresets.CINEMATIC_SLOW_ZOOM,
                    style_preset=StylePresets.CINEMATIC_4K,
                    output_path=output_path,
                )
                print(f"[Scene] Open Higgsfield OK → {video_path}")
                return video_path

            elif method == "sora":
                if not OPENAI_API_KEY:
                    print("[Scene] OpenAI API key not set, skipping Sora...")
                    continue

                print("[Scene] Trying Sora 2...")
                from video_generator import generate_sora
                video_path = generate_sora(
                    prompt=prompt,
                    duration=duration,
                    size="720x1280",
                    output_path=output_path,
                )
                print(f"[Scene] Sora 2 OK → {video_path}")
                return video_path

            elif method == "image":
                if not OPENAI_API_KEY:
                    print("[Scene] OpenAI API key not set, skipping image fallback...")
                    continue

                print("[Scene] Trying DALL-E 3 + Ken Burns...")
                from image_generator import generate_dalle3
                image = generate_dalle3(prompt=prompt)

                if kb_effect:
                    from post_processing import apply_ken_burns_effect
                    print("[Scene] Applying Ken Burns effect...")
                    video_path = apply_ken_burns_effect(
                        image=image,
                        duration_s=duration,
                        output_path=output_path,
                    )
                    print(f"[Scene] Ken Burns OK → {video_path}")
                    return video_path
                else:
                    import tempfile
                    temp_image = Path(tempfile.gettempdir()) / f"temp_image_{int(time.time())}.png"
                    image.save(str(temp_image))
                    print(f"[Scene] Image saved (no video conversion): {temp_image}")
                    return temp_image

        except Exception as e:
            print(f"[Scene] {method} failed: {e}")
            continue

    raise RuntimeError(
        f"All scene generation methods failed. Tried: {', '.join(methods)}"
    )


if __name__ == "__main__":
    # Quick smoke-test (no API key required for free/anonymous access)
    client = HiggsFieldClient()
    print(f"[Test] Client initialized. API key set: {bool(client.api_key)}")
    print(f"[Test] Base URL: {client.BASE_URL}")
    print(f"[Test] Default model: {DEFAULT_T2V_MODEL}")
    print("[Test] To generate a video: python create_reel.py --demo")
