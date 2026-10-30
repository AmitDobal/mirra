module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind jsxImportSource is disabled: css-interop crashes / no-ops on
    // React 19.3 + Reanimated 4.7 (Expo SDK 58). Screens use StyleSheet + tokens.
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
