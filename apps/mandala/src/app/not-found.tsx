import Link from 'next/link'

/**
 * Корневая страница 404.
 * Минимальный вариант для статической генерации.
 */
export default function RootNotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '8rem', fontWeight: 100, margin: 0, color: 'rgba(255,255,255,0.8)' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 400, color: 'rgba(255,255,255,0.7)', marginTop: '1rem' }}>
        Страница не найдена
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>Запрашиваемая страница не существует</p>
      <Link
        href="/"
        style={{
          marginTop: '2rem',
          padding: '0.75rem 2rem',
          backgroundColor: '#CA9E67',
          color: '#000',
          textDecoration: 'none',
          borderRadius: '0.5rem',
        }}
      >
        На главную
      </Link>
    </div>
  )
}
