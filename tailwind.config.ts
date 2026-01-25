// tailwind.config.ts
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // This enables class-based dark mode
  theme: {
    extend: {
      colors: {
        // Theme 1: Warm & Balanced (Default/Light Mode)
        primary: {
          DEFAULT: 'var(--color-primary)',
          dark: 'var(--color-primary-dark)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          dark: 'var(--color-secondary-dark)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-accent-dark)',
        },
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        text: {
          DEFAULT: 'var(--color-text)',
          light: 'var(--color-text-light)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'spin-slow': 'spin-slow 20s linear infinite',
        'spin-slow-reverse': 'spin-slow-reverse 25s linear infinite',
        'twinkle': 'twinkle 2s ease-in-out infinite',
        'float-slow': 'float-slow 20s ease-in-out infinite',
        'shift-slow': 'shift-slow 30s linear infinite',
        'slide-in': 'slide-in 0.5s ease-out forwards',
        'slide-in-delay': 'slide-in-delay 0.8s ease-out forwards',
        'progress': 'progress 4s linear infinite',
        'ping-once': 'ping-once 0.6s ease-out',
        'shooting-star': 'shooting-star 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'spin-slow-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        'twinkle': {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '33%': { transform: 'translateY(-20px) translateX(10px)' },
          '66%': { transform: 'translateY(10px) translateX(-10px)' },
        },
        'shift-slow': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '50px 50px' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-delay': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '50%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'progress': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        'ping-once': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'shooting-star': {
          '0%': { transform: 'translateX(0) translateY(0) rotate(45deg)', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { transform: 'translateX(100vw) translateY(100vh) rotate(45deg)', opacity: '0' },
        },
      },
      backgroundImage: {
        'grid-slate-100': `repeating-linear-gradient(0deg, #f1f5f9, #f1f5f9 1px, transparent 1px, transparent 20px),
                           repeating-linear-gradient(90deg, #f1f5f9, #f1f5f9 1px, transparent 1px, transparent 20px)`,
        'grid-slate-200': `repeating-linear-gradient(0deg, #e2e8f0, #e2e8f0 1px, transparent 1px, transparent 20px),
                           repeating-linear-gradient(90deg, #e2e8f0, #e2e8f0 1px, transparent 1px, transparent 20px)`,
        'grid-slate-300': `repeating-linear-gradient(0deg, #cbd5e1, #cbd5e1 1px, transparent 1px, transparent 20px),
                           repeating-linear-gradient(90deg, #cbd5e1, #cbd5e1 1px, transparent 1px, transparent 20px)`,
        'grid-slate-800': `repeating-linear-gradient(0deg, #1e293b, #1e293b 1px, transparent 1px, transparent 20px),
                           repeating-linear-gradient(90deg, #1e293b, #1e293b 1px, transparent 1px, transparent 20px)`,
        'grid-slate-900': `repeating-linear-gradient(0deg, #0f172a, #0f172a 1px, transparent 1px, transparent 20px),
                           repeating-linear-gradient(90deg, #0f172a, #0f172a 1px, transparent 1px, transparent 20px)`,
      },
    },
  },
  plugins: [],
}