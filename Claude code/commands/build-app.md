---
description: Build EAS de la app con validación previa y registro.
---

# /build-app

Ejecuta workflow W2 / skill `eas-build`.

Parámetros opcionales:
- `--profile preview|production` (default: `preview`)
- `--platform android|ios` (default: `android`; ⚠️ iOS pendiente de cuenta Apple verificada)

Pasos:

1. Invocar agente `app-dev`.
2. Skill `eas-build`:
   - `git status` y decidir si commitear.
   - `npx tsc --noEmit` debe pasar.
   - Verificar `react-native-reanimated ~4.1.1` + `react-native-worklets ~0.5.1` + plugin babel correcto.
   - Lanzar `eas build --profile <profile> --platform <platform>`.
3. Anotar build ID + URL en `_project-hub/PROJECT_STATUS.md`.
4. Cuando termine el build: skill `crash-diagnosis` para validar en dispositivo (Samsung `R3CR10E9LSE`).
5. CHANGELOG.

Reglas:
- R7: no promover build `358414d2` (roto).
- R10: no modificar `eas.json`/`app.json` sin confirmación.
- Agente responsable: `app-dev`.
