'use client'

/**
 * FriendCodeDisplay — Компонент отображения Friend Code
 *
 * Показывает Friend Code пользователя с возможностью копирования
 * и опциональным QR кодом для быстрого сканирования.
 */

import { Box, Button, Flex, HStack, IconButton, Text, VStack } from '@chakra-ui/react'

import { toaster } from '@/components/ui/toaster'
import { useCallback, useState } from 'react'
import { LuCheck, LuCopy, LuQrCode } from 'react-icons/lu'

export interface FriendCodeDisplayProps {
  /** Friend Code для отображения */
  friendCode: string | null
  /** Показывать ли QR код */
  showQR?: boolean
  /** Размер шрифта кода */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Компонент отображения Friend Code
 */
export function FriendCodeDisplay({ friendCode, showQR = false, size = 'md' }: FriendCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  const [qrVisible, setQrVisible] = useState(showQR)

  const fontSizes = {
    sm: 'lg',
    md: '2xl',
    lg: '4xl',
  }

  const handleCopy = useCallback(async () => {
    if (!friendCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(friendCode)
      setCopied(true)
      toaster.success({
        title: 'Friend Code скопирован',
        description: friendCode,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toaster.error({
        title: 'Не удалось скопировать',
        description: 'Попробуйте ещё раз',
      })
    }
  }, [friendCode])

  if (!friendCode) {
    return (
      <Box p={4} borderRadius="lg" bg="bg.subtle" textAlign="center">
        <Text color="fg.muted">Friend Code недоступен</Text>
        <Text fontSize="sm" color="fg.muted" mt={1}>
          Запустите P2P сеть в настройках
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={4} align="stretch">
      {/* Friend Code */}
      <Box p={4} borderRadius="lg" bg="bg.subtle" borderWidth="1px" borderColor="border.subtle">
        <Flex justify="space-between" align="center">
          <VStack align="start" gap={1}>
            <Text fontSize="xs" color="fg.muted" fontWeight="medium">
              Ваш Friend Code
            </Text>
            <Text fontSize={fontSizes[size]} fontWeight="bold" fontFamily="mono" letterSpacing="wider">
              {friendCode}
            </Text>
          </VStack>

          <HStack gap={2}>
            <IconButton
              aria-label="Показать QR код"
              variant={qrVisible ? 'solid' : 'ghost'}
              colorPalette={qrVisible ? 'blue' : undefined}
              size="sm"
              onClick={() => setQrVisible(!qrVisible)}
            >
              <LuQrCode />
            </IconButton>

            <Button variant="outline" size="sm" onClick={handleCopy} colorPalette={copied ? 'green' : undefined}>
              {copied ? <LuCheck /> : <LuCopy />}
              {copied ? 'Скопировано' : 'Копировать'}
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* QR Code Placeholder */}
      {qrVisible && (
        <Box p={6} borderRadius="lg" bg="white" borderWidth="1px" borderColor="border.subtle" textAlign="center">
          {/*
            QR код можно добавить позже с помощью библиотеки qrcode.react
            Пока показываем placeholder
          */}
          <Box
            w="200px"
            h="200px"
            mx="auto"
            bg="gray.100"
            borderRadius="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <VStack gap={2}>
              <LuQrCode size={48} />
              <Text fontSize="xs" color="fg.muted">
                QR Code
              </Text>
              <Text fontSize="lg" fontFamily="mono" fontWeight="bold">
                {friendCode}
              </Text>
            </VStack>
          </Box>
          <Text fontSize="sm" color="fg.muted" mt={3}>
            Покажите этот код другу для добавления
          </Text>
        </Box>
      )}
    </VStack>
  )
}
