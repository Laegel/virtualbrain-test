/** @type {import('tailwindcss').Config} */

// Colors read CSS variables (src/index.css) so light/dark is a single class switch on <html>
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

const TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
]

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        border: token('border'),
        fg: token('fg'),
        muted: token('muted'),
        accent: token('accent'),
        'accent-fg': token('accent-fg'),
        danger: token('danger'),
        // text-type-fire, bg-type-fire…
        type: Object.fromEntries(TYPES.map((t) => [t, token(`type-${t}`)])),
      },
      borderRadius: { card: '0.875rem' },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Arena motion: lunge towards the opponent, shake + flash when hit, damage number rising
        'lunge-right': {
          '0%, 100%': { transform: 'translateX(0) scale(1)' },
          '45%': { transform: 'translateX(28px) scale(1.06)' },
        },
        'lunge-left': {
          '0%, 100%': { transform: 'translateX(0) scale(1)' },
          '45%': { transform: 'translateX(-28px) scale(1.06)' },
        },
        'hit-shake': {
          '0%, 100%': { transform: 'translateX(0)', filter: 'brightness(1)' },
          '15%': { transform: 'translateX(-9px)', filter: 'brightness(1.9)' },
          '35%': { transform: 'translateX(8px)', filter: 'brightness(1.4)' },
          '55%': { transform: 'translateX(-5px)', filter: 'brightness(1.1)' },
          '75%': { transform: 'translateX(3px)' },
        },
        'float-up': {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.7)' },
          '15%': { opacity: '1', transform: 'translateY(0) scale(1.15)' },
          '70%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-38px) scale(1)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-48px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(48px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.5)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        victory: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-8px) scale(1.05)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 200ms ease-out both',
        'lunge-right': 'lunge-right 550ms ease-out',
        'lunge-left': 'lunge-left 550ms ease-out',
        'hit-shake': 'hit-shake 500ms ease-out',
        'float-up': 'float-up 1000ms ease-out forwards',
        'slide-in-left': 'slide-in-left 500ms ease-out both',
        'slide-in-right': 'slide-in-right 500ms ease-out both',
        'pop-in': 'pop-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        victory: 'victory 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
