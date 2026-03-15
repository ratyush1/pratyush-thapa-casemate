/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        surface: {
          800: '#1e293b',
          850: '#172033',
          900: '#0f172a',
          950: '#020617',
        },
      },
      backgroundImage: {
        'gradient-mesh': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(6, 182, 212, 0.15), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(6, 182, 212, 0.08), transparent), radial-gradient(ellipse 50% 30% at 0% 50%, rgba(6, 182, 212, 0.06), transparent)',
        'gradient-auth': 'radial-gradient(ellipse 100% 80% at 50% -30%, rgba(6, 182, 212, 0.2), transparent 50%), radial-gradient(ellipse 80% 60% at 100% 100%, rgba(6, 182, 212, 0.08), transparent 40%)',
      },
      boxShadow: {
        'glow': '0 0 40px -12px rgba(6, 182, 212, 0.25)',
        'card': '0 4px 24px -4px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        'card-hover': '0 12px 40px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(6, 182, 212, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
