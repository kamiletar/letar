import type { ComponentPropsWithoutRef, JSX } from 'react'

/**
 * Иконка Яндекс для кнопки OAuth
 */
export function YandexIcon(props: ComponentPropsWithoutRef<'svg'>): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#FC3F1D" {...props}>
      <circle cx="12" cy="12" r="12" />
      <path
        fill="white"
        transform="translate(0.425 0)"
        d="M13.85 19.1h2.5V4.9h-3.64c-3.66 0-5.58 1.88-5.58 4.65 0 2.21 1.05 3.52 2.94 4.87L6.8 19.1h2.71l3.65-5.58-1.27-.85c-1.54-1.03-2.29-1.84-2.29-3.28 0-1.6 1.09-2.59 3.12-2.59h1.13v12.3z"
      />
    </svg>
  )
}
