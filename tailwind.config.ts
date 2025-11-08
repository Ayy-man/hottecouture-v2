import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Mural-inspired color palette
        background: '#F4EFE9',
        surface: '#FFFFFF',
        muted: '#E9E4DF',
        text: '#2C2C2C',
        'text-secondary': '#6B6B6B',

        // Accent colors
        'accent-clay': '#B57C6C',
        'accent-olive': '#7B8360',
        'accent-taupe': '#D5B9A0',
        'accent-contrast': '#4E3B31',

        // Primary (Clay-based)
        primary: {
          50: '#FDF7F4',
          100: '#F9EDE7',
          200: '#F2D5C7',
          300: '#E8B8A3',
          400: '#D5B9A0',
          500: '#B57C6C',
          600: '#A66B5A',
          700: '#8B5A4A',
          800: '#70483C',
          900: '#4E3B31',
        },

        // Secondary (Olive-based)
        secondary: {
          50: '#F7F8F4',
          100: '#EEF0E8',
          200: '#DDE2D1',
          300: '#C7D0B8',
          400: '#A8B592',
          500: '#7B8360',
          600: '#6B7049',
          700: '#5A5E3D',
          800: '#4A4D32',
          900: '#3A3C27',
        },

        // Neutral (Muted-based)
        neutral: {
          50: '#F4EFE9',
          100: '#E9E4DF',
          200: '#D5D0CB',
          300: '#C1BCB7',
          400: '#9A9590',
          500: '#6B6B6B',
          600: '#5A5A5A',
          700: '#4A4A4A',
          800: '#3A3A3A',
          900: '#2C2C2C',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-fira-code)', 'monospace'],
      },
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
        ipad: '820px', // iPad 8 landscape width
        'ipad-landscape': '1024px', // iPad 8 landscape
        'ipad-portrait': '768px', // iPad 8 portrait
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
