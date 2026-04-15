"""
Cals2Gains - Create Reel v3.0 (Main Orchestrator)
===================================================
End-to-end pipeline: script -> AI video/images -> branding -> voice -> music -> reel.
Applies VIRAL-FORMAT-BIBLE 2026 rules and TEMPLATE-SPECS.json specs.

Pipeline:
  1. Generate script with GPT-5.4 applying viral rules
  2. Generate clips with Higgsfield Cloud API (video) or gpt-image-1.5 (images)
  3. Generate voice PER SCENE (individual API calls, fixes desync)
  4. Apply brand overlay (logo, text, word-by-word subtitles)
  5. Compose with transitions, audio mix, loudness normalization

FIXES in v3.0:
- Scene duration set to ACTUAL clip duration after generation
- Per-scene voiceover generation (not one blob)
- Pass scene_voices list to compose_reel
- Use generate_ambient_pad when music_manager returns None

Usage:
    python create_reel.py --demo
    python create_reel.py --protein-myth
    python create_reel.py --topic "5 macro tips" --lang en
    python create_reel.py --script reel.json
"""

import argparse
import json
import time
import sys
from pathlib import Path
from typing import Optional, Dict, List, Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from brand_config import OUTPUT_DIR, Reel, OPENAI_API_KEY
from higgsfield_client import HiggsFieldClient, CameraPresets, StylePresets, generate_scene_clip
from voice_generator import generate_voice
from script_generator import generate_script
from subtitle_engine import estimate_word_timestamps
from reel_composer import Scene, compose_reel
from image_generator import generate_gpt_image, generate_dalle3
from music_manager import get_music, generate_silence, generate_ambient_pad
from template_loader import load_specs, get_reel_specs, apply_reel_specs_to_script


# ===================================================================
# SCRIPT GENERATION (GPT-5.4 with viral rules)
# ===================================================================

def generate_script_from_topic(topic: str, lang: str = "en", n_scenes: int = 5) -> dict:
    """Auto-generate a reel script from a topic using GPT-5.4 with viral format rules."""
    import httpx

    reel_specs = get_reel_specs()
    pacing = reel_specs.get("pacing", {})

    system_prompt = f"""You are a viral content strategist AND professional video producer for Cals2Gains, a premium fitness/nutrition app.
Create a {n_scenes}-scene Instagram Reel script optimized for MAXIMUM virality and production quality.

Think like a professional video producer. Each scene should have multiple layers of visual information:
- The base AI-generated video clip
- A brief scene title that appears for ~2 seconds (the "text" field — max 7 words)
- Word-by-word subtitles synced to the narration (the "voiceover" field)
- 1-3 data overlays that add informational value (stats, numbers, comparisons)

BRAND IDENTITY:
- Dark premium aesthetic: plum #17121D backgrounds
- Accent colors: violet #9C8CFF, coral #FF6A4D
- Target: Fitness enthusiasts who track macros
- Tone: Confident, modern, slightly edgy, educational

VIRAL FORMAT RULES (2026 research):
- HOOK in first 0.5-1.5 seconds: pattern interrupt, curiosity gap, or contrarian statement
- 85% of viewers watch WITHOUT SOUND — text must carry the message alone
- Keep text overlays ("text" field) to max 7 words per screen (punchy, readable on mobile)
- Optimal duration: 15-30 seconds for educational content
- Scene durations: 3-6 seconds each, fast pacing
- End with shareable CTA: "Send this to your gym buddy" / "Share with someone who needs this"
- Use myth-busting, data reveals, and "did you know" formats for maximum saves

VOICEOVER STYLE:
- Conversational and punchy — like a friend telling you something surprising
- NOT robotic or formal. Short sentences. Use pauses via punctuation.
- CTA scene should feel like a natural conclusion, not an ad. Use "save this" or "send this to..." language.

VISUAL CONTINUITY (CRITICAL):
- ALL scene prompts MUST share the same visual setting, lighting style, color temperature, and camera approach.
- Imagine these are consecutive shots from the SAME video shoot in the SAME location.
- Each prompt must reference the specific set/location established in scene 1.
- Include a "setting" field in the top-level JSON that describes the unified visual environment. Reference this setting in every scene prompt.

DATA OVERLAYS:
- For each scene, include "data_overlays" — 1-3 animated data points, statistics, or labels that appear over the video.
- These add production value and make the content more informative and shareable.
- Each overlay has: text, style (stat_big|stat_small|comparison|label), position (center|top-left|top-right|bottom-left|bottom-right|center-left|center-right), appear_at (seconds from scene start), duration (seconds).
- stat_big: large numbers/percentages. stat_small: secondary data. comparison: "vs X" comparisons. label: descriptive tags.

Language: {"Spanish" if lang == "es" else "English"}

Return ONLY valid JSON:
{{"title":"Short title","lang":"{lang}","voice":"elevenlabs","music_mood":"upbeat","setting":"Unified visual environment description — lighting, surface, camera style, color temperature, shared across ALL scenes","scenes":[{{"prompt":"Detailed video prompt (ALWAYS English, cinematic) referencing the shared setting","text":"Short overlay text (max 7 words, used as brief scene title)","text_style":"hero|title|subtitle|cta|stat","voiceover":"Full narrator text — conversational, punchy, like a friend","duration":4,"transition":"crossfade|fade_black|cut","effect":"zoom_in|zoom_out|pan_left|pan_right|diagonal|zoom_punch","data_overlays":[{{"text":"612 kcal","style":"stat_big","position":"center","appear_at":0.5,"duration":2.5}}]}}]}}

Scene 1 = HOOK (pattern interrupt, make them stop scrolling).
Last scene = CTA (shareable action, natural conclusion not an ad).
Every scene between = deliver value fast with supporting data overlays."""

    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "gpt-5.4",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create a reel about: {topic}"},
        ],
        "temperature": 0.8,
        "max_tokens": 2000
    }

    print(f"[Script] Requesting GPT-5.4 to generate script for: {topic}")
    with httpx.Client(timeout=60) as client:
        resp = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()
        # Handle markdown code blocks
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1])
        return json.loads(content)


