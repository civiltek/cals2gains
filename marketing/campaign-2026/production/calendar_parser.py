"""
Cals2Gains — Calendar Parser & Status Tracker
================================================
Parses CONTENT-CALENDAR-90D.md and tracks generation/approval/publish status.

Used by scheduled tasks to know what content is due today.

Usage:
    from calendar_parser import get_today_content, update_status, get_week_content

    # Get today's posts
    items = get_today_content()

    # Get this week's posts
    items = get_week_content()

    # Update status
    update_status("2026-05-01", "approved")
"""

import json
import re
from datetime import datetime, timedelta
from pathlib import Path

CAMPAIGN_DIR = Path(__file__).resolve().parent.parent
CALENDAR_FILE = CAMPAIGN_DIR / "CONTENT-CALENDAR-90D.md"
STATUS_FILE = CAMPAIGN_DIR / "production" / "content_status.json"
REELS_DIR = CAMPAIGN_DIR / "reels"
CAROUSELS_DIR = CAMPAIGN_DIR / "carousels"
OUTPUT_DIR = CAMPAIGN_DIR / "output"

# Campaign year — calendar uses DD/MM format, we need to infer the year
CAMPAIGN_YEAR = 2026


def _load_status():
    """Load or create the status tracker."""
    if STATUS_FILE.exists():
        with open(STATUS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_status(status):
    """Persist status tracker."""
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(status, f, indent=2, ensure_ascii=False)


def parse_calendar():
    """Parse the content calendar markdown into structured data."""
    if not CALENDAR_FILE.exists():
        return []

    text = CALENDAR_FILE.read_text(encoding="utf-8")
    entries = []

    # Match table rows: | DD/MM | Format | Content | Script | Hook |
    pattern = re.compile(
        r"\|\s*(\d{2}/\d{2})\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*\"(.+?)\"\s*\|"
    )

    current_phase = ""
    current_week = ""

    for line in text.split("\n"):
        # Track phase
        if line.startswith("## FASE"):
            current_phase = line.strip("# ").strip()
        if line.startswith("### Semana"):
            current_week = line.strip("# ").strip()

        match = pattern.match(line.strip())
        if match:
            day_month = match.group(1)  # DD/MM
            fmt = match.group(2).strip()
            content = match.group(3).strip()
            script = match.group(4).strip()
            hook = match.group(5).strip()

            # Parse date
            day, month = day_month.split("/")
            date_str = f"{CAMPAIGN_YEAR}-{month.zfill(2)}-{day.zfill(2)}"

            # Find script files
            script_files = _find_script_files(script, fmt)

            entries.append({
                "date": date_str,
                "day_month": day_month,
                "format": fmt.lower(),
                "content": content,
                "script_id": script if script != "—" else None,
                "hook_en": hook,
                "phase": current_phase,
                "week": current_week,
                "script_files": script_files,
            })

    return entries


def _find_script_files(script_id, fmt):
    """Find EN and ES script JSON files for a given script ID."""
    if script_id == "—" or not script_id:
        return {"en": None, "es": None}

    files = {"en": None, "es": None}
    script_id = script_id.strip()

    if fmt.lower() == "reel":
        search_dir = REELS_DIR
    elif fmt.lower() == "carousel":
        search_dir = CAROUSELS_DIR
    else:
        return files

    if search_dir.exists():
        for lang in ("en", "es"):
            candidate = search_dir / f"{script_id}_{lang}.json"
            if candidate.exists():
                files[lang] = str(candidate)

    return files


def _find_output_files(script_id, fmt):
    """Find generated output files for a script."""
    if not script_id or not OUTPUT_DIR.exists():
        return {"en": None, "es": None}

    outputs = {"en": None, "es": None}
    for lang in ("en", "es"):
        out_dir = OUTPUT_DIR / f"{script_id}_{lang}"
        if out_dir.exists():
            # Look for the main output file
            if fmt == "reel":
                # Video file
                for ext in (".mp4", ".mov"):
                    vids = list(out_dir.glob(f"*{ext}"))
                    if vids:
                        outputs[lang] = str(vids[0])
                        break
            elif fmt == "carousel":
                # Image files (slides)
                imgs = sorted(out_dir.glob("*.png")) + sorted(out_dir.glob("*.jpg"))
                if imgs:
                    outputs[lang] = [str(p) for p in imgs]

    return outputs


def get_today_content(date=None):
    """Get content scheduled for today (or a specific date)."""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")

    entries = parse_calendar()
    status = _load_status()

    today_items = []
    for entry in entries:
        if entry["date"] == date:
            entry["status"] = status.get(date, {}).get("status", "pending")
            entry["outputs"] = _find_output_files(entry["script_id"], entry["format"])
            today_items.append(entry)

    return today_items


def get_week_content(start_date=None):
    """Get content for the current week (Mon-Sun)."""
    if start_date is None:
        today = datetime.now()
        # Go to Monday
        start = today - timedelta(days=today.weekday())
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")

    end = start + timedelta(days=6)
    entries = parse_calendar()
    status = _load_status()

    week_items = []
    for entry in entries:
        entry_date = datetime.strptime(entry["date"], "%Y-%m-%d")
        if start <= entry_date <= end:
            entry["status"] = status.get(entry["date"], {}).get("status", "pending")
            entry["outputs"] = _find_output_files(entry["script_id"], entry["format"])
            week_items.append(entry)

    return week_items


def get_next_n_days(n=7):
    """Get content for the next N days from today."""
    today = datetime.now()
    entries = parse_calendar()
    status = _load_status()

    items = []
    for entry in entries:
        entry_date = datetime.strptime(entry["date"], "%Y-%m-%d")
        delta = (entry_date - today).days
        if 0 <= delta < n:
            entry["status"] = status.get(entry["date"], {}).get("status", "pending")
            entry["outputs"] = _find_output_files(entry["script_id"], entry["format"])
            items.append(entry)

    return items


def update_status(date, new_status, details=None):
    """Update status for a date's content.

    Statuses: pending → generated → sent_for_approval → approved → scheduled → published
    """
    status = _load_status()
    if date not in status:
        status[date] = {}
    status[date]["status"] = new_status
    status[date]["updated_at"] = datetime.now().isoformat()
    if details:
        status[date]["details"] = details
    _save_status(status)
    return status[date]


def get_posting_schedule(date=None):
    """Get optimal posting times for a date's content."""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")

    items = get_today_content(date)
    if not items:
        return []

    # From CONTENT-CALENDAR-90D.md posting rules
    schedule = []
    for item in items:
        if item["format"] == "reel":
            schedule.append({
                **item,
                "instagram_time": "18:30",
                "tiktok_time": "19:00",
                "youtube_time": "17:00",
            })
        elif item["format"] == "carousel":
            schedule.append({
                **item,
                "instagram_time": "12:00",
                "tiktok_time": None,  # No carousels on TikTok
                "youtube_time": None,
            })

    return schedule


def summary_for_telegram(date=None):
    """Generate a formatted summary for Telegram notification."""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")

    items = get_today_content(date)
    if not items:
        return f"📅 {date}\n\nNo hay contenido programado para hoy."

    lines = [f"📅 <b>Contenido para {date}</b>\n"]

    for item in items:
        icon = "🎬" if item["format"] == "reel" else "📸"
        has_script = "✅" if item["script_id"] else "⚠️ Sin script"
        has_output = "✅" if any(v for v in item["outputs"].values()) else "⏳ Por generar"

        lines.append(f"{icon} <b>{item['format'].upper()}</b>: {item['content']}")
        lines.append(f"   Script: {has_script} | Output: {has_output}")
        lines.append(f"   Hook: <i>\"{item['hook_en']}\"</i>")

        if item["script_id"]:
            lines.append(f"   ID: <code>{item['script_id']}</code>")

        # Posting times
        schedule = get_posting_schedule(date)
        for s in schedule:
            if s["date"] == item["date"]:
                times = []
                if s.get("instagram_time"):
                    times.append(f"IG {s['instagram_time']}")
                if s.get("tiktok_time"):
                    times.append(f"TT {s['tiktok_time']}")
                if s.get("youtube_time"):
                    times.append(f"YT {s['youtube_time']}")
                if times:
                    lines.append(f"   ⏰ {' | '.join(times)}")

        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--today":
        date = sys.argv[2] if len(sys.argv) > 2 else None
        items = get_today_content(date)
        print(json.dumps(items, indent=2, ensure_ascii=False))
    elif len(sys.argv) > 1 and sys.argv[1] == "--week":
        items = get_week_content()
        print(json.dumps(items, indent=2, ensure_ascii=False))
    elif len(sys.argv) > 1 and sys.argv[1] == "--summary":
        date = sys.argv[2] if len(sys.argv) > 2 else None
        print(summary_for_telegram(date))
    elif len(sys.argv) > 1 and sys.argv[1] == "--all":
        entries = parse_calendar()
        print(json.dumps(entries, indent=2, ensure_ascii=False))
        print(f"\nTotal entries: {len(entries)}")
    else:
        print("Usage:")
        print("  python calendar_parser.py --today [YYYY-MM-DD]")
        print("  python calendar_parser.py --week")
        print("  python calendar_parser.py --summary [YYYY-MM-DD]")
        print("  python calendar_parser.py --all")
