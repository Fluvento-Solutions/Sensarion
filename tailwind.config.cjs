/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
          200: '#8fa3b8'
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
  plugins: []
};

