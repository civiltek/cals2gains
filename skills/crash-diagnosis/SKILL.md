# Skill: crash-diagnosis

> Diagnosticar crashes de Android en el dispositivo de pruebas usando ADB.

## Triggers
- APK se cierra al abrir.
- Reporte de "la app me petó al hacer X".
- Build nuevo a validar en dispositivo.

## Setup base
- Dispositivo de pruebas: **Samsung**, serial `R3CR10E9LSE`, conectado por USB.
- Bundle: `com.civiltek.cals2gains`.

## Pasos

1. **Verificar conexión**:
   ```bash
   adb devices
   ```
   Debe aparecer `R3CR10E9LSE  device`. Si dice `unauthorized` → pedir a Judith que acepte el prompt USB en el móvil.

2. **Limpiar instalación previa si hay APK roto**:
   ```bash
   adb -s R3CR10E9LSE uninstall com.civiltek.cals2gains
   ```
   **NUNCA instalar APK `358414d2`** (reanimated v3 roto — R7).

3. **Instalar APK actual**:
   ```bash
   adb -s R3CR10E9LSE install -r path/to/cals2gains.apk
   ```

4. **Capturar logs al abrir**:
   ```bash
   adb -s R3CR10E9LSE logcat -c    # limpiar buffer
   adb -s R3CR10E9LSE logcat -s ReactNativeJS:V System.err:W AndroidRuntime:E
   ```
   Lanzar la app desde el móvil; observar output ~20 segundos.

5. **Patrones conocidos**:
   - `NoSuchFieldError: mIsFinished` → reanimated v3 incompatible. Fix aplicado 13/04: upgrade a 4.1.1 + `react-native-worklets` 0.5.1. Si vuelve a aparecer, la dependencia regresó a v3.
   - `Missing FCM token` → `expo-notifications` sin configurar. Ya removido; si vuelve, alguien lo reinstaló.
   - `Firebase Storage ArrayBuffer` → workaround XMLHttpRequest.
   - `permission denied` en Firestore → revisar `firestore.rules`.

6. **Si crash nuevo**:
   - Capturar stack completo.
   - Identificar módulo origen.
   - Buscar en issues de Expo / React Native el error.
   - Reportar en `_project-hub/PROJECT_STATUS.md` como "Bug Nuevo" con stack + hipótesis.

7. **Al resolver**:
   - Añadir a "Bugs Resueltos" en `PROJECT_STATUS.md` con causa + fix + commit/build.
   - CHANGELOG.

## Reglas
- R7: nunca instalar build `358414d2`.
- R1: si no reproduces el crash, no digas "ya está arreglado". Marca "pendiente de reproducción".

## Verificación
- [ ] Dispositivo reconocido por ADB.
- [ ] APK nuevo instalado.
- [ ] App abre sin crash en pantalla de login/onboarding.
- [ ] Navegación a dashboard funciona.
- [ ] Bug/fix registrado en PROJECT_STATUS.md.
