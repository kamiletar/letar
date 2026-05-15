'use client'

import dynamic from 'next/dynamic'

// Динамическая загрузка ChatWidget (framer-motion + AI SDK) для уменьшения initial bundle
const ChatWidget = dynamic(() => import('@/app/_components/chat/chat-widget').then((m) => m.ChatWidget), {
  ssr: false,
})

/**
 * Lazy-loaded обёртка для ChatWidget.
 * Используется в Server Components (layout.tsx), так как ssr: false
 * требует Client Component в Next.js 16+.
 */
export function ChatWidgetLazy() {
  return <ChatWidget />
}
