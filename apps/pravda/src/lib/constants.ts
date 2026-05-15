/**
 * Общие константы приложения.
 * Единый источник для всех layout значений и стилей.
 */

/** Высота header в пикселях */
export const HEADER_HEIGHT = '60px'

/** Отступ для scroll-margin-top (для якорных ссылок) */
export const SCROLL_MARGIN_TOP = '80px'

/**
 * Стили для кастомного scrollbar.
 * Применяется к sidebar и toc.
 */
export const scrollbarStyles = {
  '&::-webkit-scrollbar': { width: '4px' },
  '&::-webkit-scrollbar-thumb': {
    background: 'var(--chakra-colors-gray-300)',
    borderRadius: '2px',
  },
}
