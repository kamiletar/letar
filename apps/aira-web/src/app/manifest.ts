import type { MetadataRoute } from 'next'

/**
 * Web App Manifest для PWA
 * @see https://nextjs.org/docs/app/guides/progressive-web-apps
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aira — Post-Quantum P2P Messenger',
    short_name: 'Aira',
    description:
      'Decentralized messenger with hybrid post-quantum cryptography. No servers, no phone numbers, no compromises.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#14B8A6',
    orientation: 'portrait-primary',
    categories: ['communication', 'security', 'productivity'],
    lang: 'en',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
