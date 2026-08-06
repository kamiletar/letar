import { Badge, Box, Card, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Профили кодирования',
  description: 'Руководство по профилям кодирования Animatrona — AV1, HEVC, VMAF оптимизация',
}

interface Profile {
  name: string
  codec: string
  quality: string
  speed: string
  fileSize: string
  useCase: string
}

const PROFILES: Profile[] = [
  {
    name: 'Quality',
    codec: 'AV1',
    quality: 'Максимальное',
    speed: 'Медленная',
    fileSize: 'Минимальный',
    useCase: 'Архивное хранение, когда время не критично',
  },
  {
    name: 'Balanced',
    codec: 'HEVC',
    quality: 'Высокое',
    speed: 'Средняя',
    fileSize: 'Средний',
    useCase: 'Повседневное использование, баланс качества и скорости',
  },
  {
    name: 'Fast',
    codec: 'HEVC',
    quality: 'Хорошее',
    speed: 'Быстрая',
    fileSize: 'Больше',
    useCase: 'Быстрое кодирование, когда нужен результат срочно',
  },
]

export default function EncodingProfilesPage() {
  return (
    <VStack align="stretch" gap={8}>
      <Box>
        <Heading as="h1" size="xl" mb={4}>
          Профили кодирования
        </Heading>
        <Text color="gray.400" fontSize="lg">
          Готовые настройки для разных сценариев использования
        </Text>
      </Box>

      {/* Что такое профили */}
      <Card.Root className="glass" borderRadius="xl">
        <Card.Body p={6}>
          <Heading as="h2" size="md" mb={4}>
            Что такое профили кодирования?
          </Heading>
          <Text color="gray.300" lineHeight="tall">
            Профили кодирования — это предустановленные наборы настроек для конвертации видео. Каждый профиль
            оптимизирован под определённые задачи: максимальное качество, баланс между качеством и скоростью, или
            быстрое кодирование.
          </Text>
          <Text color="gray.300" lineHeight="tall" mt={4}>
            Animatrona использует GPU-ускорение через NVENC (NVIDIA), AMF (AMD) или VideoToolbox (Apple), что позволяет
            кодировать видео в 5-10 раз быстрее, чем на CPU.
          </Text>
        </Card.Body>
      </Card.Root>

      {/* Встроенные профили */}
      <Card.Root className="glass" borderRadius="xl">
        <Card.Body p={6}>
          <Heading as="h2" size="md" mb={4}>
            Встроенные профили
          </Heading>
          <Table.Root variant="outline" borderRadius="lg" overflow="hidden">
            <Table.Header>
              <Table.Row bg="gray.900">
                <Table.ColumnHeader color="gray.300">Профиль</Table.ColumnHeader>
                <Table.ColumnHeader color="gray.300">Кодек</Table.ColumnHeader>
                <Table.ColumnHeader color="gray.300">Качество</Table.ColumnHeader>
                <Table.ColumnHeader color="gray.300">Скорость</Table.ColumnHeader>
                <Table.ColumnHeader color="gray.300" display={{ base: 'none', lg: 'table-cell' }}>
                  Размер файла
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {PROFILES.map((profile) => (
                <Table.Row key={profile.name} _hover={{ bg: 'gray.900/50' }}>
                  <Table.Cell>
                    <Badge
                      colorPalette={profile.name === 'Quality'
                        ? 'purple'
                        : profile.name === 'Balanced'
                        ? 'blue'
                        : 'green'}
                    >
                      {profile.name}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell color="gray.300">{profile.codec}</Table.Cell>
                  <Table.Cell color="gray.300">{profile.quality}</Table.Cell>
                  <Table.Cell color="gray.300">{profile.speed}</Table.Cell>
                  <Table.Cell color="gray.300" display={{ base: 'none', lg: 'table-cell' }}>
                    {profile.fileSize}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card.Body>
      </Card.Root>

      {/* Рекомендации */}
      <VStack align="stretch" gap={4}>
        {PROFILES.map((profile) => (
          <Card.Root key={profile.name} className="glass" borderRadius="xl">
            <Card.Body p={6}>
              <HStack justify="space-between" mb={2}>
                <Heading as="h3" size="sm">
                  {profile.name}
                </Heading>
                <Badge
                  colorPalette={profile.name === 'Quality' ? 'purple' : profile.name === 'Balanced' ? 'blue' : 'green'}
                >
                  {profile.codec}
                </Badge>
              </HStack>
              <Text color="gray.400" fontSize="sm">
                {profile.useCase}
              </Text>
            </Card.Body>
          </Card.Root>
        ))}
      </VStack>

      {/* VMAF */}
      <Card.Root className="glass" borderRadius="xl">
        <Card.Body p={6}>
          <Heading as="h2" size="md" mb={4}>
            VMAF оптимизация
          </Heading>
          <Text color="gray.300" lineHeight="tall">
            VMAF (Video Multi-method Assessment Fusion) — это метрика качества видео, разработанная Netflix. Animatrona
            использует VMAF для автоматического подбора оптимального битрейта, обеспечивая целевое качество без
            перерасхода места на диске.
          </Text>
          <Box mt={4} p={4} bg="gray.900" borderRadius="lg">
            <Text fontSize="sm" fontFamily="mono" color="gray.400">
              Целевой VMAF: 93 (практически неотличимо от оригинала)
            </Text>
          </Box>
        </Card.Body>
      </Card.Root>

      {/* Подсказка */}
      <Box p={4} bg="brand.500/10" borderRadius="lg" borderLeft="4px solid" borderColor="brand.500">
        <Text fontSize="sm" color="gray.300">
          <strong>Рекомендация:</strong>{' '}
          Для большинства случаев используйте профиль «Balanced» — он обеспечивает отличное качество при разумной
          скорости кодирования.
        </Text>
      </Box>
    </VStack>
  )
}
