import type { ComponentPropsWithoutRef, JSX } from 'react'

/**
 * Иконка Яндекс для кнопки OAuth
 */
export function YandexIcon(props: ComponentPropsWithoutRef<'svg'>): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#FC3F1D" {...props}>
      <path d="M2.04 12c0-5.523 4.476-10 10-10 5.522 0 10 4.477 10 10s-4.478 10-10 10c-5.524 0-10-4.477-10-10zm6.702 6.037h2.036V5.963h-1.49c-2.735 0-4.165 1.483-4.165 3.614 0 1.735.689 2.82 2.11 3.855l-2.437 4.605h2.208l2.69-5.103-1.03-.719c-1.127-.79-1.62-1.42-1.62-2.757 0-1.186.773-1.959 2.124-1.959h.564v8.538h.01z" />
    </svg>
  )
}
