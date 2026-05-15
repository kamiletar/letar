'use client'

/**
 * Диалог с QR-кодом для подключения Animatrona Mobile
 *
 * Формат URI: animatrona://<host>?key=<apiKey>&type=tracker
 * Совместим с Desktop QR (type=desktop)
 */

import { Box, Button, Clipboard, CloseButton, Code, Dialog, HStack, Portal, Text, VStack } from '@chakra-ui/react'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo } from 'react'
import { LuCopy, LuSmartphone } from 'react-icons/lu'

interface MobileQRDialogProps {
  /** Диалог открыт */
  open: boolean
  /** Закрыть диалог */
  onClose: () => void
  /** Оригинальный API ключ (at_xxx) */
  apiKey: string
  /** Название ключа (для отображения) */
  keyName: string
}

/** Диалог с QR-кодом для подключения мобильного приложения */
export function MobileQRDialog({ open, onClose, apiKey, keyName }: MobileQRDialogProps) {
  const connectionUri = useMemo(() => {
    const host = typeof window !== 'undefined' ? window.location.host : 'animatrona-tracker.letar.best'
    return `animatrona://${host}?key=${encodeURIComponent(apiKey)}&type=tracker`
  }, [apiKey])

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) {
          onClose()
        }
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="sm">
            <Dialog.Header>
              <Dialog.Title>
                <HStack gap={2}>
                  <LuSmartphone />
                  Подключить мобильное
                </HStack>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4}>
                <Text fontSize="sm" color="fg.muted" textAlign="center">
                  Отсканируйте QR-код в Animatrona Mobile для автоматического подключения к трекеру.
                </Text>

                {/* QR-код */}
                <Box bg="white" p={4} borderRadius="lg" display="inline-flex">
                  <QRCodeSVG value={connectionUri} size={220} level="M" />
                </Box>

                {/* Название ключа */}
                <Text fontSize="xs" color="fg.muted">
                  Ключ: <strong>{keyName}</strong>
                </Text>

                {/* URI для копирования */}
                <Clipboard.Root value={connectionUri}>
                  <HStack gap={2} w="100%">
                    <Code fontSize="xs" p={2} flex={1} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                      {connectionUri}
                    </Code>
                    <Clipboard.Trigger asChild>
                      <Button size="xs" variant="outline">
                        <LuCopy />
                      </Button>
                    </Clipboard.Trigger>
                  </HStack>
                </Clipboard.Root>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                Закрыть
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
