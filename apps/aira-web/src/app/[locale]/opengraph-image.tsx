import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Aira — Post-Quantum P2P Messenger'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * Динамически генерируемое OpenGraph изображение 1200×630
 * для социальных сетей (Twitter, Facebook, LinkedIn).
 *
 * Следует брендингу Aira: тёмный фон, teal→purple градиент,
 * щит как лого (отсылка к иконке GUI).
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0F172A 0%, #115E59 50%, #4C1D95 100%)',
        fontFamily: 'sans-serif',
        position: 'relative',
        padding: '80px',
      }}
    >
      {/* Декоративные круги */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.3) 0%, transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
        }}
      />

      {/* Иконка щита */}
      <div
        style={{
          width: '140px',
          height: '140px',
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '100px',
          color: '#5EEAD4',
        }}
      >
        🛡️
      </div>

      {/* Название */}
      <div
        style={{
          fontSize: '140px',
          fontWeight: 900,
          color: 'white',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          marginBottom: '24px',
        }}
      >
        aira
      </div>

      {/* Подзаголовок */}
      <div
        style={{
          fontSize: '36px',
          color: '#5EEAD4',
          fontWeight: 600,
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        Post-Quantum P2P Messenger
      </div>

      {/* Описание */}
      <div
        style={{
          fontSize: '24px',
          color: '#94A3B8',
          textAlign: 'center',
          maxWidth: '900px',
        }}
      >
        Speak freely. Protect the future.
      </div>

      {/* Теги внизу */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '48px',
        }}
      >
        {['ML-KEM-768', 'ML-DSA-65', 'P2P', 'Rust'].map((tag) => (
          <div
            key={tag}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'rgba(20, 184, 166, 0.15)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              color: '#5EEAD4',
              fontSize: '22px',
              fontFamily: 'monospace',
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  )
}
