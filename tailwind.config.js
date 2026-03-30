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
          DEFAULT: '#1E3A8A',
          light: '#3B82F6',
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
