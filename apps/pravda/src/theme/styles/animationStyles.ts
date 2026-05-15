/**
 * Animation styles для Pravda приложения
 *
 * Предустановленные анимации для интерактивных элементов:
 * - Модальные окна (Dialog, Drawer)
 * - Выпадающие меню (Menu, Popover)
 * - Элементы списков и карточки
 */
export const animationStyles = {
  /* ===========================
     Fade анимации
  =========================== */
  'fade-in': {
    value: {
      animationName: 'fade-in',
      animationDuration: '0.2s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
    },
  },
  'fade-out': {
    value: {
      animationName: 'fade-out',
      animationDuration: '0.2s',
      animationTimingFunction: 'ease-in',
      animationFillMode: 'forwards',
    },
  },

  /* ===========================
     Slide анимации
  =========================== */
  'slide-in-right': {
    value: {
      animationName: 'slide-from-right',
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
    },
  },
  'slide-in-left': {
    value: {
      animationName: 'slide-from-left',
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
    },
  },
  'slide-in-top': {
    value: {
      animationName: 'slide-from-top',
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
    },
  },
  'slide-in-bottom': {
    value: {
      animationName: 'slide-from-bottom',
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
    },
  },

  /* ===========================
     Scale анимации
  =========================== */
  'scale-in': {
    value: {
      animationName: 'scale-in',
      animationDuration: '0.2s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
    },
  },
  'scale-out': {
    value: {
      animationName: 'scale-out',
      animationDuration: '0.2s',
      animationTimingFunction: 'ease-in',
      animationFillMode: 'forwards',
    },
  },

  /* ===========================
     Специальные анимации
  =========================== */
  pulse: {
    value: {
      animationName: 'pulse',
      animationDuration: '2s',
      animationTimingFunction: 'ease-in-out',
      animationIterationCount: 'infinite',
    },
  },
  spin: {
    value: {
      animationName: 'spin',
      animationDuration: '1s',
      animationTimingFunction: 'linear',
      animationIterationCount: 'infinite',
    },
  },

  /* ===========================
     Комбинированные анимации
  =========================== */
  'slide-fade-in': {
    value: {
      animationName: 'slide-from-bottom, fade-in',
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
    },
  },
  'scale-fade-in': {
    value: {
      animationName: 'scale-in, fade-in',
      animationDuration: '0.2s',
      animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
    },
  },
}
