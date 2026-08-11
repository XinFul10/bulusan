/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0E3642',
          light: '#22626B',
          dark: '#061824',
          darker: '#02050E',
        },
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        background: '#F3F4F6',
        card: '#FFFFFF',
        text: {
          dark: '#111827',
          light: '#6B7280',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.1)',
      }
    },
  },
  plugins: [],
}
