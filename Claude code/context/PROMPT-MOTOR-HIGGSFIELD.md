# PROMPT: Rebuild Cals2Gains Audiovisual Engine with Higgsfield AI

> **Version:** 1.0
> **Date:** April 15, 2026
> **Purpose:** Self-contained prompt for Claude Code to rebuild the complete Cals2Gains visual-engine with Higgsfield AI replacing Sora 2 for video generation.
> **Author:** Judith @ CIVILTEK / Cals2Gains

---

## MISSION

You are rebuilding the **Cals2Gains audiovisual content engine** — an automated pipeline that generates Instagram Reels and Carousels for a fitness/nutrition brand. The engine takes a content topic as input and outputs a fully composed, branded, vertical video (9:16) with voiceover, subtitles, background music, and brand overlays.

**Critical change:** Replace OpenAI Sora 2 (deprecated, shutting down September 24, 2026) with **Higgsfield AI** for all video generation. Everything else (images, voice, composition) stays on its current stack.

---

## 1. COMPLETE PIPELINE ARCHITECTURE

```
INPUT: Topic string (e.g., "The protein myth nobody talks about")
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: SCRIPT GENERATION (GPT-5.4 / OpenAI Chat API)     │
│  ─────────────────────────────────────────────────────────── │
│  • Generate structured JSON script with scenes              │
│  • Each scene: hook_text, voiceover, visual_prompt,         │
│    duration_s, transition, data_overlay                     │
│  • Language: Spanish (primary), English (secondary)         │
│  • Model: gpt-5.4 via EXPO_PUBLIC_OPENAI_API_KEY            │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┼──────────────┐
    ▼             ▼              ▼
┌─────────┐ ┌──────────┐ ┌────────────┐
│ STEP 2a │ │ STEP 2b  │ │  STEP 2c   │
│ VOICE   │ │ VIDEO    │ │  IMAGES    │
│(11Labs) │ │(Higgs-   │ │ (DALL-E 3/ │
│         │ │ field)   │ │ gpt-image) │
└────┬────┘ └────┬─────┘ └─────┬──────┘
     │           │              │
     ▼           ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: COMPOSITION (MoviePy + Pillow)                     │
│  ─────────────────────────────────────────────────────────── │
│  • Assemble video clips, images, voice into timeline        │
│  • Add brand overlays (logo, watermark, progress bar)       │
│  • Render animated subtitles (word-by-word highlight)       │
│  • Add transitions (crossfade, zoom_cut, whip_pan)          │
│  • Mix background music at -12dB duck                       │
│  • Render intro (0.8s logo_fade) + outro (2.5s cta_logo)   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: POST-PROCESSING & EXPORT                           │
│  ─────────────────────────────────────────────────────────── │
│  • Normalize audio to -14 LUFS                              │
│  • Encode H.264, AAC 192kbps                                │
│  • 1080x1920 @ 30fps                                        │
│  • Output: MP4 file ready for Instagram upload              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. HIGGSFIELD AI — COMPLETE INTEGRATION REFERENCE

### 2.1 Overview

Higgsfield AI is a video generation platform that aggregates multiple AI video models (Kling 3.0, Wan 2.5, their own DOP models, etc.) under a single API. It supports text-to-video, image-to-video, and speech-to-video. We use it to replace the deprecated OpenAI Sora 2 Videos API.

### 2.2 Authentication

Higgsfield uses API key pairs (KEY_ID + KEY_SECRET).

**Environment variables to add to `.env`:**
```bash
# Higgsfield AI - Video Generation
HIGGSFIELD_KEY_ID=your_key_id_here
HIGGSFIELD_KEY_SECRET=your_key_secret_here
# Combined format (alternative):
# HIGGSFIELD_CREDENTIALS=KEY_ID:KEY_SECRET
```

**Auth header format:**
```
Authorization: Key KEY_ID:KEY_SECRET
```

**Base URL:** `https://platform.higgsfield.ai`

### 2.3 Node.js/TypeScript SDK

```bash
npm install @higgsfield/client
```

```typescript
import { higgsfield, config } from '@higgsfield/client/v2';

config({
  credentials: 'YOUR_KEY_ID:YOUR_KEY_SECRET'
  // OR: apiKey: 'KEY_ID', apiSecret: 'KEY_SECRET'
  // OR via env: HF_CREDENTIALS="KEY_ID:KEY_SECRET"
});
```

### 2.4 Python Integration (REST API — what we use)

Since Cals2Gains visual-engine is Python, we call the REST API directly with `httpx`:

```python
import httpx
import os
import time
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

HIGGSFIELD_KEY_ID = os.getenv("HIGGSFIELD_KEY_ID", "")
HIGGSFIELD_KEY_SECRET = os.getenv("HIGGSFIELD_KEY_SECRET", "")
HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai"

TIMEOUT = httpx.Timeout(300.0, connect=30.0)
POLL_INTERVAL = 5        # seconds between status checks
POLL_MAX_WAIT = 600      # 10 minutes max

def _hf_headers():
    """Build Higgsfield auth headers."""
    return {
        "Authorization": f"Key {HIGGSFIELD_KEY_ID}:{HIGGSFIELD_KEY_SECRET}",
        "Content-Type": "application/json",
    }
```

### 2.5 API Endpoints

#### Text-to-Video

```python
def generate_text_to_video(
    prompt: str,
    duration: int = 5,          # 5 or 10 seconds
    resolution: str = "720p",   # 480p, 720p, 1080p
    aspect_ratio: str = "9:16", # 16:9, 4:3, 1:1, 9:16
    model: str = "kling-v2.5",  # see model list below
) -> dict:
    """
    Generate video from text prompt via Higgsfield API.

    Returns: {"request_id": str, "status_url": str}
    """
    payload = {
        "prompt": prompt,
        "duration": duration,
        "resolution": resolution,
        "aspect_ratio": aspect_ratio,
    }

    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.post(
            f"{HIGGSFIELD_BASE_URL}/v1/text2video/{model}",
            headers=_hf_headers(),
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "request_id": data["request_id"],
        "status_url": data["status_url"],
    }
```

