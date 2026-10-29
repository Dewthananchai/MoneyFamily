import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#F0F4F8",
          100: "#D9E2EC",
          200: "#BCCCDC",
          300: "#9FB3C8",
          400: "#829AB1",
          500: "#627D98",
          600: "#486581",
          700: "#334E68",
          800: "#1E3A5F",
          900: "#0F2038", // สีกรมท่าลึก (Navy Main)
          950: "#081220",
        },
        brand: {
          yellow: "#FBBF24", // สีเหลืองสดใส
          amber: "#F59E0B",  // สีเหลืองทอง
          orange: "#F97316", // สีส้มกระปรี้กระเปร่า
          darkOrange: "#EA580C",
        },
      },
    },
  },
  plugins: [],
};

export default config;

