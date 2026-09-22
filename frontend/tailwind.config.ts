import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#06080F",
          900: "#0B0F19",
          800: "#111827",
          700: "#1F2937",
          600: "#374151",
        },
        cyan: {
          neon: "#00F0FF",
        },
        laser: {
          green: "#10B981",
        },
        alert: {
          amber: "#F59E0B",
          red: "#EF4444",
        }
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
