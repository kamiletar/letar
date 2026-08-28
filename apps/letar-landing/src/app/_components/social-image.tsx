/** Визуальная основа Open Graph и Twitter-карточек Letar */
export function SocialImage() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #070a10 0%, #111827 58%, #0d3436 100%)',
        color: '#f7f3e8',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between',
        overflow: 'hidden',
        padding: '64px 72px',
        position: 'relative',
        width: '100%',
      }}
    >
      <div
        style={{
          border: '2px solid rgba(79, 209, 197, 0.22)',
          borderRadius: 999,
          display: 'flex',
          height: 480,
          position: 'absolute',
          right: -120,
          top: -150,
          width: 480,
        }}
      />
      <div
        style={{
          background: 'rgba(79, 209, 197, 0.12)',
          borderRadius: 999,
          display: 'flex',
          height: 250,
          position: 'absolute',
          right: -15,
          top: -15,
          width: 250,
        }}
      />

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          fontFamily: 'monospace',
          fontSize: 22,
          justifyContent: 'space-between',
          letterSpacing: 2,
          textTransform: 'uppercase',
          width: '100%',
        }}
      >
        <span style={{ color: '#4fd1c5' }}>LETAR / PROJECTS</span>
        <span style={{ color: '#9ca3af' }}>SYSTEM ONLINE</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 940 }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Arial, sans-serif',
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: -8,
            lineHeight: 0.92,
          }}
        >
          LETAR
        </div>
        <div
          style={{
            color: '#d1d5db',
            display: 'flex',
            fontFamily: 'Arial, sans-serif',
            fontSize: 38,
            lineHeight: 1.25,
            marginTop: 28,
          }}
        >
          Проекты, которые живут и работают.
        </div>
      </div>

      <div
        style={{
          alignItems: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.18)',
          color: '#9ca3af',
          display: 'flex',
          fontFamily: 'monospace',
          fontSize: 20,
          justifyContent: 'space-between',
          letterSpacing: 1.4,
          paddingTop: 28,
          width: '100%',
        }}
      >
        <span>WEB · DESKTOP · OPEN SOURCE</span>
        <span style={{ color: '#f7f3e8' }}>letar.best</span>
      </div>
    </div>
  )
}
