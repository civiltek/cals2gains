"""
Cals2Gains - AI Video Generator v3.0 (Higgsfield Primary)
==========================================================
Generates short video clips for Instagram Reels.

Primary:   Higgsfield AI (cloud.higgsfield.ai) — kling-v2.5, dop-turbo, wan-2.5
Secondary: OpenAI Sora 2 (Videos API) — deprecated Sept 2026
Fallback:  gpt-image-1.5 + advanced Ken Burns

Higgsfield replaces Sora 2 as the primary video generation backend.
Sora 2 is kept as fallback until its shutdown date (September 24, 2026).
"""

import httpx
import base64
import json
import io
import time
from pathlib import Path
from PIL import Image
import numpy as np

from brand_config import (
    OPENAI_API_KEY, GEMINI_API_KEY, BRAND_VIDEO_SUFFIX,
    Reel, OUTPUT_DIR
)

TIMEOUT = httpx.Timeout(300.0, connect=30.0)
MAX_RETRIES = 2
POLL_INTERVAL = 15       # seconds between status checks
POLL_MAX_WAIT = 600      # 10 minutes max wait

# Only these values are accepted by the Sora 2 API (strings)
VALID_SORA_SECONDS = [4, 8, 12]

def _snap_to_valid_seconds(requested: int) -> int:
    """Snap a requested duration to the nearest valid Sora 2 value (4, 8, or 12)."""
    best = min(VALID_SORA_SECONDS, key=lambda v: abs(v - requested))
    if best != requested:
        print(f"[Sora 2] Snapping duration {requested}s -> {best}s (API constraint)")
    return best


def _brand_video_prompt(user_prompt: str) -> str:
    return f"{user_prompt}. {BRAND_VIDEO_SUFFIX}"


# ===================================================================
# OPENAI SORA 2 - Videos API (correct endpoints from API reference)
# ===================================================================

