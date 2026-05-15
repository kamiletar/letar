'use client'

/**
 * Клиентская кнопка для вызова window.print().
 * Вынесена в отдельный компонент, потому что родительская страница — Server Component,
 * а event handlers запрещены в server props.
 */

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      type="button"
      style={{
        padding: '10px 24px',
        fontSize: '16px',
        cursor: 'pointer',
        background: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
      }}
    >
      Печать / Скачать PDF
    </button>
  )
}
