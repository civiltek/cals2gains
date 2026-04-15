"""
Cals2Gains — Meta Business Suite Scheduler Helper
=====================================================
Prepares content for scheduling in Meta Business Suite.

Generates a scheduling manifest with all info needed to create
scheduled posts in MBS, either manually or via automation.

Each approved piece gets a ready-to-post package:
  - Caption (ES + EN in first comment)
  - Hashtags
  - Media files (paths)
  - Scheduled time
  - Platform (IG, FB)

Usage:
    python mbs_scheduler.py --date 2026-05-01
    python mbs_scheduler.py --week
"""

import json
import sys
from datetime import datetime
from pathlib import Path

CAMPAIGN_DIR = Path(__file__).resolve().parent.parent
HASHTAG_FILE = CAMPAIGN_DIR / "HASHTAG-STRATEGY.md"
OUTPUT_DIR = CAMPAIGN_DIR / "output"
SCHEDULES_DIR = CAMPAIGN_DIR / "production" / "schedules"


# Posting times (CET) from CONTENT-CALENDAR-90D.md
POSTING_TIMES = {
    "reel": {
        "instagram": "18:30",
        "tiktok": "19:00",
        "youtube_shorts": "17:00",
    },
    "carousel": {
        "instagram": "12:00",
    },
}

# Core hashtags always included
CORE_HASHTAGS_EN = ["#cals2gains", "#macrotracking", "#aifitness", "#nutritionapp", "#smarttracking"]
CORE_HASHTAGS_ES = ["#cals2gains", "#macrotracking", "#nutricion", "#appnutricion", "#vidasana"]

# Topic-specific hashtag mapping
TOPIC_HASHTAGS = {
    "protein_myth": {
        "en": ["#proteinmyths", "#nutritionmyths", "#proteingoals", "#fitnesstips", "#highprotein"],
        "es": ["#mitosnutricion", "#proteina", "#consejosfit", "#alimentacion", "#proteinas"],
    },
    "scan_3_seconds": {
        "en": ["#foodscan", "#aifood", "#caloriecounting", "#techfitness", "#foodtracking"],
        "es": ["#escanearia", "#contarcalorias", "#tecnologiafit", "#trackearcomida", "#innovacion"],
    },
    "5_foods": {
        "en": ["#highproteinfoods", "#proteinrich", "#nutritionhacks", "#healthyeating", "#foodfacts"],
        "es": ["#alimentosproteina", "#comersano", "#hacksnutricion", "#comidasana", "#datosnutricionales"],
    },
    "old_vs_new": {
        "en": ["#fittech", "#appcomparison", "#healthtech", "#fitnessapp", "#2026fitness"],
        "es": ["#tecnologiafit", "#appfitness", "#healthtech", "#appsalud", "#fitness2026"],
    },
    "calorie_myths": {
        "en": ["#caloriemyths", "#diettips", "#nutritionscience", "#caloriedeficit", "#fatloss"],
        "es": ["#mitoscalorias", "#consejosdieta", "#ciencianutricional", "#deficitcalorico", "#perdergrasa"],
    },
    "day_of_macros": {
        "en": ["#whatieatinaday", "#fulldayofeating", "#macros", "#mealdiary", "#dailymacros"],
        "es": ["#loquecomoenundia", "#diacomidas", "#macronutrientes", "#diariodecomidas", "#macrosdiarios"],
    },
    "macro_basics": {
        "en": ["#macros101", "#nutritionguide", "#learnnutrition", "#fitnessbasics", "#macrocoach"],
        "es": ["#macros101", "#guianutricion", "#aprendernutricion", "#basesfit", "#coachmacros"],
    },
    "app_features": {
        "en": ["#fittech", "#nutritionai", "#aicoach", "#fitnessapp", "#appfeatures"],
        "es": ["#tecnologiafit", "#ianutricion", "#coachia", "#appfitness", "#funciones"],
    },
    "cut_vs_bulk": {
        "en": ["#cutvsbulk", "#cuttingseason", "#bulkingseason", "#bodyrecomp", "#leangains"],
        "es": ["#definicionvsvolumen", "#definicion", "#volumen", "#recomposicion", "#ganarmasa"],
    },
    "meal_prep": {
        "en": ["#mealprep", "#mealprepsunday", "#batchcooking", "#foodprep", "#macrofriendly"],
        "es": ["#mealprep", "#batchcooking", "#preparacioncomidas", "#cocinafit", "#macroamigable"],
    },
    "beginner_mistakes": {
        "en": ["#fitnesstips", "#beginnerfitness", "#nutritionmistakes", "#gymtips", "#fitnessjourney"],
        "es": ["#consejosfit", "#principiantes", "#erroresnutricion", "#consejogym", "#caminofit"],
    },
}