def generate_sora(
    prompt: str,
    duration: int = 8,
    size: str = "720x1280",
    model: str = "sora-2",
    output_path: Path | None = None,
) -> Path:
    """Generate a video clip with OpenAI Sora 2 Videos API.

    Endpoint: POST https://api.openai.com/v1/videos
    Response: Video object with id, status (queued -> in_progress -> completed)
    Download: GET /v1/videos/{id}/content?variant=video
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not set")

    full_prompt = _brand_video_prompt(prompt)
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    # Snap duration to valid Sora 2 value (4, 8, or 12)
    duration = _snap_to_valid_seconds(int(duration))

    # Sora 2 payload - seconds must be string per API spec
    payload = {
        "model": model,
        "prompt": full_prompt,
        "size": size,
        "seconds": str(duration),
    }

    print(f"[Sora 2] Creating video: model={model}, size={size}, seconds={duration}")
    print(f"[Sora 2] Prompt: {full_prompt[:120]}...")

    for attempt in range(MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                # Step 1: Create video generation job
                resp = client.post(
                    "https://api.openai.com/v1/videos",
                    headers=headers,
                    json=payload,
                )
                resp.raise_for_status()
                video_job = resp.json()

                video_id = video_job.get("id")
                status = video_job.get("status", "unknown")
                print(f"[Sora 2] Job created: {video_id} (status: {status})")

                if not video_id:
                    raise ValueError(f"No video ID in response: {video_job}")

                # Step 2: Poll until completed
                video_data = _poll_sora2(client, headers, video_id)

                # Step 3: Download the video content
                print(f"[Sora 2] Downloading video content...")
                dl_resp = client.get(
                    f"https://api.openai.com/v1/videos/{video_id}/content",
                    params={"variant": "video"},
                    headers=headers,
                )
                dl_resp.raise_for_status()
                video_bytes = dl_resp.content

                # Save to disk
                if output_path is None:
                    output_path = OUTPUT_DIR / f"sora2_{int(time.time())}.mp4"
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_bytes(video_bytes)

                size_mb = len(video_bytes) / (1024 * 1024)
                print(f"[Sora 2] [OK] Saved ({size_mb:.1f}MB) -> {output_path}")
                return output_path

        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_body = ""
            try:
                error_body = e.response.json()
            except:
                error_body = e.response.text[:500]

            print(f"[Sora 2] HTTP {status_code}: {error_body}")

            # Don't retry on auth/permission errors
            if status_code in (401, 403):
                raise RuntimeError(
                    f"Sora 2 auth error ({status_code}). Check API key permissions."
                ) from e
            # Don't retry if endpoint doesn't exist
            if status_code in (404, 405):
                raise RuntimeError(
                    f"Sora 2 Videos API not available ({status_code}). "
                    f"Check if your API key has Sora access enabled."
                ) from e
            # Rate limit - respect retry-after
            if status_code == 429:
                retry_after = int(e.response.headers.get("retry-after", 30))
                print(f"[Sora 2] Rate limited, waiting {retry_after}s...")
                time.sleep(retry_after)
                continue

            if attempt < MAX_RETRIES:
                wait = 3 ** (attempt + 1)
                print(f"[Sora 2] Retry {attempt+1}/{MAX_RETRIES} in {wait}s...")
                time.sleep(wait)
            else:
                raise RuntimeError(f"Sora 2 failed after {MAX_RETRIES+1} attempts: {error_body}")

        except Exception as e:
            print(f"[Sora 2] Attempt {attempt+1} error: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(3 ** (attempt + 1))
            else:
                raise RuntimeError(f"Sora 2 generation failed: {e}")


def _poll_sora2(client, headers, video_id, max_wait=None):
    """Poll GET /v1/videos/{video_id} until terminal state."""
    max_wait = max_wait or POLL_MAX_WAIT
    start = time.time()
    interval = POLL_INTERVAL

    while True:
        elapsed = time.time() - start
        if elapsed > max_wait:
            raise RuntimeError(
                f"Sora 2 video {video_id} timed out after {elapsed:.0f}s"
            )

        resp = client.get(
            f"https://api.openai.com/v1/videos/{video_id}",
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

        status = data.get("status", "unknown")
        progress = data.get("progress", 0)

        if status == "completed":
            print(f"[Sora 2] [OK] Video completed in {elapsed:.0f}s")
            return data
        elif status == "failed":
            error = data.get("error", {})
            error_msg = error.get("message", "Unknown error") if isinstance(error, dict) else str(error)
            raise RuntimeError(f"Sora 2 video failed: {error_msg}")

        print(f"[Sora 2] Status: {status} ({progress}%) - {elapsed:.0f}s elapsed")
        time.sleep(interval)
        # Gentle backoff capped at 30s
        interval = min(interval * 1.2, 30)


# ===================================================================
# GOOGLE VEO 2 - Secondary video provider
# ===================================================================

def generate_veo2(prompt: str, duration: int = 5, output_path: Path | None = None) -> Path:
    """Generate a video clip with Google Veo 2."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")
    full_prompt = _brand_video_prompt(prompt)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/veo-002:generateVideo?key={GEMINI_API_KEY}"
    payload = {
        "instances": [{"prompt": full_prompt}],
        "parameters": {"aspectRatio": "9:16", "durationSeconds": duration, "sampleCount": 1},
    }
    for attempt in range(MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                if "name" in data:
                    video_bytes = _poll_veo2(client, data["name"])
                elif "predictions" in data:
                    vb = data["predictions"][0].get("bytesBase64Encoded", "")
                    video_bytes = base64.b64decode(vb) if vb else client.get(data["predictions"][0]["uri"]).content
                else:
                    raise ValueError("Unexpected Veo 2 response")
                if output_path is None:
                    output_path = OUTPUT_DIR / f"veo2_{int(time.time())}.mp4"
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_bytes(video_bytes)
                print(f"[Veo 2] Saved -> {output_path}")
                return output_path
        except Exception as e:
            print(f"[Veo 2] Attempt {attempt+1} failed: {e}")
            if attempt < MAX_RETRIES: time.sleep(3 ** attempt)
            else: raise RuntimeError(f"Veo 2 generation failed: {e}")


def _poll_veo2(client, op_name, max_wait=300):
    url = f"https://generativelanguage.googleapis.com/v1beta/{op_name}"
    start = time.time()
    while time.time() - start < max_wait:
        data = client.get(url).json()
        if data.get("done"):
            r = data.get("response", {})
            vb = r.get("predictions", [{}])[0].get("bytesBase64Encoded", "")
            if vb: return base64.b64decode(vb)
            vu = r.get("predictions", [{}])[0].get("uri", "")
            if vu: return client.get(vu).content
            raise RuntimeError("Veo 2 completed but no video data")
        time.sleep(10)
    raise RuntimeError("Veo 2 timed out")


# ===================================================================
# ADVANCED KEN BURNS FALLBACK
# ===================================================================

def ken_burns_from_image(
    image, duration: float = 5.0, output_path: Path | None = None,
    effect: str = "zoom_in",
) -> Path:
    """Create a professional video clip from a static image using Ken Burns effect.

    Studio-grade features:
    - Cubic ease-in-out for natural camera movement
    - 2.5x upscale for maximum quality headroom
    - Subtle parallax breathing on all effects
    - Combined motion paths (zoom + pan simultaneously)
    """
    from moviepy import VideoClip

    if isinstance(image, (str, Path)):
        image = Image.open(image).convert("RGB")
    elif isinstance(image, Image.Image):
        image = image.convert("RGB")

    target_w, target_h = Reel.WIDTH, Reel.HEIGHT
    # Higher upscale for more quality headroom
    upscale_factor = 2.5
    upscale_w, upscale_h = int(target_w * upscale_factor), int(target_h * upscale_factor)
    image_up = image.resize((upscale_w, upscale_h), Image.LANCZOS)
    img_array = np.array(image_up)

    def _ease_in_out(t):
        """Cubic ease-in-out for natural camera motion."""
        if t < 0.5:
            return 4 * t * t * t
        return 1 - (-2 * t + 2) ** 3 / 2

    def _ease_out(t):
        return 1 - (1 - t) ** 3

    def _ease_in(t):
        return t * t * t

    def _breath(t, freq=0.8, amp=0.005):
        """Subtle breathing motion for organic feel."""
        import math
        return amp * math.sin(2 * math.pi * freq * t)

    def make_frame(t):
        raw_progress = t / max(duration, 0.001)
        p = _ease_in_out(raw_progress)
        breath = _breath(t)

        if effect == "zoom_in":
            scale = 1.0 + 0.35 * p + breath
            cx = upscale_w / 2 + upscale_w * 0.01 * p  # Subtle drift
            cy = upscale_h / 2 - upscale_h * 0.005 * p
        elif effect == "zoom_out":
            scale = 1.35 - 0.35 * p + breath
            cx, cy = upscale_w / 2, upscale_h / 2
        elif effect == "pan_left":
            scale = 1.18 + breath
            cx = upscale_w * 0.33 + (upscale_w * 0.34) * p
            cy = upscale_h / 2 + upscale_h * 0.02 * _breath(t, 0.3, 1)  # Vertical drift
        elif effect == "pan_right":
            scale = 1.18 + breath
            cx = upscale_w * 0.67 - (upscale_w * 0.34) * p
            cy = upscale_h / 2 + upscale_h * 0.02 * _breath(t, 0.3, 1)
        elif effect == "pan_up":
            scale = 1.18 + breath
            cx = upscale_w / 2
            cy = upscale_h * 0.62 - (upscale_h * 0.24) * p
        elif effect == "diagonal":
            # Combined zoom + diagonal pan — cinematic feel
            scale = 1.1 + 0.25 * p + breath
            cx = upscale_w * 0.38 + (upscale_w * 0.24) * p
            cy = upscale_h * 0.58 - (upscale_h * 0.16) * p
        elif effect == "zoom_punch":
            # Dramatic punch: fast zoom in, slow settle back
            if raw_progress < 0.25:
                punch_t = _ease_in(raw_progress / 0.25)
                scale = 1.0 + 0.50 * punch_t
            else:
                settle_t = _ease_out((raw_progress - 0.25) / 0.75)
                scale = 1.50 - 0.15 * settle_t
            scale += breath * 0.5
            cx, cy = upscale_w / 2, upscale_h / 2
        elif effect == "orbit":
            # Circular orbit around center — premium look
            import math
            angle = p * math.pi * 0.35  # ~63 degrees arc
            orbit_r = upscale_w * 0.08
            scale = 1.20 + 0.1 * p + breath
            cx = upscale_w / 2 + orbit_r * math.cos(angle)
            cy = upscale_h / 2 + orbit_r * math.sin(angle) * 0.6
        elif effect == "drift":
            # Very slow, subtle drift — great for mood shots
            import math
            scale = 1.12 + 0.08 * p + breath
            cx = upscale_w / 2 + upscale_w * 0.03 * math.sin(p * math.pi)
            cy = upscale_h / 2 - upscale_h * 0.02 * p
        else:
            scale = 1.0 + 0.25 * p + breath
            cx, cy = upscale_w / 2, upscale_h / 2

        crop_w = target_w / scale
        crop_h = target_h / scale
        x1 = int(max(0, min(cx - crop_w / 2, upscale_w - crop_w)))
        y1 = int(max(0, min(cy - crop_h / 2, upscale_h - crop_h)))
        x2 = int(x1 + crop_w)
        y2 = int(y1 + crop_h)

        cropped = img_array[y1:y2, x1:x2]
        frame = Image.fromarray(cropped).resize((target_w, target_h), Image.LANCZOS)
        return np.array(frame)

    clip = VideoClip(make_frame, duration=duration).with_fps(Reel.FPS)
    if output_path is None:
        output_path = OUTPUT_DIR / f"kenburns_{int(time.time())}.mp4"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    clip.write_videofile(str(output_path), fps=Reel.FPS, codec=Reel.CODEC, audio=False, logger=None)
    clip.close()
    print(f"[Ken Burns] Saved -> {output_path}")
    return output_path


# ===================================================================
# SMART GENERATOR - Higgsfield -> Sora 2 -> Veo 2 -> Image + Ken Burns
# ===================================================================

def generate_scene_clip(
    prompt: str, duration: float = 5.0, output_path: Path | None = None,
    prefer: str = "video", kb_effect: str = "zoom_in",
    model: str | None = None,
) -> Path:
    """Generate a scene clip with automatic fallback chain.

    Priority (v3.0):
      1. Higgsfield AI (primary — kling-v2.5, best quality/cost)
      2. Sora 2 (secondary — deprecated Sept 2026)
      3. Veo 2 (tertiary — Google)
      4. gpt-image-1.5 + Ken Burns (last resort)

    Args:
        prompt: Visual description for the scene
        duration: Clip duration in seconds
        output_path: Where to save the MP4
        prefer: "video" tries AI video first, "image" skips to Ken Burns
        kb_effect: Ken Burns effect type (zoom_in, pan_left, etc.)
        model: Override Higgsfield model (kling-v2.5, dop-turbo, wan-2.5)
    """
    from brand_config import HIGGSFIELD_API_KEY, HIGGSFIELD_DEFAULT_MODEL

    if prefer == "video":
        # 1. Try Higgsfield (primary — replaces Sora 2)
        if HIGGSFIELD_API_KEY:
            try:
                from higgsfield_client import HiggsFieldClient, CameraPresets, StylePresets
                client = HiggsFieldClient()
                hf_model = model or HIGGSFIELD_DEFAULT_MODEL
                print(f"[Scene] Trying Higgsfield ({hf_model})...")
                return client.generate_video(
                    prompt=prompt,
                    duration_s=max(1, min(15, int(duration))),
                    aspect_ratio="9:16",
                    model=hf_model,
                    camera_preset=CameraPresets.CINEMATIC_SLOW_ZOOM,
                    style_preset=StylePresets.CINEMATIC_4K,
                    output_path=output_path,
                )
            except Exception as e:
                print(f"[Scene] Higgsfield failed: {e}")
        else:
            print("[Scene] Higgsfield API key not set, skipping...")

        # 2. Try Sora 2 (secondary — deprecated Sept 2026)
        try:
            return generate_sora(
                prompt, duration=int(duration),
                size="720x1280",
                model="sora-2",
                output_path=output_path,
            )
        except Exception as e:
            print(f"[Scene] Sora 2 unavailable: {e}")

        # 3. Try Veo 2
        try:
            return generate_veo2(prompt, duration=int(duration), output_path=output_path)
        except Exception as e:
            print(f"[Scene] Veo 2 unavailable: {e}")

        print("[Scene] All video APIs failed. Falling back to image + Ken Burns")

    # 4. Fallback: generate image + Ken Burns animation
    from image_generator import generate_gpt_image, generate_dalle3
    try:
        img = generate_gpt_image(prompt)
    except Exception:
        img = generate_dalle3(prompt)
    return ken_burns_from_image(img, duration=duration, output_path=output_path, effect=kb_effect)
