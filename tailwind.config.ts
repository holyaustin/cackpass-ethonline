// tailwind.config.ts
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',
        secondary: '#4CAF50',
        // Define your color palette
        'primary-dark': '#D45A2C',
        'secondary-dark': '#3D8B40',
      },
      // Add any other customizations here
    },
  },
  plugins: [],
}