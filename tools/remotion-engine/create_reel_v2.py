"""
Cals2Gains - Create Reel v2.0 (Remotion + Sora 2 Orchestrator)
================================================================
End-to-end pipeline:
  1. GPT-4o generates the script (scenes, titles, voiceover text, video prompts)
  2. Sora 2 (or DALL-E 3 fallback) generates background clips
  3. ElevenLabs generates per-scene voiceovers with word timestamps
  4. Remotion renders the final MP4 via render.ts

Usage:
    python create_reel_v2.py --topic "3 tips para beber mas agua" --lang es
    python create_reel_v2.py --topic "Protein myths debunked" --lang en
    python create_reel_v2.py --topic "3 tips para beber mas agua" --lang es --force-image
    python create_reel_v2.py --demo  (dry-run with placeholder assets)

Output: tools/remotion-engine/output/YYYY-MM-DDThh-mm-ss_slug.mp4
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

# --- Path setup -----------------------------------------------------------
ENGINE_DIR = Path(__file__).resolve().parent
VISUAL_ENGINE_DIR = ENGINE_DIR.parent / "visual-engine"
PUBLIC_DIR = ENGINE_DIR / "public"
OUTPUT_DIR = ENGINE_DIR / "output"
TEMP_DIR = ENGINE_DIR / "temp"

sys.path.insert(0, str(VISUAL_ENGINE_DIR))


def _find_env_file() -> Path | None:
    """Walk up directory tree until we find a .env file."""
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
_env_path = _find_env_file()
if _env_path:
    load_dotenv(_env_path)
else:
    load_dotenv()  # fallback: look in cwd

OPENAI_API_KEY = os.getenv("EXPO_PUBLIC_OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# --- ElevenLabs voice IDs -------------------------------------------------
# Para cambiar la voz a castellano peninsular (España):
#   1. Ve a https://elevenlabs.io/voice-library
#   2. Filtra: Language = Spanish, Accent = Spain (Castilian)
#   3. Copia el voice_id de la voz elegida y reemplaza abajo
#
# Voces castellanas verificadas en ElevenLabs (abril 2026):
#   "Lucia" (female, Spain):   pFZP5JQG7iQjIQuC4Bku  -- voz femenina peninsular
#   "Daniel" (male, Spain):    onwK4e9ZLuTAKqWW03F9  -- voz masculina peninsular
#   Fallback multilingual:     ErXwobaYiN019PkySvjV  (Antoni, acento neutro-europeo)
#
# IMPORTANTE: Si la voz da error 422, el voice_id puede haber cambiado.
# Verifica en: https://api.elevenlabs.io/v1/voices (con tu API key)
VOICE_IDS = {
    # Voz femenina peninsular España (Lucia) — model eleven_multilingual_v2
    "es": "pFZP5JQG7iQjIQuC4Bku",
    "en": "21m00Tcm4TlvDq8ikWAM",  # Rachel (EN)
}

# --- Brand style suffix for video prompts ---------------------------------
# IMPORTANT: Use realistic, everyday style — no cinematic/dramatic/neon effects.
# Sora clips should look like filmed by a real person with a smartphone.
BRAND_VIDEO_SUFFIX = (
    "Realistic scene, handheld camera feel, natural lighting, casual everyday setting, "
    "filmed with a smartphone by a real person, warm natural tones, "
    "no dramatic lighting, no neon colors, no cinematic color grading, no studio effects, "
    "Instagram Reels vertical format 9:16"
)


# ===========================================================================
# Step 1: Script generation with GPT-4o
# ===========================================================================

SCRIPT_SYSTEM_PROMPT = """You are a viral Instagram Reels scriptwriter for Cals2Gains,
a fitness and nutrition tracking app.

Use the 3/8/12 viral framework. Return ONLY valid JSON, no extra text.

FRAMEWORK 3/8/12:
- scene_0 (HOOK): 3 seconds max. Provocative question or shocking stat that stops the scroll.
  Example hooks: "¿Sabías que bebes 40% menos agua de la que necesitas?" or "Este error arruina tu dieta."
- scene_1 to scene_N-1 (VALUE): 2-3 scenes, 2.5-3.5 seconds each. One clear tip/fact per scene.
  Short, punchy voiceover — max 1 sentence. No filler words.
- scene_last (CTA): 3-4 seconds. Strong call-to-action. Direct and specific.
- Total duration: 12-18 seconds. Cuts every 2-3 seconds.