#### Image-to-Video

```python
def generate_image_to_video(
    prompt: str,
    image_url: str,             # URL of reference image
    duration: int = 5,
    model: str = "kling-v2.5",
) -> dict:
    """
    Generate video from image + prompt via Higgsfield API.
    Useful for animating DALL-E generated images into video clips.
    """
    payload = {
        "prompt": prompt,
        "input_images": [{
            "type": "image_url",
            "image_url": image_url
        }],
        "duration": duration,
    }

    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.post(
            f"{HIGGSFIELD_BASE_URL}/v1/image2video/{model}",
            headers=_hf_headers(),
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "request_id": data["request_id"],
        "status_url": data["status_url"],
    }
```

#### Poll Status & Download

```python
def poll_until_done(request_id: str) -> dict:
    """
    Poll Higgsfield generation status until terminal state.

    Status lifecycle:
      queued → in_progress → completed | failed | nsfw

    On 'nsfw': content rejected by moderation, credits refunded.
    On 'failed': generation error, credits refunded.
    On 'completed': video/images URLs available in response.
    """
    url = f"{HIGGSFIELD_BASE_URL}/requests/{request_id}/status"
    start = time.time()

    while True:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.get(url, headers=_hf_headers())
            resp.raise_for_status()
            data = resp.json()

        status = data.get("status", "unknown")
        logger.info(f"[Higgsfield] {request_id}: {status}")

        if status == "completed":
            return data  # Contains 'video' key with {'url': '...'}
        elif status in ("failed", "nsfw"):
            raise RuntimeError(f"[Higgsfield] Generation {status}: {data}")

        elapsed = time.time() - start
        if elapsed > POLL_MAX_WAIT:
            raise TimeoutError(f"[Higgsfield] Timed out after {elapsed:.0f}s")

        time.sleep(POLL_INTERVAL)


def download_video(video_url: str, output_path: Path) -> Path:
    """Download completed video from Higgsfield CDN."""
    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.get(video_url)
        resp.raise_for_status()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(resp.content)
    logger.info(f"[Higgsfield] Downloaded video to {output_path}")
    return output_path
```

#### Complete Response Structure

```json
{
  "status": "completed",
  "request_id": "d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff",
  "status_url": "https://platform.higgsfield.ai/requests/d7e6c0f3-.../status",
  "cancel_url": "https://platform.higgsfield.ai/requests/d7e6c0f3-.../cancel",
  "video": {
    "url": "https://cdn.higgsfield.ai/outputs/video_abc123.mp4"
  },
  "images": [
    {"url": "https://cdn.higgsfield.ai/outputs/thumb_abc123.jpg"}
  ]
}
```

### 2.6 Available Video Models

Use these model identifiers in the endpoint path:

| Model | Endpoint Slug | Best For | Credits/Video | Quality |
|-------|--------------|----------|---------------|---------|
| **Kling 2.5** | `kling-v2.5` | General purpose, good quality | ~6 | High |
| **Kling 3.0** | `kling-v3.0` | Latest Kling, best quality | ~8 | Very High |
| **Wan 2.5** | `wan-2.5` | Artistic, stylized | ~10 | High |
| **DOP Turbo** | `dop-turbo` | Fast generation, lower quality | ~4 | Medium |
| **DOP Standard** | `dop` | Balanced speed/quality | ~6 | High |
| **Veo 3.1** | `veo-3.1` | Google's model, cinematic | ~40-70 | Very High |
| **Sora 2** | `sora-2` | OpenAI's model (via Higgsfield) | ~40-70 | Very High |

**Recommended for Cals2Gains:**
- **Primary:** `kling-v2.5` or `kling-v3.0` — Best quality-to-cost ratio, good at fitness/food content
- **Fast drafts:** `dop-turbo` — Quick iteration, preview quality
- **Premium renders:** `wan-2.5` — When extra quality matters

### 2.7 Video Parameters

| Parameter | Values | Notes |
|-----------|--------|-------|
| `duration` | `5` or `10` seconds | Soul mode doesn't support duration |
| `resolution` | `480p`, `720p`, `1080p` | Not all models support 1080p |
| `aspect_ratio` | `16:9`, `4:3`, `1:1`, `9:16` | **Always use 9:16 for Reels** |

### 2.8 Pricing

| Plan | Price | Credits/month | API Access |
|------|-------|---------------|------------|
| Starter | $15/mo | ~150 | Yes |
| Pro | $49/mo | ~500 | Yes |
| Ultra | $129/mo | ~1500 | Yes, all models |

Alternative: **Segmind API** provides per-generation pricing (~$0.86/video) if you prefer pay-per-use over monthly credits.

### 2.9 Higgsfield Configuration for brand_config.py

Add these to `brand_config.py`:

```python
# -- Higgsfield AI Video Generation ----------------------------------------
HIGGSFIELD_KEY_ID = os.getenv("HIGGSFIELD_KEY_ID", "")
HIGGSFIELD_KEY_SECRET = os.getenv("HIGGSFIELD_KEY_SECRET", "")
HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai"
HIGGSFIELD_DEFAULT_MODEL = "kling-v2.5"    # Best quality/cost for fitness
HIGGSFIELD_DRAFT_MODEL = "dop-turbo"       # Fast previews
HIGGSFIELD_PREMIUM_MODEL = "wan-2.5"       # Premium renders
HIGGSFIELD_DEFAULT_DURATION = 5            # seconds
HIGGSFIELD_DEFAULT_RESOLUTION = "720p"
HIGGSFIELD_DEFAULT_ASPECT_RATIO = "9:16"   # Always vertical for Reels
HIGGSFIELD_POLL_INTERVAL = 5               # seconds
HIGGSFIELD_POLL_MAX_WAIT = 600             # 10 minutes
```

