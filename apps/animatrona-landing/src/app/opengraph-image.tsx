import { ImageResponse } from 'next/og'

/**
 * Динамическая генерация Open Graph изображения
 * Отображается при шаринге ссылки в соцсетях
 */

export const runtime = 'edge'

export const alt = 'Animatrona — Умная библиотека аниме'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #0a0a0b 0%, #1a1a2e 50%, #16213e 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Декоративные круги */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 61, 255, 0.3) 0%, transparent 70%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 64, 129, 0.2) 0%, transparent 70%)',
        }}
      />

      {/* Логотип */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontSize: 80,
            filter: 'drop-shadow(0 0 30px rgba(139, 61, 255, 0.5))',
          }}
        >
          🎬
        </div>
        <span
          style={{
            fontSize: 72,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ffffff 0%, #8b3dff 100%)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Animatrona
        </span>
      </div>

      {/* Слоган */}
      <div
        style={{
          fontSize: 32,
          color: '#a0a0a0',
          textAlign: 'center',
          maxWidth: 800,
          lineHeight: 1.4,
        }}
      >
        Умная библиотека аниме с GPU-транскодированием
      </div>

      {/* Фичи */}
      <div
        style={{
          display: 'flex',
          gap: 40,
          marginTop: 50,
        }}
      >
        {['AV1 • HEVC', 'VMAF Auto', 'Shikimori', 'HDR 10-bit'].map((feature) => (
          <div
            key={feature}
            style={{
              padding: '12px 24px',
              borderRadius: 30,
              border: '1px solid rgba(139, 61, 255, 0.5)',
              background: 'rgba(139, 61, 255, 0.1)',
              color: '#c4a7ff',
              fontSize: 20,
            }}
          >
            {feature}
          </div>
        ))}
      </div>

      {/* URL */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          color: '#666',
          fontSize: 20,
        }}
      >
        animatrona.letar.best
      </div>
    </div>,
    {
      ...size,
    },
  )
}
