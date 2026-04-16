"""
Cals2Gains Carousel Engine v1.0
================================
Motor de generación de carruseles de Instagram de calidad de estudio.

Pipeline:
  1. Recibe JSON spec (topic + slides data)
  2. Genera imágenes de fondo con DALL-E 3 (HD, 1024×1792 → crop 1080×1350)
  3. Compone cada slide con branding consistente (Outfit, paleta C2G)
  4. Exporta slides como PNG de alta calidad (≥300 KB por slide)
  5. Envía a Telegram para aprobación de Judith

Uso rápido:
  python create_carousel.py --spec specs/pieza-01-huevos-colesterol.json
  python create_carousel.py --demo
"""
