/**
 * Custom Expo Config Plugin para forzar minSdkVersion 26.
 *
 * Necesario porque react-native-health-connect@3.x usa
 * androidx.health.connect:connect-client que requiere API 26+.
 *
 * En Expo SDK 50+ / RN 0.73+, minSdkVersion viene de gradle.properties
 * via findProperty('android.minSdkVersion'). Usamos withGradleProperties
 * para sobreescribir ese valor.
 */
const { withGradleProperties } = require('@expo/config-plugins');

const withMinSdkVersion = (config, { minSdkVersion = 26 } = {}) => {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    // Find and update existing android.minSdkVersion property
    const existing = props.find(
      (item) => item.type === 'property' && item.key === 'android.minSdkVersion'
    );

    if (existing) {
      existing.value = String(minSdkVersion);
    } else {
      // Add if not present
      props.push({
        type: 'property',
        key: 'android.minSdkVersion',
        value: String(minSdkVersion),
      });
    }

    return config;
  });
};

module.exports = withMinSdkVersion;
