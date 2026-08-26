import { Box, Card, Heading, HStack, Kbd, Table, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Горячие клавиши',
  description: 'Список горячих клавиш Animatrona для управления воспроизведением и навигации',
}

interface Shortcut {
  keys: string[]
  description: string
}

const PLAYBACK_SHORTCUTS: Shortcut[] = [
  { keys: ['Space'], description: 'Пауза / Воспроизведение' },
  { keys: ['F'], description: 'Полноэкранный режим' },
  { keys: ['Esc'], description: 'Выход из полноэкранного режима' },
  { keys: ['←'], description: 'Перемотка на 5 секунд назад' },
  { keys: ['→'], description: 'Перемотка на 5 секунд вперёд' },
  { keys: ['Shift', '←'], description: 'Перемотка на 30 секунд назад' },
  { keys: ['Shift', '→'], description: 'Перемотка на 30 секунд вперёд' },
  { keys: ['↑'], description: 'Увеличить громкость' },
  { keys: ['↓'], description: 'Уменьшить громкость' },
  { keys: ['M'], description: 'Выключить/включить звук' },
]

const NAVIGATION_SHORTCUTS: Shortcut[] = [
  { keys: ['S'], description: 'Следующий эпизод' },
  { keys: ['A'], description: 'Предыдущий эпизод' },
  { keys: ['Ctrl', 'K'], description: 'Быстрый поиск' },
  { keys: ['Ctrl', 'H'], description: 'Переход на главную' },
  { keys: ['Ctrl', 'L'], description: 'Открыть библиотеку' },
]

const ENCODING_SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', 'E'], description: 'Начать кодирование' },
  { keys: ['Ctrl', 'Shift', 'E'], description: 'Остановить кодирование' },
  { keys: ['Ctrl', 'Q'], description: 'Открыть очередь кодирования' },
]

function ShortcutTable({ shortcuts }: { shortcuts: Shortcut[] }) {
  return (
    <Table.Root variant="outline" borderRadius="lg" overflow="hidden">
      <Table.Header>
        <Table.Row bg="gray.900">
          <Table.ColumnHeader color="gray.300" w="200px">
            Клавиши
          </Table.ColumnHeader>
          <Table.ColumnHeader color="gray.300">Действие</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {shortcuts.map((shortcut) => (
          <Table.Row key={shortcut.description} _hover={{ bg: 'gray.900/50' }}>
            <Table.Cell>
              <HStack gap={1}>
                {shortcut.keys.map((key, index) => (
                  <HStack key={key} gap={1}>
                    {index > 0 && <Text color="gray.500">+</Text>}
                    <Kbd
                      bg="gray.800"
                      borderColor="gray.700"
                      color="gray.200"
                      px={2}
                      py={1}
                      borderRadius="md"
                      fontSize="sm"
                    >
                      {key}
                    </Kbd>
                  </HStack>
                ))}
              </HStack>
            </Table.Cell>
            <Table.Cell color="gray.300">{shortcut.description}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

export default function KeyboardShortcutsPage() {
  return (
    <VStack align="stretch" gap={8}>
      <Box>
        <Heading asChild size="xl" mb={4}>
          <h1>Горячие клавиши</h1>
        </Heading>
        <Text color="gray.400" fontSize="lg">
          Быстрые клавиши для эффективной работы с приложением
        </Text>
      </Box>

      {/* Воспроизведение */}
      <Card.Root className="glass" borderRadius="xl">
        <Card.Body p={6}>
          <Heading asChild size="md" mb={4}>
            <h2>Управление воспроизведением</h2>
          </Heading>
          <ShortcutTable shortcuts={PLAYBACK_SHORTCUTS} />
        </Card.Body>
      </Card.Root>

      {/* Навигация */}
      <Card.Root className="glass" borderRadius="xl">
        <Card.Body p={6}>
          <Heading asChild size="md" mb={4}>
            <h2>Навигация</h2>
          </Heading>
          <ShortcutTable shortcuts={NAVIGATION_SHORTCUTS} />
        </Card.Body>
      </Card.Root>

      {/* Кодирование */}
      <Card.Root className="glass" borderRadius="xl">
        <Card.Body p={6}>
          <Heading asChild size="md" mb={4}>
            <h2>Кодирование</h2>
          </Heading>
          <ShortcutTable shortcuts={ENCODING_SHORTCUTS} />
        </Card.Body>
      </Card.Root>

      {/* Подсказка */}
      <Box p={4} bg="brand.500/10" borderRadius="lg" borderLeft="4px solid" borderColor="brand.500">
        <Text fontSize="sm" color="gray.300">
          <strong>Подсказка:</strong> На macOS используйте <Kbd>Cmd</Kbd> вместо <Kbd>Ctrl</Kbd>.
        </Text>
      </Box>
    </VStack>
  )
}
