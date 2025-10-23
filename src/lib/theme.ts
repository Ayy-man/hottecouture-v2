/**
 * Global theme configuration for Hotte Couture
 * Mural-inspired color palette for cohesive design
 */

export const theme = {
  colors: {
    // Primary palette
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

    // Semantic colors using the palette
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

  // CSS variables for global use
  cssVariables: {
    '--color-background': '#F4EFE9',
    '--color-surface': '#FFFFFF',
    '--color-muted': '#E9E4DF',
    '--color-text': '#2C2C2C',
    '--color-text-secondary': '#6B6B6B',
    '--color-accent-clay': '#B57C6C',
    '--color-accent-olive': '#7B8360',
    '--color-accent-taupe': '#D5B9A0',
    '--color-accent-contrast': '#4E3B31',
  },
} as const;

export type Theme = typeof theme;
