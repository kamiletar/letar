/**
 * Layer styles для driving-school приложения
 *
 * Предустановленные стили для панелей, карточек и статусов
 */
export const layerStyles = {
  /* ===========================
     Панели для статусов
  =========================== */
  'panel.info': {
    value: {
      bg: 'info.subtle',
      borderWidth: '1px',
      borderColor: 'info.border',
      borderRadius: 'md',
      p: 4,
    },
  },
  'panel.success': {
    value: {
      bg: 'success.subtle',
      borderWidth: '1px',
      borderColor: 'success.border',
      borderRadius: 'md',
      p: 4,
    },
  },
  'panel.warning': {
    value: {
      bg: 'warning.subtle',
      borderWidth: '1px',
      borderColor: 'warning.border',
      borderRadius: 'md',
      p: 4,
    },
  },
  'panel.error': {
    value: {
      bg: 'error.subtle',
      borderWidth: '1px',
      borderColor: 'error.border',
      borderRadius: 'md',
      p: 4,
    },
  },

  /* ===========================
     Карточки
  =========================== */
  'card.default': {
    value: {
      bg: 'bg.surface',
      borderRadius: 'lg',
      borderWidth: '1px',
      borderColor: 'border',
    },
  },
  'card.elevated': {
    value: {
      bg: 'bg.surface',
      borderRadius: 'lg',
      shadow: 'md',
    },
  },
  'card.interactive': {
    value: {
      bg: 'bg.surface',
      borderRadius: 'lg',
      borderWidth: '1px',
      borderColor: 'border',
      transition: 'all 0.15s ease-out',
      cursor: 'pointer',
      _hover: {
        shadow: 'sm',
        borderColor: 'border.emphasized',
      },
      _active: {
        transform: 'scale(0.99)',
      },
    },
  },

  /* ===========================
     Статистика
  =========================== */
  'stat.positive': {
    value: {
      color: 'success.fg',
      bg: 'success.subtle',
      borderRadius: 'md',
      px: 2,
      py: 1,
    },
  },
  'stat.negative': {
    value: {
      color: 'error.fg',
      bg: 'error.subtle',
      borderRadius: 'md',
      px: 2,
      py: 1,
    },
  },
  'stat.neutral': {
    value: {
      color: 'fg.muted',
      bg: 'bg.subtle',
      borderRadius: 'md',
      px: 2,
      py: 1,
    },
  },

  /* ===========================
     Специальные эффекты
  =========================== */
  glass: {
    value: {
      bg: { _light: 'whiteAlpha.800', _dark: 'blackAlpha.600' },
      backdropFilter: 'blur(8px)',
      borderWidth: '1px',
      borderColor: { _light: 'whiteAlpha.300', _dark: 'whiteAlpha.100' },
    },
  },
  overlay: {
    value: {
      bg: 'blackAlpha.600',
      position: 'fixed',
      inset: 0,
    },
  },

  /* ===========================
     Формы и поля ввода
  =========================== */
  'input.filled': {
    value: {
      bg: 'bg.subtle',
      borderRadius: 'md',
      _focus: {
        bg: 'bg.surface',
        borderColor: 'brand.focusRing',
      },
    },
  },

  /* ===========================
     Секции и контейнеры
  =========================== */
  section: {
    value: {
      bg: 'bg.surface',
      borderRadius: 'xl',
      p: 6,
      shadow: 'sm',
    },
  },
  'section.muted': {
    value: {
      bg: 'bg.subtle',
      borderRadius: 'xl',
      p: 6,
    },
  },
}
