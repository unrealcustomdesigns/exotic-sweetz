/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef7ec',
          100: '#fdecd3',
          200: '#fad5a5',
          300: '#f6b86d',
          400: '#f19333',
          500: '#ee7a12',
          600: '#de5f08',
          700: '#b8440a',
          800: '#95360f',
          900: '#7a2e10',
        },
        candy: {
          pink: '#FF6B9D',
          magenta: '#C850C0',
          purple: '#8B5CF6',
          blue: '#06B6D4',
          teal: '#14B8A6',
          lime: '#84CC16',
          yellow: '#FBBF24',
          orange: '#F97316',
          red: '#EF4444',
          coral: '#FF7979',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'Nunito', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'float-delay': 'float 3s ease-in-out 0.5s infinite',
        'float-slow': 'float 4s ease-in-out 1s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up-1': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both',
        'slide-up-2': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both',
        'slide-up-3': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both',
        'slide-up-4': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both',
        'pop': 'pop 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 6s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '40%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(238, 122, 18, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(238, 122, 18, 0.6), 0 0 40px rgba(238, 122, 18, 0.2)' },
        },
      },
    },
  },
  plugins: [],
};
