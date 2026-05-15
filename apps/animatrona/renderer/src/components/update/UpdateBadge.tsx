/**
 * Badge-индикатор доступного обновления
 *
 * Отображается в Header как фиолетовая точка с анимацией пульсации
 * При клике открывает UpdateDrawer с деталями обновления
 */

'use client'

import { Badge, IconButton } from '@chakra-ui/react'
import { LuDownload } from 'react-icons/lu'
import { useUpdateStore } from './update-store'

/**
 * Badge-индикатор обновления для Header
 *
 * @example
 * ```tsx
 * // В Header.tsx
 * <UpdateBadge />
 * ```
 */
export function UpdateBadge() {
  const status = useUpdateStore((state) => state.status)
  const setDrawerOpen = useUpdateStore((state) => state.setDrawerOpen)
  const skippedVersions = useUpdateStore((state) => state.skippedVersions)

  // Показываем badge только если:
  // 1. Обновление доступно, загружается или загружено
  // 2. Версия не в списке пропущенных
  const shouldShow =
    (status.status === 'available' || status.status === 'downloading' || status.status === 'downloaded') &&
    status.updateInfo &&
    !skippedVersions.includes(status.updateInfo.version)

  if (!shouldShow) {
    return null
  }

  const isDownloaded = status.status === 'downloaded'
  const isDownloading = status.status === 'downloading'

  // Цвет badge: зелёный если загружено, синий если загружается, фиолетовый если доступно
  const badgeColor = isDownloaded ? 'green.solid' : isDownloading ? 'blue.solid' : 'purple.solid'

  return (
    <IconButton
      aria-label="Проверить обновление"
      size="sm"
      variant="ghost"
      colorPalette="purple"
      position="relative"
      onClick={() => setDrawerOpen(true)}
    >
      <LuDownload />

      {/* Pulse animation badge */}
      <Badge
        position="absolute"
        top="-1"
        right="-1"
        w="2.5"
        h="2.5"
        bg={badgeColor}
        borderRadius="full"
        borderWidth="2px"
        borderColor="bg"
        css={{
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1,
            },
            '50%': {
              opacity: 0.5,
            },
          },
        }}
      />
    </IconButton>
  )
}
