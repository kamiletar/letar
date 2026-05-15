'use client'

/**
 * KeyboardShortcutsOverlay — оверлей с горячими клавишами плеера
 *
 * Появляется по нажатию `?`, закрывается по `Escape`, `?` или клику на фон.
 * Дизайн как у YouTube — полупрозрачный overlay поверх плеера.
 */

import { Box, Flex, Grid, Heading, Kbd, Text, VStack } from '@chakra-ui/react'

interface ShortcutItem {
  keys: string[]
  description: string
}

const SHORTCUT_GROUPS: { title: string; items: ShortcutItem[] }[] = [
  {
    title: 'Воспроизведение',
    items: [
      { keys: ['Space', 'K'], description: 'Пауза / Воспроизведение' },
      { keys: ['←'], description: 'Назад на 10 секунд' },
      { keys: ['→'], description: 'Вперёд на 10 секунд' },
      { keys: ['['], description: 'Уменьшить скорость' },
      { keys: [']'], description: 'Увеличить скорость' },
    ],
  },
  {
    title: 'Звук и видео',
    items: [
      { keys: ['↑'], description: 'Громкость +10%' },
      { keys: ['↓'], description: 'Громкость −10%' },
      { keys: ['M'], description: 'Выкл/вкл звук' },
      { keys: ['F'], description: 'Полноэкранный режим' },
    ],
  },
  {
    title: 'Прочее',
    items: [
      { keys: ['I'], description: 'Информация о видео' },
      { keys: ['T'], description: 'Режим озвучки / субтитры' },
      { keys: ['?'], description: 'Горячие клавиши' },
    ],
  },
]

interface KeyboardShortcutsOverlayProps {
  /** Закрыть оверлей */
  onClose: () => void
}

export function KeyboardShortcutsOverlay({ onClose }: KeyboardShortcutsOverlayProps) {
  return (
    <Flex
      position="absolute"
      inset={0}
      zIndex={50}
      align="center"
      justify="center"
      bg="blackAlpha.800"
      onClick={onClose}
    >
      <Box
        bg="gray.900"
        borderRadius="xl"
        p={6}
        maxW="500px"
        w="90%"
        maxH="80%"
        overflowY="auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Heading size="md" color="white" mb={4}>
          Горячие клавиши
        </Heading>

        <VStack gap={5} align="stretch">
          {SHORTCUT_GROUPS.map((group) => (
            <Box key={group.title}>
              <Text color="gray.400" fontSize="xs" fontWeight="semibold" textTransform="uppercase" mb={2}>
                {group.title}
              </Text>

              <Grid templateColumns="auto 1fr" gap={2} alignItems="center">
                {group.items.map((item) => (
                  <Flex key={item.description} display="contents">
                    <Flex gap={1} justify="flex-end">
                      {item.keys.map((key) => (
                        <Kbd
                          key={key}
                          bg="gray.700"
                          color="white"
                          borderColor="gray.600"
                          fontSize="xs"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                        >
                          {key}
                        </Kbd>
                      ))}
                    </Flex>
                    <Text color="gray.300" fontSize="sm" pl={3}>
                      {item.description}
                    </Text>
                  </Flex>
                ))}
              </Grid>
            </Box>
          ))}
        </VStack>

        <Text color="gray.500" fontSize="xs" mt={4} textAlign="center">
          Нажмите ? или Escape чтобы закрыть
        </Text>
      </Box>
    </Flex>
  )
}
