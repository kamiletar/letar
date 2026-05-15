import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Elfafeya Art - Мандалы и точечная роспись',
    short_name: 'Elfafeya',
    description: 'Галерея мандал и работ художницы Эльфафеи',
    start_url: '/',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#CA9E67',
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
    screenshots: [
      {
        src: '/screenshots/desktop-home.png',
        sizes: '2560x1440',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Главная страница',
      },
      {
        src: '/screenshots/desktop-gallery.png',
        sizes: '2560x1440',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Галерея мандал',
      },
      {
        src: '/screenshots/desktop-mandala.png',
        sizes: '2560x1440',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Просмотр мандалы',
      },
      {
        src: '/screenshots/mobile-home.png',
        sizes: '824x1830',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Главная (мобильная)',
      },
      {
        src: '/screenshots/mobile-gallery.png',
        sizes: '824x1830',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Галерея (мобильная)',
      },
      {
        src: '/screenshots/mobile-mandala.png',
        sizes: '824x1830',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Мандала (мобильная)',
      },
    ],
  }
}
