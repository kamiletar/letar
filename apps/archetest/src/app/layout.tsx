import type { ReactNode } from 'react'

// Корневой layout — минимальный, без провайдеров
// Вся логика в [locale]/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
