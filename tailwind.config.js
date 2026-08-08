/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0D0D0D',      // primary background
        panel: '#1A1A1A',    // card / section background
        paper: '#FFFFFF',    // primary text on dark
        volt: '#CAD600',     // brand accent (acid lime)
        slate: '#808080',    // muted text
        line: '#2B2B2B'      // hairline borders on dark
      },
      fontFamily: {
        display: ['"Anton"', 'sans-serif'],       // big statement headlines
        accent: ['"Bebas Neue"', 'sans-serif'],   // eyebrows / labels / stamps
        body: ['"Barlow"', 'sans-serif']          // paragraphs, UI text
      },
      backgroundImage: {
        grain: "url('/textures/grain.png')"
      },
      boxShadow: {
        volt: '0 0 0 2px #CAD600'
      }
    }
  },
  plugins: []
}
