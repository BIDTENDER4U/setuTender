import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F1",
        surface: "#FFFFFF",
        surfaceAlt: "#EFEDE6",
        ink: "#16233F",
        inkSoft: "#3D4A63",
        inkFaint: "#7C879C",
        rule: "#D8D3C7",
        ruleSoft: "#E7E3D8",
        accent: "#B4690E",
        accentSoft: "#F1E1CC",
        success: "#1F7A4D",
        successSoft: "#E1EEE5",
        danger: "#A8341F",
        dangerSoft: "#F3E2DE",
        warning: "#A67C1E",
        warningSoft: "#F1E9D6",
        info: "#3D5A80",
        infoSoft: "#E4EAF1",
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
