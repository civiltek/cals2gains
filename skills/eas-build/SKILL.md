# Skill: eas-build

> Flujo de build EAS con validación previa.

## Triggers
- `/build-app`.
- Fix de bug listo para validación en dispositivo.
- Release candidate para stores.

## Contexto
- Owner EAS: `civiltek`.
- Project ID: `381120d5-3866-4b97-af00-4c6840768327`.
- Bundle ID: `com.civiltek.cals2gains`.
- Expo SDK: 54. RN: 0.81.5.
- Cals2Gains **NO corre en Expo Go** (módulos nativos) — siempre build EAS.

## Pasos

1. **Check de repo limpio**:
   ```bash
   git status
   ```
   Si hay cambios sin commitear → decidir si committear o stashear antes del build (para saber qué versión del código se está compilando).

2. **Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   Debe pasar sin errores. Si falla → no hacer build, reportar.

3. **Lint** (si existe script):
   ```bash
   npm run lint
   ```

4. **Verificar dependencias clave**:
   - `react-native-reanimated` debe ser `~4.1.1` o superior (tras fix 13/04).
   - `react-native-worklets` debe estar instalado (`0.5.1+`).
   - `babel.config.js` debe usar plugin `react-native-worklets/plugin` (no el antiguo `react-native-reanimated/plugin`).

5. **Seleccionar profile**:
   - `preview` → APK para pruebas internas.
   - `production` → AAB para Play Store.

6. **Lanzar build**:
   ```bash
   eas build --profile preview --platform android
   # o --platform ios cuando la cuenta Apple esté verificada
   ```

7. **Registrar build**:
   - Anotar build ID y URL de `expo.dev/accounts/civiltek/projects/cals2gains/builds/…`.
   - Actualizar `_project-hub/PROJECT_STATUS.md` con la nueva entrada "Último build Android/iOS".

8. **Tras completar**:
   - Invocar skill `crash-diagnosis` para validar en dispositivo.

## Reglas
- R10: no modificar `eas.json` / `app.json` sin confirmación si el cambio puede romper builds.
- R7: no promover build `358414d2` bajo ninguna circunstancia.
- R1: si el build falla, reportar el error real. No "relanzar y rezar" sin leer logs.

## Verificación
- [ ] Typecheck pasó.
- [ ] Reanimated v4 + worklets presentes.
- [ ] Build ID anotado.
- [ ] PROJECT_STATUS.md actualizado.
- [ ] Siguiente paso (validación ADB) activado.
