/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          orange: {
            DEFAULT: '#FF6B35',
            light: '#FF9A56',
            lighter: '#FFB347',
          },
          blue: {
            DEFAULT: '#1A73E8',
            light: '#4A9AF5',
            lighter: '#7EC8E3',
          },
        },
        dark: {
          bg: '#0F1117',
          surface: '#1A1D2E',
          card: '#232738',
          border: '#2E3348',
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-in-up': 'slideInUp 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'slide-out-right': 'slideOutRight 0.3s ease-in forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'overlay-fade-in': 'overlayFadeIn 0.2s ease-out forwards',
        'gentle-float': 'gentleFloat 3s ease-in-out infinite',
        'subtle-pulse': 'subtlePulse 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideOutRight: {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(100%)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        overlayFadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        gentleFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        subtlePulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 107, 53, 0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(255, 107, 53, 0)' },
        },
      },
    },
  },
  plugins: [],
}