---

## 3. BRAND CONFIGURATION (Single Source of Truth)

All visual output MUST use these values. Imported from `brand_config.py`.

### 3.1 Color Palette

```python
class Colors:
    plum       = "#17121D"   # Carbon Plum - backgrounds
    violet     = "#9C8CFF"   # Soft Violet - primary accent
    coral      = "#FF6A4D"   # Signal Coral - secondary accent
    bone       = "#F7F2EA"   # Bone - text on dark

    card       = "#1E1829"
    card_hover = "#2A2235"

    text_primary   = "#F7F2EA"
    text_secondary = "rgba(247,242,234,0.6)"
    text_muted     = "rgba(247,242,234,0.35)"

    success = "#4ADE80"
    warning = "#FBBF24"
    error   = "#F87171"

    macro_protein = "#9C8CFF"   # Violet
    macro_carbs   = "#F7F2EA"   # Bone
    macro_fat     = "#FF6A4D"   # Coral

    # Pre-computed RGBA tuples for Pillow
    PLUM_RGBA   = (23, 18, 29, 255)
    VIOLET_RGBA = (156, 140, 255, 255)
    CORAL_RGBA  = (255, 106, 77, 255)
    BONE_RGBA   = (247, 242, 234, 255)
    SHADOW_RGBA = (0, 0, 0, 180)
```

### 3.2 Typography

```python
class Fonts:
    display_family  = "Outfit"           # Headings
    display_bold    = FONTS_DIR / "Outfit-Bold.ttf"
    display_regular = FONTS_DIR / "Outfit-Regular.ttf"

    body_family     = "Instrument Sans"  # Body text
    body_regular    = FONTS_DIR / "InstrumentSans-Regular.ttf"
    body_bold       = FONTS_DIR / "InstrumentSans-Bold.ttf"
    body_italic     = FONTS_DIR / "InstrumentSans-Italic.ttf"

    data_family     = "Geist Mono"       # Numbers / stats
    data_regular    = FONTS_DIR / "GeistMono-Regular.ttf"
    data_bold       = FONTS_DIR / "GeistMono-Bold.ttf"
```

### 3.3 Text Sizes (for 1080x1920 canvas)

| Element | Size (px) |
|---------|-----------|
| Hero (hook text) | 96 |
| Title | 72 |
| Subtitle | 48 |
| Body | 36 |
| Caption | 28 |
| Stat (big numbers) | 120 |
| CTA | 56 |
| Watermark | 24 |

### 3.4 Layout Constants

```python
class Layout:
    margin_x     = 60    # Horizontal margin
    margin_y     = 80    # Vertical margin
    padding      = 40    # General padding
    logo_size    = 120   # Logo overlay height (px)
    logo_margin  = 40    # Logo distance from edge
    gradient_h   = 300   # Gradient bar height
    subtitle_y   = 1600  # Subtitle Y position
```

### 3.5 Logo Files

- `C2G-Logo-Dark.png` — Full logo (text + mark) for dark backgrounds
- `C2G-Logomark-2048.png` — Mark-only, square, for watermarks

### 3.6 Brand Prompt Suffixes

Append to EVERY AI image/video prompt:

```python
BRAND_STYLE_SUFFIX = (
    "Dark premium aesthetic, moody lighting, deep plum (#17121D) and violet (#9C8CFF) "
    "color accents, fitness/wellness mood, clean modern composition, "
    "cinematic quality, shot on RED camera look, shallow depth of field, "
    "professional color grading with warm coral (#FF6A4D) highlights"
)

BRAND_VIDEO_SUFFIX = (
    "Cinematic 4K quality, smooth camera movement, dark premium aesthetic, "
    "moody gym/fitness lighting, deep plum and violet color palette, "
    "professional color grading, shallow depth of field, "
    "fitness influencer production quality, Instagram Reels style"
)
```

---

## 4. ELEVENLABS VOICE INTEGRATION

### 4.1 Configuration

- **API Key:** `ELEVENLABS_API_KEY` in `.env`
- **Model:** `eleven_multilingual_v2`
- **Default Voice ID:** `21m00Tcm4TlvDq8ikWAM` (Rachel)
- **Language:** Spanish (`es`) primary
- **Stability:** 0.5
- **Similarity Boost:** 0.75

### 4.2 Key Endpoint

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps
```

This endpoint returns both audio AND character-level timestamps for subtitle sync.

### 4.3 Response Structure

```json
{
  "audio_base64": "base64_encoded_mp3...",
  "alignment": {
    "characters": ["H", "o", "l", "a", " ", ...],
    "character_start_times_seconds": [0.0, 0.05, 0.1, ...],
    "character_end_times_seconds": [0.05, 0.1, 0.15, ...]
  }
}
```

### 4.4 Word Timestamp Reconstruction

The `voice_generator.py` reconstructs word-level timestamps from character data using `_reconstruct_word_timestamps()`. This drives the animated subtitle system.

### 4.5 Fallback Chain

1. **ElevenLabs** (primary) — has real timestamps for subtitles
2. **OpenAI TTS** (fallback) — estimates timestamps by distributing words evenly

The `generate_voice()` function handles automatic fallback.

---

## 5. IMAGE GENERATION (DALL-E 3 / GPT-Image-1.5)

### 5.1 Configuration

- **API Key:** `EXPO_PUBLIC_OPENAI_API_KEY` in `.env`
- **Model:** `gpt-image-1.5` (latest, state of the art)
- **Size:** `1024x1536` (portrait for reels)
- **Quality:** `medium` (balance cost/quality)
- **Format:** `webp` at 85% compression

### 5.2 Key Endpoint

```
POST https://api.openai.com/v1/images/generations
```

GPT-Image models always return `b64_json`.

### 5.3 Image Types Generated

1. **Scene backgrounds** — moody fitness/food backgrounds for text overlays
2. **Food photography** — realistic plated dishes, flat lays, ingredients
3. **Exercise illustrations** — proper form demonstrations
4. **Infographic backgrounds** — subtle gradient backgrounds for data overlays

### 5.4 Prompt Templates

Always append `BRAND_STYLE_SUFFIX` to every prompt:

```python
# Food photo
f"Professional food photography of {dish}. 45-degree angle on white marble. "
f"Soft natural light, shallow DOF, appetizing. {BRAND_STYLE_SUFFIX}"

