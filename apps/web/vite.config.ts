import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // App instalável (PWA): manifesto, ícones (public/icone-*, gerados do escudo) e service worker que guarda o
    // site para abrir rápido. Os dados do jogo vêm sempre do Supabase (outra origem, nunca guardada).
    VitePWA({
      // Versão nova publicada: o site mostra o aviso "Atualizar" (AvisoAtualizacao) em vez de recarregar sozinho.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['escudo.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Terra de Ninguém',
        short_name: 'Terra de Ninguém',
        description: 'Estratégia medieval entre amigos: evolua sua cidade e dispute o mapa.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1c1410',
        theme_color: '#1c1410',
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icone-mascaravel-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // O código e os ícones ficam guardados; a arte (WebP) só quando aparece, para não baixar tudo de uma vez.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'arte', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 } },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fontes', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
