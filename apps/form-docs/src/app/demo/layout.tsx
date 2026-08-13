import type { ReactNode } from 'react'

/**
 * Layout для demo iframe — без Fumadocs-хрома (нав, сайдбар).
 * Не объявляет собственные `<html>`/`<body>` — этот сегмент вложен в корневой `app/layout.tsx`
 * (сиблинг `[lang]/`, не отдельная route group), поэтому второй `<html>` создавал невалидную
 * вложенность тегов и hydration mismatch на каждой загрузке (2026-08-13).
 */
export default function DemoLayout({ children }: { children: ReactNode }) {
  return <div style={{ padding: '16px 16px 32px', fontFamily: 'system-ui, sans-serif' }}>{children}</div>
}