def generate_protein_myth_script(lang: str = "en") -> dict:
    """Generate the protein myth reel script."""
    return {
        "title": "The Protein Myth",
        "lang": lang,
        "voice": "elevenlabs",
        "music_mood": "upbeat",
        "setting": (
            "Dark premium kitchen with black marble counter, single dramatic spotlight "
            "from top-left, purple LED strip ambient light in background, shallow depth "
            "of field, consistent camera height and angle, moody cinematic color grading"
        ),
        "scenes": [
            {
                "prompt": (
                    "Dramatic close-up of a protein shake being poured in slow motion, "
                    "dark moody kitchen with purple neon backlighting, liquid splashing "
                    "with dynamic frozen droplets, cinematic shallow depth of field, "
                    "9:16 vertical format, professional food videography"
                ),
                "text": "The protein myth nobody talks about",
                "text_style": "hero",
                "voiceover": "There's a protein myth that nobody talks about.",
                "duration": 4,
                "transition": "cut",
                "effect": "zoom_punch",
                "data_overlays": [],
            },
            {
                "prompt": (
                    "Overhead flat lay of various high-protein foods: chicken breast, eggs, "
                    "greek yogurt, lentils, tofu, fish, arranged on dark slate surface, "
                    "dramatic side lighting casting long shadows, premium food photography, "
                    "dark moody aesthetic with violet color grading, 9:16 vertical"
                ),
                "text": "You DON'T need 200g per day",
                "text_style": "hero",
                "voiceover": "Most people think they need 200 grams of protein per day. But science says otherwise.",
                "duration": 5,
                "transition": "crossfade",
                "effect": "pan_left",
                "data_overlays": [
                    {"text": "200g?", "style": "stat_big", "position": "center", "appear_at": 0.5, "duration": 2.0},
                    {"text": "Common myth", "style": "label", "position": "bottom-left", "appear_at": 1.0, "duration": 2.5},
                ],
            },
            {
                "prompt": (
                    "Cinematic shot of an athletic person in a dark premium gym, "
                    "lifting weights with perfect form, purple ambient lighting, "
                    "sweat glistening, dramatic rim light, professional sports videography, "
                    "shallow depth of field, motivational energy, 9:16 vertical"
                ),
                "text": "0.7-1g per lb is ENOUGH",
                "text_style": "stat",
                "voiceover": "Research shows 0.7 to 1 gram per pound of bodyweight is enough for maximum muscle growth.",
                "duration": 5,
                "transition": "crossfade",
                "effect": "zoom_in",
                "data_overlays": [
                    {"text": "0.7-1.0g/lb", "style": "stat_big", "position": "center", "appear_at": 0.3, "duration": 3.0},
                    {"text": "Meta-analysis 2024", "style": "label", "position": "bottom-right", "appear_at": 1.5, "duration": 2.0},
                ],
            },
            {
                "prompt": (
                    "Abstract 3D visualization of protein molecules breaking down into "
                    "amino acids, colorful particles flowing through a dark space, "
                    "scientific yet artistic, neon violet and coral color palette, "
                    "motion graphics style, clean modern aesthetic, 9:16 vertical"
                ),
                "text": "More protein != more muscle",
                "text_style": "title",
                "voiceover": "Eating more protein beyond this point does NOT build more muscle. Your body simply can't use it all.",
                "duration": 5,
                "transition": "crossfade",
                "effect": "diagonal",
                "data_overlays": [
                    {"text": "Diminishing returns", "style": "comparison", "position": "bottom-left", "appear_at": 1.0, "duration": 2.5},
                ],
            },
            {
                "prompt": (
                    "Person smiling while using a sleek dark-themed nutrition tracking app "
                    "on their phone, cozy kitchen background with warm coral accent lighting, "
                    "close-up of hands and screen, premium lifestyle photography, "
                    "soft bokeh background, 9:16 vertical format"
                ),
                "text": "Send this to your gym buddy",
                "text_style": "cta",
                "voiceover": "Save this and send it to your gym buddy who's chugging 5 shakes a day.",
                "duration": 4,
                "transition": "crossfade",
                "effect": "zoom_out",
                "data_overlays": [],
            },
        ],
    }


