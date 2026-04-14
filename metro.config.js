// Learn more https://docs.expo.io/guides/customizing-metro
// Using require with path.resolve to avoid Node 24 ESM URL issues on Windows
const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(path.resolve(__dirname));

// Disable package exports so firebase/auth uses the web bundle
// instead of the React Native-specific one (which requires native modules)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
