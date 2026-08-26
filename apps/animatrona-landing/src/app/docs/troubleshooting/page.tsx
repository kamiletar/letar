'use client'

import { Box, Card, Heading, Link, Text, VStack } from '@chakra-ui/react'
import { LuCpu, LuDatabase, LuExternalLink, LuFileVideo, LuMonitor, LuTriangleAlert } from 'react-icons/lu'

interface Problem {
  icon: typeof LuTriangleAlert
  title: string
  symptoms: string[]
  solutions: string[]
}

const PROBLEMS: Problem[] = [
  {
    icon: LuFileVideo,
    title: 'FFmpeg не найден',
    symptoms: ['Ошибка "FFmpeg not found" при запуске', 'Кодирование не начинается', 'Видео не воспроизводится'],
    solutions: [
      'Убедитесь, что FFmpeg установлен и доступен в PATH',
      'На Windows: скачайте FFmpeg и добавьте путь в переменные среды',
      'На macOS: установите через Homebrew: brew install ffmpeg',
      'На Linux: sudo apt install ffmpeg (Ubuntu/Debian)',
    ],
  },
  {
    icon: LuCpu,
    title: 'GPU не определяется',
    symptoms: [
      'Кодирование идёт на CPU вместо GPU',
      'Очень медленная скорость кодирования',
      'Ошибка "No GPU encoder available"',
    ],
    solutions: [
      'Обновите драйверы видеокарты до последней версии',
      'Для NVIDIA: установите CUDA Toolkit',
      'Убедитесь, что видеокарта поддерживает NVENC (GTX 600+)',
      'На macOS: VideoToolbox используется автоматически',
    ],
  },
  {
    icon: LuMonitor,
    title: 'Проблемы с субтитрами',
    symptoms: ['Субтитры не отображаются', 'Неправильные шрифты в ASS субтитрах', 'Субтитры съезжают или обрезаются'],
    solutions: [
      'Проверьте, что файл субтитров имеет расширение .ass или .srt',
      'Установите шрифты, указанные в субтитрах',
      'Попробуйте перезагрузить эпизод',
      'Проверьте кодировку файла субтитров (должна быть UTF-8)',
    ],
  },
  {
    icon: LuDatabase,
    title: 'База данных повреждена',
    symptoms: ['Приложение не запускается', 'Потеряны данные о просмотре', 'Ошибка "Database corrupted"'],
    solutions: [
      'Создайте резервную копию папки данных',
      'Удалите файл database.db и перезапустите приложение',
      'Папка данных: %APPDATA%/animatrona (Windows), ~/Library/Application Support/animatrona (macOS)',
      'Переимпортируйте библиотеку после сброса',
    ],
  },
]

export default function TroubleshootingPage() {
  return (
    <VStack align="stretch" gap={8}>
      <Box>
        <Heading asChild size="xl" mb={4}>
          <h1>Решение проблем</h1>
        </Heading>
        <Text color="gray.400" fontSize="lg">
          Типичные проблемы и способы их устранения
        </Text>
      </Box>

      {/* Проблемы */}
      <VStack align="stretch" gap={6}>
        {PROBLEMS.map((problem) => {
          const ProblemIcon = problem.icon
          return (
            <Card.Root key={problem.title} className="glass" borderRadius="xl">
              <Card.Body p={6}>
                <VStack align="stretch" gap={4}>
                  {/* Заголовок */}
                  <Box display="flex" alignItems="center" gap={3}>
                    <Box p={2} borderRadius="lg" bg="red.500/20" color="red.400">
                      <ProblemIcon size={20} />
                    </Box>
                    <Heading asChild size="md">
                      <h2>{problem.title}</h2>
                    </Heading>
                  </Box>

                  {/* Симптомы */}
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" color="gray.500" mb={2}>
                      Симптомы:
                    </Text>
                    <VStack align="start" gap={1}>
                      {problem.symptoms.map((symptom) => (
                        <Text key={symptom} fontSize="sm" color="gray.400">
                          • {symptom}
                        </Text>
                      ))}
                    </VStack>
                  </Box>

                  {/* Решения */}
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" color="green.400" mb={2}>
                      Решения:
                    </Text>
                    <VStack align="start" gap={2}>
                      {problem.solutions.map((solution, index) => (
                        <Text key={solution} fontSize="sm" color="gray.300">
                          {index + 1}. {solution}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>
          )
        })}
      </VStack>

      {/* Дополнительная помощь */}
      <Card.Root className="glass" borderRadius="xl">
        <Card.Body p={6}>
          <Box display="flex" alignItems="center" gap={3} mb={4}>
            <Box p={2} borderRadius="lg" bg="brand.500/20" color="brand.400">
              <LuTriangleAlert size={20} />
            </Box>
            <Heading asChild size="md">
              <h2>Не нашли решение?</h2>
            </Heading>
          </Box>
          <Text color="gray.300" mb={4}>
            Если ваша проблема не описана выше, создайте Issue на GitHub с подробным описанием проблемы, шагами для
            воспроизведения и логами приложения.
          </Text>
          <Link
            href="https://github.com/kamiletar/letar/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            color="brand.400"
            fontSize="sm"
            display="flex"
            alignItems="center"
            gap={1}
            _hover={{ color: 'brand.300' }}
          >
            <LuExternalLink />
            Создать Issue на GitHub
          </Link>
        </Card.Body>
      </Card.Root>

      {/* Как получить логи */}
      <Box p={4} bg="gray.900" borderRadius="lg">
        <Text fontSize="sm" fontWeight="bold" color="gray.400" mb={2}>
          Как получить логи приложения:
        </Text>
        <Text fontSize="xs" fontFamily="mono" color="gray.500">
          Windows: %APPDATA%\animatrona\logs\
        </Text>
        <Text fontSize="xs" fontFamily="mono" color="gray.500">
          macOS: ~/Library/Logs/animatrona/
        </Text>
        <Text fontSize="xs" fontFamily="mono" color="gray.500">
          Linux: ~/.config/animatrona/logs/
        </Text>
      </Box>
    </VStack>
  )
}
