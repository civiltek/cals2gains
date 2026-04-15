"""
Cals2Gains - AI Image Generator v2.0
======================================
Primary: OpenAI gpt-image-1.5 (best quality, 32K char prompts, always b64)
Fallback: DALL-E 3 (4K char prompts, b64 or url)
Secondary: Google Gemini Imagen 3

API Reference (April 2026):
  POST /v1/images/generations
  gpt-image-1.5: sizes 1024x1024, 1536x1024, 1024x1536, auto
                  quality: low, medium, high, auto
                  output_format: png, jpeg, webp
                  always returns b64_json
  dall-e-3:      sizes 1024x1024, 1792x1024, 1024x1792
                  quality: standard, hd
                  style: vivid, natural
"""

import httpx
import base64
import json
import io
import time
from pathlib import Path
from PIL import Image

from brand_config import (
    OPENAI_API_KEY, GEMINI_API_KEY, BRAND_STYLE_SUFFIX,
    Reel, OUTPUT_DIR
)

TIMEOUT = httpx.Timeout(120.0, connect=30.0)
MAX_RETRIES = 2


def _brand_prompt(user_prompt: str) -> str:
    return f"{user_prompt}. {BRAND_STYLE_SUFFIX}"


# ---------------------------------------------------------------------------
# GPT IMAGE 1.5 - Primary (state of the art, April 2026)
# ---------------------------------------------------------------------------

