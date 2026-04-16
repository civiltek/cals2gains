"""
Cals2Gains - Sora 2 Clip Generator
=====================================
Generates short video clips using OpenAI Sora 2 API for reel backgrounds.
Falls back to DALL-E 3 still images if Sora is unavailable/fails.

Usage:
    python generate_sora_clips.py --scenes scenes.json --output-dir ./public/
    python generate_sora_clips.py --test

The scenes JSON is a list of dicts:
    [{"id": "scene_0", "prompt": "...", "seconds": 5}, ...]

Outputs:
    public/scene_0_bg.mp4  (or .png if fallback)
    public/scene_0_bg.json  (metadata: type, duration, file)
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

# --- Path setup -----------------------------------------------------------
ENGINE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ENGINE_DIR.parent / "visual-engine"))


def _find_env_file() -> "Path | None":
    current = ENGINE_DIR
    for _ in range(10):
        candidate = current / ".env"
        if candidate.exists():
            return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent
    return None


from dotenv import load_dotenv
_env = _find_env_file()
if _env:
    load_dotenv(_env)
else:
    load_dotenv()

OPENAI_API_KEY = os.getenv("EXPO_PUBLIC_OPENAI_API_KEY", "")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# --- Brand style suffix (from brand_config) --------------------------------
BRAND_VIDEO_SUFFIX = (
    "Cinematic quality, smooth camera movement, dark premium aesthetic, "
    "moody fitness/nutrition lighting, deep plum and violet color palette, "
    "professional color grading, shallow depth of field, "
    "fitness influencer production quality, Instagram Reels vertical format"
)

# Vertical size supported by Sora 2
SORA_SIZE_VERTICAL = "720x1280"


# ===========================================================================
# Sora 2
# ===========================================================================

def _snap_sora_seconds(seconds: int) -> int:
    """Snap duration to nearest Sora 2 supported value: 4, 8, or 12."""
    valid = [4, 8, 12]
    return min(valid, key=lambda v: abs(v - seconds))


def generate_sora_clip(
    prompt: str,
    output_path: Path,
    seconds: int = 4,
    size: str = SORA_SIZE_VERTICAL,
) -> dict[str, Any]:
    """
    Generate a video clip with Sora 2 and save to output_path.

    Returns dict: {"type": "video", "file": str, "duration": float, "error": None}
    On failure returns {"type": None, "file": None, "duration": 0, "error": str}
    """
    if not OPENAI_API_KEY:
        return {"type": None, "file": None, "duration": 0,
                "error": "EXPO_PUBLIC_OPENAI_API_KEY not set"}

    try:
        from openai import OpenAI
    except ImportError:
        return {"type": None, "file": None, "duration": 0,
                "error": "openai package not installed. Run: pip install openai>=2.0.0"}

    client = OpenAI(api_key=OPENAI_API_KEY)

    full_prompt = f"{prompt}. {BRAND_VIDEO_SUFFIX}"
    log.info(f"[Sora2] Generating {seconds}s clip: {prompt[:60]}...")

    try:
        snapped_seconds = _snap_sora_seconds(seconds)
        if snapped_seconds != seconds:
            log.info(f"[Sora2] Snapping {seconds}s -> {snapped_seconds}s (Sora only supports 4/8/12)")

        # create_and_poll waits for the job to finish
        video_obj = client.videos.create_and_poll(
            model="sora-2",
            prompt=full_prompt,
            size=size,
            seconds=snapped_seconds,
        )
        log.info(f"[Sora2] Job complete. ID={video_obj.id}, status={getattr(video_obj, 'status', 'unknown')}")

        # Download the video binary
        content = client.videos.download_content(video_obj.id, variant="video")

        # content may be bytes directly or an httpx.Response
        if hasattr(content, "read"):
            data = content.read()
        elif hasattr(content, "content"):
            data = content.content
        else:
            data = bytes(content)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(data)

        file_size_mb = len(data) / (1024 * 1024)
        log.info(f"[Sora2] Saved {file_size_mb:.1f}MB -> {output_path}")

        return {
            "type": "video",
            "file": output_path.name,
            "duration": float(seconds),
            "error": None,
        }

    except Exception as exc:
        error_msg = str(exc)
        log.error(f"[Sora2] Failed: {error_msg}")
        return {"type": None, "file": None, "duration": 0, "error": error_msg}


# ===========================================================================
# DALL-E 3 fallback
# ===========================================================================

BRAND_IMAGE_SUFFIX = (
    "Dark premium aesthetic, moody lighting, deep plum (#17121D) and violet (#9C8CFF) "
    "color accents, fitness/wellness mood, clean modern composition, "
    "cinematic quality, shallow depth of field, "
    "professional color grading with warm coral (#FF6A4D) highlights, "
    "vertical 9:16 composition for Instagram Reels"
)


def generate_dalle3_fallback(
    prompt: str,
    output_path: Path,
) -> dict[str, Any]:
    """
    Generate a still image with DALL-E 3 and save to output_path (.png).
    Used as fallback when Sora 2 is unavailable.
    """
    if not OPENAI_API_KEY:
        return {"type": None, "file": None, "duration": 0,
                "error": "EXPO_PUBLIC_OPENAI_API_KEY not set"}

    try:
        from openai import OpenAI
    except ImportError:
        return {"type": None, "file": None, "duration": 0,
                "error": "openai package not installed"}

    client = OpenAI(api_key=OPENAI_API_KEY)

    full_prompt = f"{prompt}. {BRAND_IMAGE_SUFFIX}"
    log.info(f"[DALL-E3] Generating image fallback: {prompt[:60]}...")

    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=full_prompt,
            size="1024x1792",  # Closest to 9:16 vertical
            quality="hd",
            n=1,
        )

        image_url = response.data[0].url
        if not image_url:
            return {"type": None, "file": None, "duration": 0,
                    "error": "No URL in DALL-E 3 response"}

        # Download image and fix EXIF rotation
        import urllib.request
        from PIL import Image, ImageOps
        png_path = output_path.with_suffix(".png")
        png_path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(image_url, png_path)

        # Apply EXIF auto-rotation so images don't appear sideways in the player
        try:
            img = Image.open(png_path)
            img = ImageOps.exif_transpose(img)
            # Ensure it's RGBA for consistent handling in Remotion
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            img.save(png_path, "PNG")
        except Exception as img_err:
            log.warning(f"[DALL-E3] EXIF fix failed (non-critical): {img_err}")

        log.info(f"[DALL-E3] Saved -> {png_path}")
        return {
            "type": "image",
            "file": png_path.name,
            "duration": 0,
            "error": None,
        }

    except Exception as exc:
        error_msg = str(exc)
        log.error(f"[DALL-E3] Failed: {error_msg}")
        return {"type": None, "file": None, "duration": 0, "error": error_msg}


# ===========================================================================
# Main generation function (Sora -> DALL-E 3 -> error)
# ===========================================================================

def generate_scene_background(
    scene_id: str,
    prompt: str,
    output_dir: Path,
    seconds: int = 5,
    force_image: bool = False,
) -> dict[str, Any]:
    """
    Try Sora 2 first; fall back to DALL-E 3 on error.
    Returns the metadata dict for embedding in scene JSON.
    """
    mp4_path = output_dir / f"{scene_id}_bg.mp4"
    png_path = output_dir / f"{scene_id}_bg.png"

    if not force_image:
        result = generate_sora_clip(prompt, mp4_path, seconds=seconds)
        if result["type"] == "video":
            return result
        log.warning(f"[Generator] Sora failed for {scene_id}: {result['error']}")
        log.info(f"[Generator] Falling back to DALL-E 3 for {scene_id}...")

    # DALL-E 3 fallback
    result = generate_dalle3_fallback(prompt, png_path)
    if result["type"] == "image":
        return result

    log.error(f"[Generator] Both Sora and DALL-E 3 failed for {scene_id}")
    return result


# ===========================================================================
# CLI
# ===========================================================================

def cmd_generate(scenes_file: str, output_dir: str, force_image: bool = False):
    scenes_path = Path(scenes_file)
    if not scenes_path.exists():
        log.error(f"Scenes file not found: {scenes_path}")
        sys.exit(1)

    scenes: list[dict] = json.loads(scenes_path.read_text(encoding="utf-8"))
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    results = {}
    for scene in scenes:
        sid = scene["id"]
        prompt = scene["prompt"]
        secs = int(scene.get("seconds", 5))
        log.info(f"\n--- Scene: {sid} ---")
        r = generate_scene_background(sid, prompt, out_dir, seconds=secs, force_image=force_image)
        results[sid] = r
        # Small delay between API calls
        time.sleep(1)

    # Write results summary
    summary_path = out_dir / "clip_manifest.json"
    summary_path.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    log.info(f"\n[Done] Manifest: {summary_path}")

    # Print summary
    ok = sum(1 for r in results.values() if r["type"] is not None)
    log.info(f"[Summary] {ok}/{len(results)} clips generated successfully")
    for sid, r in results.items():
        status = "OK" if r["type"] else "FAIL"
        log.info(f"  {status} {sid}: {r.get('file', r.get('error', ''))}")


def cmd_test():
    """Quick test with one scene."""
    log.info("[Test] Running single-scene test...")
    result = generate_scene_background(
        scene_id="test_scene",
        prompt="Person drinking a glass of water in a modern minimalist kitchen, morning light",
        output_dir=ENGINE_DIR / "public",
        seconds=4,
        force_image=False,
    )
    log.info(f"[Test] Result: {result}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cals2Gains Sora 2 Clip Generator")
    sub = parser.add_subparsers(dest="cmd")

    gen_p = sub.add_parser("generate", help="Generate clips from scenes JSON")
    gen_p.add_argument("--scenes", required=True, help="Path to scenes JSON file")
    gen_p.add_argument("--output-dir", default="./public", help="Output directory")
    gen_p.add_argument("--force-image", action="store_true", help="Skip Sora, use DALL-E 3 only")

    sub.add_parser("test", help="Generate a single test clip")

    args = parser.parse_args()

    if args.cmd == "generate":
        cmd_generate(args.scenes, args.output_dir, args.force_image)
    elif args.cmd == "test":
        cmd_test()
    else:
        parser.print_help()