# ===================================================================
# MAIN PIPELINE
# ===================================================================

def create_reel_from_script(
    script: dict,
    lang: str = "en",
    use_higgsfield: bool = True,
    output_path: Optional[Path] = None,
) -> Path:
    """
    Full pipeline: generate all assets and compose the final reel.

    Args:
        script: Script dict with title, scenes, voice, music_mood, etc.
        lang: Language code (en, es, etc.)
        use_higgsfield: Use Higgsfield API for video (True) or fallback to images (False)
        output_path: Optional custom output path

    Returns:
        Path to final MP4 reel
    """
    title = script.get("title", "reel")
    voice_pref = script.get("voice", "elevenlabs")
    music_mood = script.get("music_mood", "upbeat")
    visual_setting = script.get("setting", "")
    scene_defs = script.get("scenes", [])

    # Load and apply viral format specs
    specs = load_specs()
    reel_specs = get_reel_specs(specs)
    script = apply_reel_specs_to_script(script, reel_specs)
    scene_defs = script.get("scenes", [])

    # Append visual setting to every scene prompt for continuity
    if visual_setting:
        for sdef in scene_defs:
            orig_prompt = sdef.get("prompt", "")
            if visual_setting not in orig_prompt:
                sdef["prompt"] = f"{orig_prompt}. Consistent visual setting: {visual_setting}"

    ts = int(time.time())
    safe = "".join(c for c in title if c.isalnum() or c in " _-")[:30].strip().replace(" ", "_")
    work_dir = OUTPUT_DIR / f"{safe}_{ts}"
    work_dir.mkdir(parents=True, exist_ok=True)

    if output_path is None:
        output_path = work_dir / f"{safe}.mp4"

    total_duration = sum(s.get("duration", 4) for s in scene_defs)

    print(f"\n{'='*70}")
    print(f"  CALS2GAINS REEL PIPELINE v3.0 - ORCHESTRATOR")
    print(f"{'='*70}")
    print(f"  Title:        {title}")
    print(f"  Scenes:       {len(scene_defs)}")
    print(f"  Est. duration: {total_duration + 3:.0f}s (+ intro/outro)")
    print(f"  Video AI:     {'Higgsfield API' if use_higgsfield else 'Images + Ken Burns'}")
    print(f"  Voice:        {voice_pref} (per-scene)")
    print(f"  Output:       {output_path}")
    print(f"{'='*70}\n")

    # -- STEP 1: Generate scene visuals [Video] --
    print("[1/4] GENERATING SCENE VISUALS")
    print("-" * 70)
    scenes = []
    video_success = 0
    fallback_count = 0

    for i, sdef in enumerate(scene_defs):
        prompt = sdef.get("prompt", "")
        text = sdef.get("text", "")
        text_style = sdef.get("text_style", "title")
        voiceover = sdef.get("voiceover", "")
        duration = sdef.get("duration", 4.0)
        transition = sdef.get("transition", "crossfade")
        effect = sdef.get("effect", "zoom_in")
        trans_dur = sdef.get("transition_duration", 0.5)

        scene_label = text[:40] if text else f"Scene {i+1}"
        print(f"\n  Scene {i+1:2d}/{len(scene_defs)}: \"{scene_label}...\"")
        clip_path = work_dir / f"scene_{i+1:02d}.mp4"

        try:
            if use_higgsfield:
                print(f"           -> Requesting Higgsfield Cloud API...")
                clip_path = generate_scene_clip(
                    prompt=prompt,
                    duration=min(duration, 15),  # Higgsfield max 15s
                    output_path=clip_path,
                    prefer="video",
                    kb_effect=effect,
                )
                video_success += 1
                print(f"           [OK] Video generated ({clip_path.name})")
            else:
                print(f"           -> Generating image with GPT...")
                try:
                    img = generate_gpt_image(
                        prompt,
                        output_path=work_dir / f"scene_{i+1:02d}.webp"
                    )
                    print(f"           [OK] Image generated (GPT)")
                except Exception:
                    print(f"           [WARN] GPT image failed, trying DALL-E 3...")
                    img = generate_dalle3(
                        prompt,
                        output_path=work_dir / f"scene_{i+1:02d}.png"
                    )
                    print(f"           [OK] Image generated (DALL-E)")

                print(f"           -> Applying Ken Burns effect...")
                from video_generator import ken_burns_from_image
                clip_path = ken_burns_from_image(
                    img,
                    duration=duration,
                    output_path=clip_path,
                    effect=effect,
                )
                fallback_count += 1
                print(f"           [OK] Ken Burns applied")

            # Update scene duration to ACTUAL clip duration
            if clip_path.exists():
                from moviepy import VideoFileClip as VFC
                with VFC(str(clip_path)) as vc:
                    actual_dur = vc.duration
                duration = actual_dur
                print(f"           => Actual duration: {duration:.1f}s")

            scenes.append(Scene(
                clip_path=clip_path,
                duration=duration,
                text_overlay=text,
                text_style=text_style,
                voiceover_text=voiceover,
                transition=transition,
                transition_duration=trans_dur,
            ))

        except Exception as e:
            print(f"           [FAIL] {type(e).__name__}: {str(e)[:60]}")
            print(f"           => Using solid color fallback")
            from PIL import Image as PILImage
            fallback = PILImage.new("RGB", Reel.SIZE, (23, 18, 29))
            scenes.append(Scene(
                image=fallback,
                duration=duration,
                text_overlay=text,
                text_style=text_style,
                voiceover_text=voiceover,
                transition=transition,
            ))
            fallback_count += 1

    print(f"\n  Summary: {video_success} videos, {fallback_count} fallbacks")

    # -- STEP 2: Generate voiceover (PER SCENE) [Voice] --
    print("\n[2/4] GENERATING PER-SCENE VOICEOVER")
    print("-" * 70)
    voice_paths = []
    voice_durations = []

    for i, sdef in enumerate(scene_defs):
        vo_text = sdef.get("voiceover", "")
        if not vo_text:
            voice_paths.append(None)
            voice_durations.append(None)
            print(f"  Scene {i+1:2d}: (no voiceover)")
            continue

        print(f"\n  Scene {i+1:2d}/{len(scene_defs)}: Generating voice...")
        try:
            vo_path = generate_voice(
                text=vo_text,
                prefer=voice_pref,
                lang=lang,
                output_path=work_dir / f"voice_{i+1:02d}.mp3",
            )
            voice_paths.append(vo_path)

            # Get actual voice duration for subtitle sync
            try:
                from moviepy import AudioFileClip
                with AudioFileClip(str(vo_path)) as afc:
                    voice_dur = afc.duration
                voice_durations.append(voice_dur)
                print(f"           [OK] {vo_path.name} ({voice_dur:.2f}s)")
            except Exception:
                voice_durations.append(None)
                print(f"           [OK] {vo_path.name} (duration unknown)")

        except Exception as e:
            print(f"           [FAIL] {type(e).__name__}: {str(e)[:50]}")
            voice_paths.append(None)
            voice_durations.append(None)

    # Update Scene objects with voice durations and data overlays
    for i, scene in enumerate(scenes):
        if i < len(voice_durations) and voice_durations[i]:
            scene.voice_duration = voice_durations[i]
        if i < len(scene_defs):
            scene.data_overlays = scene_defs[i].get("data_overlays", [])

    # -- STEP 3: Select/generate music [Music] --
    print("\n[3/4] SELECTING BACKGROUND MUSIC")
    print("-" * 70)
    music_path = get_music(mood=music_mood)

    if not music_path:
        total_dur = sum(s.duration for s in scenes) + 4
        print(f"  No music found in catalog ({music_mood})")
        print(f"  Generating ambient pad ({total_dur:.0f}s)...")
        try:
            music_path = generate_ambient_pad(
                duration_s=total_dur,
                output_path=work_dir / "ambient_pad.wav",
            )
            print(f"  [OK] Ambient pad generated")
        except Exception as e:
            print(f"  [WARN] Ambient pad failed: {e}")
            print(f"  Falling back to silence...")
            music_path = generate_silence(
                duration_s=total_dur,
                output_path=work_dir / "silence.wav",
            )
            print(f"  [OK] Silence generated")
    else:
        print(f"  [OK] Music: {music_path.name}")

    # -- STEP 4: Compose final reel [Compose] --
    print("\n[4/4] COMPOSING FINAL REEL")
    print("-" * 70)
    print(f"  Stitching {len(scenes)} scenes + intro/outro...")
    final = compose_reel(
        scenes=scenes,
        scene_voices=voice_paths,
        music_audio=music_path,
        output_path=output_path,
        add_intro=True,
        add_outro=True,
        cta_text=scene_defs[-1].get("text", "Send this to your gym buddy") if scene_defs else "Send this to your gym buddy",
    )

    print(f"\n{'='*70}")
    print(f"  [SUCCESS] REEL COMPLETE")
    print(f"{'='*70}")
    print(f"  Output:     {final}")
    print(f"  Size:       {final.stat().st_size / (1024*1024):.1f} MB")
    print(f"  Videos:     {video_success}/{len(scene_defs)}")
    print(f"  Fallbacks:  {fallback_count}")
    print(f"{'='*70}\n")

    # Save script for reference
    (work_dir / "script.json").write_text(json.dumps(script, indent=2, ensure_ascii=False))
    print(f"  Script saved: {work_dir / 'script.json'}")
    return final