# Scene background
f"Cinematic fitness atmosphere background, dark premium, moody gym lighting. "
f"Space for text overlay. No text, no humans. {BRAND_STYLE_SUFFIX}"
```

---

## 6. COMPOSITION ENGINE (MoviePy + Pillow)

### 6.1 Reel Specifications

```python
class Reel:
    WIDTH  = 1080
    HEIGHT = 1920
    SIZE   = (1080, 1920)
    FPS    = 30
    CODEC  = "libx264"
    AUDIO_CODEC = "aac"
    AUDIO_BITRATE = "192k"
    TARGET_LUFS = -14.0
    MUSIC_DUCK_DB = -12     # dB reduction during voice
```

### 6.2 Reel Structure

```
[Intro: 0.8s]  →  logo_fade animation
[Hook: 2.5s]   →  title_card_fullscreen with hook text
[Scene 1-N]    →  4s each, video/image + voiceover + subtitles
[CTA: 3s]      →  call-to-action text
[Outro: 2.5s]  →  cta_logo animation
```

### 6.3 Transitions

**Preferred:** `crossfade`, `zoom_cut`, `whip_pan`, `jump_cut`, `match_cut`, `speed_ramp`
**Avoid:** `glitch`, `capcut_template`
**Default duration:** 0.4 seconds

### 6.4 Text Overlay Rules

- Max 7 words per screen
- Position: center of safe zone
- Safe zone: top 15%, bottom 20% are excluded
- Must be readable on mute (85% watch without sound)
- Animated subtitles: word-by-word highlight synced to audio

### 6.5 Audio Mixing

- Voice starts after 0.5s delay
- Background music at -12dB when voice is present
- Master loudness: -14 LUFS
- No watermark audio

### 6.6 Brand Overlays

```python
class GraphicElements:
    CORNER_LINE_LENGTH = 40
    CORNER_LINE_WIDTH = 2
    CORNER_LINE_OPACITY = 0.20
    CORNER_LINE_COLOR = "#9C8CFF"

    PROGRESS_BAR_HEIGHT = 3
    PROGRESS_BAR_COLOR = "#FF6A4D"
    PROGRESS_BAR_BG_OPACITY = 0.15

    GLOW_DOT_SIZE = 10
    GLOW_DOT_COLOR = "#FF6A4D"
    GLOW_DOT_PULSE_PERIOD = 2.0

    HOOK_FLASH_OPACITY = 0.15
    HOOK_FLASH_DURATION = 0.2

class TitleAnimation:
    STYLE = "slide_up"
    DURATION_S = 0.4
    OFFSET_PX = 30
    EASING = "ease_out_cubic"
