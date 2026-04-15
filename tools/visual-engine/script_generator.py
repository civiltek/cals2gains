"""
Script Generator - AI-Powered Instagram Reel Script Creation
============================================================

This module handles AI-powered script generation for Instagram Reels using GPT-4.
It generates viral-format scripts optimized for the Cals2Gains brand with:
- Compelling hooks (first 1.5-2.5 seconds)
- Scene-by-scene breakdowns with video prompts for Higgsfield AI
- Detailed camera presets and movements
- Voiceover narration
- Optional data overlays and CTAs
- Multi-language support

Key Features:
- Generates complete 30-60 second Reel scripts
- Video prompts optimized for Higgsfield AI video generation
- Viral format rules from VIRAL-FORMAT-BIBLE
- Muted-video optimized (85% watch muted, text carries message)
- DM-share optimized CTAs
- Fitness/nutrition niche styling
- Configurable scene durations (3-6 seconds per scene)
"""

import json
import httpx
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict

from brand_config import (
    OPENAI_API_KEY,
    BRAND_VIDEO_SUFFIX,
    BRAND_STYLE_SUFFIX,
    Colors,
    Reel,
    OUTPUT_DIR,
)


@dataclass
class DataOverlay:
    """Stat overlay for a scene (optional)"""
    stat: str  # e.g., "200g"
    label: str  # e.g., "Daily Protein Target"
    color: str = Colors.macro_protein  # hex color


@dataclass
class Scene:
    """Individual scene in a Reel script"""
    scene_num: int
    duration_s: float
    video_prompt: str  # Detailed prompt for Higgsfield AI
    camera_preset: str  # CINEMATIC_SLOW_ZOOM, ORBIT_360, DOLLY_IN, etc.
    text: str  # Max 7 words for on-screen overlay
    voiceover: str  # Narration text for this scene
    data_overlays: List[DataOverlay] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, handling dataclass objects"""
        return {
            "scene_num": self.scene_num,
            "duration_s": self.duration_s,
            "video_prompt": self.video_prompt,
            "camera_preset": self.camera_preset,
            "text": self.text,
            "voiceover": self.voiceover,
            "data_overlays": [
                {
                    "stat": overlay.stat,
                    "label": overlay.label,
                    "color": overlay.color,
                }
                for overlay in self.data_overlays
            ],
        }


@dataclass
class ReelScript:
    """Complete Instagram Reel script"""
    title: str
    hook: str  # First 2.5 seconds of engaging content
    scenes: List[Scene]
    cta_text: str  # Call-to-action
    total_duration_s: float
    lang: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "title": self.title,
            "hook": self.hook,
            "scenes": [scene.to_dict() for scene in self.scenes],
            "cta_text": self.cta_text,
            "total_duration_s": self.total_duration_s,
            "lang": self.lang,
        }


# ============================================================================
# SYSTEM PROMPT - Encodes viral format rules from VIRAL-FORMAT-BIBLE
# ============================================================================

VIRAL_SYSTEM_PROMPT = f"""You are an expert Instagram Reel scriptwriter specializing in fitness and nutrition content.
You generate viral-format scripts optimized for the Cals2Gains brand.

CRITICAL FORMAT RULES (from VIRAL-FORMAT-BIBLE):
1. HOOK (first 1.5-2.5 seconds): Must be curiosity-driven, pattern-interrupt, or counterintuitive
   - Examples: "This myth is costing you gains", "Nobody talks about this", "You've been doing it wrong"
   - Goal: Stop scroll in first second, establish emotional hook

2. SCENE DURATION: Each scene 3-6 seconds (typically 4-5 seconds)
   - Avoid scenes under 3s (too jarring)
   - Avoid scenes over 6s (retention drop)

3. TEXT ON SCREEN (max 7 words per scene):
   - 85% of viewers watch MUTED - text MUST carry the message
   - Use impact words: bold claims, contrasts, numbers, action verbs
   - Examples: "Myth: Need 200g Daily", "Reality: 100g Enough", "Science Says: Quality Wins"