def create_reel_from_topic(
    topic: str,
    lang: str = "en",
    n_scenes: int = 5,
    output_path: Optional[Path] = None,
) -> Path:
    """
    Generate a reel from a topic using GPT script generation.

    Args:
        topic: Topic/title for the reel
        lang: Language code (en, es, etc.)
        n_scenes: Number of scenes to generate
        output_path: Optional custom output path

    Returns:
        Path to final MP4 reel
    """
    print(f"\n[Script] Generating script for: {topic}")
    script = generate_script_from_topic(topic, lang=lang, n_scenes=n_scenes)
    return create_reel_from_script(script, lang=lang, output_path=output_path)


def create_protein_myth_reel(
    lang: str = "en",
    output_path: Optional[Path] = None,
) -> Path:
    """
    Generate the protein myth reel.

    Args:
        lang: Language code
        output_path: Optional custom output path

    Returns:
        Path to final MP4 reel
    """
    print(f"\n[Script] Using protein myth template")
    script = generate_protein_myth_script(lang=lang)
    return create_reel_from_script(script, lang=lang, output_path=output_path)


# ===================================================================
# CLI ENTRY POINT
# ===================================================================

def main():
    """CLI entry point for reel creation."""
    parser = argparse.ArgumentParser(
        description="Cals2Gains Reel Creator v3.0 - AI Reel Production Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python create_reel.py --demo
  python create_reel.py --protein-myth
  python create_reel.py --topic "5 macro tips" --lang en
  python create_reel.py --script reel.json
        """,
    )

    parser.add_argument(
        "--script",
        type=str,
        help="Path to JSON script file",
    )
    parser.add_argument(
        "--topic",
        type=str,
        help="Auto-generate script from topic using GPT-5.4",
    )
    parser.add_argument(
        "--lang",
        type=str,
        default="en",
        help="Language code (default: en)",
    )
    parser.add_argument(
        "--n-scenes",
        type=int,
        default=5,
        help="Number of scenes for topic-based generation (default: 5)",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Custom output path (default: auto-generated in OUTPUT_DIR)",
    )
    parser.add_argument(
        "--no-video",
        action="store_true",
        help="Skip Higgsfield API, use images + Ken Burns instead",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Run demo reel: 'Track Macros Like a Pro'",
    )
    parser.add_argument(
        "--protein-myth",
        action="store_true",
        help="Generate protein myth reel",
    )

    args = parser.parse_args()

    try:
        # Route to appropriate pipeline
        if args.protein_myth:
            print("\n[Entry] --protein-myth: Generating protein myth reel")
            result = create_protein_myth_reel(
                lang=args.lang,
                output_path=Path(args.output) if args.output else None,
            )

        elif args.script:
            print(f"\n[Entry] --script: Loading from {args.script}")
            script = json.loads(Path(args.script).read_text())
            result = create_reel_from_script(
                script,
                lang=args.lang,
                use_higgsfield=not args.no_video,
                output_path=Path(args.output) if args.output else None,
            )

        elif args.topic:
            print(f"\n[Entry] --topic: Generating script from topic")
            result = create_reel_from_topic(
                topic=args.topic,
                lang=args.lang,
                n_scenes=args.n_scenes,
                output_path=Path(args.output) if args.output else None,
            )

        elif args.demo:
            print(f"\n[Entry] --demo: Running demo reel")
            # Demo: simple quick reel
            demo_script = {
                "title": "Track Macros Like a Pro",
                "lang": args.lang,
                "voice": "elevenlabs",
                "music_mood": "motivational",
                "setting": "Modern gym with purple lighting",
                "scenes": [
                    {
                        "prompt": "Close-up of a fit person holding a smartphone showing a nutrition app, dark moody gym background with purple neon lighting, 9:16 vertical",
                        "text": "Still guessing your macros?",
                        "text_style": "hero",
                        "voiceover": "Are you still guessing your macros? There is a better way.",
                        "duration": 4,
                        "transition": "cut",
                        "effect": "zoom_in",
                        "data_overlays": [],
                    },
                    {
                        "prompt": "Overhead shot of meal prep containers with colorful healthy food, dark marble counter, dramatic lighting, 9:16 vertical",
                        "text": "Scan. Track. Done.",
                        "text_style": "title",
                        "voiceover": "With Cals2Gains, just scan your food and your macros are tracked instantly.",
                        "duration": 4,
                        "transition": "crossfade",
                        "effect": "pan_left",
                        "data_overlays": [
                            {"text": "< 3 sec", "style": "stat_big", "position": "center", "appear_at": 1.0, "duration": 2.0},
                        ],
                    },
                    {
                        "prompt": "Athletic person doing weight training in a premium dark gym with purple ambient lighting, 9:16 vertical",
                        "text": "AI Coach for Your Goals",
                        "text_style": "title",
                        "voiceover": "Our AI coach adapts to your goals. Cut, bulk, or maintain.",
                        "duration": 4,
                        "transition": "crossfade",
                        "effect": "zoom_out",
                        "data_overlays": [],
                    },
                    {
                        "prompt": "Person celebrating reaching a fitness goal, vibrant energy, dark background with coral light, 9:16 vertical",
                        "text": "Download Free",
                        "text_style": "cta",
                        "voiceover": "Download Cals2Gains free today. Link in bio.",
                        "duration": 3,
                        "transition": "fade_black",
                        "effect": "zoom_in",
                        "data_overlays": [],
                    },
                ],
            }
            result = create_reel_from_script(
                demo_script,
                lang=args.lang,
                use_higgsfield=not args.no_video,
                output_path=Path(args.output) if args.output else None,
            )

        else:
            # Default: show help
            parser.print_help()
            print("\n[Note] No input specified. Using --protein-myth as default...")
            result = create_protein_myth_reel(
                lang=args.lang,
                output_path=Path(args.output) if args.output else None,
            )

        print(f"\n[Complete] Reel saved: {result}")
        return result

    except KeyboardInterrupt:
        print("\n[Interrupted] User cancelled pipeline")
        sys.exit(130)
    except Exception as e:
        print(f"\n[Error] {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
