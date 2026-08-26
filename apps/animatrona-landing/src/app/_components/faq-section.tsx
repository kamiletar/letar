'use client'

import { Accordion, Box, Container, Heading, Span, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { LuCircleHelp } from 'react-icons/lu'

interface FaqItem {
  value: string
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    value: 'gpu-required',
    question: 'Нужна ли NVIDIA видеокарта?',
    answer:
      'Нет, NVIDIA GPU рекомендуется, но не обязательна. С видеокартой RTX серии транскодирование происходит в 2x быстрее благодаря Dual NVENC. Без GPU приложение использует CPU кодирование через libsvtav1, которое тоже даёт отличное качество, но работает медленнее.',
  },
  {
    value: 'formats',
    question: 'Какие форматы видео поддерживаются?',
    answer:
      'На входе: MKV, MP4, AVI, MOV и другие популярные контейнеры. На выходе: MKV с AV1 или HEVC видео, AAC аудио и ASS субтитрами. Приложение автоматически извлекает все дорожки и шрифты из исходных файлов.',
  },
  {
    value: 'metadata',
    question: 'Откуда берутся метаданные?',
    answer:
      'Метаданные (постеры, описания, жанры, персонажи, сейю) автоматически импортируются из Shikimori.one — крупнейшей русскоязычной базы аниме. Просто введите название или ID аниме, и все данные загрузятся автоматически.',
  },
  {
    value: 'free',
    question: 'Это бесплатно?',
    answer:
      'Да, Animatrona полностью бесплатна и с открытым исходным кодом. Код доступен на GitHub под лицензией MIT. Никаких подписок, рекламы или скрытых платежей.',
  },
  {
    value: 'platforms',
    question: 'На каких платформах работает?',
    answer:
      'Windows 10+, macOS 10.13+ (Intel и Apple Silicon) и Linux (Ubuntu 18.04+, Debian, Fedora, Arch). На macOS потребуется разрешить запуск в настройках безопасности, так как приложение не подписано сертификатом Apple.',
  },
  {
    value: 'vmaf',
    question: 'Что такое VMAF и зачем он нужен?',
    answer:
      'VMAF (Video Multimethod Assessment Fusion) — это метрика качества видео от Netflix. Animatrona использует VMAF для автоматического подбора оптимального CQ (Constant Quality): находит минимальный размер файла при заданном уровне качества (по умолчанию 95+). Это позволяет значительно сэкономить место без видимой потери качества.',
  },
]

// Motion компоненты
const MotionBox = motion.create(Box)
const MotionVStack = motion.create(VStack)

export function FaqSection() {
  return (
    <Box as="section" id="faq" py={{ base: 16, md: 24 }}>
      <Container maxW="container.md">
        <VStack gap={12}>
          {/* Заголовок */}
          <MotionVStack
            gap={4}
            textAlign="center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Heading as="h2" size={{ base: '2xl', md: '3xl' }}>
              Часто задаваемые вопросы
            </Heading>
            <Text color="gray.400" fontSize="lg">
              Ответы на популярные вопросы о приложении
            </Text>
          </MotionVStack>

          {/* FAQ Accordion */}
          <MotionBox
            w="full"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Accordion.Root collapsible variant="enclosed" spaceY={3}>
              {FAQ_ITEMS.map((item) => (
                <Accordion.Item
                  key={item.value}
                  value={item.value}
                  className="glass"
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor="gray.800"
                  overflow="hidden"
                  _open={{
                    borderColor: 'brand.500/30',
                  }}
                >
                  <Accordion.ItemTrigger px={5} py={4} _hover={{ bg: 'gray.900/50' }}>
                    <LuCircleHelp color="var(--chakra-colors-brand-400)" size={20} style={{ marginRight: '12px' }} />
                    <Span flex="1" fontWeight="medium" color="white" textAlign="left">
                      {item.question}
                    </Span>
                    <Accordion.ItemIndicator color="gray.500" />
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    <Accordion.ItemBody px={5} pb={5} pt={0}>
                      <Text color="gray.400" lineHeight="tall">
                        {item.answer}
                      </Text>
                    </Accordion.ItemBody>
                  </Accordion.ItemContent>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </MotionBox>
        </VStack>
      </Container>
    </Box>
  )
}
