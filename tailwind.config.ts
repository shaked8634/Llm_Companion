import type {Config} from 'tailwindcss';

export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: 'media', // Uses prefers-color-scheme
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
