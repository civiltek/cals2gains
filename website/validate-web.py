#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cals2Gains - validador pre-deploy de website/index.html
Ejecutar: python3 website/validate-web.py
Devuelve exit code 0 si todo OK, 1 si hay errores.
"""

import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HTML_FILE = 'website/index.html'
errors = []
warnings = []

try:
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
except FileNotFoundError:
    print(f"ERROR: No se encuentra {HTML_FILE}")
    sys.exit(1)

# ── 1. TILDES: palabras en español que nunca deben aparecer sin acento ─────────
# Words checked as WHOLE WORDS only (using regex \b boundaries)
# These are noun/adjective forms that need accents, not verb forms
word_boundary_checks = {
    # pattern (no accent) : corrected form
    r'\bnutricion\b':     'nutrición',
    r'\bconfiguracion\b': 'configuración',
    r'\bfuncion\b':       'función',      # noun only; "funciona/funcionan" = verb, no accent
    r'\baccion\b':        'acción',
    r'\bconexion\b':      'conexión',
    r'\bprecision\b':     'precisión',
    r'\bgamificacion\b':  'gamificación',
    r'\bplanificacion\b': 'planificación',
    r'\brecomposicion\b': 'recomposición',
    r'\bhidratacion\b':   'hidratación',
    r'\bbusqueda\b':      'búsqueda',
    r'\beschaner\b':      'escáner',
    r'\bescaner\b':       'escáner',
    r'\bdinamico\b':      'dinámico',
    r'\bautomatico\b':    'automático',
    r'\bcodigo\b':        'código',
    r'\bcalorias\b':      'calorías',
    r'\bestadisticas\b':  'estadísticas',
    r'\bproteina\b':      'proteína',
    r'\bmedico\b':        'médico',
    r'\bperdida\b':       'pérdida',
    r'\bnucleo\b':        'núcleo',
    r'\bSiguenos\b':      'Síguenos',
    r'\bTerminos\b':      'Términos',
    r'\bUnete\b':         'Únete',
}
# Substring checks (multi-word phrases)
phrase_checks = {
    'Vision IA':       'Visión IA',
    'vision avanzada': 'visión avanzada',
}

for pattern, good in word_boundary_checks.items():
    for m in re.finditer(pattern, content):
        pos = m.start()
        # Skip if inside data-en="..." attribute
        context_before = content[max(0, pos-300):pos]
        last_en = context_before.rfind('data-en="')
        last_es = context_before.rfind('data-es="')
        if last_en > last_es:
            # Check if the closing quote of data-en is before our position
            after_attr_start = context_before[last_en+9:]
            if '"' not in after_attr_start:
                continue  # we're inside data-en="..., skip
        line_num = content[:pos].count('\n') + 1
        snippet = content[max(0, pos-15):pos+25].replace('\n', ' ').strip()
        errors.append(f"  Linea {line_num}: '{m.group()}' -> deberia ser '{good}'  [...{snippet}...]")

for bad, good in phrase_checks.items():
    idx = 0
    while True:
        pos = content.find(bad, idx)
        if pos == -1:
            break
        # Skip English context
        context_before = content[max(0, pos-300):pos]
        last_en = context_before.rfind('data-en="')
        last_es = context_before.rfind('data-es="')
        if last_en > last_es:
            after_attr_start = context_before[last_en+9:]
            if '"' not in after_attr_start:
                idx = pos + 1
                continue
        line_num = content[:pos].count('\n') + 1
        errors.append(f"  Linea {line_num}: '{bad}' -> deberia ser '{good}'")
        idx = pos + 1

# ── 2. Entidades HTML sin renderizar en atributos data-* ──────────────────────
# &amp;copy; in data attributes would show as &copy; literal
if 'data-es="&amp;copy;' in content or 'data-en="&amp;copy;' in content:
    errors.append("  &amp;copy; encontrado en atributo data-es/data-en → usar © directamente")
if 'data-es="&copy;' in content or 'data-en="&copy;' in content:
    errors.append("  &copy; en atributo data-es/data-en → usar © directamente (JS usa textContent)")

# Check for other unrendered entities in data attributes
for entity in ['&amp;amp;', '&lt;', '&gt;']:
    if f'data-es="{entity}' in content or f'data-en="{entity}' in content:
        warnings.append(f"  Entidad HTML {entity} en atributo data-* — revisar si es intencional")

# ── 3. Enlace Google Play ──────────────────────────────────────────────────────
GPLAY_URL = 'https://play.google.com/store/apps/details?id=com.civiltek.cals2gains'
if GPLAY_URL not in content:
    errors.append(f"  URL de Google Play no encontrada: {GPLAY_URL}")
else:
    warnings.append("  ✓ Enlace Google Play presente")

# ── 4. Enlace App Store ────────────────────────────────────────────────────────
ASTORE_URL = 'https://apps.apple.com/app/cals2gains/id6744253498'
if ASTORE_URL not in content:
    errors.append(f"  URL de App Store no encontrada: {ASTORE_URL}")
else:
    warnings.append("  ✓ Enlace App Store presente")

# ── 5. href="#" en botones de descarga ────────────────────────────────────────
# These are the CTA download buttons — should NOT be href="#"
if 'href="#" class="btn btn-primary"' in content:
    errors.append('  Botón de descarga con href="#" — debe apuntar a la store correspondiente')

# ── 6. Logo de Instagram en social cards ──────────────────────────────────────
# The social cards should have the Instagram SVG, not flag emojis
if '&#127758;' in content and 'icon ig' in content:
    # Globe emoji in an ig card — wrong
    errors.append("  Emoji de globo (🌎) en social card de Instagram — usar SVG del logo de Instagram")
if '&#127466;&#127480;' in content and 'icon ig' in content:
    errors.append("  Emoji de bandera 🇪🇸 en social card de Instagram — usar SVG del logo de Instagram")

# Check SVG Instagram logo is present in social section
social_section_start = content.find('id="social"')
if social_section_start == -1:
    social_section_start = content.find('class="social"')
social_section_end = content.find('</section>', social_section_start + 1) if social_section_start != -1 else -1

if social_section_start != -1 and social_section_end != -1:
    social_section = content[social_section_start:social_section_end]
    if '<svg' not in social_section or 'icon ig' not in social_section:
        errors.append("  Sección social: falta el SVG del logo de Instagram en las social cards")
    else:
        warnings.append("  ✓ SVG de Instagram presente en social cards")

# ── 7. Footer © symbol ────────────────────────────────────────────────────────
# The footer text should have © rendered, and data attributes should use ©
footer_start = content.find('<footer>')
if footer_start != -1:
    footer_content = content[footer_start:footer_start+2000]
    if '©' not in footer_content and '&copy;' not in footer_content:
        errors.append("  Footer: no se encuentra el símbolo © — revisar el footer")
    else:
        warnings.append("  ✓ Símbolo © presente en footer")

# ── 8. Charset UTF-8 ──────────────────────────────────────────────────────────
if 'charset="UTF-8"' not in content and "charset='UTF-8'" not in content:
    errors.append("  Falta <meta charset='UTF-8'> — necesario para tildes y caracteres especiales")
else:
    warnings.append("  ✓ charset UTF-8 declarado")

# ── 9. lang="es" en <html> ────────────────────────────────────────────────────
if '<html lang="es">' not in content:
    warnings.append("  AVISO: <html lang='es'> no encontrado — revisar si el lang se establece correctamente")
else:
    warnings.append("  ✓ lang='es' en <html>")

# ── Resultado ─────────────────────────────────────────────────────────────────
print("=" * 60)
print("Cals2Gains — Validación pre-deploy de website/index.html")
print("=" * 60)

if warnings:
    print("\nChecks OK:")
    for w in warnings:
        if w.startswith("  ✓"):
            print(w)

if errors:
    print(f"\n❌ {len(errors)} error(es) encontrado(s):")
    for e in errors:
        print(e)
    print("\nCorrige los errores antes de hacer deploy.")
    sys.exit(1)
else:
    print("\n✅ Todo OK — la web está lista para deploy.")
    sys.exit(0)
