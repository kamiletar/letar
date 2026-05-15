import { Cousine, Source_Sans_3 } from 'next/font/google'

// Шрифт для бренда РОССТИЛЬ (похож на Myriad Pro)
export const sourceSans3 = Source_Sans_3({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-source-sans',
})

// Шрифт для "Сделано в России" (моноширинный с кириллицей)
export const cousine = Cousine({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-cousine',
})
