import localFont from 'next/font/local'

// Шрифт для бренда РОССТИЛЬ (похож на Myriad Pro)
export const sourceSans3 = localFont({
  src: './fonts/SourceSans3-cyrillic-latin.woff2',
  weight: '400 700',
  display: 'swap',
  variable: '--font-source-sans',
})

// Шрифт для "Сделано в России" (моноширинный с кириллицей)
export const cousine = localFont({
  src: [
    { path: './fonts/Cousine-Regular-cyrillic-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Cousine-Bold-cyrillic-latin.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-cousine',
})
