"""
Cals2Gains - Music Manager v3.0
=================================
Background music selection and generation for reels.

Features:
- Load music catalog from JSON (cached background tracks)
- Generate silence fallback
- Generate ambient pad using numpy (new in v3.0)

FIXES in v3.0:
- Added generate_ambient_pad() function for dark ambient background music
- Creates low pad chords with gentle LFO and fade in/out
- Called from create_reel when get_music returns None

Music mood options: upbeat, calm, motivational, dark, ambient
"""

import json
import wave
from pathlib import Path

import numpy as np

from brand_config import OUTPUT_DIR

# Music catalog location
MUSIC_DIR = OUTPUT_DIR / "music"
CATALOG_PATH = MUSIC_DIR / "catalog.json"


def _load_catalog() -> dict:
    """Load music catalog from JSON file."""
    if CATALOG_PATH.exists():
        try:
            with open(CATALOG_PATH) as f:
                return json.load(f)
        except Exception as e:
            print(f"[Music] Catalog load error: {e}")
    return {"tracks": {}}


def get_music(mood: str = "upbeat") -> Path | None:
    """Get a music track for the given mood.

    Returns:
        Path to audio file, or None if not found
    """
    catalog = _load_catalog()
    tracks = catalog.get("tracks", {})
    mood_tracks = tracks.get(mood, [])

    if not mood_tracks:
        print(f"[Music] No tracks for mood '{mood}'")
        return None

    # Return first available track that exists
    for track_info in mood_tracks:
        if isinstance(track_info, dict):
            track_file = MUSIC_DIR / track_info.get("file", "")
        else:
            track_file = MUSIC_DIR / str(track_info)

        if track_file.exists():
            print(f"[Music] Selected: {track_file.name} ({mood})")
            return track_file

    print(f"[Music] All tracks for '{mood}' missing from disk")
    return None


