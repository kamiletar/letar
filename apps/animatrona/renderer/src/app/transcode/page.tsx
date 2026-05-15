'use client'

/**
 * Страница очереди транскодирования
 *
 * Показывает очередь импорта сериалов через библиотеку.
 */

import { Box, Heading, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuHistory, LuTerminal } from 'react-icons/lu'

import { Header } from '@/components/layout'
import { ImportQueueView, LogViewerDrawer } from '@/components/transcode'
import { Tooltip } from '@/components/ui/tooltip'

/** Контент страницы без Header — для встраивания в табы */
export function TranscodeContent() {
  const [logViewerOpen, setLogViewerOpen] = useState(false)

  return (
    <Box p={6}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between">
          <VStack align="start" gap={0}>
            <Heading size="lg">Очередь кодирования</Heading>
            <Text color="fg.muted">Управление импортом сериалов</Text>
          </VStack>
          <HStack gap={1}>
            <Tooltip content="История импортов">
              <IconButton aria-label="История" variant="ghost" size="md" asChild>
                <a href="/transcode/history">
                  <LuHistory />
                </a>
              </IconButton>
            </Tooltip>
            <Tooltip content="Просмотр логов FFmpeg">
              <IconButton aria-label="Логи FFmpeg" variant="ghost" size="md" onClick={() => setLogViewerOpen(true)}>
                <LuTerminal />
              </IconButton>
            </Tooltip>
          </HStack>
        </HStack>

        {/* Очередь импорта */}
        <ImportQueueView />
      </VStack>

      {/* Drawer с логами */}
      <LogViewerDrawer open={logViewerOpen} onOpenChange={setLogViewerOpen} />
    </Box>
  )
}

export default function TranscodePage() {
  return (
    <Box minH="100vh" bg="bg">
      <Header title="Очередь кодирования" />
      <TranscodeContent />
    </Box>
  )
}
