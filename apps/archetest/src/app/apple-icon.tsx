import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/**
 * Apple Touch Icon — генерируется из JSX.
 * Символ Ψ (пси) на фиолетовом фоне.
 */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
        borderRadius: 38,
        fontSize: 120,
        color: 'white',
        fontWeight: 300,
      }}
    >
      Ψ
    </div>,
    { ...size },
  )
}