```

---

## 7. TEMPLATE SPECIFICATIONS (from TEMPLATE-SPECS.json)

### 7.1 Reel Template

```json
{
  "aspect_ratio": "9:16",
  "resolution": [1080, 1920],
  "fps": 30,
  "optimal_duration_s": 12,
  "optimal_duration_range_s": [8, 90],
  "hook_duration_s": 2.5,
  "scene_duration_s": 4,
  "cta_duration_s": 3
}
```

### 7.2 Algorithm Signals 2026

```json
{
  "primary": "watch_time",
  "secondary": "dm_shares",
  "dm_share_weight_vs_like": "3-5x",
  "watch_time_over_completion_rate": true,
  "original_content_bonus": true,
  "repost_penalty": true,
  "tiktok_watermark_penalty": true
}
```

### 7.3 Carousel Template

```json
{
  "aspect_ratio": "4:5",
  "resolution": [1080, 1350],
  "max_slides": 20,
  "optimal_slides": 8
}
```

### 7.4 CTA Templates

```
English: "Send this to a friend who needs it"
Spanish: "Manda esto a alguien que necesite verlo"
```

DM-bait CTAs are weighted 3-5x vs likes in the 2026 algorithm.

---

## 8. VIRAL FORMAT SPECIFICATIONS (April 2026)

### 8.1 What Makes Reels Go Viral in 2026

1. **Watch Time is king** — total seconds viewed > completion rate. A 60s reel with 50% retention beats a 10s reel with 80%.
2. **DM Shares are 3-5x more powerful than likes** — optimize every CTA for sharing.
3. **Original content gets a bonus** — never repost or use TikTok watermarks.
4. **Dynamic editing** — fast purposeful cuts, varied angles, speed ramps.
5. **Hook in first 1.5 seconds** — before Instagram shows the caption overlay.
6. **Text on first frame** — 85% watch on mute.
7. **60-90 second sweet spot** — the optimal has shifted up from ultra-short.

### 8.2 Hook Types That Work

1. **Shared Struggle** — "¿Comes sano pero no bajas de peso?"
2. **Myth-Reality** — "MITO: Las ensaladas adelgazan / REALIDAD: Depende"
3. **Rhetorical Question** — "¿Sabías que el zumo tiene más azúcar que un refresco?"
4. **Numeric Claim** — "2847 calorías en este plato 'saludable'"
5. **Visual Comparison** — side-by-side before/after

### 8.3 Content Safe Zones (1080x1920)

```
TOP: 210px margin (notch/Dynamic Island)
TEXT SAFE ZONE: Y 210px - 1610px, X 84px - 996px
HOOK TEXT: Y 200px - 600px (optimal)
BODY TEXT: Y 600px - 1350px
CTA: Y 1350px - 1450px
BOTTOM: 310-440px margin (UI elements)
```

### 8.4 Subtitle Style

**Word-by-Word Highlight** (most popular 2026):
- Full text visible, each word highlights in brand color on pronunciation
- Background: semi-transparent black rectangle (50-70% opacity)
- Position: centered, Y 1200-1400px
- Font: Outfit Bold or Instrument Sans Bold, 48-56px
- Highlight color: Violet (#9C8CFF)

### 8.5 Priority Content Formats for Cals2Gains

1. **"Calorie Reveal" Reel** — food with calorie counter animation, 10-20s
2. **"Swap & Save" Carousel** — common food vs healthier alternative with calories
3. **"Myth Buster" Talking Head** — direct to camera, informal
4. **"Data Infographic" Carousel** — macronutrient cards per food
5. **"Do This, Not That" Split Screen** — visual habit comparison
6. **"Long-Form Nurture" Reel** — 3-10min tutorial for existing followers

---

## 9. EXISTING FILES IN tools/visual-engine/

### 9.1 Files to MODIFY (update video generation to Higgsfield)

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `brand_config.py` | Brand config & API keys | Add Higgsfield env vars and config constants |
| `video_generator.py` | Video generation (currently Sora 2) | **REPLACE** Sora 2 with Higgsfield API calls |
| `create_reel.py` | Main reel creation orchestrator | Update to use new video_generator API |
| `reel_composer.py` | Timeline assembly with MoviePy | May need minor adjustments for new video format |
| `requirements.txt` | Python dependencies | Add any new deps if needed |

### 9.2 Files to KEEP AS-IS (no changes)

| File | Purpose |
|------|---------|
| `voice_generator.py` | ElevenLabs + OpenAI TTS with word timestamps |
| `image_generator.py` | DALL-E 3 / gpt-image-1.5 generation |
| `brand_overlay.py` | Logo, watermark, progress bar, corner accents |
| `post_processing.py` | Audio normalization, encoding, export |
| `music_manager.py` | Background music selection and mixing |
| `template_loader.py` | Template loading from TEMPLATE-SPECS.json |
| `transitions.py` | Crossfade, zoom_cut, whip_pan effects |
| `create_carousel.py` | Carousel image generation |

### 9.3 Files to CREATE (new)

| File | Purpose |
|------|---------|
| `higgsfield_client.py` | Dedicated Higgsfield API client module |

### 9.4 Asset Files (keep)

- `C2G-Logo-Dark.png` — Full logo
- `C2G-Logomark-2048.png` — Square logomark
- `fonts/` — Outfit, InstrumentSans, GeistMono font files
- `music/` — Background music tracks
- `templates/TEMPLATE-SPECS.json` — Template specifications

---

## 10. ENVIRONMENT VARIABLES (.env)

```bash
# ============================================
# Cals2Gains - Environment Variables
# ============================================

# OpenAI (images, script generation, fallback TTS)
EXPO_PUBLIC_OPENAI_API_KEY=sk-...

# ElevenLabs (primary TTS with timestamps)
ELEVENLABS_API_KEY=sk_...

# Higgsfield AI (video generation — NEW, replaces Sora 2)
HIGGSFIELD_KEY_ID=your_key_id
HIGGSFIELD_KEY_SECRET=your_key_secret

# Google Gemini (optional, for script enhancement)
GEMINI_API_KEY=AIza...

# Firebase (app backend — not used by visual engine)
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...

# RevenueCat (subscriptions — not used by visual engine)
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
```

---

## 11. IMPLEMENTATION INSTRUCTIONS

### Step 1: Create `higgsfield_client.py`

Create a new file `tools/visual-engine/higgsfield_client.py` with:

```python
"""
Cals2Gains - Higgsfield AI Video Client
=========================================
REST client for Higgsfield AI video generation API.
Replaces OpenAI Sora 2 (deprecated Sept 2026).

Supports:
  - Text-to-Video (text2video)
  - Image-to-Video (image2video)
  - Status polling with exponential backoff
  - Automatic video download

Models: kling-v2.5 (default), kling-v3.0, dop-turbo (fast), wan-2.5 (premium)
"""

import httpx
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from brand_config import (
    HIGGSFIELD_KEY_ID,
    HIGGSFIELD_KEY_SECRET,
    HIGGSFIELD_BASE_URL,
    HIGGSFIELD_DEFAULT_MODEL,
    HIGGSFIELD_DRAFT_MODEL,
    HIGGSFIELD_DEFAULT_DURATION,
    HIGGSFIELD_DEFAULT_RESOLUTION,
    HIGGSFIELD_DEFAULT_ASPECT_RATIO,
    HIGGSFIELD_POLL_INTERVAL,
    HIGGSFIELD_POLL_MAX_WAIT,
    BRAND_VIDEO_SUFFIX,
)

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(300.0, connect=30.0)
MAX_RETRIES = 2


