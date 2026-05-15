'use client'

import { Box, Flex, HStack, Icon, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuMinus, LuSquare, LuX } from 'react-icons/lu'

/**
 * Иконка восстановления окна (два квадрата)
 */
function RestoreIcon() {
  return (
    <Box position="relative" w="10px" h="10px">
      <Box position="absolute" top="0" right="0" w="8px" h="8px" border="1px solid currentColor" borderRadius="1px" />
      <Box
        position="absolute"
        bottom="0"
        left="0"
        w="8px"
        h="8px"
        border="1px solid currentColor"
        borderRadius="1px"
        bg="bg.panel"
      />
    </Box>
  )
}

/**
 * Кнопка управления окном (Windows стиль)
 */
function WindowButton({
  onClick,
  label,
  isClose,
  children,
}: {
  onClick: () => void
  label: string
  isClose?: boolean
  children: React.ReactNode
}) {
  return (
    <Flex
      as="button"
      aria-label={label}
      align="center"
      justify="center"
      h="32px"
      w="46px"
      color="fg.muted"
      bg="transparent"
      _hover={{
        bg: isClose ? 'red.600' : 'state.hover',
        color: isClose ? 'white' : 'fg',
      }}
      _active={{
        bg: isClose ? 'red.700' : 'state.active',
      }}
      transition="all 0.1s"
      onClick={onClick}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {children}
    </Flex>
  )
}

/**
 * macOS кнопки (traffic lights)
 */
function MacControls({
  onClose,
  onMinimize,
  onMaximize,
}: {
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
}) {
  return (
    <HStack gap={2} px={3} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <Box
        as="button"
        aria-label="Закрыть"
        w="12px"
        h="12px"
        borderRadius="full"
        bg="red.500"
        _hover={{ bg: 'red.400' }}
        onClick={onClose}
      />
      <Box
        as="button"
        aria-label="Свернуть"
        w="12px"
        h="12px"
        borderRadius="full"
        bg="yellow.500"
        _hover={{ bg: 'yellow.400' }}
        onClick={onMinimize}
      />
      <Box
        as="button"
        aria-label="Развернуть"
        w="12px"
        h="12px"
        borderRadius="full"
        bg="green.500"
        _hover={{ bg: 'green.400' }}
        onClick={onMaximize}
      />
    </HStack>
  )
}

/**
 * Кастомный title bar в стиле VSCode
 *
 * - macOS: кнопки слева (traffic lights стиль)
 * - Windows/Linux: кнопки справа
 * - Высота: 32px
 * - Drag region для перетаскивания окна
 */
export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [platform, setPlatform] = useState<'win32' | 'darwin' | 'linux'>('win32')

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.window) {
      return
    }

    // Инициализация
    const init = async () => {
      const [plat, maximized] = await Promise.all([api.window.getPlatform(), api.window.isMaximized()])
      setPlatform(plat)
      setIsMaximized(maximized)
    }
    init()

    // Подписка на изменения maximize
    const unsubscribe = api.window.onMaximizeChanged(setIsMaximized)
    return unsubscribe
  }, [])

  const handleMinimize = () => window.electronAPI?.window?.minimize()
  const handleMaximize = () => window.electronAPI?.window?.maximize()
  const handleClose = () => window.electronAPI?.window?.close()

  const isMac = platform === 'darwin'

  return (
    <Flex
      as="header"
      h="32px"
      bg="bg.panel"
      borderBottom="1px"
      borderColor="border"
      align="center"
      justify="space-between"
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={1000}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Левая часть: кнопки macOS или название */}
      <HStack gap={2} px={isMac ? 0 : 3}>
        {isMac && <MacControls onClose={handleClose} onMinimize={handleMinimize} onMaximize={handleMaximize} />}
        <Text fontSize="xs" fontWeight="medium" color="fg.muted">
          Animatrona
        </Text>
      </HStack>

      {/* Правая часть: кнопки Windows/Linux */}
      {!isMac && (
        <HStack gap={0}>
          <WindowButton onClick={handleMinimize} label="Свернуть">
            <Icon as={LuMinus} boxSize={4} />
          </WindowButton>

          <WindowButton onClick={handleMaximize} label={isMaximized ? 'Восстановить' : 'Развернуть'}>
            {isMaximized ? <RestoreIcon /> : <Icon as={LuSquare} boxSize={3.5} />}
          </WindowButton>

          <WindowButton onClick={handleClose} label="Закрыть" isClose>
            <Icon as={LuX} boxSize={4} />
          </WindowButton>
        </HStack>
      )}
    </Flex>
  )
}