def get_hashtags_for_script(script_id, lang="en"):
    """Get the full hashtag set for a script."""
    if not script_id:
        return CORE_HASHTAGS_EN if lang == "en" else CORE_HASHTAGS_ES

    core = CORE_HASHTAGS_EN if lang == "en" else CORE_HASHTAGS_ES

    # Extract topic from script_id (e.g. "reel_01_protein_myth" -> "protein_myth")
    parts = script_id.split("_", 2)
    topic = parts[2] if len(parts) > 2 else ""

    topic_tags = TOPIC_HASHTAGS.get(topic, {}).get(lang, [])

    return core + topic_tags


def build_caption(item, lang="es"):
    """Build a ready-to-post caption for the item."""
    # Load script for voiceover/text content
    script_file = item.get("script_files", {}).get(lang)
    if script_file and Path(script_file).exists():
        with open(script_file, "r", encoding="utf-8") as f:
            script = json.load(f)

        # Use CTA scene voiceover as caption base
        cta_scene = script["scenes"][-1]
        title = script["title"]
        cta = cta_scene.get("voiceover", "")
    else:
        title = item.get("content", "")
        cta = ""

    hashtags = get_hashtags_for_script(item.get("script_id"), lang)
    hashtag_str = " ".join(hashtags)

    caption = f"{title}\n\n{cta}\n\n{hashtag_str}"
    return caption.strip()


def build_schedule_package(item, date=None):
    """Build a complete scheduling package for one content item."""
    if date is None:
        date = item.get("date", datetime.now().strftime("%Y-%m-%d"))

    fmt = item.get("format", "reel")
    times = POSTING_TIMES.get(fmt, {})
    script_id = item.get("script_id")

    package = {
        "date": date,
        "format": fmt,
        "content_title": item.get("content", ""),
        "script_id": script_id,
        "hook": item.get("hook_en", ""),
        "platforms": [],
    }

    # Build per-platform per-language posts
    for platform, time_str in times.items():
        for lang in ("es", "en"):
            caption = build_caption(item, lang)
            output_key = item.get("outputs", {}).get(lang)

            post = {
                "platform": platform,
                "language": lang,
                "scheduled_time": f"{date}T{time_str}:00",
                "caption": caption,
                "media_files": output_key if output_key else None,
                "status": "ready" if output_key else "needs_generation",
            }
            package["platforms"].append(post)

    return package


def save_schedule(date, packages):
    """Save scheduling packages to a JSON file."""
    SCHEDULES_DIR.mkdir(parents=True, exist_ok=True)
    filepath = SCHEDULES_DIR / f"schedule_{date}.json"

    data = {
        "date": date,
        "generated_at": datetime.now().isoformat(),
        "posts": packages,
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return filepath


def main():
    from calendar_parser import get_today_content, get_week_content

    if len(sys.argv) > 1 and sys.argv[1] == "--date":
        date = sys.argv[2] if len(sys.argv) > 2 else datetime.now().strftime("%Y-%m-%d")
        items = get_today_content(date)
    elif len(sys.argv) > 1 and sys.argv[1] == "--week":
        items = get_week_content()
    else:
        print("Usage:")
        print("  python mbs_scheduler.py --date [YYYY-MM-DD]")
        print("  python mbs_scheduler.py --week")
        return

    if not items:
        print("No content found for the specified period.")
        return

    packages = []
    for item in items:
        pkg = build_schedule_package(item)
        packages.append(pkg)
        print(f"\n{'='*50}")
        print(f"  {item['format'].upper()}: {item['content']}")
        print(f"  Date: {item['date']}")
        for post in pkg["platforms"]:
            print(f"  [{post['platform'].upper()}] [{post['language'].upper()}] {post['scheduled_time']}")
            print(f"    Status: {post['status']}")

    # Save
    date = items[0]["date"]
    filepath = save_schedule(date, packages)
    print(f"\nSchedule saved: {filepath}")


if __name__ == "__main__":
    main()
