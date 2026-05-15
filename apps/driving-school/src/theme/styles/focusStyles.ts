/**
 * Кастомные focus styles для улучшения accessibility
 *
 * Определяет консистентные стили фокуса для интерактивных элементов
 * Использует :focus-visible для отображения только при keyboard navigation
 */
export const focusStyles = {
  /**
   * Стандартный focus ring для кнопок и ссылок
   */
  'focus.ring': {
    value: {
      outline: '2px solid',
      outlineColor: 'brand.500',
      outlineOffset: '2px',
    },
  },

  /**
   * Focus ring для карточек и больших элементов
   */
  'focus.ring.large': {
    value: {
      outline: '3px solid',
      outlineColor: 'brand.500',
      outlineOffset: '3px',
      borderRadius: 'lg',
    },
  },

  /**
   * Focus ring для инпутов
   */
  'focus.ring.input': {
    value: {
      outline: 'none',
      borderColor: 'brand.500',
      boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
    },
  },

  /**
   * Focus ring для элементов внутри группы (списки, меню)
   */
  'focus.ring.inset': {
    value: {
      outline: '2px solid',
      outlineColor: 'brand.500',
      outlineOffset: '-2px',
    },
  },

  /**
   * Subtle focus для мелких элементов
   */
  'focus.subtle': {
    value: {
      outline: 'none',
      bg: 'brand.subtle',
    },
  },
}

/**
 * Глобальные CSS стили для focus-visible
 *
 * Применяются ко всем интерактивным элементам
 */
export const focusGlobalCss = {
  // Кнопки
  'button:focus-visible, [role="button"]:focus-visible': {
    outline: '2px solid',
    outlineColor: 'brand.500',
    outlineOffset: '2px',
  },

  // Ссылки
  'a:focus-visible': {
    outline: '2px solid',
    outlineColor: 'brand.500',
    outlineOffset: '2px',
    borderRadius: 'sm',
  },

  // Инпуты, textarea, select
  'input:focus-visible, textarea:focus-visible, select:focus-visible': {
    outline: 'none',
    borderColor: 'brand.500',
    boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
  },

  // Checkbox и radio
  '[type="checkbox"]:focus-visible, [type="radio"]:focus-visible': {
    outline: '2px solid',
    outlineColor: 'brand.500',
    outlineOffset: '2px',
  },

  // Карточки с tabIndex
  '[tabindex]:focus-visible:not([tabindex="-1"])': {
    outline: '2px solid',
    outlineColor: 'brand.500',
    outlineOffset: '2px',
  },

  // Элементы списка с role="option"
  '[role="option"]:focus-visible': {
    outline: 'none',
    bg: 'brand.subtle',
  },

  // Элементы меню
  '[role="menuitem"]:focus-visible, [role="menuitemradio"]:focus-visible, [role="menuitemcheckbox"]:focus-visible': {
    outline: 'none',
    bg: 'brand.subtle',
  },

  // Skip links
  '.skip-link:focus-visible': {
    position: 'fixed',
    top: '4',
    left: '4',
    zIndex: 'skipLink',
    bg: 'brand.solid',
    color: 'brand.contrast',
    px: '4',
    py: '2',
    borderRadius: 'md',
    fontWeight: 'semibold',
    textDecoration: 'none',
  },
}