WRITING RULES:
- Titles: max 6 words, no emojis, SENTENCE CASE ONLY (only first word capitalized, e.g. "Empieza el día con agua" NOT "Empieza El Día Con Agua")
- ALWAYS include accent marks (tildes): á é í ó ú ü ñ ¿ ¡ — Spanish requires them: "sabías" not "sabias", "día" not "dia"
- Voiceover: natural spoken Spanish/English, max 1-2 short sentences per scene, include all tildes
- No filler phrases ("hoy vamos a ver", "en este video", etc.)
- Hook must create FOMO or curiosity gap
- CTA must name the app: "Descarga Cals2Gains" or "Trackea con Cals2Gains"

VIDEO PROMPT RULES (CRITICAL — read carefully):
- NEVER mention people, persons, humans, bodies, skin, muscles, abs, torsos, silhouettes, or body parts.
- NEVER describe someone looking at themselves, someone exercising, or any human figure.
- INSTEAD, describe OBJECTS and ENVIRONMENTS: food, plates, drinks, ingredients, gym equipment, kitchen surfaces.
- Use vivid, appetizing, premium-looking scene descriptions.
- Good examples:
    "Close-up of a colorful protein bowl with quinoa, avocado and cherry tomatoes on a marble countertop, natural morning light"
    "Protein shake in a sleek glass next to fresh fruits on a white kitchen counter, bright natural light"
    "Scrambled eggs with spinach and whole-grain toast on a ceramic plate, sunlit kitchen table"
    "Modern gym interior with empty squat rack and dumbbells, warm afternoon light, no people"
    "Assorted breakfast foods arranged flat-lay on a wooden table: oats, banana, Greek yogurt, berries"
    "Nutrition label close-up on a food product, blurred healthy foods in background"
    "Glass of orange juice and a bowl of fruit on a bright terrace table, summer morning light"
- Length: 15-25 words, realistic, smartphone-filmed feel, natural lighting.

