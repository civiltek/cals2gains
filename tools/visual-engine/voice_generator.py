"""
Cals2Gains - Voice Generator with Word-Level Timestamps
==========================================================
TTS with subtitle sync support using ElevenLabs (primary) and OpenAI (fallback).
Provides word-level timestamps for precise subtitle alignment.
"""

import httpx
import time
import base64
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from brand_config import OPENAI_API_KEY, ELEVENLABS_API_KEY, OUTPUT_DIR

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(60.0, connect=15.0)
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds


def _estimate_word_timestamps(words: List[str], duration_s: float) -> List[Dict[str, Any]]:
    """
    Estimate word timestamps by distributing words evenly across duration.
    Used for OpenAI fallback which doesn't provide timestamp data.

    Args:
        words: List of words to timestamp
        duration_s: Total audio duration in seconds

    Returns:
        List of dicts with 'word', 'start', 'end' keys
    """
    if not words or duration_s <= 0:
        return []

    timestamps = []
    time_per_word = duration_s / len(words)

    for i, word in enumerate(words):
        start = i * time_per_word
        end = (i + 1) * time_per_word
        timestamps.append({
            "word": word,
            "start": round(start, 3),
            "end": round(end, 3)
        })

    return timestamps


def _reconstruct_word_timestamps(
    text: str,
    characters: List[str],
    char_start_times: List[float],
    char_end_times: List[float]
) -> List[Dict[str, Any]]:
    """
    Reconstruct word-level timestamps from character-level data.
    Aligns words with character timing data from ElevenLabs.

    Args:
        text: Original input text
        characters: List of individual characters with timings
        char_start_times: Start times for each character
        char_end_times: End times for each character

    Returns:
        List of dicts with 'word', 'start', 'end' keys
    """
    if not characters or not char_start_times or not char_end_times:
        # Fallback: split by words and estimate
        words = text.split()
        return _estimate_word_timestamps(words, char_end_times[-1] if char_end_times else 0.0)

    word_timestamps = []
    current_word = ""
    word_start_time = None
    word_end_time = None

    for i, char in enumerate(characters):
        if i < len(char_start_times) and i < len(char_end_times):
            char_start = char_start_times[i]
            char_end = char_end_times[i]
        else:
            continue

        # Track word boundaries
        if char.isspace():
            if current_word:
                word_timestamps.append({
                    "word": current_word,
                    "start": round(word_start_time, 3) if word_start_time is not None else 0.0,
                    "end": round(word_end_time, 3) if word_end_time is not None else 0.0
                })
                current_word = ""
                word_start_time = None
                word_end_time = None
        else:
            current_word += char
            if word_start_time is None:
                word_start_time = char_start
            word_end_time = char_end

    # Add final word if exists
    if current_word:
        word_timestamps.append({
            "word": current_word,
            "start": round(word_start_time, 3) if word_start_time is not None else 0.0,
            "end": round(word_end_time, 3) if word_end_time is not None else 0.0
        })

    return word_timestamps


