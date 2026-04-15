"""
Cals2Gains - Muapi AI Client (Open Higgsfield API)
===================================================
Wraps Muapi.ai (api.muapi.ai) — el backend open-source de Higgsfield AI.
Acceso gratuito a 40+ modelos de vídeo (Kling, Seedance, Veo, Sora, Runway…)
sin necesidad de cuenta ni API key de pago de Higgsfield Cloud.

Cómo obtener la API key gratuita:
  1. Regístrate en https://muapi.ai
  2. Genera una API key (empieza por "sk-")
  3. Añade al .env:  MUAPI_API_KEY=sk-...

API Reference (api.muapi.ai):
  POST /api/v1/{model-endpoint}           - Enviar job → devuelve request_id
  GET  /api/v1/predictions/{id}/result    - Polling cada 2s hasta completar
  POST /api/v1/upload_file                - Subir imagen/vídeo → URL alojada

Autenticación: header  x-api-key: sk-...

Fallback Strategy:
  1. Muapi / Higgsfield open source (primario) — 40+ modelos, tier gratuito
  2. Sora 2 vía OpenAI Videos API
  3. DALL-E 3 + efecto Ken Burns (imagen + pan/zoom)
"""

import httpx
import json
import time
import os
from pathlib import Path
from typing import Literal, Optional
from dataclasses import dataclass, field
from enum import Enum

from brand_config import (
    OPENAI_API_KEY, BRAND_VIDEO_SUFFIX, Reel, OUTPUT_DIR, MUAPI_API_KEY,
)

TIMEOUT = httpx.Timeout(600.0, connect=30.0)
MAX_RETRIES = 3
POLL_INTERVAL = 2          # segundos entre comprobaciones (estándar Muapi)
POLL_MAX_WAIT = 1800       # 30 minutos máx (vídeos de alta calidad tardan ~5-10 min)

# URL base de la API de Muapi
MUAPI_BASE_URL = "https://api.muapi.ai/api/v1"

# Modelo T2V por defecto — buen equilibrio calidad/coste en tier gratuito
DEFAULT_VIDEO_MODEL = "kling-v2.6-pro-t2v"

# Mapeo de nombres heredados (Higgsfield Cloud) → IDs de Muapi
MODEL_ALIASES = {
    "sora-2": "openai-sora-2-text-to-video",
    "sora": "openai-sora",
    "kling-3.0": "kling-v3.0-pro-text-to-video",
    "kling-2.6": "kling-v2.6-pro-t2v",
    "kling-2.1": "kling-v2.1-master-t2v",
    "veo-3.1": "veo3.1-text-to-video",
    "veo-3": "veo3-text-to-video",
    "runway": "runway-text-to-video",
    "wan": "wan2.6-text-to-video",
    "seedance": "seedance-v2.0-t2v",
    "hunyuan": "hunyuan-text-to-video",
    "pixverse": "pixverse-v5-t2v",
}


# ===================================================================
# CAMERA / STYLE PRESETS — mantenidos para compatibilidad de llamadas
# No se envían a la API de Muapi (que no tiene este concepto).
# Puedes incorporar la información en el prompt manualmente.
# ===================================================================

class CameraPresets(str, Enum):
    """Presets de cámara (sólo para compatibilidad con código existente)."""
    CINEMATIC_SLOW_ZOOM = "cinematic_slow_zoom"
    ORBIT_360 = "orbit_360"
    DOLLY_IN = "dolly_in"
    CRANE_UP = "crane_up"
    TRACKING_SHOT = "tracking_shot"
    HANDHELD_NATURAL = "handheld_natural"
    DRONE_AERIAL = "drone_aerial"
    STATIC_LOCKED = "static_locked"
    PARALLAX = "parallax"
    WHIP_PAN = "whip_pan"


class StylePresets(str, Enum):
    """Presets de estilo (sólo para compatibilidad con código existente)."""
    FITNESS_GYM = "fitness_gym"
    FOOD_PHOTOGRAPHY = "food_photography"
    DARK_MOODY = "dark_moody"
    BRIGHT_CLEAN = "bright_clean"
    CINEMATIC_4K = "cinematic_4k"


