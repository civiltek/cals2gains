"""
Generador de preview HTML interactivo para carruseles Cals2Gains.

Produce un archivo .html autocontenido con:
- Slides embebidas en base64 (no necesita servidor)
- Navegación con swipe (touch) y flechas de teclado
- Barra de progreso animada
- Botones ← → y contador de slides
- Responsive: 390×488 px (proporción 4:5) centrado en pantalla
- Colores de marca: Dark #17121D · Coral #FF6A4D · Violet #9C8CFF

Inspirado en la guía de carruseles interactivos de Claude:
  "7-slide interactive HTML carousel with swipe functionality and progress bar"
"""
from __future__ import annotations

import base64
import json
from pathlib import Path


# ─────────────────────────────────────────────────────────────────────────────
# Template HTML
# ─────────────────────────────────────────────────────────────────────────────

_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
  :root {{
    --dark:   #17121D;
    --violet: #9C8CFF;
    --coral:  #FF6A4D;
    --bone:   #F7F2EA;
    --w: 390px;
    --h: 488px;  /* 4:5 a tamaño móvil */
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}

  body {{
    background: var(--dark);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: 'Outfit', 'Segoe UI', sans-serif;
    color: var(--bone);
    user-select: none;
  }}

  .carousel-wrapper {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }}

  .meta {{
    font-size: 11px;
    color: rgba(247,242,234,0.45);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }}

  .viewport {{
    width: var(--w);
    height: var(--h);
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 24px 64px rgba(0,0,0,0.65);
    cursor: grab;
  }}
  .viewport:active {{ cursor: grabbing; }}

  .track {{
    display: flex;
    height: 100%;
    transition: transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;
  }}

  .slide {{
    min-width: var(--w);
    height: var(--h);
    position: relative;
    overflow: hidden;
  }}

  .slide img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none;
  }}

  /* Progress bar */
  .progress-bar {{
    width: var(--w);
    height: 3px;
    background: rgba(247,242,234,0.12);
    border-radius: 2px;
    overflow: hidden;
  }}
  .progress-fill {{
    height: 100%;
    background: linear-gradient(90deg, var(--coral), var(--violet));
    border-radius: 2px;
    transition: width 0.38s cubic-bezier(0.4, 0, 0.2, 1);
  }}

  /* Controls */
  .controls {{
    display: flex;
    align-items: center;
    gap: 20px;
  }}

  .btn {{
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1.5px solid rgba(247,242,234,0.20);
    background: rgba(247,242,234,0.06);
    color: var(--bone);
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s ease;
    backdrop-filter: blur(4px);
  }}
  .btn:hover {{ background: rgba(247,242,234,0.14); border-color: rgba(247,242,234,0.40); }}
  .btn:disabled {{ opacity: 0.25; cursor: not-allowed; }}

  .counter {{
    font-size: 13px;
    color: rgba(247,242,234,0.55);
    min-width: 52px;
    text-align: center;
    letter-spacing: 0.05em;
  }}

  /* Dots */
  .dots {{
    display: flex;
    gap: 7px;
    align-items: center;
  }}
  .dot {{
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: rgba(247,242,234,0.20);
    transition: all 0.25s ease;
    cursor: pointer;
  }}
  .dot.active {{
    background: var(--coral);
    transform: scale(1.2);
  }}

  /* Labels */
  .slide-info {{
    font-size: 11px;
    color: rgba(247,242,234,0.35);
    text-align: center;
    max-width: var(--w);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }}

  /* Keyboard hint */
  .hint {{
    font-size: 10px;
    color: rgba(247,242,234,0.20);
    margin-top: 4px;
  }}
</style>
</head>
<body>

<div class="carousel-wrapper">
  <div class="meta">{account} &nbsp;·&nbsp; {n_slides} slides &nbsp;·&nbsp; {date}</div>

  <div class="viewport" id="vp">
    <div class="track" id="track">
{slides_html}
    </div>
  </div>

  <div class="progress-bar">
    <div class="progress-fill" id="prog" style="width:{first_pct}%"></div>
  </div>

  <div class="controls">
    <button class="btn" id="btnPrev" onclick="go(-1)" disabled>&#8592;</button>
    <div class="dots" id="dots">{dots_html}</div>
    <button class="btn" id="btnNext" onclick="go(1)">&#8594;</button>
  </div>

  <div class="slide-info" id="slideInfo">{first_label}</div>
  <div class="hint">← → flechas &nbsp;|&nbsp; swipe en móvil</div>
</div>

