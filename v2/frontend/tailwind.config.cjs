/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // v2 CSS Variables (beibehalten für Kompatibilität)
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        background: 'var(--color-background)',
        text: 'var(--color-text)',
        'text-secondary': 'var(--color-text-secondary)',
        // v1 Theme Colors
        surface: {
          base: '#f8fbff',
          glass: '#ecf2f8'
        },
        accent: {
          sky: '#1a7fd8',
          teal: '#18b4a6'
        },
        steel: {
          700: '#0c1f2f',
          500: '#1f3c54',
          200: '#8fa3b8',
          300: '#6b7d8f'
        }
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        xl: '24px',
        '3xl': '32px'
      },
      boxShadow: {
        pane: '0 24px 50px rgba(15, 46, 70, 0.22)'
      }
    }
  },
  plugins: [
    function({ addComponents, theme }) {
      addComponents({
        '.glass-card': {
          overflow: 'hidden',
          borderRadius: theme('borderRadius.3xl'),
          border: '1px solid rgba(255, 255, 255, 0.55)',
          background: 'linear-gradient(to bottom right, white, #f3f6fb, #ecf2f8)',
          backdropFilter: 'blur(2rem)',
        }
      });
    }
  ]
};