class HiggsfieldClient:
    """Client for Higgsfield AI video generation API."""

    def __init__(
        self,
        key_id: str = None,
        key_secret: str = None,
        base_url: str = None,
        default_model: str = None,
    ):
        self.key_id = key_id or HIGGSFIELD_KEY_ID
        self.key_secret = key_secret or HIGGSFIELD_KEY_SECRET
        self.base_url = (base_url or HIGGSFIELD_BASE_URL).rstrip("/")
        self.default_model = default_model or HIGGSFIELD_DEFAULT_MODEL

        if not self.key_id or not self.key_secret:
            raise RuntimeError(
                "Higgsfield credentials not set. "
                "Set HIGGSFIELD_KEY_ID and HIGGSFIELD_KEY_SECRET in .env"
            )

    def _headers(self) -> dict:
        return {
            "Authorization": f"Key {self.key_id}:{self.key_secret}",
            "Content-Type": "application/json",
        }

    def text_to_video(
        self,
        prompt: str,
        model: str = None,
        duration: int = None,
        resolution: str = None,
        aspect_ratio: str = None,
        append_brand_suffix: bool = True,
    ) -> Dict[str, Any]:
        """Generate video from text prompt."""
        model = model or self.default_model
        full_prompt = f"{prompt}. {BRAND_VIDEO_SUFFIX}" if append_brand_suffix else prompt

        payload = {
            "prompt": full_prompt,
            "duration": duration or HIGGSFIELD_DEFAULT_DURATION,
            "resolution": resolution or HIGGSFIELD_DEFAULT_RESOLUTION,
            "aspect_ratio": aspect_ratio or HIGGSFIELD_DEFAULT_ASPECT_RATIO,
        }

        logger.info(f"[Higgsfield] text2video: model={model}, "
                     f"duration={payload['duration']}s, "
                     f"res={payload['resolution']}")

        for attempt in range(MAX_RETRIES + 1):
            try:
                with httpx.Client(timeout=TIMEOUT) as client:
                    resp = client.post(
                        f"{self.base_url}/v1/text2video/{model}",
                        headers=self._headers(),
                        json=payload,
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    logger.info(f"[Higgsfield] Job created: {data.get('request_id')}")
                    return data

            except httpx.HTTPStatusError as e:
                logger.error(f"[Higgsfield] HTTP {e.response.status_code}: "
                             f"{e.response.text}")
                if attempt < MAX_RETRIES and e.response.status_code >= 500:
                    time.sleep(2 ** attempt)
                    continue
                raise

    def image_to_video(
        self,
        prompt: str,
        image_url: str,
        model: str = None,
        duration: int = None,
        append_brand_suffix: bool = True,
    ) -> Dict[str, Any]:
        """Generate video from image + prompt."""
        model = model or self.default_model
        full_prompt = f"{prompt}. {BRAND_VIDEO_SUFFIX}" if append_brand_suffix else prompt

        payload = {
            "prompt": full_prompt,
            "input_images": [{"type": "image_url", "image_url": image_url}],
            "duration": duration or HIGGSFIELD_DEFAULT_DURATION,
        }

        logger.info(f"[Higgsfield] image2video: model={model}")

        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.post(
                f"{self.base_url}/v1/image2video/{model}",
                headers=self._headers(),
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    def poll_until_done(self, request_id: str) -> Dict[str, Any]:
        """Poll status until completed/failed/nsfw."""
        url = f"{self.base_url}/requests/{request_id}/status"
        start = time.time()
        interval = HIGGSFIELD_POLL_INTERVAL

        while True:
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.get(url, headers=self._headers())
                resp.raise_for_status()
                data = resp.json()

            status = data.get("status", "unknown")
            logger.info(f"[Higgsfield] {request_id}: {status}")

            if status == "completed":
                return data
            elif status in ("failed", "nsfw"):
                raise RuntimeError(
                    f"[Higgsfield] Generation {status}: "
                    f"{data.get('error', 'Unknown error')}"
                )

            elapsed = time.time() - start
            if elapsed > HIGGSFIELD_POLL_MAX_WAIT:
                raise TimeoutError(
                    f"[Higgsfield] Timed out after {elapsed:.0f}s"
                )

            time.sleep(interval)
            interval = min(interval * 1.2, 30)

    def download_video(
        self, video_url: str, output_path: Path
    ) -> Path:
        """Download video from CDN to local file."""
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.get(video_url)
            resp.raise_for_status()
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(resp.content)
        logger.info(f"[Higgsfield] Saved: {output_path} ({len(resp.content)} bytes)")
        return output_path

    def generate_and_download(
        self,
        prompt: str,
        output_path: Path,
        model: str = None,
        duration: int = None,
        resolution: str = None,
        image_url: str = None,
    ) -> Path:
        """Convenience: generate video, poll, download. Returns local path."""
        if image_url:
            job = self.image_to_video(prompt, image_url, model=model, duration=duration)
        else:
            job = self.text_to_video(
                prompt, model=model, duration=duration, resolution=resolution
            )

        result = self.poll_until_done(job["request_id"])

        video_url = result.get("video", {}).get("url")
        if not video_url:
            raise RuntimeError("[Higgsfield] No video URL in completed response")

        return self.download_video(video_url, output_path)
```

### Step 2: Update `brand_config.py`

Add Higgsfield configuration after the existing `ELEVENLABS_API_KEY` line:

```python
# Higgsfield AI - Video Generation (replaces Sora 2)
HIGGSFIELD_KEY_ID = os.getenv("HIGGSFIELD_KEY_ID", "")
HIGGSFIELD_KEY_SECRET = os.getenv("HIGGSFIELD_KEY_SECRET", "")
HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai"
HIGGSFIELD_DEFAULT_MODEL = "kling-v2.5"
HIGGSFIELD_DRAFT_MODEL = "dop-turbo"
HIGGSFIELD_PREMIUM_MODEL = "wan-2.5"
HIGGSFIELD_DEFAULT_DURATION = 5
HIGGSFIELD_DEFAULT_RESOLUTION = "720p"
HIGGSFIELD_DEFAULT_ASPECT_RATIO = "9:16"
HIGGSFIELD_POLL_INTERVAL = 5
HIGGSFIELD_POLL_MAX_WAIT = 600
```

### Step 3: Replace `video_generator.py`

Replace the Sora 2 implementation in `video_generator.py` with a wrapper that uses `higgsfield_client.py`:

```python
"""
Cals2Gains - Video Generator v3.0 (Higgsfield)
================================================
Generates video clips via Higgsfield AI.
Falls back to gpt-image-1.5 + Ken Burns if Higgsfield unavailable.

Replaces: Sora 2 (deprecated September 24, 2026)
"""

from pathlib import Path
from typing import Optional
import logging

from brand_config import (
    BRAND_VIDEO_SUFFIX, OUTPUT_DIR, Reel,
    HIGGSFIELD_DEFAULT_MODEL,
    HIGGSFIELD_DRAFT_MODEL,
    HIGGSFIELD_PREMIUM_MODEL,
)
from higgsfield_client import HiggsfieldClient

logger = logging.getLogger(__name__)

# Initialize client (reads credentials from env via brand_config)
_client = None

def _get_client() -> HiggsfieldClient:
    global _client
    if _client is None:
        _client = HiggsfieldClient()
    return _client


def generate_scene_video(
    prompt: str,
    duration: int = 5,
    output_path: Optional[Path] = None,
    model: str = None,
    resolution: str = "720p",
    image_url: str = None,
) -> Path:
    """
    Generate a single scene video clip.

    Args:
        prompt: Visual description for the scene
        duration: Duration in seconds (5 or 10)
        output_path: Where to save the MP4
        model: Higgsfield model (default: kling-v2.5)
        resolution: Video resolution (480p, 720p, 1080p)
        image_url: Optional reference image for image-to-video

    Returns:
        Path to the downloaded MP4 file
    """
    if output_path is None:
        import time
        output_path = OUTPUT_DIR / f"scene_{int(time.time())}.mp4"

    client = _get_client()
    return client.generate_and_download(
        prompt=prompt,
        output_path=output_path,
        model=model or HIGGSFIELD_DEFAULT_MODEL,
        duration=duration,
        resolution=resolution,
        image_url=image_url,
    )


def generate_scene_videos(
    scenes: list,
    output_dir: Path = None,
    model: str = None,
) -> list:
    """
    Generate videos for multiple scenes sequentially.

    Args:
        scenes: List of scene dicts with 'visual_prompt' and optional
                'duration', 'image_url' keys
        output_dir: Directory to save MP4 files
        model: Override model for all scenes

    Returns:
        List of dicts with 'scene_index', 'video_path' or 'error'
    """
    if output_dir is None:
        output_dir = OUTPUT_DIR
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for i, scene in enumerate(scenes):
        try:
            prompt = scene.get("visual_prompt", "")
            if not prompt:
                results.append({"scene_index": i, "error": "No visual_prompt"})
                continue

            duration = scene.get("duration", 5)
            image_url = scene.get("image_url")
            out = output_dir / f"scene_{i+1:02d}.mp4"

            path = generate_scene_video(
                prompt=prompt,
                duration=duration,
                output_path=out,
                model=model,
                image_url=image_url,
            )
            results.append({"scene_index": i, "video_path": str(path)})
            logger.info(f"[Video] Scene {i} done: {path}")

        except Exception as e:
            logger.error(f"[Video] Scene {i} failed: {e}")
            results.append({"scene_index": i, "error": str(e)})

    return results
```

### Step 4: Update `.env`

Add these two new lines:
```bash
HIGGSFIELD_KEY_ID=your_key_id_here
HIGGSFIELD_KEY_SECRET=your_key_secret_here
```

### Step 5: Update `create_reel.py`

In `create_reel.py`, update the video generation calls to use the new API. The function signatures in the new `video_generator.py` match the old pattern (`generate_scene_video` / `generate_scene_videos`), so changes should be minimal — mainly adjusting parameter names:

- Replace `size="720x1280"` → `resolution="720p"` + `aspect_ratio` is handled by default config
- Replace `seconds=8` → `duration=5` (or `duration=10` for longer clips)
- Remove any `model="sora-2"` references → model defaults to `kling-v2.5`

---

## 12. TEST REEL: "The Protein Myth Nobody Talks About"

### 12.1 Script Structure

```json
{
  "title": "El Mito de la Proteína",
  "topic": "protein_myth",
  "language": "es",
  "hook": {
    "text": "El mito de la proteína\nque NADIE te cuenta",
    "type": "myth_reality",
    "duration_s": 2.5
  },
  "scenes": [
    {
      "scene_id": 1,
      "visual_prompt": "Close-up of a protein shake being poured into a glass, slow motion, gym background with moody purple lighting, fitness aesthetic",
      "voiceover": "¿De verdad necesitas 2 gramos de proteína por kilo? La ciencia dice otra cosa.",
      "duration_s": 5,
      "text_overlay": "¿2g/kg de proteína?",
      "transition": "zoom_cut"
    },
    {
      "scene_id": 2,
      "visual_prompt": "Scientific papers and research documents on a desk, soft lighting, overhead shot, data visualization floating above",
      "voiceover": "Estudios recientes demuestran que entre 1.2 y 1.6 gramos por kilo es suficiente para la mayoría de personas.",
      "duration_s": 5,
      "text_overlay": "1.2 - 1.6 g/kg es suficiente",
      "data_overlay": {"value": "1.6", "unit": "g/kg", "label": "Óptimo"},
      "transition": "crossfade"
    },
    {
      "scene_id": 3,
      "visual_prompt": "Variety of high-protein foods arranged beautifully: eggs, chicken, lentils, greek yogurt, fish, on dark marble surface, cinematic food photography",
      "voiceover": "Lo importante no es la cantidad total, sino distribuirla bien a lo largo del día.",
      "duration_s": 5,
      "text_overlay": "Distribución > Cantidad total",
      "transition": "whip_pan"
    },
    {
      "scene_id": 4,
      "visual_prompt": "Split screen showing meal prep containers with balanced portions, left side labeled morning, right side labeled evening, clean kitchen aesthetic",
      "voiceover": "Tres a cuatro comidas con 25 a 40 gramos cada una. Así de simple.",
      "duration_s": 5,
      "text_overlay": "25-40g × 3-4 comidas",
      "data_overlay": {"value": "25-40g", "unit": "por comida", "label": "Rango óptimo"},
      "transition": "crossfade"
    },
    {
      "scene_id": 5,
      "visual_prompt": "Person confidently walking away from gym with gym bag, sunset golden hour lighting, motivational mood, cinematic",
      "voiceover": "Deja de obsesionarte con los gramos. Come bien, entrena bien, y los resultados llegan.",
      "duration_s": 5,
      "text_overlay": null,
      "transition": "crossfade"
    }
  ],
  "cta": {
    "text_es": "Manda esto a alguien que necesite verlo",
    "text_en": "Send this to someone who needs it",
    "duration_s": 3
  },
  "total_duration_estimate_s": 30
}
```

### 12.2 Run Command

```bash
cd tools/visual-engine
python create_reel.py --topic "protein_myth" --title "El Mito de la Proteína" --lang es
```

Or programmatically:

```python
from create_reel import create_reel

result = create_reel(
    topic="protein_myth",
    title="El Mito de la Proteína",
    language="es",
    model="kling-v2.5",
    duration_per_scene=5,
)
print(f"Reel saved to: {result['output_path']}")
```

---

## 13. REQUIREMENTS

### Python Dependencies

```
# tools/visual-engine/requirements.txt
moviepy>=2.0
Pillow>=10.0
httpx>=0.27
python-dotenv>=1.0
numpy>=1.24
pydub>=0.25          # Audio processing
```

### System Dependencies

```bash
# FFmpeg (required for MoviePy)
# On Windows: choco install ffmpeg
# On Mac: brew install ffmpeg
# On Linux: apt install ffmpeg
```

---

## 14. CRITICAL NOTES

1. **Sora 2 is DEPRECATED** — shuts down September 24, 2026. All video generation MUST go through Higgsfield.

2. **Higgsfield duration is 5 or 10 seconds** — unlike Sora's 4/8/12. Adjust scene planning accordingly. For longer scenes, chain multiple clips in composition.

3. **Aspect ratio 9:16** — ALWAYS use vertical format for Reels. This is hardcoded in the Higgsfield config.

4. **Brand consistency** — ALWAYS append `BRAND_VIDEO_SUFFIX` to video prompts. Every visual must match the dark plum + violet + coral palette.

5. **ElevenLabs is primary for voice** — it provides real word timestamps. OpenAI TTS is only the fallback. Subtitles depend on accurate timestamps.

6. **Download immediately** — Higgsfield CDN URLs may expire. Always download to local storage right after polling completes.

7. **Cost awareness** — Kling models (~6-8 credits) are 5-10x cheaper than Sora/Veo via Higgsfield (~40-70 credits). Prefer Kling for daily content.

8. **Spanish is default** — All voiceovers, CTAs, and text overlays default to Spanish. Support English as secondary.

9. **Safe zones matter** — Never place text in top 210px or bottom 310px of the 1080x1920 canvas. Instagram UI overlaps there.

10. **Test with `dop-turbo` first** — Use the fast model for iteration, then render final with `kling-v2.5` or `wan-2.5`.

---

## 15. FILE TREE AFTER REBUILD

```
tools/visual-engine/
├── __init__.py
├── brand_config.py              # MODIFIED: + Higgsfield config
├── higgsfield_client.py         # NEW: Higgsfield REST client
├── video_generator.py           # REPLACED: Higgsfield instead of Sora 2
├── voice_generator.py           # UNCHANGED: ElevenLabs + OpenAI TTS
├── image_generator.py           # UNCHANGED: DALL-E 3 / gpt-image-1.5
├── create_reel.py               # MODIFIED: minor param changes
├── reel_composer.py             # UNCHANGED: MoviePy composition
├── brand_overlay.py             # UNCHANGED: logo, progress bar, corners
├── post_processing.py           # UNCHANGED: audio norm, encoding
├── music_manager.py             # UNCHANGED: background music
├── template_loader.py           # UNCHANGED: template loading
├── transitions.py               # UNCHANGED: visual transitions
├── create_carousel.py           # UNCHANGED: carousel generation
├── requirements.txt             # MODIFIED: verify httpx present
├── C2G-Logo-Dark.png
├── C2G-Logomark-2048.png
├── fonts/
│   ├── Outfit-Bold.ttf
│   ├── Outfit-Regular.ttf
│   ├── InstrumentSans-Regular.ttf
│   ├── InstrumentSans-Bold.ttf
│   ├── InstrumentSans-Italic.ttf
│   ├── GeistMono-Regular.ttf
│   └── GeistMono-Bold.ttf
├── music/
├── templates/
│   └── TEMPLATE-SPECS.json
├── screens/
├── scripts/
└── output/
```

---

## APPENDIX A: QUICK REFERENCE CARD

| Component | Provider | Model | Key Env Var |
|-----------|----------|-------|-------------|
| Script | OpenAI | gpt-5.4 | `EXPO_PUBLIC_OPENAI_API_KEY` |
| Video | **Higgsfield** | kling-v2.5 | `HIGGSFIELD_KEY_ID` + `HIGGSFIELD_KEY_SECRET` |
| Images | OpenAI | gpt-image-1.5 | `EXPO_PUBLIC_OPENAI_API_KEY` |
| Voice | ElevenLabs | eleven_multilingual_v2 | `ELEVENLABS_API_KEY` |
| Voice (fallback) | OpenAI | tts-1-hd | `EXPO_PUBLIC_OPENAI_API_KEY` |
| Composition | Local | MoviePy + Pillow | N/A |
| Export | Local | FFmpeg (H.264/AAC) | N/A |

---

*End of prompt. This document is self-contained. Claude Code should be able to rebuild the entire visual engine from this reference alone.*
