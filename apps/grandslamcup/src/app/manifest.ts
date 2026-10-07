import type { MetadataRoute } from 'next'

/**
 * PWA Manifest — Кубок Большого Слэма
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Кубок Большого Слэма',
    short_name: 'КБС',
    description: 'Командный поэтический турнир в формате poetry-clash',
    start_url: '/',
    display: 'standalone',
    // Установленное приложение открывается без системных панелей; где fullscreen не
    // поддерживается — браузер берёт standalone.
    display_override: ['fullscreen', 'standalone'],
    // Быстрый вход в режим чтеца долгим нажатием на иконку приложения
    shortcuts: [
      {
        name: 'Режим чтеца',
        short_name: 'Чтец',
        description: 'Стихи для выступления, работает без интернета',
        url: '/reader',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    background_color: '#000000',
    theme_color: '#FF0000',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
