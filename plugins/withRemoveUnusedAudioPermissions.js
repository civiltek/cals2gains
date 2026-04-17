/**
 * Custom Expo Config Plugin: elimina del AndroidManifest los permisos
 * y servicios de expo-audio que NO usamos en Cals2Gains.
 *
 * Problema:
 *   expo-audio declara automaticamente FOREGROUND_SERVICE_MEDIA_PLAYBACK
 *   y el servicio AudioControlsService (foregroundServiceType=mediaPlayback)
 *   en su AndroidManifest.xml. El manifest merger los incluye en el build
 *   final. Google Play Console detecta esos permisos y exige declaracion
 *   de "Permisos de servicios en primer plano" (Android 14+).
 *
 *   Cals2Gains solo usa expo-audio para grabacion de voz (useAudioRecorder
 *   en app/voice-log.tsx). No reproduce audio en segundo plano. El servicio
 *   AudioControlsService nunca se inicia.
 *
 * Solucion:
 *   Quitar del manifest final esos permisos y el servicio no usado.
 *   Usamos el atributo tools:node="remove" del manifest merger para que
 *   Android elimine limpiamente lo que expo-audio inyecta.
 */

const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const PERMISSIONS_TO_REMOVE = [
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
];

const SERVICES_TO_REMOVE = [
  'expo.modules.audio.service.AudioControlsService',
];

const withRemoveUnusedAudioPermissions = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [];
    }

    for (const perm of PERMISSIONS_TO_REMOVE) {
      const already = manifest['uses-permission'].some(
        (p) =>
          p.$ &&
          p.$['android:name'] === perm &&
          p.$['tools:node'] === 'remove'
      );
      if (!already) {
        manifest['uses-permission'].push({
          $: {
            'android:name': perm,
            'tools:node': 'remove',
          },
        });
      }
    }

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    if (!Array.isArray(app.service)) {
      app.service = [];
    }

    for (const svcName of SERVICES_TO_REMOVE) {
      const already = app.service.some(
        (s) =>
          s.$ &&
          s.$['android:name'] === svcName &&
          s.$['tools:node'] === 'remove'
      );
      if (!already) {
        app.service.push({
          $: {
            'android:name': svcName,
            'tools:node': 'remove',
          },
        });
      }
    }

    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    return cfg;
  });
};

module.exports = withRemoveUnusedAudioPermissions;