JSON schema:
{
  "scenes": [
    {
      "id": "scene_0",
      "title": "Short punchy title",
      "voiceover": "Spoken text for this scene.",
      "video_prompt": "Visual description — objects/environments only, NO people.",
      "duration_seconds": 3
    }
  ]
}
"""

def generate_script(topic: str, lang: str = "es") -> list[dict]:
    """Generate reel script from a topic using GPT-4o."""
    if not OPENAI_API_KEY:
        raise RuntimeError("EXPO_PUBLIC_OPENAI_API_KEY not set in .env")

    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai not installed: pip install openai>=2.0.0")

    client = OpenAI(api_key=OPENAI_API_KEY)

    lang_name = "Spanish" if lang == "es" else "English"
    user_prompt = (
        f"Create a reel about: '{topic}'\n"
        f"Language: {lang_name}\n"
        f"Brand: Cals2Gains (fitness/nutrition app, dark premium aesthetic)"
    )

    log.info(f"[GPT-4o] Generating script: '{topic}' ({lang})...")

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SCRIPT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.8,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    scenes = data.get("scenes", [])

    log.info(f"[GPT-4o] Generated {len(scenes)} scenes")
    for s in scenes:
        log.info(f"  [{s['id']}] {s['title'][:50]} ({s['duration_seconds']}s)")

    return scenes


# ===========================================================================
# Step 2: Generate background clips (Sora 2 / DALL-E 3)
# ===========================================================================

def generate_backgrounds(
    scenes: list[dict],
    output_dir: Path,
    force_image: bool = False,
) -> list[dict]:
    """
    Generate background clips for each scene.
    Mutates each scene dict to add: backgroundType, backgroundFile.
    Returns updated scenes list.
    """
    from generate_sora_clips import generate_scene_background

    output_dir.mkdir(parents=True, exist_ok=True)

    for scene in scenes:
        sid = scene["id"]
        prompt = scene.get("video_prompt", scene["title"])
        secs = int(scene.get("duration_seconds", 5))

        log.info(f"\n[Backgrounds] Scene {sid}...")
        result = generate_scene_background(
            scene_id=sid,
            prompt=prompt,
            output_dir=output_dir,
            seconds=secs,
            force_image=force_image,
        )

        if result["type"] == "video":
            scene["backgroundType"] = "video"
            scene["backgroundFile"] = result["file"]
        elif result["type"] == "image":
            scene["backgroundType"] = "image"
            scene["backgroundFile"] = result["file"]
        else:
            # Both failed — use dark placeholder
            log.warning(f"[Backgrounds] Using placeholder for {sid}: {result['error']}")
            scene["backgroundType"] = "image"
            scene["backgroundFile"] = "placeholder_dark.png"

        # Small delay between requests
        time.sleep(2)

    return scenes


# ===========================================================================
# Step 3: Generate voiceovers with ElevenLabs
# ===========================================================================

def generate_voiceovers(
    scenes: list[dict],
    output_dir: Path,
    lang: str = "es",
) -> list[dict]:
    """
    Generate per-scene voiceovers using ElevenLabs.
    Mutates each scene dict to add: voiceoverFile, subtitles.
    Returns updated scenes list.
    """
    if not ELEVENLABS_API_KEY:
        log.warning("[ElevenLabs] No API key — skipping voiceovers")
        for scene in scenes:
            scene["voiceoverFile"] = None
            scene["subtitles"] = []
        return scenes

    # Import from visual-engine
    sys.path.insert(0, str(VISUAL_ENGINE_DIR))
    from voice_generator import generate_voice_elevenlabs

    voice_id = VOICE_IDS.get(lang, VOICE_IDS["en"])
    output_dir.mkdir(parents=True, exist_ok=True)

    for scene in scenes:
        sid = scene["id"]
        text = scene.get("voiceover", scene.get("title", ""))
        if not text.strip():
            scene["voiceoverFile"] = None
            scene["subtitles"] = []
            continue

        log.info(f"[ElevenLabs] Scene {sid}: '{text[:50]}...'")
        mp3_path = output_dir / f"{sid}_voice.mp3"

        try:
            result = generate_voice_elevenlabs(
                text=text,
                voice_id=voice_id,
                lang=lang,
                output_path=mp3_path,
                # Alta stability para mantener el acento castellano peninsular
                # consistente. Similarity 0.75 mantiene la voz fiel al entrenamiento.
                stability=0.75,
                similarity_boost=0.75,
            )
            scene["voiceoverFile"] = mp3_path.name
            scene["subtitles"] = result.get("word_timestamps", [])
            actual_duration = result.get("duration_s", scene["duration_seconds"])
            # Update scene duration to match voiceover + 0.5s padding
            scene["duration_seconds"] = max(
                scene["duration_seconds"], actual_duration + 0.5
            )
            log.info(f"[ElevenLabs] {sid}: {actual_duration:.1f}s, {len(scene['subtitles'])} words")
        except Exception as exc:
            log.error(f"[ElevenLabs] Failed for {sid}: {exc}")
            scene["voiceoverFile"] = None
            scene["subtitles"] = []

        time.sleep(0.5)

    return scenes


# ===========================================================================
# Step 4: Build Remotion inputProps JSON
# ===========================================================================

def _find_background_music() -> str | None:
    """
    Look for a background music file in public/.
    Accepts any file starting with 'background_music', 'bg_music', or 'ambient'
    with extension .mp3, .wav, or .ogg.

    Returns the filename (relative to public/) if found, None otherwise.
    Tip: place a libre-royalty MP3 at tools/remotion-engine/public/background_music.mp3
    """
    candidates = [
        "background_music.mp3",
        "background_music.wav",
        "bg_music.mp3",
        "bg_music.wav",
        "ambient.mp3",
        "ambient.wav",
        "ambient_pad.wav",
        "music.mp3",
    ]
    for name in candidates:
        if (PUBLIC_DIR / name).exists():
            log.info(f"[Music] Found background music: {name}")
            return name
    log.info("[Music] No background_music.mp3 found in public/. Skipping music.")
    log.info("[Music] To add music: place a libre-royalty MP3 at tools/remotion-engine/public/background_music.mp3")
    return None


def build_reel_props(
    scenes: list[dict],
    lang: str,
    watermark: str,
    template: str = "educational_tips",
) -> dict:
    """Build the JSON object that gets passed to Remotion as inputProps."""
    reel_scenes = []
    for i, s in enumerate(scenes):
        reel_scenes.append({
            "id": s["id"],
            "backgroundType": s.get("backgroundType", "image"),
            "backgroundFile": s.get("backgroundFile", "placeholder_dark.png"),
            "title": s["title"],
            "voiceoverFile": s.get("voiceoverFile"),
            "durationSeconds": float(s.get("duration_seconds", 5)),
            "subtitles": s.get("subtitles", []),
            "transition": "fade" if i == 0 else (
                "slide_up" if i % 2 == 1 else "zoom"
            ),
        })

    props: dict = {
        "scenes": reel_scenes,
        "lang": lang,
        "showProgressBar": True,
        "showCTASlide": True,
        "template": template,
        "watermark": watermark,
    }

    # Add background music if available
    music_file = _find_background_music()
    if music_file:
        props["backgroundMusicFile"] = music_file

    return props


# ===========================================================================
# Step 5: Render with Remotion
# ===========================================================================

def render_reel(props: dict, output_path: Path) -> bool:
    """
    Write props to temp JSON, then invoke render.ts via ts-node.
    Returns True on success.
    """
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    props_file = TEMP_DIR / "reel_props_latest.json"
    props_file.write_text(json.dumps(props, indent=2, ensure_ascii=False), encoding="utf-8")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    log.info(f"\n[Remotion] Starting render -> {output_path}")

    # On Windows, npx must be invoked via shell or with .cmd extension
    import platform
    is_windows = platform.system() == "Windows"

    if is_windows:
        # Use shell=True on Windows so npx.cmd is resolved correctly
        cmd_str = (
            f'npx ts-node "{ENGINE_DIR / "render.ts"}" '
            f'--props "{props_file}" '
            f'--output "{output_path}"'
        )
        try:
            result = subprocess.run(
                cmd_str,
                cwd=str(ENGINE_DIR),
                shell=True,
                text=True,
                timeout=600,
            )
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            log.error("[Remotion] Render timed out after 10 minutes")
            return False
        except Exception as exc:
            log.error(f"[Remotion] Render subprocess failed: {exc}")
            return False
    else:
        cmd = [
            "npx", "ts-node",
            str(ENGINE_DIR / "render.ts"),
            "--props", str(props_file),
            "--output", str(output_path),
        ]
        try:
            result = subprocess.run(
                cmd,
                cwd=str(ENGINE_DIR),
                capture_output=False,
                text=True,
                timeout=600,
            )
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            log.error("[Remotion] Render timed out after 10 minutes")
            return False
        except FileNotFoundError:
            log.error("[Remotion] npx not found. Run: npm install in tools/remotion-engine/")
            return False


# ===========================================================================
# Demo mode — placeholder assets
# ===========================================================================

def run_demo():
    """Run with pre-built placeholder scenes, no API calls."""
    log.info("[Demo] Running demo reel (no API calls, placeholder assets)...")

    demo_scenes = [
        {
            "id": "scene_0",
            "title": "3 Tips para Beber Mas Agua",
            "voiceover": "Descubre tres trucos para hidratarte mejor cada dia.",
            "video_prompt": "Glass of water in morning light",
            "duration_seconds": 4,
            "backgroundType": "image",
            "backgroundFile": "placeholder_dark.png",
            "voiceoverFile": None,
            "subtitles": [],
        },
        {
            "id": "scene_1",
            "title": "Empieza el Dia con Agua",
            "voiceover": "Bebe un vaso de agua al despertarte antes de cafe o desayuno.",
            "duration_seconds": 5,
            "backgroundType": "image",
            "backgroundFile": "placeholder_dark.png",
            "voiceoverFile": None,
            "subtitles": [],
        },
        {
            "id": "scene_2",
            "title": "Lleva Tu Botella Siempre",
            "voiceover": "Tener agua visible aumenta la ingesta diaria hasta un 73 por ciento.",
            "duration_seconds": 5,
            "backgroundType": "image",
            "backgroundFile": "placeholder_dark.png",
            "voiceoverFile": None,
            "subtitles": [],
        },
        {
            "id": "scene_3",
            "title": "Pon Alarmas de Hidratacion",
            "voiceover": "Configura recordatorios cada 2 horas. Tu cuerpo te lo agradecera.",
            "duration_seconds": 5,
            "backgroundType": "image",
            "backgroundFile": "placeholder_dark.png",
            "voiceoverFile": None,
            "subtitles": [],
        },
        {
            "id": "scene_4",
            "title": "Descarga Cals2Gains Gratis",
            "voiceover": "Trackea agua, macros y progreso. Descargala gratis.",
            "duration_seconds": 4,
            "backgroundType": "image",
            "backgroundFile": "placeholder_dark.png",
            "voiceoverFile": None,
            "subtitles": [],
        },
    ]

    props = build_reel_props(demo_scenes, lang="es", watermark="@cals2gains")
    ts = time.strftime("%Y-%m-%dT%H-%M-%S")
    output_path = OUTPUT_DIR / f"{ts}_demo_3tips_agua.mp4"
    success = render_reel(props, output_path)

    if success:
        log.info(f"\n[Demo] SUCCESS! Reel saved: {output_path}")
    else:
        log.error("\n[Demo] Render failed. Check logs above.")

    return success


# ===========================================================================
# Main pipeline
# ===========================================================================

def run_pipeline(
    topic: str,
    lang: str = "es",
    force_image: bool = False,
    skip_voice: bool = False,
):
    """Full pipeline: script -> clips -> voice -> render."""
    log.info(f"\n{'='*60}")
    log.info(f"[Pipeline] Topic: {topic}")
    log.info(f"[Pipeline] Lang: {lang} | Force image: {force_image}")
    log.info(f"{'='*60}\n")

    timestamp = time.strftime("%Y-%m-%dT%H-%M-%S")
    slug = topic.lower()[:30].replace(" ", "_").replace("'", "")

    # -- Step 1: Script --
    log.info("[Step 1/4] Generating script with GPT-4o...")
    scenes = generate_script(topic, lang)
    if not scenes:
        log.error("Script generation returned no scenes. Aborting.")
        sys.exit(1)

    # Save raw script
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    script_file = TEMP_DIR / f"{timestamp}_script.json"
    script_file.write_text(json.dumps(scenes, indent=2, ensure_ascii=False), encoding="utf-8")
    log.info(f"[Step 1] Script saved: {script_file}")

    # -- Step 2: Backgrounds --
    log.info(f"\n[Step 2/4] Generating {len(scenes)} background clips...")
    scenes = generate_backgrounds(scenes, PUBLIC_DIR, force_image=force_image)

    # -- Step 3: Voiceovers --
    if not skip_voice:
        log.info(f"\n[Step 3/4] Generating voiceovers with ElevenLabs...")
        scenes = generate_voiceovers(scenes, PUBLIC_DIR, lang=lang)
    else:
        log.info("[Step 3/4] Skipping voiceovers (--skip-voice flag)")
        for s in scenes:
            s["voiceoverFile"] = None
            s["subtitles"] = []

    # -- Step 4: Render --
    log.info(f"\n[Step 4/4] Rendering with Remotion...")
    watermark = "@cals2gains" if lang == "en" else "@cals2gains_es"
    props = build_reel_props(scenes, lang=lang, watermark=watermark)

    # Save final props for debugging
    props_debug = TEMP_DIR / f"{timestamp}_props.json"
    props_debug.write_text(json.dumps(props, indent=2, ensure_ascii=False), encoding="utf-8")

    output_path = OUTPUT_DIR / f"{timestamp}_{slug}.mp4"
    success = render_reel(props, output_path)

    if success:
        log.info(f"\n[Pipeline] SUCCESS! Reel: {output_path}")
    else:
        log.error(f"\n[Pipeline] Render failed. Props saved at: {props_debug}")
        log.error("Try: cd tools/remotion-engine && npx ts-node render.ts --props temp/..._props.json")
        sys.exit(1)

    return output_path


# ===========================================================================
# CLI
# ===========================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Cals2Gains Reel v2 — Remotion + Sora 2 Pipeline"
    )
    parser.add_argument("--topic", type=str, help="Reel topic in natural language")
    parser.add_argument("--lang", type=str, default="es", choices=["es", "en"],
                        help="Language (default: es)")
    parser.add_argument("--force-image", action="store_true",
                        help="Skip Sora 2, use DALL-E 3 images only")
    parser.add_argument("--skip-voice", action="store_true",
                        help="Skip ElevenLabs voiceover generation")
    parser.add_argument("--demo", action="store_true",
                        help="Demo mode: render with placeholders, no API calls")

    args = parser.parse_args()

    if args.demo:
        run_demo()
    elif args.topic:
        run_pipeline(
            topic=args.topic,
            lang=args.lang,
            force_image=args.force_image,
            skip_voice=args.skip_voice,
        )
    else:
        parser.print_help()
        print("\nExample:")
        print('  python create_reel_v2.py --topic "3 tips para beber mas agua" --lang es')
        print('  python create_reel_v2.py --demo')