4. VOICEOVER NARRATION:
   - Conversational, direct address ("you", "your")
   - Explain WHY, not just WHAT
   - Create pattern-break: setup contrasts with expectation
   - 1-2 sentences per scene maximum

5. VIDEO PROMPTS for Higgsfield AI:
   - Ultra-detailed: camera angle, lighting, movement, subjects, mood
   - Include brand color palette: plum (#17121D), violet (#9C8CFF), coral (#FF6A4D)
   - Fitness/gym context
   - Always end with: "{BRAND_VIDEO_SUFFIX}"

6. CAMERA PRESETS (cinematic movement):
   - CINEMATIC_SLOW_ZOOM: Slow dolly-zoom with shallow DOF, builds tension
   - ORBIT_360: Smooth 360-degree orbit, reveals subject from all angles
   - DOLLY_IN: Linear push toward subject, reveals detail
   - TILT_UP: Vertical reveal, shows scale or emotion
   - PAN_REVEAL: Horizontal sweep, discovers element
   - RACK_FOCUS: Focus shift from foreground to background element
   - SPIN_360_FAST: Quick 360 spin for energy/comedy relief
   - PARALLAX: Multi-plane depth with foreground/background layers

7. DATA OVERLAYS (optional):
   - Use for statistics, research data, contrasts
   - Format: stat (large number) + label (context)
   - Example: stat="100g", label="Optimal Daily Intake"
   - Colors: macro_protein (#9C8CFF), macro_carbs (#F7F2EA), macro_fat (#FF6A4D)

8. CTA (Call-to-Action):
   - DM-share optimized: "Save this & send to your gym buddy"
   - Engagement optimized: "Follow for more fitness myths busted"
   - Action-oriented: "Click our link for the full breakdown"

OUTPUT FORMAT (JSON):
{{
    "title": "Hook title that summarizes the reel",
    "hook": "First 2.5 seconds of engaging copy",
    "scenes": [
        {{
            "scene_num": 1,
            "duration_s": 4.0,
            "video_prompt": "Detailed Higgsfield AI prompt...",
            "camera_preset": "CINEMATIC_SLOW_ZOOM",
            "text": "Max 7 words here",
            "voiceover": "Conversational narration for this scene",
            "data_overlays": [
                {{"stat": "200g", "label": "Common Myth", "color": "{Colors.macro_protein}"}}
            ]
        }},
        ...
    ],
    "cta_text": "Save this & share with your gym buddy",
    "total_duration_s": 30.0,
    "lang": "en"
}}

BRAND STYLE CONTEXT (Cals2Gains fitness coaching):
- Dark premium aesthetic: plum backgrounds, violet/coral accents
- Target audience: fitness enthusiasts, gym-goers, nutrition hackers
- Tone: Expert yet approachable, myth-busting, data-driven
- Energy: High-paced, addictive, addictive loops
- Value: Health/fitness facts, myth-busting, optimization tips

You MUST validate:
- All scenes total the requested duration (within 1 second tolerance)
- Each scene text is <= 7 words
- Each scene duration is 3-6 seconds
- Hook is compelling and curiosity-driven
- Video prompts are detailed and include brand context
- CTA is actionable and DM-share optimized
"""


# ============================================================================
# MAIN API FUNCTIONS
# ============================================================================


def generate_script(
    topic: str,
    lang: str = "en",
    n_scenes: int = 5,
    duration_target_s: float = 30.0,
) -> Dict[str, Any]:
    """
    Generate a complete Instagram Reel script using GPT-4.

    Args:
        topic: The main topic for the Reel (e.g., "protein myths", "carb timing", "hydration")
        lang: Language code (e.g., "en", "es", "fr"). Default: "en"
        n_scenes: Number of scenes in the Reel. Default: 5
        duration_target_s: Total duration target in seconds. Default: 30.0 (30s Reel)

    Returns:
        Dict with keys:
        - title: Reel title/hook
        - hook: Hook copy (first 2.5 seconds)
        - scenes: List of scene dicts with all details
        - cta_text: Call-to-action
        - total_duration_s: Calculated total duration
        - lang: Language code

    Raises:
        httpx.HTTPError: If OpenAI API call fails
        json.JSONDecodeError: If response is not valid JSON
    """
    if not OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY not set. Check .env file or environment variables."
        )

    # Build user prompt
    user_prompt = f"""Generate a viral Instagram Reel script with these requirements:

TOPIC: {topic}
LANGUAGE: {lang}
NUMBER OF SCENES: {n_scenes}
TOTAL DURATION TARGET: {duration_target_s} seconds
AVERAGE SCENE DURATION: {duration_target_s / n_scenes:.1f} seconds per scene (adjust within 3-6s range)

Create a compelling, myth-busting style script in the fitness/nutrition niche.
The script should be addictive, fact-driven, and optimized for muted viewing (text-forward).

Return ONLY valid JSON (no markdown, no code blocks, just raw JSON object).
"""

    # Call OpenAI API
    client = httpx.Client()
    try:
        response = client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": VIRAL_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.8,  # Creative but not chaotic
                "max_tokens": 4000,
            },
            timeout=60.0,
        )
        response.raise_for_status()

        result = response.json()
        script_json = result["choices"][0]["message"]["content"]

        # Parse JSON response
        script_data = json.loads(script_json)

        # Validate and reconstruct as ReelScript
        script = _validate_and_construct_script(script_data)

        return script.to_dict()

    finally:
        client.close()


def generate_protein_myth_script(lang: str = "en") -> Dict[str, Any]:
    """
    Generate a hardcoded demo script for "The protein myth nobody talks about".

    This is a 30-second, 5-scene Reel with detailed video prompts for Higgsfield AI.

    Args:
        lang: Language code (currently only "en" is implemented)

    Returns:
        Dict with complete Reel script structure
    """
    if lang != "en":
        # Could add other languages here
        print(f"Warning: Language '{lang}' not yet implemented, using English")
        lang = "en"

    # Scene 1: Hook (3s)
    scene1 = Scene(
        scene_num=1,
        duration_s=3.0,
        text="Think you need 200g protein?",
        voiceover="Everyone at the gym is chasing 200 grams of protein daily. But what if I told you that's not the whole story?",
        camera_preset="CINEMATIC_SLOW_ZOOM",
        video_prompt=(
            "Fit athlete in a modern gym, shirtless or in sleeveless shirt, holding a protein shake and looking skeptical. "
            "Close-up of the shake being mixed, showing whey powder clouds. Dark moody gym lighting with deep plum (#17121D) "
            "shadows and violet (#9C8CFF) rim lighting from neon signs. Cinematic slow zoom into the face with shallow depth of field. "
            "High-intensity fitness mood, professional gym setting with weights in background slightly blurred. "
            f"{BRAND_VIDEO_SUFFIX}"
        ),
        data_overlays=[
            DataOverlay(stat="200g", label="Daily Protein Myth", color=Colors.macro_protein)
        ],
    )

    # Scene 2: The Science (5s)
    scene2 = Scene(
        scene_num=2,
        duration_s=5.0,
        text="Science says something different",
        voiceover="Research from the Journal of the International Society of Sports Nutrition found that muscle protein synthesis plateaus around 0.7 to 1.0 grams per pound of body weight.",
        camera_preset="DOLLY_IN",
        video_prompt=(
            "Scientific lab setting with test tubes, protein samples, and research data on screens. A scientist or fitness expert "
            "pointing at a large graph showing protein synthesis curves. Plum and violet color palette with coral accent lights. "
            "Cinematic dolly-in movement from wide lab shot to close-up of the data/graph. Professional research aesthetic with "
            "subtle animation of the curve line. Shallow depth of field, moody lab lighting with warm coral highlights. "
            f"{BRAND_VIDEO_SUFFIX}"
        ),
        data_overlays=[
            DataOverlay(
                stat="0.7-1.0g",
                label="Per Pound Body Weight",
                color=Colors.macro_protein,
            )
        ],
    )

    # Scene 3: Real Numbers (5s)
    scene3 = Scene(
        scene_num=3,
        duration_s=5.0,
        text="Real numbers: 100-150g tops",
        voiceover="For most people, 100 to 150 grams of quality protein per day is more than enough to build and maintain muscle.",
        camera_preset="PAN_REVEAL",
        video_prompt=(
            "Food preparation scene showing high-quality protein sources: grilled chicken breast, salmon fillets, eggs, Greek yogurt, "
            "and legumes arranged on a dark plum cutting board. Each food item is illuminated with soft violet key light and coral fill. "
            "Smooth horizontal pan revealing each protein source from left to right. Close-up shots of texture and freshness. "
            "Professional food photography style with shallow depth of field and cinematic color grading. Plum background with "
            "minimal props. Fitness influencer production quality. "
            f"{BRAND_VIDEO_SUFFIX}"
        ),
        data_overlays=[
            DataOverlay(
                stat="100-150g",
                label="Daily Optimal Intake",
                color=Colors.macro_protein,
            )
        ],
    )

    # Scene 4: Quality Over Quantity (5s)
    scene4 = Scene(
        scene_num=4,
        duration_s=5.0,
        text="Quality matters way more",
        voiceover="The real secret is protein quality. Complete amino acid profiles, timing distribution, and hitting your total daily intake matters infinitely more than obsessing over 200 grams.",
        camera_preset="RACK_FOCUS",
        video_prompt=(
            "Cooking montage in a modern kitchen: grilling chicken breast, sautéing fish, cooking eggs, blending protein smoothie. "
            "Each action is captured with professional cinematography. Wide shots showing the kitchen (dark plum countertops), "
            "then rack-focus into close-ups of food being prepared. Hands of someone (fitness influencer aesthetic) preparing meals. "
            "Violet neon accent lighting on the kitchen edges, coral highlights on the food. Shallow depth of field throughout. "
            "Smooth transitions between cooking scenes. Professional cooking show aesthetic. "
            f"{BRAND_VIDEO_SUFFIX}"
        ),
        data_overlays=[],
    )

    # Scene 5: CTA - Brand Outro (4s)
    scene5 = Scene(
        scene_num=5,
        duration_s=4.0,
        text="Save this & share it",
        voiceover="Save this video, send it to your gym buddy who's obsessing over protein, and follow for more fitness myths debunked.",
        camera_preset="CINEMATIC_SLOW_ZOOM",
        video_prompt=(
            "Cals2Gains brand logo/watermark animation with a fit athlete in the background (gym setting with weights). "
            "Logo zooms in and pulses with violet and coral colors. Slow zoom out to reveal the athlete nodding with confidence. "
            "Dark plum background with gradient fade at edges. Violet rim light on athlete, coral accent glow around logo. "
            "Professional outro template aesthetic. Call-to-action text: 'Follow @cals2gains for more fitness science'. "
            "Instagram Reels end-card style. "
            f"{BRAND_VIDEO_SUFFIX}"
        ),
        data_overlays=[],
    )

    # Construct complete script
    script = ReelScript(
        title="The Protein Myth Nobody Talks About",
        hook="Think you need 200g protein daily? Science says you're wrong.",
        scenes=[scene1, scene2, scene3, scene4, scene5],
        cta_text="Save this & send to your gym buddy | Follow @cals2gains",
        total_duration_s=22.0,
        lang=lang,
    )

    return script.to_dict()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _validate_and_construct_script(data: Dict[str, Any]) -> ReelScript:
    """
    Validate and construct a ReelScript from GPT response data.

    Args:
        data: Dict with keys: title, hook, scenes, cta_text, total_duration_s, lang

    Returns:
        ReelScript object

    Raises:
        ValueError: If validation fails
    """
    # Validate required keys
    required_keys = {"title", "hook", "scenes", "cta_text", "lang"}
    if not all(key in data for key in required_keys):
        raise ValueError(f"Missing required keys in script data: {required_keys}")

    # Validate and construct scenes
    scenes = []
    total_duration = 0.0

    for scene_data in data.get("scenes", []):
        # Validate scene keys
        scene_required = {
            "scene_num",
            "duration_s",
            "video_prompt",
            "camera_preset",
            "text",
            "voiceover",
        }
        if not all(key in scene_data for key in scene_required):
            raise ValueError(
                f"Missing required keys in scene {scene_data.get('scene_num')}: {scene_required}"
            )

        # Validate text length (max 7 words)
        text_words = len(scene_data["text"].split())
        if text_words > 7:
            raise ValueError(
                f"Scene {scene_data['scene_num']} text exceeds 7 words: "
                f"'{scene_data['text']}' ({text_words} words)"
            )

        # Validate duration range (3-6 seconds)
        duration = scene_data["duration_s"]
        if duration < 3.0 or duration > 6.0:
            raise ValueError(
                f"Scene {scene_data['scene_num']} duration out of range: "
                f"{duration}s (must be 3-6s)"
            )

        # Reconstruct data overlays
        overlays = []
        for overlay_data in scene_data.get("data_overlays", []):
            overlays.append(
                DataOverlay(
                    stat=overlay_data.get("stat", ""),
                    label=overlay_data.get("label", ""),
                    color=overlay_data.get("color", Colors.macro_protein),
                )
            )

        # Create Scene object
        scene = Scene(
            scene_num=scene_data["scene_num"],
            duration_s=duration,
            video_prompt=scene_data["video_prompt"],
            camera_preset=scene_data["camera_preset"],
            text=scene_data["text"],
            voiceover=scene_data["voiceover"],
            data_overlays=overlays,
        )

        scenes.append(scene)
        total_duration += duration

    # Calculate total duration (or use provided value)
    calculated_total = data.get("total_duration_s", total_duration)

    # Validate total duration matches scenes (within 1 second tolerance)
    if abs(total_duration - calculated_total) > 1.0:
        raise ValueError(
            f"Total duration mismatch: scenes sum to {total_duration}s, "
            f"but total_duration_s is {calculated_total}s"
        )

    # Construct and return ReelScript
    script = ReelScript(
        title=data["title"],
        hook=data["hook"],
        scenes=scenes,
        cta_text=data["cta_text"],
        total_duration_s=total_duration,
        lang=data["lang"],
    )

    return script


def save_script_to_file(script: Dict[str, Any], filename: str = "reel_script.json"):
    """
    Save a generated script to a JSON file in OUTPUT_DIR.

    Args:
        script: Dict returned from generate_script() or generate_protein_myth_script()
        filename: Output filename (default: "reel_script.json")

    Returns:
        Path to the saved file
    """
    output_path = OUTPUT_DIR / filename
    with open(output_path, "w") as f:
        json.dump(script, f, indent=2)
    return output_path


def load_script_from_file(filename: str) -> Dict[str, Any]:
    """
    Load a previously saved script from a JSON file.

    Args:
        filename: Filename in OUTPUT_DIR

    Returns:
        Dict with script data
    """
    file_path = OUTPUT_DIR / filename
    with open(file_path, "r") as f:
        return json.load(f)


# ============================================================================
# DEMO / TESTING
# ============================================================================

if __name__ == "__main__":
    # Example 1: Generate protein myth script (hardcoded)
    print("=" * 80)
    print("EXAMPLE 1: Hardcoded Protein Myth Script")
    print("=" * 80)

    protein_script = generate_protein_myth_script(lang="en")
    print(json.dumps(protein_script, indent=2))

    # Save to file
    save_path = save_script_to_file(
        protein_script, "demo_protein_myth_script.json"
    )
    print(f"\nScript saved to: {save_path}")

    # Example 2: Generate custom script via GPT (requires API key)
    print("\n" + "=" * 80)
    print("EXAMPLE 2: AI-Generated Script (requires OPENAI_API_KEY)")
    print("=" * 80)
    print("Uncomment below to test GPT generation...\n")

    # Uncomment to test:
    # try:
    #     custom_script = generate_script(
    #         topic="Carb timing myths for muscle building",
    #         lang="en",
    #         n_scenes=5,
    #         duration_target_s=30.0,
    #     )
    #     print(json.dumps(custom_script, indent=2))
    #     save_script_to_file(custom_script, "custom_script.json")
    # except Exception as e:
    #     print(f"Error generating script: {e}")