def generate_silence(duration_s: float = 30.0, output_path: Path | None = None) -> Path:
    """Generate a silent audio file.

    Args:
        duration_s: Duration in seconds
        output_path: Output WAV file path

    Returns:
        Path to generated WAV file
    """
    sr = 44100
    n_samples = int(sr * duration_s)
    signal = np.zeros(n_samples, dtype=np.int16)

    if output_path is None:
        output_path = MUSIC_DIR / "silence.wav"

    output_path = Path(str(output_path)).with_suffix(".wav")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with wave.open(str(output_path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(signal.tobytes())

    print(f"[Music] Generated silence ({duration_s:.0f}s) -> {output_path}")
    return output_path


def generate_ambient_pad(
    duration_s: float = 30.0,
    output_path: Path | None = None,
    bpm: int = 90,
    mood: str = "dark",
) -> Path:
    """Generate professional stereo ambient background music.

    Studio-grade features:
    - Stereo field with panned voices and width modulation
    - Multi-layer harmonic content (pad + shimmer + sub + texture)
    - Convolution-style reverb tail simulation
    - Chord progression (not static) for musical interest
    - Smooth exponential fades
    - Rhythmic pulse synced to BPM

    Moods: dark (plum/violet), warm (coral/gold), ethereal (violet/bone)
    """
    sr = 44100
    n_samples = int(sr * duration_s)
    t = np.linspace(0, duration_s, n_samples, endpoint=False)

    # Chord progressions by mood (frequencies in Hz)
    progressions = {
        "dark": [
            # Cm - Ab - Eb - Bb (dark cinematic, fits plum palette)
            [65.41, 77.78, 98.0, 130.81],   # Cm
            [52.00, 65.41, 82.41, 104.0],    # Ab
            [77.78, 98.0, 116.54, 155.56],   # Eb
            [58.27, 73.42, 87.31, 116.54],   # Bb
        ],
        "warm": [
            # F - Am - Dm - G (warm, uplifting)
            [87.31, 110.0, 130.81, 174.61],
            [110.0, 130.81, 164.81, 220.0],
            [73.42, 87.31, 110.0, 146.83],
            [98.0, 123.47, 146.83, 196.0],
        ],
        "ethereal": [
            # Cmaj7 - Em - Am7 - Fmaj7 (dreamy)
            [65.41, 82.41, 98.0, 123.47],
            [82.41, 98.0, 123.47, 164.81],
            [110.0, 130.81, 164.81, 196.0],
            [87.31, 110.0, 130.81, 164.81],
        ],
    }

    chords = progressions.get(mood, progressions["dark"])
    beat_s = 60.0 / bpm
    bars_per_chord = 4
    chord_dur = beat_s * bars_per_chord * 4  # 4/4 time

    # Initialize stereo signal
    left = np.zeros(n_samples, dtype=np.float64)
    right = np.zeros(n_samples, dtype=np.float64)

    # -- Layer 1: Pad voices with chord changes --
    for i in range(n_samples):
        chord_idx = int((t[i] % (chord_dur * len(chords))) / chord_dur) % len(chords)
        freqs = chords[chord_idx]

        for j, f in enumerate(freqs):
            # Slightly detune each voice for warmth
            detune = 1.0 + (j - 1.5) * 0.002
            val = 0.10 * np.sin(2 * np.pi * f * detune * t[i])
            # 1st harmonic
            val += 0.04 * np.sin(2 * np.pi * f * detune * 2 * t[i])

            # Pan each voice differently in stereo field
            pan = 0.5 + 0.3 * np.sin(2 * np.pi * 0.02 * (j + 1) * t[i])
            left[i] += val * (1 - pan)
            right[i] += val * pan

    # -- Layer 2: High shimmer (subtle harmonic sparkle) --
    shimmer_freq = chords[0][2] * 4  # High octave of 3rd note
    shimmer_lfo = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t))
    shimmer = 0.015 * np.sin(2 * np.pi * shimmer_freq * t) * shimmer_lfo
    shimmer2 = 0.010 * np.sin(2 * np.pi * shimmer_freq * 1.005 * t) * shimmer_lfo
    # Shimmer wide in stereo
    left += shimmer
    right += shimmer2

    # -- Layer 3: Sub bass pulse synced to BPM --
    sub_env = 0.5 + 0.5 * np.cos(2 * np.pi * (bpm / 60.0 / 2) * t)  # Half-note pulse
    sub = 0.05 * np.sin(2 * np.pi * 32.7 * t) * sub_env
    # Sub centered in stereo
    left += sub
    right += sub

    # -- Layer 4: Texture (filtered noise for air) --
    noise = np.random.normal(0, 1, n_samples) * 0.008
    # Simple low-pass via running average
    kernel_size = 200
    kernel = np.ones(kernel_size) / kernel_size
    noise_lp = np.convolve(noise, kernel, mode='same')
    noise_lfo = 0.3 + 0.7 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.03 * t))
    noise_lp *= noise_lfo
    left += noise_lp * 0.8
    right += noise_lp * 1.2  # Slightly asymmetric for width

    # -- Global LFO (breathing) --
    breath = 0.5 + 0.5 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.06 * t))
    left *= breath
    right *= breath

    # -- Reverb simulation (feedback delay network approximation) --
    delay_samples = [int(sr * d) for d in [0.037, 0.043, 0.053, 0.067]]
    feedback = 0.35
    for delay in delay_samples:
        if delay < n_samples:
            left_delayed = np.zeros_like(left)
            right_delayed = np.zeros_like(right)
            left_delayed[delay:] = left[:-delay] * feedback
            right_delayed[delay:] = right[:-delay] * feedback
            left += left_delayed
            right += right_delayed

    # -- Exponential fades (smoother than linear) --
    fade_in_s = 2.5
    fade_out_s = 4.0
    fade_in_n = int(sr * fade_in_s)
    fade_out_n = int(sr * fade_out_s)

    fade_in_curve = (np.linspace(0, 1, fade_in_n)) ** 2  # Exponential
    fade_out_curve = (np.linspace(1, 0, fade_out_n)) ** 2

    left[:fade_in_n] *= fade_in_curve
    right[:fade_in_n] *= fade_in_curve
    left[-fade_out_n:] *= fade_out_curve
    right[-fade_out_n:] *= fade_out_curve

    # -- Normalize to ~45% volume (ducking headroom) --
    peak = max(np.max(np.abs(left)), np.max(np.abs(right)))
    if peak > 0:
        left = left / peak * 0.45
        right = right / peak * 0.45

    # -- Write stereo WAV --
    if output_path is None:
        output_path = MUSIC_DIR / "ambient_pad.wav"
    output_path = Path(str(output_path)).with_suffix(".wav")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Interleave stereo channels
    stereo = np.empty(n_samples * 2, dtype=np.int16)
    stereo[0::2] = (left * 32767).clip(-32767, 32767).astype(np.int16)
    stereo[1::2] = (right * 32767).clip(-32767, 32767).astype(np.int16)

    with wave.open(str(output_path), "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(stereo.tobytes())

    print(f"[Music] Generated stereo ambient pad ({duration_s:.0f}s, {mood}) -> {output_path}")
    return output_path


if __name__ == "__main__":
    # Test functions
    print("[Music] Testing music manager...")

    # Test ambient pad generation
    test_pad = generate_ambient_pad(duration_s=10.0, output_path=OUTPUT_DIR / "test_ambient.wav")
    print(f"[Music] Ambient pad: {test_pad}")

    # Test silence generation
    test_silence = generate_silence(duration_s=5.0, output_path=OUTPUT_DIR / "test_silence.wav")
    print(f"[Music] Silence: {test_silence}")

    print("[Music] [OK] Tests complete")
