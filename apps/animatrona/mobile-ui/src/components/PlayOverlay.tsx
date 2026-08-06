/**
 * PlayOverlay — Overlay для первого запуска воспроизведения
 *
 * Решает проблему user gesture на мобильных браузерах:
 * video.play() и enterFullscreen() требуют user gesture.
 * При первом входе показываем кнопку Play, тап на которую
 * запускает всё в одном gesture.
 */

import { Box, IconButton, Spinner, Text, VStack } from '@chakra-ui/react'
import { LuPlay } from 'react-icons/lu'

interface PlayOverlayProps {
  /** Показывать overlay */
  visible: boolean
  /** Название эпизода */
  episodeName: string
  /** Название аниме */
  animeName?: string
  /** Видео загружается */
  isLoading?: boolean
  /** Callback при нажатии Play */
  onPlay: () => void
}

export function PlayOverlay({ visible, episodeName, animeName, isLoading, onPlay }: PlayOverlayProps) {
  if (!visible) {
    return null
  }

  return (
    <Box
      position="absolute"
      inset={0}
      bg="black"
      zIndex={200}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={(e) => e.stopPropagation()}
    >
      <VStack gap={6} textAlign="center" px={4}>
        {animeName && (
          <Text color="gray.400" fontSize="sm">
            {animeName}
          </Text>
        )}
        <Text color="white" fontSize="xl" fontWeight="semibold">
          {episodeName}
        </Text>
        {isLoading ? <Spinner size="xl" color="purple.500" /> : (
          <IconButton
            aria-label="Воспроизвести"
            size="2xl"
            borderRadius="full"
            bg="purple.600"
            color="white"
            minW="80px"
            minH="80px"
            onClick={(e) => {
              e.stopPropagation()
              onPlay()
            }}
            _hover={{ bg: 'purple.500' }}
            _active={{ transform: 'scale(0.95)', bg: 'purple.700' }}
          >
            <LuPlay size={48} />
          </IconButton>
        )}
        <Text color="gray.500" fontSize="sm">
          {isLoading ? 'Загрузка...' : 'Нажмите для воспроизведения'}
        </Text>
      </VStack>
    </Box>
  )
}
