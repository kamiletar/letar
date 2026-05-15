'use client'

/**
 * Route-level error boundary для страницы протокола матча.
 * Ловит SSR/render ошибки, печатает stack в консоль и показывает fallback.
 */

import { useEffect } from 'react'

interface ProtocolErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ProtocolError({ error, reset }: ProtocolErrorProps) {
  useEffect(() => {
    console.error('[Protocol Error]', error)
  }, [error])

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '40px auto',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
        color: '#000',
      }}
    >
      <h1 style={{ fontSize: '22px', marginBottom: '12px' }}>Ошибка загрузки протокола</h1>
      <p style={{ color: '#555', marginBottom: '12px' }}>{error.message}</p>
      {error.digest && <p style={{ color: '#888', fontSize: '13px', marginBottom: '12px' }}>Код: {error.digest}</p>}
      {process.env.NODE_ENV === 'development' && error.stack && (
        <pre
          style={{
            background: '#f5f5f5',
            padding: '12px',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            overflowX: 'auto',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          {error.stack}
        </pre>
      )}
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: '16px',
          padding: '10px 20px',
          fontSize: '14px',
          cursor: 'pointer',
          background: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
        }}
      >
        Повторить
      </button>
    </div>
  )
}
