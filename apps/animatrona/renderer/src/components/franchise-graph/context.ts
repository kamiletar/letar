/**
 * Контекст для передачи обработчика клика в узлы графа франшизы.
 * Используется как альтернатива React Flow onNodeClick,
 * который может не срабатывать из-за HoverCard.Trigger asChild.
 */

import { createContext } from 'react'

export const FranchiseClickContext = createContext<{
  onNodeClick?: (shikimoriId: number) => void
}>({})
