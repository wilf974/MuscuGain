import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // enregistrement fait dans main.jsx (virtual:pwa-register) : aucun script inline
      includeAssets: ['apple-touch-icon.png', 'icon.svg', 'theme-init.js'],
      manifest: {
        id: '/',
        name: 'MuscuGain',
        short_name: 'MuscuGain',
        description: 'Suivi de musculation local-first : séances, records, scanner de machine et coach IA',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Raccourci (Android/desktop ; ignoré par iOS) : ouvre directement le scanner.
        shortcuts: [
          { name: 'Scanner une machine', short_name: 'Scanner', url: '/?action=scan', icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        // App shell + catalogue (exercices, vidéos = IDs dans le JS) précachés : l'app marche hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Ne JAMAIS cacher les appels IA (photos envoyées, réponses personnelles) : NetworkOnly.
        // Les miniatures/vidéos YouTube ne sont pas mises en cache non plus (aucune règle runtime).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