def generate_gpt_image(
    prompt: str,
    size: str = "1024x1536",        # Portrait for reels
    quality: str = "medium",         # Balance quality/cost
    output_format: str = "webp",     # Smaller files
    compression: int = 85,           # Good quality
    background: str = "auto",        # auto, transparent, opaque
    output_path: Path | None = None,
) -> Image.Image:
    """Generate an image with OpenAI gpt-image-1.5. Returns PIL Image.
    
    Always returns b64_json. Supports transparent backgrounds.
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not set")
    
    full_prompt = _brand_prompt(prompt)
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gpt-image-1.5",
        "prompt": full_prompt,
        "n": 1,
        "size": size,
        "quality": quality,
        "output_format": output_format,
        "output_compression": compression,
    }
    if background != "auto":
        payload["background"] = background
        if background == "transparent":
            payload["output_format"] = "png"  # Required for transparency

    for attempt in range(MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers=headers, json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                
                # gpt-image-1.5 always returns b64_json
                img_b64 = data["data"][0]["b64_json"]
                img = Image.open(io.BytesIO(base64.b64decode(img_b64))).convert("RGBA")
                
                # Log token usage if available
                usage = data.get("usage", {})
                if usage:
                    print(f"[GPT Image 1.5] Tokens: {usage.get('total_tokens', '?')}")
                
                if output_path:
                    img.save(str(output_path))
                    print(f"[GPT Image 1.5] Saved -> {output_path}")
                else:
                    print(f"[GPT Image 1.5] Generated {img.size}")
                return img
                
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_body = ""
            try:
                error_body = e.response.json()
            except:
                error_body = e.response.text[:300]
            print(f"[GPT Image 1.5] HTTP {status_code}: {error_body}")
            
            if status_code in (400,) and "content_policy" in str(error_body).lower():
                # Content filter - sanitize and retry once
                from brand_config import BRAND_STYLE_SUFFIX
                safe_prompt = _sanitize_fitness_prompt(prompt) + ". " + BRAND_STYLE_SUFFIX
                payload["prompt"] = safe_prompt
                print("[GPT Image 1.5] Content filter hit, retrying with sanitized prompt...")
                continue
            
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"GPT Image 1.5 failed: {error_body}")
        except Exception as e:
            print(f"[GPT Image 1.5] Attempt {attempt+1} failed: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"GPT Image 1.5 failed after {MAX_RETRIES+1} attempts: {e}")


# ---------------------------------------------------------------------------
# DALL-E 3 - Fallback
# ---------------------------------------------------------------------------

def generate_dalle3(
    prompt: str,
    size: str = "1024x1792",
    quality: str = "hd",
    style: str = "vivid",
    output_path: Path | None = None,
) -> Image.Image:
    """Generate an image with OpenAI DALL-E 3. Returns PIL Image."""
    full_prompt = _brand_prompt(prompt)
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "dall-e-3",
        "prompt": full_prompt,
        "n": 1,
        "size": size,
        "quality": quality,
        "style": style,
        "response_format": "b64_json",
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers=headers, json=payload,
                )
                resp.raise_for_status()
                data = resp.json()
                img_b64 = data["data"][0]["b64_json"]
                img = Image.open(io.BytesIO(base64.b64decode(img_b64))).convert("RGBA")
                if output_path:
                    img.save(str(output_path))
                    print(f"[DALL-E 3] Saved -> {output_path}")
                return img
        except Exception as e:
            print(f"[DALL-E 3] Attempt {attempt+1} failed: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"DALL-E 3 failed after {MAX_RETRIES+1} attempts: {e}")


# ---------------------------------------------------------------------------
# GEMINI IMAGEN 3 - Secondary
# ---------------------------------------------------------------------------

def generate_gemini(
    prompt: str,
    output_path: Path | None = None,
) -> Image.Image:
    """Generate an image with Google Gemini Imagen 3. Returns PIL Image."""
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")
    full_prompt = _brand_prompt(prompt)
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"imagen-3.0-generate-002:predict?key={GEMINI_API_KEY}"
    )
    payload = {
        "instances": [{"prompt": full_prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": "9:16"},
    }
    for attempt in range(MAX_RETRIES + 1):
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()
                img_b64 = data["predictions"][0]["bytesBase64Encoded"]
                img = Image.open(io.BytesIO(base64.b64decode(img_b64))).convert("RGBA")
                if output_path:
                    img.save(str(output_path))
                    print(f"[Gemini Imagen 3] Saved -> {output_path}")
                return img
        except Exception as e:
            print(f"[Gemini Imagen 3] Attempt {attempt+1} failed: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
            else:
                raise RuntimeError(f"Gemini Imagen 3 failed: {e}")


# ---------------------------------------------------------------------------
# SMART GENERATOR - gpt-image-1.5 -> DALL-E 3 -> Gemini
# ---------------------------------------------------------------------------

def generate_best(prompt: str, output_path: Path | None = None) -> Image.Image:
    """Try gpt-image-1.5 first, fall back to DALL-E 3, then Gemini."""
    try:
        img = generate_gpt_image(prompt, output_path=output_path)
        print("[Best] gpt-image-1.5 OK")
        return img
    except Exception as e:
        print(f"[Best] gpt-image-1.5 failed: {e}")
    
    try:
        img = generate_dalle3(prompt, output_path=output_path)
        print("[Best] DALL-E 3 OK")
        return img
    except Exception as e:
        print(f"[Best] DALL-E 3 failed: {e}")
    
    try:
        img = generate_gemini(prompt, output_path=output_path)
        print("[Best] Gemini OK")
        return img
    except Exception as e:
        print(f"[Best] Gemini also failed: {e}")
        raise RuntimeError("All image generators failed")


# ---------------------------------------------------------------------------
# UTILITIES
# ---------------------------------------------------------------------------

def _sanitize_fitness_prompt(prompt: str) -> str:
    """Remove potentially flagged terms from fitness prompts."""
    replacements = {
        "shirtless": "in athletic wear",
        "bare skin": "athletic outfit",
        "sweating heavily": "working hard",
        "pain": "effort",
        "burning": "intensity",
        "ripped": "fit",
        "six-pack": "strong core",
    }
    result = prompt
    for old, new in replacements.items():
        result = result.replace(old, new)
    return result


if __name__ == "__main__":
    print("Testing gpt-image-1.5...")
    img = generate_gpt_image(
        "Athletic woman preparing a healthy meal in a modern dark kitchen",
        output_path=OUTPUT_DIR / "test_gpt_image.webp",
    )
    print(f"Image size: {img.size}")
