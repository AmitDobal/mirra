const { colors } = require("./src/theme/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors,
      spacing: {
        "space-xs": 4,
        "space-sm": 8,
        "space-md": 16,
        "space-lg": 20,
        "space-xl": 28,
        margin: 20,
        gutter: 16,
        touch: 44,
        dock: 64,
        "dock-clearance": 96,
      },
      borderRadius: {
        sm: 8,
        DEFAULT: 16,
        md: 24,
        lg: 32,
        xl: 48,
        full: 9999,
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "52px", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-metric": ["38px", { lineHeight: "42px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["28px", { lineHeight: "34px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["22px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "500" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-lg": ["14px", { lineHeight: "18px", letterSpacing: "0.02em", fontWeight: "600" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "600" }],
        "label-caps": ["11px", { lineHeight: "14px", letterSpacing: "0.08em", fontWeight: "700" }],
      },
      fontFamily: {
        display: ["SpaceGrotesk_700Bold"],
        headline: ["SpaceGrotesk_700Bold"],
        "headline-semi": ["SpaceGrotesk_600SemiBold"],
        label: ["SpaceGrotesk_600SemiBold"],
        "label-bold": ["SpaceGrotesk_700Bold"],
        body: ["PlusJakartaSans_400Regular"],
        "body-medium": ["PlusJakartaSans_500Medium"],
        "body-semi": ["PlusJakartaSans_600SemiBold"],
        "body-bold": ["PlusJakartaSans_700Bold"],
      },
    },
  },
  plugins: [],
};
