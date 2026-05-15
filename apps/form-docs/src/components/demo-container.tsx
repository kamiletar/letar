'use client'

/** Iframe-обёртка для live-демо — полная изоляция CSS от Fumadocs */
export function DemoContainer({ demo, height = 400 }: { demo: string; height?: number }) {
  return (
    <div style={{ margin: '24px 0' }}>
      <iframe
        src={`/demo/${demo}`}
        style={{
          width: '100%',
          height: `${height}px`,
          border: '1px solid var(--color-fd-border, #e2e8f0)',
          borderRadius: '8px',
          background: 'white',
        }}
        title={`${demo} demo`}
      />
    </div>
  )
}
