import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * OG/Twitter-превью для шеринга. Next подставляет его на все страницы,
 * у которых нет собственного opengraph-image/openGraph.images — этот файл
 * закрывает дыру от несуществовавшего статического /og-image.png.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0A',
          backgroundImage:
            'linear-gradient(rgba(57, 255, 20, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(57, 255, 20, 0.08) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#39FF14',
            textShadow: '0 0 40px rgba(57, 255, 20, 0.6)',
          }}
        >
          KamiKeyThe
        </div>
        <div style={{ fontSize: 36, color: '#D1D5DB', marginTop: 16 }}>
          Типографские символы одной клавишей
        </div>
      </div>
    ),
    { ...size },
  )
}
