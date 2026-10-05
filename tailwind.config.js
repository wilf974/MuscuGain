import colors from 'tailwindcss/colors'
import plugin from 'tailwindcss/plugin'

// Thème clair/sombre sans réécrire les classes : les palettes utilisées par l'app pointent
// vers des variables CSS. :root = valeurs Tailwind d'origine (thème sombre inchangé),
// html.theme-light = palette « miroir » (fonds clairs, textes foncés, accents lisibles).
const THEMED = ['slate', 'blue', 'green', 'red', 'amber', 'orange', 'emerald']
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

// Accents en clair : textes 200–400 assombris, teintes de fond 700–950 éclaircies, 500/600 ~ stables.
const ACCENT_LIGHT = { 50: '950', 100: '900', 200: '800', 300: '800', 400: '700', 500: '600', 600: '600', 700: '300', 800: '200', 900: '100', 950: '50' }
// Slate en clair : 900 = fond de page, 800 = cartes, 700 = bordures/boutons secondaires, 400–200 = textes.
const SLATE_LIGHT = {
  50: '#020617', 100: '#0f172a', 200: '#1e293b', 300: '#334155', 400: '#475569', 500: '#64748b',
  600: '#94a3b8', 700: '#e2e8f0', 800: '#ffffff', 900: '#f1f5f9', 950: '#e2e8f0',
}

const rgb = (hex) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ')
}
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

const themedColors = Object.fromEntries(
  THEMED.map((c) => [c, Object.fromEntries(SHADES.map((s) => [s, v(`${c}-${s}`)]))]),
)

const darkVars = {}
const lightVars = {}
for (const c of THEMED) {
  for (const s of SHADES) {
    darkVars[`--c-${c}-${s}`] = rgb(colors[c][s])
    lightVars[`--c-${c}-${s}`] = rgb(c === 'slate' ? SLATE_LIGHT[s] : colors[c][ACCENT_LIGHT[s]])
  }
}
darkVars['--c-white'] = rgb('#ffffff')
lightVars['--c-white'] = rgb('#0f172a') // « text-white » = texte principal → encre foncée en clair

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ...themedColors,
        white: v('white'),
        // Texte sur fond d'accent plein (boutons bleu/vert/rouge) : toujours blanc.
        onaccent: '#ffffff',
      },
      fontFamily: {
        // Pile système : San Francisco sur iPhone, aucune police distante (offline, vie privée).
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': darkVars, ':root.theme-light': lightVars })
    }),
  ],
}