# ===================================================================
# DATA CLASSES
# ===================================================================

@dataclass
class VideoJobStatus:
    """Estado de un job de generación de vídeo en Muapi."""
    job_id: str
    status: str        # processing, completed, failed
    progress: int      # 0-100
    estimated_remaining_s: Optional[int] = None
    error_message: Optional[str] = None
    video_url: Optional[str] = None   # URL directa al vídeo generado


# ===================================================================
# CLIENTE MUAPI / HIGGSFIELD OPEN SOURCE
# ===================================================================

class HiggsFieldClient:
    """
    Cliente para la API abierta de Higgsfield vía Muapi.ai.

    Usa Muapi.ai como backend — API key gratuita en muapi.ai.
    Sin cuenta ni pago en Higgsfield Cloud.

    Capacidades:
      - Generación de vídeo desde texto (40+ modelos: Kling, Seedance, Veo, Sora…)
      - Conversión imagen → vídeo
      - Polling asíncrono con backoff exponencial
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Inicializa el cliente.

        Args:
            api_key: Muapi API key. Si no se pasa, usa MUAPI_API_KEY del env.

        Raises:
            RuntimeError: Si no hay API key disponible.
        """
        self.api_key = api_key or MUAPI_API_KEY
        if not self.api_key:
            raise RuntimeError(
                "No se encontró MUAPI_API_KEY. "
                "Consigue una API key gratuita en https://muapi.ai y añádela al .env: "
                "MUAPI_API_KEY=sk-..."
            )
        self.base_url = MUAPI_BASE_URL

    # ------------------------------------------------------------------
    # Helpers internos
    # ------------------------------------------------------------------

    def _log(self, msg: str) -> None:
        print(f"[Muapi] {msg}")

    def _headers(self) -> dict:
        return {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }

    def _resolve_model(self, model: str) -> str:
        """Traduce nombres heredados de Higgsfield Cloud a IDs de Muapi."""
        return MODEL_ALIASES.get(model, model)

    def _retry_with_backoff(self, fn, max_attempts: int = MAX_RETRIES):
        """Reintenta fn() con backoff exponencial."""
        for attempt in range(max_attempts):
            try:
                return fn()
            except Exception as e:
                if attempt < max_attempts - 1:
                    wait = 2 ** attempt
                    self._log(f"Intento {attempt + 1} fallido: {e}. Reintentando en {wait}s…")
                    time.sleep(wait)
                else:
                    raise

    def _extract_job_id(self, response_data: dict) -> str:
        """Extrae el request_id del response de submit."""
        job_id = (
            response_data.get("id")
            or response_data.get("request_id")
            or response_data.get("job_id")
        )
        if not job_id:
            raise RuntimeError(f"Sin job ID en respuesta: {response_data}")
        return str(job_id)

    def _extract_video_url(self, result_data: dict) -> Optional[str]:
        """
        Extrae la URL del vídeo del resultado del polling.
        Orden de prioridad: outputs[0] → url → output.url → output (str)
        """
        outputs = result_data.get("outputs")
        if outputs and isinstance(outputs, list) and outputs[0]:
            return str(outputs[0])
        url = result_data.get("url")
        if url:
            return str(url)
        output = result_data.get("output")
        if isinstance(output, dict):
            u = output.get("url") or output.get("video_url")
            if u:
                return str(u)
        if isinstance(output, str) and output:
            return output
        return None

    def _poll_job(self, job_id: str, timeout_s: int = POLL_MAX_WAIT) -> VideoJobStatus:
        """
        Hace polling del job hasta completar o agotar el timeout.

        Endpoint: GET /api/v1/predictions/{job_id}/result
        Intervalo: 2 segundos (estándar Muapi)
        Estados terminales: completed, succeeded, success, failed, error

        Returns:
            VideoJobStatus con video_url relleno si completado.
        Raises:
            RuntimeError si el job falla o expira.
        """
        start_time = time.time()
        DONE = {"completed", "succeeded", "success"}
        FAIL = {"failed", "error", "cancelled"}

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_s:
                raise RuntimeError(f"Job {job_id} expiró tras {timeout_s}s")

            try:
                with httpx.Client(timeout=TIMEOUT) as client:
                    resp = client.get(
                        f"{self.base_url}/predictions/{job_id}/result",
                        headers=self._headers(),
                    )
                    resp.raise_for_status()
                    data = resp.json()

                status_raw = str(data.get("status", "processing")).lower()

                if status_raw in DONE:
                    video_url = self._extract_video_url(data)
                    self._log(f"Job {job_id} completado. URL: {video_url}")
                    return VideoJobStatus(
                        job_id=job_id,
                        status="completed",
                        progress=100,
                        video_url=video_url,
                    )

                if status_raw in FAIL:
                    err = (
                        data.get("error")
                        or data.get("message")
                        or data.get("detail")
                        or "Error desconocido"
                    )
                    raise RuntimeError(f"Job fallido: {err}")

                progress = data.get("progress", 0)
                self._log(f"Job {job_id}: {status_raw} ({progress}%) — {elapsed:.0f}s transcurridos")
                time.sleep(POLL_INTERVAL)

            except httpx.HTTPError as e:
                if elapsed < timeout_s / 2:
                    self._log(f"Error HTTP al hacer polling (reintentando): {e}")
                    time.sleep(POLL_INTERVAL * 2)
                else:
                    raise RuntimeError(f"Fallo persistente al hacer polling del job {job_id}: {e}")

    def _download_from_url(self, video_url: str, output_path: Path) -> Path:
        """
        Descarga vídeo desde URL directa.

        Args:
            video_url: URL del vídeo generado
            output_path: Ruta donde guardar el MP4
        Returns:
            Path al vídeo descargado.
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                with client.stream("GET", video_url) as resp:
                    resp.raise_for_status()
                    with open(output_path, "wb") as f:
                        for chunk in resp.iter_bytes(chunk_size=8192):
                            f.write(chunk)

            self._log(f"Vídeo descargado en {output_path}")
            return output_path

        except Exception as e:
            raise RuntimeError(f"Fallo al descargar vídeo de {video_url}: {e}")

    def _upload_file(self, file_path: Path) -> str:
        """
        Sube un archivo a Muapi y devuelve la URL alojada.

        Args:
            file_path: Archivo local a subir
        Returns:
            URL pública para usar en requests de generación.
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise RuntimeError(f"Archivo no encontrado: {file_path}")

        try:
            with open(file_path, "rb") as f:
                with httpx.Client(timeout=TIMEOUT) as client:
                    resp = client.post(
                        f"{self.base_url}/upload_file",
                        headers={"x-api-key": self.api_key},
                        files={"file": (file_path.name, f, "application/octet-stream")},
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    url = (
                        data.get("url")
                        or data.get("file_url")
                        or data.get("output")
                        or data.get("outputs", [None])[0]
                    )
                    if not url:
                        raise RuntimeError(f"Sin URL en respuesta de upload: {data}")
                    self._log(f"Subido {file_path.name} → {url}")
                    return str(url)

        except Exception as e:
            raise RuntimeError(f"Fallo al subir {file_path}: {e}")

    # ------------------------------------------------------------------
    # Métodos públicos
    # ------------------------------------------------------------------

    def generate_video(
        self,
        prompt: str,
        duration_s: int = 5,
        aspect_ratio: Literal["9:16", "16:9", "1:1"] = "9:16",
        model: str = DEFAULT_VIDEO_MODEL,
        camera_preset: Optional[CameraPresets] = None,
        style_preset: Optional[StylePresets] = None,
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Genera un clip de vídeo desde un prompt de texto.

        Args:
            prompt: Descripción del vídeo deseado.
            duration_s: Duración en segundos (5 o 10; Muapi no soporta duraciones arbitrarias).
            aspect_ratio: "9:16" (vertical/reels), "16:9" (paisaje), "1:1" (cuadrado).
            model: ID de modelo Muapi (por defecto "kling-v2.6-pro-t2v").
                   Nombres heredados como "sora-2", "kling-3.0", "veo-3.1" se traducen automáticamente.
            camera_preset: Ignorado (compatibilidad). Incluye movimientos en el prompt.
            style_preset: Ignorado (compatibilidad). Incluye estilo en el prompt.
            output_path: Ruta de salida del MP4. Si None, usa OUTPUT_DIR.

        Returns:
            Path al MP4 generado.
        """
        if output_path is None:
            output_path = OUTPUT_DIR / f"muapi_video_{int(time.time())}.mp4"

        model_id = self._resolve_model(model)

        # Muapi soporta 5s y 10s en la mayoría de modelos
        duration_s = 10 if duration_s > 7 else 5

        full_prompt = f"{prompt}. {BRAND_VIDEO_SUFFIX}"

        payload = {
            "prompt": full_prompt,
            "aspect_ratio": aspect_ratio,
            "duration": duration_s,
        }

        self._log(f"Generando vídeo: {prompt[:80]}…")
        self._log(f"  Modelo: {model_id} | Duración: {duration_s}s | Aspecto: {aspect_ratio}")
        if camera_preset:
            self._log(f"  (camera_preset '{camera_preset.value}' — inclúyelo en el prompt para efecto)")

        def create_job():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.base_url}/{model_id}",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(create_job)
        job_id = self._extract_job_id(job_data)
        self._log(f"Job enviado: {job_id}")

        status = self._poll_job(job_id)

        if not status.video_url:
            raise RuntimeError(f"Job {job_id} completado pero sin URL de vídeo en la respuesta")

        return self._download_from_url(status.video_url, output_path)

    def image_to_video(
        self,
        image_path: Path,
        prompt: Optional[str] = None,
        duration_s: int = 5,
        aspect_ratio: Literal["9:16", "16:9", "1:1"] = "9:16",
        camera_preset: Optional[CameraPresets] = None,
        output_path: Optional[Path] = None,
        model: str = "kling-v2.6-pro-i2v",
    ) -> Path:
        """
        Convierte una imagen estática en vídeo con movimiento.

        Args:
            image_path: Imagen de entrada (JPG, PNG, WebP).
            prompt: Descripción del movimiento deseado (opcional).
            duration_s: Duración en segundos (5 o 10).
            aspect_ratio: Relación de aspecto de salida.
            camera_preset: Ignorado (compatibilidad).
            output_path: Ruta de salida del MP4.
            model: ID del modelo I2V de Muapi (por defecto "kling-v2.6-pro-i2v").

        Returns:
            Path al MP4 generado.
        """
        image_path = Path(image_path)
        if not image_path.exists():
            raise RuntimeError(f"Imagen no encontrada: {image_path}")

        if output_path is None:
            output_path = OUTPUT_DIR / f"muapi_i2v_{int(time.time())}.mp4"

        # Subir imagen para obtener URL alojada
        self._log(f"Subiendo imagen: {image_path.name}")
        image_url = self._upload_file(image_path)

        duration_s = 10 if duration_s > 7 else 5

        payload: dict = {
            "image_url": image_url,
            "aspect_ratio": aspect_ratio,
            "duration": duration_s,
        }
        if prompt:
            payload["prompt"] = f"{prompt}. {BRAND_VIDEO_SUFFIX}"

        self._log(f"Imagen → vídeo: {image_path.name} ({model})")

        def create_job():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.base_url}/{model}",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(create_job)
        job_id = self._extract_job_id(job_data)
        self._log(f"Job enviado: {job_id}")

        status = self._poll_job(job_id)

        if not status.video_url:
            raise RuntimeError(f"Job {job_id} completado pero sin URL de vídeo")

        return self._download_from_url(status.video_url, output_path)

    def upscale_video(
        self,
        video_path: Path,
        target_resolution: Literal["2K", "4K", "8K"] = "4K",
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Upscale de vídeo.

        NOTA: La API open source de Muapi no expone upscaling de vídeo.
        Este método devuelve el vídeo original sin modificar.
        Para upscaling local usa ffmpeg: ffmpeg -i input.mp4 -vf scale=3840:2160 output.mp4

        Returns:
            Path al vídeo (original si upscale no disponible).
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise RuntimeError(f"Vídeo no encontrado: {video_path}")

        self._log(f"[AVISO] Upscaling de vídeo no disponible en la API open source de Muapi.")
        self._log(f"  Devolviendo vídeo original: {video_path}")

        if output_path:
            import shutil
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(video_path, output_path)
            return output_path

        return video_path

    def add_lip_sync(
        self,
        video_path: Path,
        audio_path: Path,
        output_path: Optional[Path] = None,
        model: str = "lipsync-pro",
    ) -> Path:
        """
        Añade lip sync a un vídeo usando una pista de audio.

        Args:
            video_path: Vídeo de entrada (MP4).
            audio_path: Audio de entrada (MP3, WAV, AAC).
            output_path: Ruta de salida.
            model: Modelo de lip sync en Muapi (por defecto "lipsync-pro").

        Returns:
            Path al vídeo con lip sync.
        """
        video_path = Path(video_path)
        audio_path = Path(audio_path)
        if not video_path.exists():
            raise RuntimeError(f"Vídeo no encontrado: {video_path}")
        if not audio_path.exists():
            raise RuntimeError(f"Audio no encontrado: {audio_path}")

        if output_path is None:
            output_path = OUTPUT_DIR / f"lipsynced_{int(time.time())}.mp4"

        self._log(f"Subiendo vídeo: {video_path.name}")
        video_url = self._upload_file(video_path)
        self._log(f"Subiendo audio: {audio_path.name}")
        audio_url = self._upload_file(audio_path)

        payload = {
            "video_url": video_url,
            "audio_url": audio_url,
        }

        self._log(f"Lip sync: {video_path.name} + {audio_path.name}")

        def create_job():
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{self.base_url}/{model}",
                    headers=self._headers(),
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        job_data = self._retry_with_backoff(create_job)
        job_id = self._extract_job_id(job_data)
        self._log(f"Job enviado: {job_id}")

        status = self._poll_job(job_id)

        if not status.video_url:
            raise RuntimeError(f"Job {job_id} completado pero sin URL de vídeo")

        return self._download_from_url(status.video_url, output_path)

    def optimize_for_social(
        self,
        video_path: Path,
        platform: Literal["instagram", "tiktok", "youtube_shorts"] = "instagram",
        output_path: Optional[Path] = None,
    ) -> Path:
        """
        Optimiza vídeo para plataforma social.

        NOTA: La API open source de Muapi no incluye optimización social automática.
        Usa post_processing.py para optimización local con ffmpeg.

        Returns:
            Path al vídeo original (sin modificar).
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise RuntimeError(f"Vídeo no encontrado: {video_path}")

        self._log(f"[AVISO] Optimización social no disponible en la API open source de Muapi.")
        self._log(f"  Devolviendo vídeo original para {platform}: {video_path}")

        if output_path:
            import shutil
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(video_path, output_path)
            return output_path

        return video_path


# ===================================================================
# FUNCIÓN DE CONVENIENCIA: Generar clip de escena con fallback
# ===================================================================

def generate_scene_clip(
    prompt: str,
    duration: int = 5,
    output_path: Optional[Path] = None,
    prefer: Literal["higgsfield", "video", "sora", "image"] = "higgsfield",
    kb_effect=False,
) -> Path:
    """
    Genera un clip de escena con fallback automático.

    Orden de intento:
      1. Muapi / Higgsfield open source — 40+ modelos, tier gratuito
      2. Sora 2 vía OpenAI Videos API
      3. DALL-E 3 + efecto Ken Burns

    Args:
        prompt: Descripción de la escena.
        duration: Duración en segundos (5 o 10 para Muapi).
        output_path: Ruta de salida. Si None, usa OUTPUT_DIR.
        prefer: Método preferido ("higgsfield"/"video", "sora", "image").
                "video" es alias de "higgsfield" (usado por create_reel.py).
        kb_effect: Si truthy y se usa fallback de imagen, aplica Ken Burns.

    Returns:
        Path al clip MP4.

    Raises:
        RuntimeError si todos los métodos fallan.
    """
    if output_path is None:
        output_path = OUTPUT_DIR / f"scene_clip_{int(time.time())}.mp4"

    output_path = Path(output_path)

    # "video" es alias de "higgsfield" (create_reel.py v3.0+)
    if prefer == "video":
        prefer = "higgsfield"

    if prefer == "higgsfield":
        methods = ["higgsfield", "sora", "image"]
    elif prefer == "sora":
        methods = ["sora", "higgsfield", "image"]
    else:
        methods = ["image", "sora", "higgsfield"]

    for method in methods:
        try:
            if method == "higgsfield":
                if not MUAPI_API_KEY:
                    print("[Scene] MUAPI_API_KEY no configurada — saltando Muapi…")
                    continue

                client = HiggsFieldClient()
                print("[Scene] Intentando Muapi / Higgsfield open source…")
                clip = client.generate_video(
                    prompt=prompt,
                    duration_s=min(duration, 10),
                    aspect_ratio="9:16",
                    model=DEFAULT_VIDEO_MODEL,
                    output_path=output_path,
                )
                print(f"[Scene] Muapi OK → {clip}")
                return clip

            elif method == "sora":
                if not OPENAI_API_KEY:
                    print("[Scene] OPENAI_API_KEY no configurada — saltando Sora…")
                    continue

                print("[Scene] Intentando Sora 2…")
                from video_generator import generate_sora
                clip = generate_sora(
                    prompt=prompt,
                    duration=duration,
                    size="720x1280",
                    output_path=output_path,
                )
                print(f"[Scene] Sora 2 OK → {clip}")
                return clip

            elif method == "image":
                if not OPENAI_API_KEY:
                    print("[Scene] OPENAI_API_KEY no configurada — no se puede generar imagen…")
                    continue

                print("[Scene] Intentando DALL-E 3 + Ken Burns…")
                from image_generator import generate_dalle3
                from post_processing import apply_ken_burns_effect

                image = generate_dalle3(prompt=prompt)

                if kb_effect:
                    print("[Scene] Aplicando efecto Ken Burns…")
                    clip = apply_ken_burns_effect(
                        image=image,
                        duration_s=duration,
                        output_path=output_path,
                    )
                    print(f"[Scene] Ken Burns OK → {clip}")
                    return clip
                else:
                    import tempfile
                    tmp = Path(tempfile.gettempdir()) / f"temp_image_{int(time.time())}.png"
                    image.save(str(tmp))
                    print(f"[Scene] Imagen guardada (sin conversión a vídeo): {tmp}")
                    return tmp

        except Exception as e:
            print(f"[Scene] {method} falló: {e}")
            continue

    raise RuntimeError(
        f"Todos los métodos de generación fallaron. "
        f"Intentados: {', '.join(methods)}"
    )


if __name__ == "__main__":
    # Ejemplo de uso (requiere MUAPI_API_KEY en .env — gratis en muapi.ai)
    try:
        client = HiggsFieldClient()

        prompt = "Fit woman doing kettlebell swings in a modern gym with moody lighting"
        video = client.generate_video(
            prompt=prompt,
            duration_s=5,
            aspect_ratio="9:16",
            model="kling-v2.6-pro-t2v",
        )
        print(f"Vídeo generado: {video}")

    except RuntimeError as e:
        print(f"Error: {e}")
        print("Asegúrate de que MUAPI_API_KEY está en .env (API key gratuita de muapi.ai)")
