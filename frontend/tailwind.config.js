/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0d',
        surface: {
          DEFAULT: 'rgba(13,13,20,0.78)',
          elevated: 'rgba(18,18,28,0.88)',
          strong: 'rgba(22,22,34,0.94)',
          soft: 'rgba(255,255,255,0.04)',
          border: 'rgba(255,255,255,0.08)',
        },
        'surface-solid': '#0d0d14',
        red: {
          DEFAULT: '#e53535',
          accent: '#e53535',
          glow: 'rgba(229,53,53,0.3)',
        },
        green: {
          accent: '#22c55e',
          glow: 'rgba(34,197,94,0.3)',
        },
        amber: {
          accent: '#f59e0b',
        },
        // Language accent colors
        lang: {
          python: '#3776ab',
          cpp: '#00599c',
          go: '#00add8',
          rust: '#ce422b',
          lua: '#000080',
          javascript: '#f7df1e',
          tailwind: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        glass: '20px',
        premium: '24px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.37)',
        'glass-strong': '0 18px 50px rgba(0,0,0,0.42)',
        'red-glow': '0 0 20px rgba(229,53,53,0.3)',
        'red-soft': '0 10px 30px rgba(229,53,53,0.18)',
        'green-glow': '0 0 20px rgba(34,197,94,0.3)',
      },
      backgroundImage: {
        'panel-sheen':
          'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0))',
        'red-sheen':
          'linear-gradient(135deg, rgba(229,53,53,0.12), rgba(229,53,53,0))',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(229,53,53,0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(229,53,53,0.5)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
