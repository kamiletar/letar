'use client'
/* eslint-disable no-console */

/**
 * DropZone — оверлей для Drag & Drop импорта папок с аниме
 *
 * Показывает визуальный индикатор при перетаскивании папки.
 * При drop вызывает колбэк с путём к папке.
 */

import { Box, Icon, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuFolderOpen } from 'react-icons/lu'

interface DropZoneProps {
  /** Колбэк при drop папки */
  onFolderDrop: (folderPath: string) => void
  /** Дочерние элементы */
  children: React.ReactNode
}

/**
 * Компонент drop zone для Drag & Drop импорта
 */
export function DropZone({ onFolderDrop, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  /** Обработчик dragenter */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('[DropZone] dragenter')
    setIsDragging(true)
  }, [])

  /** Обработчик dragleave */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Проверяем что ушли за пределы контейнера
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false)
    }
  }, [])

  /** Обработчик dragover */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  /** Обработчик drop */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      // DEBUG: логируем что получили
      console.log('[DropZone] Drop event:', {
        filesCount: e.dataTransfer.files.length,
        types: e.dataTransfer.types,
        items: Array.from(e.dataTransfer.items).map((item) => ({
          kind: item.kind,
          type: item.type,
        })),
      })

      const files = e.dataTransfer.files
      if (files.length === 0) {
        console.warn('[DropZone] No files in dataTransfer')
        return
      }

      // В Electron с contextIsolation: true свойство file.path недоступно,
      // используем webUtils.getPathForFile() через preload API
      const file = files[0]
      const filePath = window.electronAPI?.fs.getPathForFile(file)

      console.log('[DropZone] File info:', {
        name: file.name,
        size: file.size,
        type: file.type,
        path: filePath,
      })

      if (!filePath) {
        console.warn('[DropZone] No path in dropped file (not Electron?)')
        return
      }

      // Проверяем что это папка (в Electron нет прямого способа, но можем проверить через API)
      // Передаём путь родителю — он решит что делать
      console.log('[DropZone] Calling onFolderDrop with:', filePath)
      onFolderDrop(filePath)
    },
    [onFolderDrop]
  )

  return (
    <Box
      position="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Overlay при перетаскивании */}
      {isDragging && (
        <Box
          position="fixed"
          inset={0}
          zIndex={1000}
          bg="blackAlpha.700"
          display="flex"
          alignItems="center"
          justifyContent="center"
          pointerEvents="none"
        >
          <VStack gap={4} p={12} borderRadius="2xl" border="3px dashed" borderColor="purple.400" bg="bg.panel">
            <Icon as={LuFolderOpen} boxSize={16} color="purple.400" />
            <Text fontSize="2xl" fontWeight="bold" color="fg">
              Отпустите для импорта
            </Text>
            <Text color="fg.muted">Папка будет открыта в визарде импорта</Text>
          </VStack>
        </Box>
      )}
    </Box>
  )
}
