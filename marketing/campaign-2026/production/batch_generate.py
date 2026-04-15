"""
Cals2Gains — Batch Content Generator
======================================
Automates production of all reels and carousels from JSON scripts.

Usage:
    python batch_generate.py --all                  # Generate everything
    python batch_generate.py --reels                # Only reels
    python batch_generate.py --carousels            # Only carousels
    python batch_generate.py --lang en              # Only English
    python batch_generate.py --lang es              # Only Spanish
    python batch_generate.py --script reel_01       # Match by name fragment
    python batch_generate.py --dry-run              # Show what would be generated
    python batch_generate.py --all --parallel 2     # Run 2 at a time
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed

# Paths
CAMPAIGN_DIR = Path(__file__).resolve().parent.parent
REELS_DIR = CAMPAIGN_DIR / "reels"
CAROUSELS_DIR = CAMPAIGN_DIR / "carousels"
OUTPUT_DIR = CAMPAIGN_DIR / "output"
VISUAL_ENGINE = Path(__file__).resolve().parent.parent.parent.parent / "tools" / "visual-engine"

CREATE_REEL = VISUAL_ENGINE / "create_reel.py"
CREATE_CAROUSEL = VISUAL_ENGINE / "create_carousel.py"


def find_scripts(script_type="all", lang=None, name_filter=None):
    """Find all JSON script files matching filters."""
    scripts = []

    if script_type in ("all", "reels"):
        if REELS_DIR.exists():
            for f in sorted(REELS_DIR.glob("*.json")):
                scripts.append(("reel", f))

    if script_type in ("all", "carousels"):
        if CAROUSELS_DIR.exists():
            for f in sorted(CAROUSELS_DIR.glob("*.json")):
                scripts.append(("carousel", f))

    # Filter by language
    if lang:
        scripts = [(t, f) for t, f in scripts if f.stem.endswith(f"_{lang}")]

    # Filter by name fragment
    if name_filter:
        scripts = [(t, f) for t, f in scripts if name_filter in f.stem]

    return scripts


def generate_one(script_type, script_path, output_dir):
    """Generate a single reel or carousel from a script file."""
    output_subdir = output_dir / script_path.stem
    output_subdir.mkdir(parents=True, exist_ok=True)

    if script_type == "reel":
        cmd = [
            sys.executable,
            str(CREATE_REEL),
            "--script", str(script_path),
            "--output", str(output_subdir),
        ]
    else:
        cmd = [
            sys.executable,
            str(CREATE_CAROUSEL),
            "--script", str(script_path),
            "--output", str(output_subdir),
        ]

    print(f"  [{script_type.upper()}] {script_path.name}")
    print(f"    -> {output_subdir}")

    start = time.time()
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=str(VISUAL_ENGINE),
        timeout=600,  # 10 min max per piece
    )
    elapsed = time.time() - start

    # Save logs
    log_file = output_subdir / "generate.log"
    with open(log_file, "w", encoding="utf-8") as f:
        f.write(f"Command: {' '.join(cmd)}\n")
        f.write(f"Duration: {elapsed:.1f}s\n")
        f.write(f"Return code: {result.returncode}\n\n")
        f.write("=== STDOUT ===\n")
        f.write(result.stdout or "(empty)")
        f.write("\n\n=== STDERR ===\n")
        f.write(result.stderr or "(empty)")

    status = "OK" if result.returncode == 0 else "FAIL"
    print(f"    {status} ({elapsed:.1f}s)")

    return {
        "script": script_path.name,
        "type": script_type,
        "status": status,
        "duration": elapsed,
        "output": str(output_subdir),
        "returncode": result.returncode,
    }


def run_batch(scripts, output_dir, parallel=1, dry_run=False):
    """Run batch generation for all scripts."""
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  Cals2Gains Batch Content Generator")
    print(f"  Scripts found: {len(scripts)}")
    print(f"  Output: {output_dir}")
    print(f"  Parallel: {parallel}")
    print(f"{'='*60}\n")

    if dry_run:
        print("DRY RUN — no files will be generated:\n")
        for script_type, script_path in scripts:
            print(f"  [{script_type.upper()}] {script_path.name}")
        print(f"\nTotal: {len(scripts)} items")
        return []

    results = []
    start_all = time.time()

    if parallel <= 1:
        # Sequential
        for i, (script_type, script_path) in enumerate(scripts, 1):
            print(f"\n[{i}/{len(scripts)}]")
            result = generate_one(script_type, script_path, output_dir)
            results.append(result)
    else:
        # Parallel
        with ProcessPoolExecutor(max_workers=parallel) as executor:
            futures = {}
            for script_type, script_path in scripts:
                future = executor.submit(generate_one, script_type, script_path, output_dir)
                futures[future] = (script_type, script_path)

            for i, future in enumerate(as_completed(futures), 1):
                script_type, script_path = futures[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    print(f"  [ERROR] {script_path.name}: {e}")
                    results.append({
                        "script": script_path.name,
                        "type": script_type,
                        "status": "ERROR",
                        "duration": 0,
                        "output": "",
                        "returncode": -1,
                    })

    total_time = time.time() - start_all

    # Summary
    ok = sum(1 for r in results if r["status"] == "OK")
    fail = len(results) - ok

    print(f"\n{'='*60}")
    print(f"  BATCH COMPLETE")
    print(f"  Total: {len(results)} | OK: {ok} | Failed: {fail}")
    print(f"  Time: {total_time:.1f}s ({total_time/60:.1f} min)")
    print(f"{'='*60}")

    if fail > 0:
        print(f"\n  Failed items:")
        for r in results:
            if r["status"] != "OK":
                print(f"    - {r['script']} (exit code {r['returncode']})")
                log = Path(r["output"]) / "generate.log" if r["output"] else None
                if log and log.exists():
                    print(f"      Log: {log}")

    # Save manifest
    manifest_path = output_dir / "batch_manifest.json"
    manifest = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total_scripts": len(results),
        "success": ok,
        "failed": fail,
        "total_seconds": round(total_time, 1),
        "results": results,
    }
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\n  Manifest saved: {manifest_path}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Batch generate Cals2Gains marketing content")
    parser.add_argument("--all", action="store_true", help="Generate all reels and carousels")
    parser.add_argument("--reels", action="store_true", help="Generate only reels")
    parser.add_argument("--carousels", action="store_true", help="Generate only carousels")
    parser.add_argument("--lang", choices=["en", "es"], help="Filter by language")
    parser.add_argument("--script", type=str, help="Filter by script name fragment")
    parser.add_argument("--output", type=str, help="Custom output directory")
    parser.add_argument("--parallel", type=int, default=1, help="Number of parallel workers")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without generating")
    args = parser.parse_args()

    # Determine type filter
    if args.reels:
        script_type = "reels"
    elif args.carousels:
        script_type = "carousels"
    elif args.all or (not args.reels and not args.carousels):
        script_type = "all"
    else:
        script_type = "all"

    scripts = find_scripts(script_type, args.lang, args.script)

    if not scripts:
        print("No scripts found matching filters.")
        sys.exit(1)

    output_dir = Path(args.output) if args.output else OUTPUT_DIR
    run_batch(scripts, output_dir, args.parallel, args.dry_run)


if __name__ == "__main__":
    main()
