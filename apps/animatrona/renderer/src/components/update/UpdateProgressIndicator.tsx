/**
 * Глобальный индикатор прогресса загрузки обновления
 *
 * Отображается как тонкая полоска в верхней части окна (как в VSCode)
 * Видна только во время загрузки обновления
 */

'use client'

import { Portal, Progress } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUpdateStore } from './update-store'

/**
 * Глобальный индикатор прогресса загрузки
 *
 * @example
 * ```tsx
 * // В layout.tsx
 * <UpdateProgressIndicator />
 * ```
 */
export function UpdateProgressIndicator() {
  const status = useUpdateStore((state) => state.status)

  const isDownloading = status.status === 'downloading'
  const progress = status.downloadProgress

  return (
    <Portal>
      <AnimatePresence>
        {isDownloading && (
          <motion.div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 9999, // tooltip z-index
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Progress.Root
              value={progress}
              size="xs"
              colorPalette="purple"
              css={{
                height: '3px',
                backgroundColor: 'transparent',
              }}
            >
              <Progress.Track bg="transparent">
                <Progress.Range
                  css={{
                    transition: 'width 0.3s ease-out',
                  }}
                />
              </Progress.Track>
            </Progress.Root>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  )
}
