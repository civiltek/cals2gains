module.exports = function (api) {
  api.cache(true);

  const plugins = ['react-native-worklets/plugin'];

  // Strip console.log/warn/error from production builds
  // Prevents leaking debug info, PII, and tokens in released APK/IPA
  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
