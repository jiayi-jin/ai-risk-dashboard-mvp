import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // 浅色、柔和的控制台配色，贴近参考设计
        background: "#f5f7fb",
        foreground: "#0f172a",
        primary: {
          DEFAULT: "#4f46e5",
          foreground: "#ffffff"
        },
        muted: "#ffffff",
        border: "#e5e7eb",
        subtle: "#f1f5f9"
      },
      borderRadius: {
        xl: "1.25rem"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
