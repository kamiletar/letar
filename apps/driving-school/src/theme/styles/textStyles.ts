/**
 * Text styles для driving-school приложения
 *
 * Консистентные стили типографики для заголовков, текста и меток
 */
export const textStyles = {
  /* ===========================
     Заголовки (Headings)
  =========================== */
  'heading.2xl': {
    value: {
      fontSize: { base: '2rem', md: '3rem' },
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '-0.02em',
    },
  },
  'heading.xl': {
    value: {
      fontSize: { base: '1.75rem', md: '2.25rem' },
      fontWeight: '700',
      lineHeight: '1.2',
      letterSpacing: '-0.01em',
    },
  },
  'heading.lg': {
    value: {
      fontSize: { base: '1.25rem', md: '1.5rem' },
      fontWeight: '600',
      lineHeight: '1.3',
    },
  },
  'heading.md': {
    value: {
      fontSize: { base: '1.125rem', md: '1.25rem' },
      fontWeight: '600',
      lineHeight: '1.4',
    },
  },
  'heading.sm': {
    value: {
      fontSize: '1rem',
      fontWeight: '600',
      lineHeight: '1.4',
    },
  },
  'heading.xs': {
    value: {
      fontSize: '0.875rem',
      fontWeight: '600',
      lineHeight: '1.4',
    },
  },

  /* ===========================
     Основной текст (Body)
  =========================== */
  'body.xl': {
    value: {
      fontSize: '1.25rem',
      fontWeight: '400',
      lineHeight: '1.6',
    },
  },
  'body.lg': {
    value: {
      fontSize: '1.125rem',
      fontWeight: '400',
      lineHeight: '1.6',
    },
  },
  'body.md': {
    value: {
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.6',
    },
  },
  'body.sm': {
    value: {
      fontSize: '0.875rem',
      fontWeight: '400',
      lineHeight: '1.5',
    },
  },
  'body.xs': {
    value: {
      fontSize: '0.75rem',
      fontWeight: '400',
      lineHeight: '1.5',
    },
  },

  /* ===========================
     Метки и подписи (Labels)
  =========================== */
  label: {
    value: {
      fontSize: '0.875rem',
      fontWeight: '500',
      lineHeight: '1.4',
    },
  },
  'label.sm': {
    value: {
      fontSize: '0.75rem',
      fontWeight: '500',
      lineHeight: '1.4',
    },
  },

  /* ===========================
     Подписи (Captions)
  =========================== */
  caption: {
    value: {
      fontSize: '0.75rem',
      fontWeight: '400',
      lineHeight: '1.4',
      color: 'fg.muted',
    },
  },

  /* ===========================
     Специальные стили
  =========================== */
  overline: {
    value: {
      fontSize: '0.75rem',
      fontWeight: '600',
      lineHeight: '1.4',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
  },
  quote: {
    value: {
      fontSize: '1.125rem',
      fontWeight: '400',
      lineHeight: '1.6',
      fontStyle: 'italic',
    },
  },
  code: {
    value: {
      fontFamily: 'mono',
      fontSize: '0.875rem',
      lineHeight: '1.5',
    },
  },

  /* ===========================
     Статистика и числа
  =========================== */
  'stat.value': {
    value: {
      fontSize: { base: '1.5rem', md: '2rem' },
      fontWeight: '700',
      lineHeight: '1.2',
    },
  },
  'stat.label': {
    value: {
      fontSize: '0.875rem',
      fontWeight: '500',
      lineHeight: '1.4',
      color: 'fg.muted',
    },
  },
  'stat.helpText': {
    value: {
      fontSize: '0.75rem',
      fontWeight: '400',
      lineHeight: '1.4',
      color: 'fg.muted',
    },
  },
}
