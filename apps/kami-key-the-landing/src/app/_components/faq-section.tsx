'use client'

import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuChevronDown } from 'react-icons/lu'

/** Вопросы и ответы */
const FAQ_ITEMS = [
  {
    question: 'Что такое AltGr?',
    answer:
      'Правый Alt на клавиатуре. В Windows его можно использовать как модификатор для ввода спецсимволов. KamiKeyThe перехватывает эти нажатия и вставляет нужные символы.',
  },
  {
    question: 'Работает ли с играми?',
    answer:
      'Да, но можно добавить игры в список исключений. KamiKeyThe автоматически отключается для указанных приложений.',
  },
  {
    question: 'Как добавить свои символы?',
    answer:
      'Откройте редактор раскладок (правый клик по иконке в трее \u2192 \u00ABРедактор\u00BB). Найдите символ в Unicode-пикере и перетащите на нужную клавишу.',
  },
  {
    question: 'Это безопасно?',
    answer:
      'Да. KamiKeyThe работает локально, не отправляет данные в интернет, не логирует нажатия клавиш. Исходный код открыт.',
  },
  {
    question: 'Можно ли отключить для конкретных приложений?',
    answer:
      'Да, через профили исключений. Правый клик по иконке в трее \u2192 \u00ABНастройки\u00BB \u2192 \u00ABИсключения\u00BB.',
  },
] as const

/**
 * Секция FAQ — аккордеон с вопросами и ответами
 */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }, [])

  return (
    <Box as="section" id="faq" py={{ base: 16, md: 24 }}>
      <Container maxW="3xl" px={{ base: 4, md: 8 }}>
        <VStack gap={{ base: 8, md: 12 }}>
          {/* Заголовок */}
          <VStack gap={3} textAlign="center">
            <Heading as="h2" className="gradient-text font-mono" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="700">
              FAQ
            </Heading>
            <Text color="gray.400" fontSize={{ base: 'sm', md: 'md' }}>
              Частые вопросы о KamiKeyThe
            </Text>
          </VStack>

          {/* Аккордеон */}
          <VStack gap={3} w="100%">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index
              return (
                <Box
                  key={item.question}
                  className="glass"
                  borderRadius="xl"
                  w="100%"
                  overflow="hidden"
                  transition="all 0.3s ease"
                  borderColor={isOpen ? 'rgba(57, 255, 20, 0.3)' : 'rgba(57, 255, 20, 0.1)'}
                  boxShadow={isOpen ? '0 0 20px rgba(57, 255, 20, 0.05)' : 'none'}
                >
                  {/* Кнопка вопроса */}
                  <Box
                    as="button"
                    w="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    px={{ base: 4, md: 5 }}
                    py={4}
                    textAlign="left"
                    cursor="pointer"
                    _hover={{ bg: 'rgba(57, 255, 20, 0.03)' }}
                    onClick={() => toggle(index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <Text
                      className="font-mono"
                      fontSize={{ base: 'sm', md: 'md' }}
                      fontWeight="600"
                      color={isOpen ? 'brand.400' : 'gray.200'}
                      transition="color 0.2s ease"
                      pr={4}
                    >
                      {item.question}
                    </Text>
                    <Box
                      as={LuChevronDown}
                      boxSize={4}
                      color={isOpen ? 'brand.400' : 'gray.500'}
                      flexShrink={0}
                      transition="transform 0.3s ease, color 0.2s ease"
                      transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
                    />
                  </Box>

                  {/* Ответ */}
                  <Box
                    id={`faq-answer-${index}`}
                    role="region"
                    overflow="hidden"
                    maxH={isOpen ? '300px' : '0'}
                    opacity={isOpen ? 1 : 0}
                    transition="max-height 0.3s ease, opacity 0.3s ease"
                  >
                    <Box px={{ base: 4, md: 5 }} pb={4}>
                      <Text fontSize="sm" color="gray.400" lineHeight="tall">
                        {item.answer}
                      </Text>
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