def generate_voice_elevenlabs(
    text: str,
    voice_id: str = "21m00Tcm4TlvDq8ikWAM",
    lang: str = "en",
    model: str = "eleven_multilingual_v2",
    stability: float = 0.5,
    similarity_boost: float = 0.75,
    style: float = 0.0,
    speed: float = 1.0,
    use_speaker_boost: bool = True,
    output_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Generate voice with ElevenLabs API v1 with word-level timestamps.

    Args:
        text: Text to synthesize
        voice_id: ElevenLabs voice ID (default: Rachel - 21m00Tcm4TlvDq8ikWAM)
        lang: Language code (e.g., 'en', 'es', 'fr')
        model: Model ID (default: eleven_multilingual_v2)
        stability: Voice stability (0.0 - 1.0, default: 0.5) — baja = más expresiva.
        similarity_boost: Similarity boost (0.0 - 1.0, default: 0.75) — alta = acento fiel.
        style: Style exaggeration (0.0 - 1.0, default: 0.0) — alto = más dramático/autoritativo.
        speed: Speech speed (0.7 - 1.2, default: 1.0) — ritmo viral reels: 1.05-1.15.
        use_speaker_boost: Boost claridad del altavoz (default True).
        output_path: Path to save MP3 file

    Returns:
        Dict with keys:
            - audio_path: Path to generated MP3
            - duration_s: Audio duration in seconds
            - word_timestamps: List of {"word": str, "start": float, "end": float}
    """
    if not ELEVENLABS_API_KEY:
        raise RuntimeError("[ElevenLabs] API key not configured (ELEVENLABS_API_KEY)")

    if not text or not text.strip():
        raise ValueError("[ElevenLabs] Text cannot be empty")

    logger.info(f"[ElevenLabs] Generating voice for {len(text)} chars using model {model}")

    # Use the with-timestamps endpoint for subtitle sync
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "model_id": model,
        "voice_settings": {
            "stability": stability,
            "similarity_boost": similarity_boost,
            "style": style,
            "use_speaker_boost": use_speaker_boost,
            "speed": speed,
        }
    }

    # Retry logic
    for attempt in range(MAX_RETRIES):
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(url, headers=headers, json=payload)
                resp.raise_for_status()

                data = resp.json()

                # Extract audio and alignment data
                audio_base64 = data.get("audio_base64")
                alignment = data.get("alignment", {})

                if not audio_base64:
                    raise ValueError("[ElevenLabs] No audio data in response")

                # Decode audio
                audio_bytes = base64.b64decode(audio_base64)

                # Set output path
                if output_path is None:
                    output_path = OUTPUT_DIR / f"voice_el_{int(time.time() * 1000)}.mp3"
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_bytes(audio_bytes)

                logger.info(f"[ElevenLabs] Saved audio to {output_path}")

                # Calculate duration (rough estimate: MP3 bitrate ~128kbps)
                # More accurate: use alignment data if available
                characters = alignment.get("characters", [])
                char_end_times = alignment.get("character_end_times_seconds", [])
                duration_s = char_end_times[-1] if char_end_times else (len(audio_bytes) / (128000 / 8))

                # Reconstruct word timestamps from character data
                char_start_times = alignment.get("character_start_times_seconds", [])
                word_timestamps = _reconstruct_word_timestamps(
                    text, characters, char_start_times, char_end_times
                )

                logger.info(f"[ElevenLabs] Generated {len(word_timestamps)} word timestamps")

                return {
                    "audio_path": str(output_path),
                    "duration_s": round(duration_s, 2),
                    "word_timestamps": word_timestamps
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"[ElevenLabs] HTTP {e.response.status_code}: {e.response.text}")
            if attempt < MAX_RETRIES - 1:
                logger.info(f"[ElevenLabs] Retrying ({attempt + 1}/{MAX_RETRIES}) in {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY)
            else:
                raise
        except Exception as e:
            logger.error(f"[ElevenLabs] Attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                raise


def generate_voice_openai(
    text: str,
    voice: str = "nova",
    model: str = "tts-1",
    speed: float = 1.0,
    output_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Generate voice with OpenAI TTS API with estimated word-level timestamps.
    Note: OpenAI does not provide precise timing, so timestamps are estimated
    by distributing words evenly across the audio duration.

    Args:
        text: Text to synthesize
        voice: Voice name (alloy, echo, fable, onyx, nova, shimmer)
        model: Model ID (tts-1 or tts-1-hd)
        speed: Speech speed (0.25 - 4.0, default: 1.0)
        output_path: Path to save MP3 file

    Returns:
        Dict with keys:
            - audio_path: Path to generated MP3
            - duration_s: Audio duration in seconds
            - word_timestamps: List of {"word": str, "start": float, "end": float}
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("[OpenAI TTS] API key not configured (OPENAI_API_KEY)")

    if not text or not text.strip():
        raise ValueError("[OpenAI TTS] Text cannot be empty")

    logger.info(f"[OpenAI TTS] Generating voice for {len(text)} chars using {model}")

    url = "https://api.openai.com/v1/audio/speech"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "input": text,
        "voice": voice,
        "speed": speed,
        "response_format": "mp3"
    }

    # Retry logic
    for attempt in range(MAX_RETRIES):
        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(url, headers=headers, json=payload)
                resp.raise_for_status()

                audio_bytes = resp.content

                # Set output path
                if output_path is None:
                    output_path = OUTPUT_DIR / f"voice_oai_{int(time.time() * 1000)}.mp3"
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_bytes(audio_bytes)

                logger.info(f"[OpenAI TTS] Saved audio to {output_path}")

                # Estimate duration from audio bytes
                # MP3 bitrate approximation (OpenAI uses ~128kbps)
                duration_s = len(audio_bytes) / (128000 / 8)

                # Split text into words and estimate timestamps
                words = text.split()
                word_timestamps = _estimate_word_timestamps(words, duration_s)

                logger.info(f"[OpenAI TTS] Generated {len(word_timestamps)} estimated word timestamps")

                return {
                    "audio_path": str(output_path),
                    "duration_s": round(duration_s, 2),
                    "word_timestamps": word_timestamps
                }

        except httpx.HTTPStatusError as e:
            logger.error(f"[OpenAI TTS] HTTP {e.response.status_code}: {e.response.text}")
            if attempt < MAX_RETRIES - 1:
                logger.info(f"[OpenAI TTS] Retrying ({attempt + 1}/{MAX_RETRIES}) in {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY)
            else:
                raise
        except Exception as e:
            logger.error(f"[OpenAI TTS] Attempt {attempt + 1} failed: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY)
            else:
                raise


def generate_voice(
    text: str,
    prefer: str = "elevenlabs",
    voice_id: Optional[str] = None,
    lang: str = "en",
    output_path: Optional[Path] = None,
    return_timestamps: bool = True,
) -> Dict[str, Any] | str:
    """
    Generate voice with fallback support.
    Attempts primary provider first, falls back to secondary on failure.

    Args:
        text: Text to synthesize
        prefer: Preferred provider ('elevenlabs' or 'openai')
        voice_id: Voice identifier (ElevenLabs voice ID or OpenAI voice name)
        lang: Language code
        output_path: Path to save MP3 file
        return_timestamps: If True, return dict with timestamps; if False, return audio path (string) for backward compatibility

    Returns:
        Dict with audio_path, duration_s, and word_timestamps (if return_timestamps=True)
        OR Path/str to audio file (if return_timestamps=False)
    """
    if prefer == "elevenlabs":
        try:
            logger.info("[Voice] Using ElevenLabs as primary provider")
            result = generate_voice_elevenlabs(
                text,
                voice_id=voice_id or "21m00Tcm4TlvDq8ikWAM",
                lang=lang,
                output_path=output_path
            )
            return result if return_timestamps else result["audio_path"]
        except Exception as e:
            logger.warning(f"[Voice] ElevenLabs failed: {e}, falling back to OpenAI TTS")
            try:
                result = generate_voice_openai(
                    text,
                    voice=voice_id or "nova",
                    output_path=output_path
                )
                return result if return_timestamps else result["audio_path"]
            except Exception as e2:
                logger.error(f"[Voice] OpenAI TTS also failed: {e2}")
                raise RuntimeError(f"Voice generation failed with both providers: {e}, {e2}")
    else:
        try:
            logger.info("[Voice] Using OpenAI TTS as primary provider")
            result = generate_voice_openai(
                text,
                voice=voice_id or "nova",
                output_path=output_path
            )
            return result if return_timestamps else result["audio_path"]
        except Exception as e:
            logger.warning(f"[Voice] OpenAI TTS failed: {e}, falling back to ElevenLabs")
            try:
                result = generate_voice_elevenlabs(
                    text,
                    voice_id=voice_id or "21m00Tcm4TlvDq8ikWAM",
                    lang=lang,
                    output_path=output_path
                )
                return result if return_timestamps else result["audio_path"]
            except Exception as e2:
                logger.error(f"[Voice] ElevenLabs also failed: {e2}")
                raise RuntimeError(f"Voice generation failed with both providers: {e}, {e2}")


def generate_scene_voices(
    scenes: List[Dict[str, Any]],
    lang: str = "en",
    prefer: str = "elevenlabs",
) -> List[Dict[str, Any]]:
    """
    Generate voice for multiple scenes with voiceover text.
    Batch processes scenes and returns list of voice result dicts.

    Args:
        scenes: List of scene dicts with 'voiceover' key containing text
        lang: Language code
        prefer: Preferred TTS provider

    Returns:
        List of dicts with:
            - scene_index: Index of scene in input list
            - voiceover_text: Original text
            - audio_path: Path to generated MP3
            - duration_s: Audio duration
            - word_timestamps: Word-level timing data
            - error: Error message if generation failed (optional)
    """
    logger.info(f"[Scene Voices] Processing {len(scenes)} scenes")

    results = []

    for i, scene in enumerate(scenes):
        try:
            voiceover = scene.get("voiceover", "").strip()

            if not voiceover:
                logger.warning(f"[Scene Voices] Scene {i} has no voiceover text, skipping")
                results.append({
                    "scene_index": i,
                    "voiceover_text": "",
                    "error": "No voiceover text provided"
                })
                continue

            logger.info(f"[Scene Voices] Generating voice for scene {i}")

            voice_result = generate_voice(
                text=voiceover,
                prefer=prefer,
                lang=lang,
                output_path=OUTPUT_DIR / f"scene_{i}_voice_{int(time.time() * 1000)}.mp3"
            )

            results.append({
                "scene_index": i,
                "voiceover_text": voiceover,
                "audio_path": voice_result["audio_path"],
                "duration_s": voice_result["duration_s"],
                "word_timestamps": voice_result["word_timestamps"]
            })

            logger.info(f"[Scene Voices] Scene {i} completed: {voice_result['duration_s']}s")

        except Exception as e:
            logger.error(f"[Scene Voices] Scene {i} failed: {e}")
            results.append({
                "scene_index": i,
                "voiceover_text": scene.get("voiceover", ""),
                "error": str(e)
            })

    logger.info(f"[Scene Voices] Completed {len(scenes)} scenes: {sum(1 for r in results if 'error' not in r)} succeeded")
    return results
