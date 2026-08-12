'use client'

import { Box, Button, HStack, IconButton, Menu, Text, VStack } from '@chakra-ui/react'
import { useCopyToClipboard } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import { LuCheck, LuCopy, LuDownload, LuShare2 } from 'react-icons/lu'
import type { ViewerSettings } from '../_schemas/viewer-settings.schema'

interface ShareButtonProps {
  /** URL изображения мандалы */
  mandalaImageUrl: string
  /** Название мандалы */
  mandalaName: string
  /** Slug мандалы */
  mandalaSlug: string
  /** Текущие настройки просмотра */
  settings: ViewerSettings
  /** Размер кнопки */
  size?: 'sm' | 'md' | 'lg'
  /** Вариант для fullscreen */
  variant?: 'normal' | 'fullscreen'
}

/**
 * Кнопка "Поделиться" с меню опций.
 * Позволяет скопировать ссылку или скачать изображение.
 */
export function ShareButton({
  mandalaImageUrl,
  mandalaName,
  mandalaSlug,
  settings,
  size = 'md',
  variant = 'normal',
}: ShareButtonProps) {
  const t = useTranslations('viewer.aria')
  const { copied, copy } = useCopyToClipboard()

  // Генерация URL с настройками
  const generateShareUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (settings.effectIndex !== 0) {
      params.set('effect', String(settings.effectIndex))
    }
    if (settings.spinDuration !== 60) {
      params.set('speed', String(settings.spinDuration))
    }
    if (settings.nightMode) {
      params.set('night', '1')
    }
    if (settings.breathingEnabled) {
      params.set('breathe', '1')
    }

    const baseUrl = `${window.location.origin}/mandalas/${mandalaSlug}`
    const queryString = params.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }, [mandalaSlug, settings])

  // Копирование ссылки
  const handleCopyLink = useCallback(async () => {
    await copy(generateShareUrl())
  }, [generateShareUrl, copy])

  // Скачивание изображения
  const handleDownload = useCallback(
    async (resolution: '1920x1080' | '2560x1440' | 'original') => {
      try {
        // Загружаем изображение
        const response = await fetch(mandalaImageUrl)
        const blob = await response.blob()

        // Создаём ссылку для скачивания
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${mandalaName.replace(/\s+/g, '-').toLowerCase()}-${resolution}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Ошибка скачивания:', error)
      }
    },
    [mandalaImageUrl, mandalaName],
  )

  // Простой вариант для fullscreen
  if (variant === 'fullscreen') {
    return (
      <IconButton
        aria-label={t('share')}
        size={size}
        variant="solid"
        colorPalette="whiteAlpha"
        onClick={handleCopyLink}
      >
        {copied ? <LuCheck /> : <LuShare2 />}
      </IconButton>
    )
  }

  // Полный вариант с меню
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button size={size} variant="outline" colorPalette="gray">
          <LuShare2 />
          Поделиться
        </Button>
      </Menu.Trigger>

      <Menu.Positioner>
        <Menu.Content bg="gray.800" borderColor="gray.700">
          {/* Копировать ссылку */}
          <Menu.Item value="copy" onClick={handleCopyLink} cursor="pointer">
            <HStack gap={3}>
              {copied ? <LuCheck color="green" /> : <LuCopy />}
              <VStack align="start" gap={0}>
                <Text fontSize="sm">{copied ? 'Скопировано!' : 'Скопировать ссылку'}</Text>
                {!copied && (
                  <Text fontSize="xs" color="gray.400">
                    С текущими настройками
                  </Text>
                )}
              </VStack>
            </HStack>
          </Menu.Item>

          <Menu.Separator />

          {/* Скачать как обои */}
          <Box px={3} py={2}>
            <Text fontSize="xs" color="gray.500" mb={2}>
              Скачать как обои
            </Text>
          </Box>

          <Menu.Item value="download-1080" onClick={() => handleDownload('1920x1080')} cursor="pointer">
            <HStack gap={3}>
              <LuDownload />
              <Text fontSize="sm">Full HD (1920×1080)</Text>
            </HStack>
          </Menu.Item>

          <Menu.Item value="download-1440" onClick={() => handleDownload('2560x1440')} cursor="pointer">
            <HStack gap={3}>
              <LuDownload />
              <Text fontSize="sm">2K (2560×1440)</Text>
            </HStack>
          </Menu.Item>

          <Menu.Item value="download-original" onClick={() => handleDownload('original')} cursor="pointer">
            <HStack gap={3}>
              <LuDownload />
              <Text fontSize="sm">Оригинал</Text>
            </HStack>
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}
