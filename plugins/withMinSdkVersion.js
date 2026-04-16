/**
 * Custom Expo Config Plugin para forzar minSdkVersion 26.
 *
 * Necesario porque react-native-health-connect@3.x usa
 * androidx.health.connect:connect-client que requiere API 26+.
 *
 * Usa withProjectBuildGradle para modificar android/build.gradle.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

const withMinSdkVersion = (config, { minSdkVersion = 26 } = {}) => {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Pattern 1: minSdkVersion = Integer.parseInt(safeExtGet('minSdkVersion', '24'))
    contents = contents.replace(
      /minSdkVersion\s*=\s*Integer\.parseInt\s*\(\s*safeExtGet\s*\(\s*['"]minSdkVersion['"]\s*,\s*['"]\d+['"]\s*\)\s*\)/g,
      `minSdkVersion = ${minSdkVersion}`
    );

    // Pattern 2: minSdkVersion = 24 (direct assignment)
    contents = contents.replace(
      /minSdkVersion\s*=\s*\d+/g,
      `minSdkVersion = ${minSdkVersion}`
    );

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withMinSdkVersion;
