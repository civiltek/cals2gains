/**
 * Custom Expo Config Plugin para forzar minSdkVersion 26.
 *
 * Necesario porque react-native-health-connect@3.x usa
 * androidx.health.connect:connect-client que requiere API 26+.
 *
 * El campo android.minSdkVersion en app.json no es válido en Expo
 * managed workflow - se usa este plugin en su lugar.
 */
const { withBuildGradle } = require('@expo/config-plugins');

const withMinSdkVersion = (config, { minSdkVersion = 26 } = {}) => {
  return withBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Replace default minSdkVersion with our required value
    // Expo generates: minSdkVersion = Integer.parseInt(safeExtGet('minSdkVersion', '24'))
    // or: minSdkVersion = 24
    const updated = buildGradle
      .replace(
        /minSdkVersion\s*=\s*Integer\.parseInt\s*\(\s*safeExtGet\s*\(\s*['"]minSdkVersion['"]\s*,\s*['"]\d+['"]\s*\)\s*\)/,
        `minSdkVersion = ${minSdkVersion}`
      )
      .replace(
        /minSdkVersion\s*=\s*\d+/,
        `minSdkVersion = ${minSdkVersion}`
      );

    config.modResults.contents = updated;
    return config;
  });
};

module.exports = withMinSdkVersion;
