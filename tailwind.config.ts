// tailwind.config.ts
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme 1: Warm & Balanced (Light Mode)
        primary: {
          DEFAULT: '#D95427', // Burnt Orange
          dark: '#BF4519',
        },
        secondary: {
          DEFAULT: '#3D6A66', // Muted Teal
          dark: '#2E514D',
        },
        background: '#F7F3E9', // Cream Shell
        surface: '#FFFFFF', // Pure White
        text: {
          DEFAULT: '#2E2D27', // Deep Charcoal
          light: '#5C5B54',
        },
        
        // Theme 2: Professional Tech (Dark Mode)
        dark: {
          primary: '#3D6A66', // Deep Teal
          secondary: '#5C5B54', // Slate Grey
          accent: '#D95427', // Burnt Orange
          background: '#F2F2F0', // Soft Grey
          text: '#1A1A18', // Near Black
          surface: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
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
      },
    },
  },
  plugins: [],
}