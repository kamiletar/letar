import type { CSSProperties } from 'react'

/** Общие параметры размера/типографики мини-кнопки — своё сочетание на каждый вызов */
export interface ButtonStyleOptions {
  padding: string
  fontSize?: string
  letterSpacing?: string
  lineHeight?: number
  whiteSpace?: CSSProperties['whiteSpace']
  monospace?: boolean
}

/** Залитая toggle-кнопка (алгоритмы FM, типы волны/фильтра, пэды драм-машины) */
export function filledToggleStyle(active: boolean, options: ButtonStyleOptions): CSSProperties {
  return {
    padding: options.padding,
    fontSize: options.fontSize ?? '10px',
    borderRadius: '4px',
    border: `1px solid ${active ? '#D4AF37' : '#2A2018'}`,
    background: active ? '#3A2E08' : '#160E0A',
    color: active ? '#EEC835' : '#706860',
    cursor: 'pointer',
    ...(options.letterSpacing !== undefined && { letterSpacing: options.letterSpacing }),
    ...(options.lineHeight !== undefined && { lineHeight: options.lineHeight }),
    ...(options.whiteSpace !== undefined && { whiteSpace: options.whiteSpace }),
  }
}

export type OutlineButtonState = 'default' | 'active' | 'disabled' | 'recording'

/** Прозрачная outline-кнопка (MIDI-статус, библиотека патчей, запись железа) */
export function outlineButtonStyle(state: OutlineButtonState, options: ButtonStyleOptions): CSSProperties {
  const base: CSSProperties = {
    padding: options.padding,
    fontSize: options.fontSize ?? '10px',
    borderRadius: '3px',
    cursor: state === 'disabled' ? 'not-allowed' : 'pointer',
    ...(options.lineHeight !== undefined && { lineHeight: options.lineHeight }),
    ...(options.monospace && { fontFamily: 'monospace' }),
  }

  if (state === 'recording') {
    return { ...base, background: '#3A0808', border: '1px solid #e05555', color: '#ff8080' }
  }
  if (state === 'disabled') {
    return { ...base, background: 'transparent', border: '1px solid #2a1f10', color: '#3a2a18' }
  }
  if (state === 'active') {
    return { ...base, background: 'transparent', border: '1px solid #D4AF37', color: '#EEC835' }
  }
  return { ...base, background: 'transparent', border: '1px solid #5a3a10', color: '#D4AF37' }
}
