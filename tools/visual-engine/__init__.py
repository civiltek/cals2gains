# Cals2Gains Visual Engine v5.0 (Higgsfield)
# ===========================================
# Professional reel production pipeline powered by Higgsfield AI.
#
# Pipeline: Script (GPT) → Voice (ElevenLabs) → Video (Higgsfield) → Compose (MoviePy)
#
# Modules:
#   brand_config      - Colors, fonts, layout, API keys
#   higgsfield_client - Higgsfield Cloud API wrapper (primary video backend)
#   script_generator  - AI script generation with viral format rules
#   voice_generator   - ElevenLabs TTS with word-level timestamps
#   subtitle_engine   - Word-by-word animated subtitle renderer
#   image_generator   - DALL-E 3 / GPT Image for static images
#   video_generator   - Legacy Sora 2 / Veo 2 / Ken Burns (fallback)
#   reel_composer     - Video composition, branding, audio mixing
#   create_reel       - Main orchestrator & CLI entry point
#   brand_overlay     - Per-frame brand compositing
#   transitions       - Scene transition effects
#   music_manager     - Background music & ambient pads
#   template_loader   - TEMPLATE-SPECS.json loader
