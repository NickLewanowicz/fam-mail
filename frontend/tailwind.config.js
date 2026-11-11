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
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        ink: {
          bg: '#3B1D1E',
          surface: '#482527',
          raised: '#562D2E',
          line: '#6B3A38',
        },
        clay: {
          DEFAULT: '#CE7A57',
          hover: '#DD8F6C',
          soft: '#FFF6EF',
        },
        paper: {
          DEFAULT: '#FFFDF6',
          border: '#A89578',
        },
        warm: {
          text: '#F7EDE5',
          text2: '#C7AEA3',
          text3: '#A99288',
          ring: '#E09A6B',
        },
      },
      borderRadius: {
        sheet: '20px',
      },
      // Motion tokens (docs/design/motion-and-polish-spec.md slice 1) —
      // CSS-side motion without framer; framer twin lives in utils/motion.ts
      transitionTimingFunction: {
        enter: 'cubic-bezier(0.2,0,0,1)',
        exit: 'cubic-bezier(0.4,0,1,1)',
        sheet: 'cubic-bezier(0.32,0.72,0,1)',
      },
      transitionDuration: {
        micro: '120ms',
        standard: '200ms',
        large: '300ms',
        flip: '400ms',
      },
      keyframes: {
        'overlay-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'overlay-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'dialog-in': { from: { opacity: '0', transform: 'translate(-50%,-48.5%) scale(0.96)' }, to: { opacity: '1', transform: 'translate(-50%,-50%) scale(1)' } },
        'dialog-out': { from: { opacity: '1', transform: 'translate(-50%,-50%) scale(1)' }, to: { opacity: '0', transform: 'translate(-50%,-51.5%) scale(0.97)' } },
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'sheet-out': { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(100%)' } },
      },
      animation: {
        'overlay-in': 'overlay-in 150ms cubic-bezier(0.2,0,0,1) forwards',
        'overlay-out': 'overlay-out 120ms cubic-bezier(0.4,0,1,1) forwards',
        'dialog-in': 'dialog-in 200ms cubic-bezier(0.2,0,0,1) forwards',
        'dialog-out': 'dialog-out 150ms cubic-bezier(0.4,0,1,1) forwards',
        'sheet-in': 'sheet-in 300ms cubic-bezier(0.32,0.72,0,1) forwards',
        'sheet-out': 'sheet-out 200ms cubic-bezier(0.4,0,1,1) forwards',
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
        // Warm ink theme (docs/design/warm-theme-unification-spec.md): the
        // single app theme. Semantic values match the token vocabulary in
        // theme.extend.colors so DaisyUI primitives (dropdown, skeleton,
        // toast, ConfirmDialog) render on the same surfaces as the app.
        fammail: {
          "primary": "#CE7A57",
          "primary-content": "#3B1D1E",
          "secondary": "#C7AEA3",
          "secondary-content": "#3B1D1E",
          "accent": "#E09A6B",
          "accent-content": "#3B1D1E",
          "neutral": "#562D2E",
          "neutral-content": "#F7EDE5",
          "base-100": "#482527",
          "base-200": "#3B1D1E",
          "base-300": "#6B3A38",
          "base-content": "#F7EDE5",
          "info": "#60a5fa",
          "info-content": "#0f172a",
          "success": "#4ade80",
          "success-content": "#052e16",
          "warning": "#fbbf24",
          "warning-content": "#451a03",
          "error": "#f87171",
          "error-content": "#450a0a",
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
