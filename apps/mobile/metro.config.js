const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Keep CSS enabled — NativeWind needs it.
  isCSSEnabled: true,
});

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Avoid empty injectData({}) races in `eas update` / production export.
  // Virtual Metro modules work in dev, but OTA builds often baked empty CSS.
  forceWriteFileSystem: true,
});
