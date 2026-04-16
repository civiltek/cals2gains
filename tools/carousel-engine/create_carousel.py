#!/usr/bin/env python3
"""
Cals2Gains Carousel Engine — Orquestador principal.

Pipeline completo:
  1. Carga o genera un spec JSON
  2. Renderiza todos los slides (DALL-E 3 + Pillow)
  3. Empaqueta en ZIP
  4. Envía a Telegram para aprobación de Judith

Uso:
  python create_carousel.py --spec specs/pieza-01-huevos-colesterol.json
  python create_carousel.py --topic "Huevos y colesterol" --lang es --template myth-buster
  python create_carousel.py --demo
  python create_carousel.py --spec mi_spec.json --no-ai      (solo fondos procedurales)
  python create_carousel.py --spec mi_spec.json --no-telegram (no enviar a Telegram)
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import zipfile
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

# ── Cargar .env — busca hacia arriba hasta encontrarlo ────────────────────
_HERE = Path(__file__).parent.resolve()

def _load_env() -> None:
    """Sube el árbol hasta encontrar el .env del proyecto."""
    p = _HERE
    for _ in range(8):
        candidate = p / ".env"
        if candidate.exists():
            load_dotenv(str(candidate), override=False)
            return
        p = p.parent

_load_env()

from brand_config import (
    OUTPUT_DIR,
    SPECS_DIR,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
)
from carousel_composer import render_carousel
from template_engine import SlideSpec, parse_slide

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("carousel.main")


# ─────────────────────────────────────────────────────────────────────────────
# Telegram
# ─────────────────────────────────────────────────────────────────────────────

def _send_to_telegram(
    slide_paths: list[Path],
    carousel_title: str,
    carousel_id: str,
    account: str,
) -> bool:
    """
    Envía el carrusel a Telegram como álbum de fotos con botones de aprobación.
    Usa el patrón de telegram_client.py del MCP server existente.
    """
    # Importar TelegramClient desde el MCP server local
    mcp_dir = _REPO_ROOT / "tools" / "telegram-mcp-server"
    if mcp_dir.exists() and str(mcp_dir) not in sys.path:
        sys.path.insert(0, str(mcp_dir))

    try:
        from telegram_client import TelegramClient, build_approval_keyboard
    except ImportError:
        log.warning("telegram-mcp-server no encontrado; enviando via httpx directo")
        return _send_to_telegram_direct(slide_paths, carousel_title, carousel_id, account)

    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        log.warning(
            "TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados. "
            "El carrusel NO se ha enviado a Telegram."
        )
        return False

    client = TelegramClient(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, timeout=60)
    try:
        caption = (
            f"<b>🖼 {carousel_title}</b>\n"
            f"<code>{carousel_id}</code> · {account}\n"
            f"{len(slide_paths)} slides · Motor Cals2Gains v1.0"
        )
        # Telegram admite álbumes de 2-10 fotos
        chunks = [slide_paths[i:i+10] for i in range(0, len(slide_paths), 10)]
        for chunk_idx, chunk in enumerate(chunks):
            chunk_caption = caption if chunk_idx == 0 else f"(continuación) {carousel_id}"
            client.send_media_group_files(
                [str(p) for p in chunk],
                caption=chunk_caption,
            )

        # Mensaje de aprobación con botones inline
        keyboard = build_approval_keyboard(carousel_id)
        client.send_message(
            f"¿Apruebas el carrusel <code>{carousel_id}</code>?",
            reply_markup=keyboard,
        )
        log.info("Carrusel enviado a Telegram ✓")
        return True

    except Exception as exc:
        log.error("Error enviando a Telegram: %s", exc)
        return False
    finally:
        client.close()


def _send_to_telegram_direct(
    slide_paths: list[Path],
    carousel_title: str,
    carousel_id: str,
    account: str,
) -> bool:
    """Fallback directo via httpx si el MCP server no está disponible."""
    import httpx as _httpx

    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False

    base_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
    try:
        # Enviar slides de 10 en 10 (límite de Telegram)
        chunks = [slide_paths[i:i+10] for i in range(0, len(slide_paths), 10)]
        for chunk_idx, chunk in enumerate(chunks):
            media = []
            files = {}
            for i, p in enumerate(chunk):
                key = f"media{i}"
                entry: dict = {"type": "photo", "media": f"attach://{key}"}
                if i == 0 and chunk_idx == 0:
                    entry["caption"] = (
                        f"🖼 {carousel_title}\n{carousel_id} · {account}\n"
                        f"{len(slide_paths)} slides"
                    )
                    entry["parse_mode"] = "HTML"
                media.append(entry)

                fh = open(str(p), "rb")
                files[key] = (p.name, fh, "image/png")

            _httpx.post(
                f"{base_url}/sendMediaGroup",
                data={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "media": json.dumps(media),
                },
                files=files,
                timeout=120,
            ).raise_for_status()

            for _, (_, fh, _) in files.items():
                fh.close()

        # Mensaje de aprobación
        _httpx.post(
            f"{base_url}/sendMessage",
            data={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": f"¿Apruebas el carrusel {carousel_id}?",
                "parse_mode": "HTML",
                "reply_markup": json.dumps({
                    "inline_keyboard": [[
                        {"text": "✅ Aprobar", "callback_data": f"approve:{carousel_id}"},
                        {"text": "✏️ Cambios", "callback_data": f"changes:{carousel_id}"},
                        {"text": "❌ Descartar", "callback_data": f"discard:{carousel_id}"},
                    ]]
                }),
            },
            timeout=30,
        ).raise_for_status()

        log.info("Carrusel enviado a Telegram (directo) ✓")
        return True
    except Exception as exc:
        log.error("Error enviando a Telegram (directo): %s", exc)
        return False


# ─────────────────────────────────────────────────────────────────────────────
# ZIP
# ─────────────────────────────────────────────────────────────────────────────

def _create_zip(slide_paths: list[Path], zip_path: Path) -> Path:
    """Empaqueta todos los slides en un ZIP."""
    with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_STORED) as zf:
        for p in slide_paths:
            zf.write(str(p), p.name)
    size_kb = zip_path.stat().st_size // 1024
    log.info("ZIP creado: %s (%d KB)", zip_path.name, size_kb)
    return zip_path


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline principal
# ─────────────────────────────────────────────────────────────────────────────

def create_carousel_from_spec(
    spec_data: dict,
    use_ai_images: bool = True,
    send_telegram: bool = True,
) -> Path:
    """
    Pipeline completo: spec → slides PNG → ZIP → Telegram.

    Args:
        spec_data:       dict con el spec del carrusel (ver specs/pieza-01-*.json)
        use_ai_images:   Si True, usa DALL-E 3 para los fondos
        send_telegram:   Si True, envía el álbum a Telegram para aprobación

    Returns:
        Path al directorio de salida con todos los slides.
    """
    carousel_id    = spec_data.get("id", f"C2G-CAR-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    carousel_title = spec_data.get("title", "Carrusel sin título")
    account        = spec_data.get("account", "@cals2gains_es")
    slides_raw     = spec_data.get("slides", [])
    total          = len(slides_raw)
    default_handle = account

    if not slides_raw:
        raise ValueError("El spec no contiene slides.")

    log.info("═══ Carousel Engine v1.0 ═══")
    log.info("ID:     %s", carousel_id)
    log.info("Título: %s", carousel_title)
    log.info("Slides: %d  |  Cuenta: %s  |  IA: %s", total, account, use_ai_images)

    # ── Parsear specs ──────────────────────────────────────────────────────
    slide_specs: list[SlideSpec] = []
    for i, raw in enumerate(slides_raw):
        s = parse_slide(raw, slide_num=i + 1, total_slides=total, default_handle=default_handle)
        if not use_ai_images:
            s.bg_prompt = None  # Forzar procedural
        slide_specs.append(s)

    # ── Renderizar ─────────────────────────────────────────────────────────
    out_dir = OUTPUT_DIR / carousel_id
    out_dir.mkdir(parents=True, exist_ok=True)

    slide_paths = render_carousel(slide_specs, out_dir, carousel_id=carousel_id)

    # ── Resumen de calidad ─────────────────────────────────────────────────
    sizes = [p.stat().st_size // 1024 for p in slide_paths]
    log.info("Tamaños (KB): %s | Min: %d | Media: %d",
             sizes, min(sizes), sum(sizes) // len(sizes))

    # ── ZIP ────────────────────────────────────────────────────────────────
    zip_path = out_dir / f"{carousel_id}.zip"
    _create_zip(slide_paths, zip_path)

    # ── HTML preview interactivo ───────────────────────────────────────────
    try:
        from html_preview import generate_html_preview
        html_path = out_dir / f"{carousel_id}_preview.html"
        generate_html_preview(slide_paths, spec_data, html_path)
        log.info("Preview HTML → %s", html_path)
    except Exception as exc:
        log.warning("No se pudo generar HTML preview: %s", exc)

    # ── Guardar spec usado ─────────────────────────────────────────────────
    spec_out = out_dir / f"{carousel_id}_spec.json"
    with open(str(spec_out), "w", encoding="utf-8") as f:
        json.dump(spec_data, f, ensure_ascii=False, indent=2)

    # ── Telegram ───────────────────────────────────────────────────────────
    if send_telegram:
        sent = _send_to_telegram(slide_paths, carousel_title, carousel_id, account)
        if not sent:
            log.info("Slides disponibles localmente en: %s", out_dir)

    log.info("═══ Listo (%d slides en %s) ═══", len(slide_paths), out_dir)
    return out_dir


# ─────────────────────────────────────────────────────────────────────────────
# Demo spec integrado
# ─────────────────────────────────────────────────────────────────────────────

_DEMO_SPEC = {
    "id":       "C2G-ES-CAR-DEMO-01",
    "title":    "Demo Motor Carruseles — Proteína básica",
    "lang":     "es",
    "template": "educational",
    "account":  "@cals2gains_es",
    "slides": [
        {
            "type":         "cover",
            "accent_color": "coral",
            "headline":     "¿Cuánta proteína\nnecesitas de verdad?",
            "subhead":      "La guía que nadie te explica en el gym",
            "bridge":       "Desliza →",
            "handle":       "@cals2gains_es",
            "bg_prompt":    "Athletic person in modern gym, moody dark lighting, bokeh background, editorial photography",
        },
        {
            "type":         "science",
            "accent_color": "violet",
            "label":        "LA CIENCIA",
            "headline":     "0.8 g/kg al día es\nel mínimo oficial",
            "body":         "Ese número fue calculado para evitar déficit — no para ganar músculo.",
            "stat":         "Para músculo real: 1.6–2.2 g/kg al día",
            "bg_prompt":    "Dark laboratory with scientific equipment, deep blue-purple moody atmosphere",
        },
        {
            "type":         "stats",
            "accent_color": "violet",
            "label":        "100 g DE PECHUGA",
            "stats": [
                {"label": "Proteína",       "value": "31 g",   "bar_pct": 0.90},
                {"label": "Calorías",       "value": "165 kcal","bar_pct": 0.45},
                {"label": "Grasa",          "value": "3.6 g",  "bar_pct": 0.12},
                {"label": "Carbohidratos",  "value": "0 g",    "bar_pct": 0.0},
            ],
            "body":         "Pollo · Pavo · Atún · Claras · Tofu",
        },
        {
            "type":         "educational",
            "accent_color": "violet",
            "label":        "DISTRIBUYE BIEN",
            "headline":     "El timing importa\nmucho menos de\nlo que crees",
            "bullets": [
                "Come proteína en cada comida principal",
                "20-40 g por toma maximizan la síntesis muscular",
                "Antes o después del gym: ambos funcionan igual",
            ],
        },
        {
            "type":         "cta",
            "accent_color": "coral",
            "headline":     "¿Sabes cuánta\nproteína comes hoy?",
            "cta_primary":  "Calcula tus macros en 30 segundos 👆",
            "cta_secondary": "Guárdalo para cuando lo necesites",
            "handle":       "@cals2gains_es",
            "bg_prompt":    "Dark gradient background with purple and coral light bokeh, minimal brand aesthetic",
        },
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Cals2Gains Carousel Engine v1.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Ejemplos:\n"
            "  python create_carousel.py --demo\n"
            "  python create_carousel.py --spec specs/pieza-01-huevos-colesterol.json\n"
            "  python create_carousel.py --topic 'Ayuno intermitente' --lang es\n"
            "  python create_carousel.py --spec mi_spec.json --no-ai --no-telegram\n"
        ),
    )
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--spec",  metavar="PATH",  help="Ruta al JSON spec del carrusel")
    group.add_argument("--demo",  action="store_true", help="Genera el carrusel demo integrado")
    group.add_argument("--topic", metavar="TOPIC", help="Genera spec desde cero con GPT-4o")

    p.add_argument("--lang",     default="es",           choices=["es", "en"])
    p.add_argument("--template", default="myth-buster",
                   choices=["myth-buster", "educational", "tips-list", "recipe"])
    p.add_argument("--n-slides", type=int, default=8, metavar="N")
    p.add_argument("--no-ai",       action="store_true", help="No usar DALL-E 3 (solo fondos procedurales)")
    p.add_argument("--no-telegram", action="store_true", help="No enviar a Telegram")
    p.add_argument("--output-dir",  metavar="DIR",        help="Directorio de salida personalizado")
    return p


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    # ── Fuente del spec ────────────────────────────────────────────────────
    if args.demo:
        spec_data = _DEMO_SPEC
        log.info("Usando spec demo integrado")

    elif args.spec:
        spec_path = Path(args.spec)
        if not spec_path.exists():
            # Buscar relativo al directorio de specs
            spec_path = SPECS_DIR / args.spec
        if not spec_path.exists():
            log.error("Spec no encontrado: %s", args.spec)
            return 1
        with open(str(spec_path), encoding="utf-8") as f:
            spec_data = json.load(f)
        log.info("Spec cargado desde: %s", spec_path)

    else:  # --topic
        from script_generator import generate_carousel_spec
        try:
            spec_data = generate_carousel_spec(
                topic    = args.topic,
                lang     = args.lang,
                template = args.template,
                n_slides = args.n_slides,
            )
            # Guardar el spec generado para referencia futura
            safe_name = args.topic.lower()[:40].replace(" ", "_")
            spec_out = SPECS_DIR / f"generated_{safe_name}.json"
            with open(str(spec_out), "w", encoding="utf-8") as f:
                json.dump(spec_data, f, ensure_ascii=False, indent=2)
            log.info("Spec guardado en: %s", spec_out)
        except Exception as exc:
            log.error("Error generando spec con GPT-4o: %s", exc)
            return 1

    # ── Override de output dir ─────────────────────────────────────────────
    if args.output_dir:
        from brand_config import OUTPUT_DIR as _OUT
        import brand_config as _bc
        _bc.OUTPUT_DIR = Path(args.output_dir)
        _bc.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # ── Ejecutar pipeline ──────────────────────────────────────────────────
    try:
        out_dir = create_carousel_from_spec(
            spec_data     = spec_data,
            use_ai_images = not args.no_ai,
            send_telegram = not args.no_telegram,
        )
        slides = sorted(out_dir.glob("*_slide_*.png"))
        preview = next(out_dir.glob("*_preview.html"), None)
        print(f"\nOK Carrusel generado en: {out_dir}")
        print(f"  Slides:  {len(slides)}")
        sizes = [p.stat().st_size // 1024 for p in slides]
        if sizes:
            print(f"  Tamaños: min {min(sizes)} KB  ·  media {sum(sizes)//len(sizes)} KB")
        if preview:
            print(f"  Preview: {preview}")
            # Abrir en navegador automáticamente si es posible
            try:
                import webbrowser
                webbrowser.open(preview.as_uri())
            except Exception:
                pass
        return 0
    except Exception as exc:
        log.exception("Error en el pipeline: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
