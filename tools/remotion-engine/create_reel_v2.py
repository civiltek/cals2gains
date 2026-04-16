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
# Premium cinematic style — reels impersonales text-forward.
# Debe mantenerse en sync con brand_config.BRAND_VIDEO_SUFFIX.
BRAND_VIDEO_SUFFIX = (
    "cinematic 4K studio quality, dark premium aesthetic, "
    "deep plum and violet shadow tones, warm coral and gold rim highlights, "
    "shallow depth of field f/1.4, professional Hollywood color grade, "
    "ultra-modern black steel gym with violet LED strips "
    "OR high-end Calacatta marble kitchen with brushed brass hardware, "
    "slow intentional camera movement, "
    "composition leaves dark negative space in top-third and bottom-third for text overlay, "
    "no subject looking directly at camera, no dialogue, no mouth movement, "
    "B-roll style cinematic fitness content, Instagram Reels vertical 9:16"
)


# ===========================================================================
# Step 1: Script generation with GPT-4o
# ===========================================================================

SCRIPT_SYSTEM_PROMPT = """You are a viral Instagram Reels scriptwriter AND cinematic director for Cals2Gains,
an IMPERSONAL premium fitness/nutrition brand account (no host face, pure brand).

Your job: write TEXT-FORWARD, FAST-PACED scripts that go viral on impersonal accounts.
Return ONLY valid JSON, no extra text.

=== VIRAL FORMAT 2026 — IMPERSONAL BRAND ACCOUNTS ===

OPTIMAL DURATION: 10-12 seconds TOTAL. Never exceed 14s. Short reels out-perform long ones 3:1.
Impersonal accounts (no face) must be TEXT-FORWARD — text is the protagonist, video is background.

=== SCENE STRUCTURE (5 scenes) ===

scene_0 — HOOK (1.5-2s):
  - ONE provocative sentence. Max 5 words in TITLE.
  - Hook types: contrarian ("Olvida las proteínas"), shock stat ("97% lo hace mal"),
    question ("¿Bebes suficiente agua?"), numbered ("3 errores fatales"),
    mistake reveal ("Este error arruina tu dieta").
  - Voiceover: 1 sentence, 8-12 words max, authoritative delivery, NO filler.
  - MUST stop the scroll in 0.5 seconds.

scene_1 — PROBLEMA (2-2.5s):
  - Amplify the pain. What people are doing wrong.
  - Title: max 6 words. Voiceover: 1 short sentence.
  - Examples: "Contar calorías a ciegas", "Comer sin medir proteína".

scene_2 — VALOR #1 (2-2.5s) — PATTERN INTERRUPT:
  - Change of environment (gym → kitchen, or vice versa) — visual reset.
  - Deliver FACT #1 with a specific number or ratio.
  - Title: "X g por kilo" or "Regla del 2x2" — numeric, memorable.
  - Voiceover: 1 sentence ending in the number.

scene_3 — VALOR #2 (2-2.5s):
  - Deliver FACT #2 that completes the advice.
  - Title: action-oriented. "Así se hace" / "La clave real".
  - Voiceover: 1 sentence that sets up the CTA.

scene_4 — CTA (2.5-3s):
  - Name the app. Two actions: save + download.
  - Title examples: "Cals2Gains lo calcula", "Descarga Cals2Gains", "Guárdalo antes".
  - Voiceover: "Cals2Gains lo calcula por ti. Descárgala gratis."

HARD CUTS every 2-2.5s. No scene may exceed 3s (except CTA max 3s).

=== WRITING RULES (TEXT-FORWARD) ===

- Titles: MAX 5 WORDS for hook, MAX 6 WORDS for rest. NO emojis. SENTENCE CASE (only first word capitalized).
- Spanish MUST include accents and marks: á é í ó ú ü ñ ¿ ¡. NEVER "sabias" (use "sabías"), NEVER "dia" (use "día").
- Spanish is PENINSULAR (Spain): use "coge", "vosotros" if plural, NEVER "agarra" or "ustedes".
- Voiceover: 1 sentence per scene, 8-14 words. AUTHORITATIVE tone (not intimate, not whisper). Direct "tú" address.
- NO filler phrases ever: "hoy vamos a ver", "en este video", "como veis", "os cuento" — PROHIBITED.
- Hook MUST create curiosity gap or pattern interrupt.
- At least ONE scene between scene_1–scene_3 must contain a specific NUMBER (%, g, ratio, seconds).
- CTA must name "Cals2Gains" verbatim and include a save cue ("Guarda" or similar).

=== VIDEO PROMPT RULES (B-ROLL under text) ===

Since impersonal accounts are TEXT-FORWARD, video is SECONDARY to text — but must look cinematic.
Write prompts in ENGLISH, 25-40 words. ALWAYS specify:
1. SUBJECT: athletic person (toned, 22-35, premium activewear) OR premium food/ingredient close-up
2. ENVIRONMENT: ultra-modern black-steel gym with violet LED strips / Calacatta marble kitchen with brass hardware / premium wellness studio
3. LIGHTING: dramatic key + violet rim backlight + warm coral/gold accent
4. CAMERA: slow push-in / macro close-up / rack focus / locked-off low-angle — ALWAYS slow and intentional (text needs to be readable on top)

CINEMATIC EXAMPLES:
- HOOK: "Extreme close-up of hands pouring protein powder into shaker, slow-motion dust cloud, dramatic top-down spotlight, violet rim light, dark plum background, ultra-shallow depth of field, cinematic 4K"
- PROBLEM: "Overhead shot of messy kitchen with processed food wrappers and empty plates, low warm tungsten light, violet LED accent in background, slow dolly-in, moody editorial, cinematic 4K"
- VALUE (food): "Macro close-up of perfectly grilled salmon fillet on Calacatta marble, slow 360 orbit, warm brass pendant light, violet LED background, steam rising, editorial food photography, cinematic 4K"
- VALUE (training): "Low-angle slow-motion shot of athletic legs mid-squat in minimalist black steel gym, violet rim backlight highlights sweat, single spotlight, dark plum background, cinematic 4K"
- CTA: "Elegant flat-lay of smartphone next to dumbbells and protein on dark plum wood surface, violet LED rim, coral warm accent, slow zoom-in on phone screen, cinematic 4K"

KEY RULE: Background video must have DARK/EMPTY TOP-THIRD so overlay text is readable.
Avoid video prompts with people looking at camera or talking — text must not compete with faces.

=== JSON SCHEMA ===
{
  "scenes": [
    {
      "id": "scene_0",
      "title": "Short punchy title (≤5 words for hook, ≤6 for rest)",
      "voiceover": "Spoken text for this scene.",
      "video_prompt": "Cinematic English prompt, 25-40 words, specify subject+environment+lighting+camera.",
      "duration_seconds": 2
    }
  ]
}

EXACTLY 5 scenes. Total duration 10-12 seconds.
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
                # Stability baja (0.45) + style alto (0.6) = voz autoritativa con
                # inflexiones marcadas, necesarias para reels virales impersonales.
                # Similarity 0.78 mantiene el acento peninsular de Lucia intacto.
                stability=0.45,
                similarity_boost=0.78,
                style=0.6,
                speed=1.08,
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