<script>
const LABELS = {labels_json};
const N      = {n_slides};
let   cur    = 0;

const track   = document.getElementById('track');
const prog    = document.getElementById('prog');
const counter = null; // not used
const info    = document.getElementById('slideInfo');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const dots    = document.querySelectorAll('.dot');

function pct(i) {{ return ((i + 1) / N * 100).toFixed(1); }}

function go(dir) {{
  const next = cur + dir;
  if (next < 0 || next >= N) return;
  cur = next;
  update();
}}

function goTo(i) {{
  cur = i;
  update();
}}

function update() {{
  track.style.transform = `translateX(-${{cur * 390}}px)`;
  prog.style.width      = pct(cur) + '%';
  btnPrev.disabled      = cur === 0;
  btnNext.disabled      = cur === N - 1;
  info.textContent      = LABELS[cur] || '';
  dots.forEach((d, i) => d.classList.toggle('active', i === cur));
}}

// Keyboard
document.addEventListener('keydown', e => {{
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  go(1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    go(-1);
}});

// Touch / swipe
let tx0 = null;
const vp = document.getElementById('vp');
vp.addEventListener('touchstart', e => {{ tx0 = e.touches[0].clientX; }}, {{passive:true}});
vp.addEventListener('touchend',   e => {{
  if (tx0 === null) return;
  const dx = e.changedTouches[0].clientX - tx0;
  if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  tx0 = null;
}});

// Mouse drag
let mx0 = null;
vp.addEventListener('mousedown',  e => {{ mx0 = e.clientX; }});
vp.addEventListener('mouseup',    e => {{
  if (mx0 === null) return;
  const dx = e.clientX - mx0;
  if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  mx0 = null;
}});
</script>
</body>
</html>
"""

# ─────────────────────────────────────────────────────────────────────────────
# Función pública
# ─────────────────────────────────────────────────────────────────────────────

def generate_html_preview(
    slide_paths: list[Path],
    spec_data: dict,
    output_path: Path,
) -> Path:
    """
    Genera un archivo HTML autocontenido con preview interactivo del carrusel.

    Las imágenes se incrustan en base64 (no necesita servidor web).
    El resultado se puede abrir directamente en cualquier navegador.

    Args:
        slide_paths: Lista de rutas a los PNGs de los slides (en orden).
        spec_data:   Dict con el spec del carrusel (para título, account, etc.)
        output_path: Ruta de destino del .html

    Returns:
        output_path del HTML generado.
    """
    title   = spec_data.get("title", "Carrusel Cals2Gains")
    account = spec_data.get("account", "@cals2gains_es")
    lang    = spec_data.get("lang", "es")
    slides_raw = spec_data.get("slides", [])
    n = len(slide_paths)

    from datetime import date
    date_str = date.today().isoformat()

    # ── Slides HTML (imágenes en base64) ─────────────────────────────────
    slides_html_parts = []
    labels = []

    for i, path in enumerate(slide_paths):
        raw = spec_data.get("slides", [{}])[i] if i < len(slides_raw) else {}
        # Etiqueta = label o type del slide
        label_text = raw.get("label") or raw.get("type", "").upper() or f"Slide {i+1}"
        labels.append(label_text)

        with open(str(path), "rb") as f:
            b64 = base64.b64encode(f.read()).decode()

        slides_html_parts.append(
            f'      <div class="slide">'
            f'<img src="data:image/png;base64,{b64}" alt="Slide {i+1}: {label_text}" loading="lazy">'
            f'</div>'
        )

    slides_html = "\n".join(slides_html_parts)

    # ── Dots ──────────────────────────────────────────────────────────────
    dots_html = " ".join(
        f'<div class="dot{" active" if i == 0 else ""}" onclick="goTo({i})" title="{labels[i]}"></div>'
        for i in range(n)
    )

    # ── Render ────────────────────────────────────────────────────────────
    html = _HTML_TEMPLATE.format(
        title       = title,
        account     = account,
        lang        = lang,
        n_slides    = n,
        date        = date_str,
        slides_html = slides_html,
        dots_html   = dots_html,
        first_pct   = f"{100/n:.1f}",
        first_label = labels[0] if labels else "",
        labels_json = json.dumps(labels, ensure_ascii=False),
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(str(output_path), "w", encoding="utf-8") as f:
        f.write(html)

    size_kb = output_path.stat().st_size // 1024
    import logging
    logging.getLogger("carousel.html").info(
        "HTML preview → %s (%d KB)", output_path.name, size_kb
    )
    return output_path
