import type { ReactNode } from 'react'

/** Layout для demo iframe — без Fumadocs, чистый HTML */
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: '16px 16px 32px', fontFamily: 'system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}
