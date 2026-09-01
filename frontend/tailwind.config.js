/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('daisyui'),
    require('@tailwindcss/typography'),
  ],
  daisyui: {
    themes: [
      {
        fammail: {
          "primary": "#18181b",
          "primary-content": "#ffffff",
          "secondary": "#71717a",
          "secondary-content": "#ffffff",
          "accent": "#2563eb",
          "accent-content": "#ffffff",
          "neutral": "#18181b",
          "neutral-content": "#fafafa",
          "base-100": "#ffffff",
          "base-200": "#f4f4f5",
          "base-300": "#e4e4e7",
          "base-content": "#18181b",
          "info": "#2563eb",
          "info-content": "#ffffff",
          "success": "#16a34a",
          "success-content": "#ffffff",
          "warning": "#d97706",
          "warning-content": "#ffffff",
          "error": "#dc2626",
          "error-content": "#ffffff",
          "--rounded-box": "0.5rem",
          "--rounded-btn": "0.375rem",
          "--rounded-badge": "0.375rem",
          "--animation-btn": "0.15s",
          "--animation-input": "0.15s",
          "--btn-focus-scale": "1",
          "--tab-radius": "0.375rem",
        },
      },
    ],
  },
}
