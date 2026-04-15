"""
Cals2Gains - Template Loader
==============================
Loads viral format specs from TEMPLATE-SPECS.json and applies them
to reel/carousel generation. Falls back to defaults when specs unavailable.

Defaults reflect VIRAL-FORMAT-BIBLE.md 2026 research. TEMPLATE-SPECS.json
overrides these via _deep_merge — JSON keys must match defaults exactly.
"""

import json
from pathlib import Path
from typing import Optional

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
SPECS_PATH = TEMPLATES_DIR / "TEMPLATE-SPECS.json"


def load_specs() -> dict:
    """Load TEMPLATE-SPECS.json, return empty dict if missing."""
    if SPECS_PATH.exists():
        try:
            return json.loads(SPECS_PATH.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[TemplateLoader] Warning: could not parse specs: {e}")
    return {}


def get_reel_specs(specs: Optional[dict] = None) -> dict:
    """Extract reel-specific format specs with defaults (2026 viral research)."""
    if specs is None:
        specs = load_specs()
    reel_raw = specs.get("reel", specs.get("reels", {}))
    defaults = {
        "aspect_ratio": "9:16",
        "resolution": [1080, 1920],
        "fps": 30,
        "max_duration_s": 90,
        # 2026: sweet spot 7-15s. 12s default — enough for hook+value+CTA.
        "optimal_duration_s": 12,
        # Hook must land emotional punch in 2-3s (2026 research: 25% viral potential)
        "hook_duration_s": 2.5,
        "scene_duration_s": 4,
        "cta_duration_s": 3,
        "transitions": {
            "default": "crossfade",
            "duration_s": 0.4,
            # zoom_cut and whip_pan are top-performing in fitness 2026
            "preferred": ["zoom_cut", "whip_pan", "crossfade", "jump_cut"],
            "avoid": ["glitch", "capcut_template"]
        },
        "text_overlay": {
            "max_words_per_screen": 7,
            "position": "center",
            "safe_zone_top_pct": 15,
            "safe_zone_bottom_pct": 20,
            # 2026: 60%+ watch in mute — text must carry the full message
            "require_mute_readable": True,
            "subtitles_recommended": True,
        },
        "pacing": {
            "cuts_per_minute": 18,
            "min_scene_s": 2,
            "max_scene_s": 6
        },
        "audio": {
            "music_volume_db": -12,
            "voice_start_delay_s": 0.5,
            "target_lufs": -14,
            # 2026: IG Originality Score penalises watermarked audio -60-80% reach
            "no_watermark_audio": True,
        },
        "intro": {
            "enabled": True,
            "duration_s": 0.8,   # Fast brand flash — don't waste hook window
            "style": "logo_fade"
        },
        "outro": {
            "enabled": True,
            "duration_s": 2.5,
            "style": "cta_logo"
        },
        # 2026: DM-bait CTA — sends per reach is top-2 algo signal
        "cta": {
            "default_text_en": "Send this to a friend who needs it",
            "default_text_es": "Manda esto a alguien que lo necesite",
            "dm_bait_enabled": True,
        },
        "hook": {
            "style": "title_card_fullscreen",
            "preferred_types": [
                "shared_struggle",
                "myth_reality",
                "rhetorical_question",
                "numeric_claim",
                "visual_comparison",
            ],
        },
    }
    _deep_merge(defaults, reel_raw)
    return defaults


def get_carousel_specs(specs: Optional[dict] = None) -> dict:
    """Extract carousel-specific format specs with defaults (2026 viral research)."""
    if specs is None:
        specs = load_specs()
    car_raw = specs.get("carousel", specs.get("carousels", {}))
    defaults = {
        "aspect_ratio": "4:5",
        "resolution": [1080, 1350],  # 4:5 portrait — max screen real estate
        # 2026: 8-12 slides for educational earns saves; 5-7 for quick tips
        "max_slides": 20,
        "optimal_slides": 8,
        "formats": {
            "square": [1080, 1080],
            "portrait": [1080, 1350],
            "story": [1080, 1920]
        },
        "slide_types": {
            "hook": {
                "position": 1,
                "text_style": "hero",
                "max_words": 10,
                "description": "Answer in <2s: Is this for me? What do I get if I swipe?",
            },
            "problem": {"position": 2, "text_style": "title", "max_words": 15},
            "solution": {
                "positions": [3, 4, 5, 6, 7, 8],
                "text_style": "title",
                "max_words": 20,
            },
            # 2026 new: self-contained saveable workout/nutrition card
            "screenshot_card": {
                "text_style": "title",
                "max_words": 30,
                "layout": "card",
                "add_save_reminder": True,
                "description": "Each slide works standalone: exercise/tip + details + cue. High save-rate.",
            },
            "proof": {"text_style": "stat", "max_words": 10},
            "cta": {
                "position": -1,
                "text_style": "cta",
                "max_words": 10,
                "description": "Save-bait + DM-bait. DM shares weighted 3-5x by algorithm.",
            },
        },
        "text_overlay": {
            "max_words_per_slide": 20,
            "headline_max_words": 7,
            "safe_zone_top_pct": 10,
            "safe_zone_bottom_pct": 10,
        },
        "swipe_cues": {
            "enabled": True,
            "text": "→",
            "position": "bottom_right"
        },
        "slide_counter": {
            "enabled": True,
            "position": "top_right",
            "style": "fraction"   # "1/8" format — shows progress, drives STR
        },
        # 2026: always pair save-bait (quality signal) + DM-bait (distribution signal)
        "cta": {
            "save_text_en": "Save this",
            "save_text_es": "Guarda este post",
            "dm_bait_text_en": "Send this to a friend who needs it",
            "dm_bait_text_es": "Manda esto a alguien que lo necesite",
            "include_both": True,
        },
    }
    _deep_merge(defaults, car_raw)
    return defaults


def get_cta_text(specs: dict, lang: str = "en", format_type: str = "reel") -> dict:
    """Return CTA texts for the given language and format."""
    if format_type == "carousel":
        cta = specs.get("cta", {})
        return {
            "save": cta.get(f"save_text_{lang}", "Save this" if lang == "en" else "Guarda este post"),
            "dm_bait": cta.get(
                f"dm_bait_text_{lang}",
                "Send this to a friend who needs it" if lang == "en" else "Manda esto a alguien que lo necesite",
            ),
        }
    else:
        cta = specs.get("cta", {})
        return {
            "dm_bait": cta.get(
                f"default_text_{lang}",
                "Send this to a friend who needs it" if lang == "en" else "Manda esto a alguien que lo necesite",
            ),
        }


def apply_reel_specs_to_script(script: dict, reel_specs: dict) -> dict:
    """Adjust a reel script to match viral format specs."""
    scenes = script.get("scenes", [])
    pacing = reel_specs.get("pacing", {})
    min_s = pacing.get("min_scene_s", 2)
    max_s = pacing.get("max_scene_s", 6)
    hook_dur = reel_specs.get("hook_duration_s", 2.5)
    cta_dur = reel_specs.get("cta_duration_s", 3)
    default_dur = reel_specs.get("scene_duration_s", 4)
    trans = reel_specs.get("transitions", {})
    default_trans = trans.get("default", "crossfade")
    trans_dur = trans.get("duration_s", 0.4)
    avoid = trans.get("avoid", [])
    preferred = trans.get("preferred", [default_trans])
    text_spec = reel_specs.get("text_overlay", {})
    max_words = text_spec.get("max_words_per_screen", 7)

    for i, scene in enumerate(scenes):
        # Enforce duration bounds
        dur = scene.get("duration", default_dur)
        if i == 0:
            dur = min(dur, hook_dur)
        elif i == len(scenes) - 1:
            dur = min(dur, cta_dur)
        scene["duration"] = max(min_s, min(max_s, dur))

        # Apply/validate transition from specs
        current_trans = scene.get("transition", default_trans)
        if current_trans in avoid or current_trans not in preferred:
            scene["transition"] = default_trans
        else:
            scene["transition"] = current_trans
        scene.setdefault("transition_duration", trans_dur)

        # Truncate overlay text if too wordy
        text = scene.get("text", "")
        words = text.split()
        if len(words) > max_words:
            scene["text"] = " ".join(words[:max_words])

    script["scenes"] = scenes
    return script


def apply_carousel_specs_to_slides(slides: list, car_specs: dict) -> list:
    """Adjust carousel slides to match viral format specs."""
    max_slides = car_specs.get("max_slides", 20)
    text_spec = car_specs.get("text_overlay", {})
    max_words = text_spec.get("max_words_per_slide", 20)
    headline_max = text_spec.get("headline_max_words", 7)
    slide_types = car_specs.get("slide_types", {})
    swipe = car_specs.get("swipe_cues", {})

    # Trim slides to max
    if len(slides) > max_slides:
        slides = slides[:max_slides]

    for i, slide in enumerate(slides):
        # Apply slide type defaults
        stype = slide.get("type", "solution")
        type_spec = slide_types.get(stype, {})
        if "text_style" not in slide and "text_style" in type_spec:
            slide["text_style"] = type_spec["text_style"]
        # screenshot_card has higher word limit
        smax = type_spec.get("max_words", max_words)

        # Truncate text
        headline = slide.get("headline", "")
        words = headline.split()
        if len(words) > headline_max and stype != "screenshot_card":
            slide["headline"] = " ".join(words[:headline_max])
        body = slide.get("body", "")
        bwords = body.split()
        if len(bwords) > smax:
            slide["body"] = " ".join(bwords[:smax])

        # Add swipe cue (not on last slide)
        if swipe.get("enabled") and i < len(slides) - 1:
            slide["swipe_cue"] = True

        # Flag screenshot_card slides for special rendering
        if stype == "screenshot_card":
            slide["_layout"] = "card"

    return slides


def _deep_merge(base: dict, override: dict):
    """Recursively merge override into base (in-place)."""
    for k, v in override.items():
        if k.startswith("_"):
            continue   # skip metadata keys
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            _deep_merge(base[k], v)
        else:
            base[k] = v
