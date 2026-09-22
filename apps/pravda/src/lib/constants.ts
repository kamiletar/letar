/**
 * Общие константы приложения.
 * Единый источник для всех layout значений и стилей.
 */

/** Высота header в пикселях */
export const HEADER_HEIGHT = '60px'

/**
 * Отступ для scroll-margin-top на section/chapter/article (для якорных ссылок и TOC).
 * `html { scroll-padding-top: 60px }` (globals.css) уже резервирует высоту шапки и СКЛАДЫВАЕТСЯ
 * с этим отступом при scrollIntoView/переходе по #hash (оба применяются одновременно, это
 * поведение спеки CSS Scroll Snap, не баг браузера) — итоговый отступ элемента от верха вьюпорта
 * равен 60 + это значение. Раньше здесь стояло 80px, что давало реальный отступ 140px вместо
 * задуманных 80 — TOC-компонент (`toc.tsx`, `ACTIVE_THRESHOLD`) ждёт ровно 80, поэтому подсветка
 * активного пункта после клика/скролла к якорю никогда не срабатывала. 20px даёт суммарные 80.
 */
export const SCROLL_MARGIN_TOP = '20px'

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
