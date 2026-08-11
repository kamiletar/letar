'use client'

import { Box, Container, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { FaKeyboard } from 'react-icons/fa6'
import { LuEye, LuFolders, LuLayers, LuPencil, LuSearch } from 'react-icons/lu'

/** Описания фич */
const FEATURES: { icon: ReactNode; title: string; description: string }[] = [
  {
    icon: <FaKeyboard size={20} color="#4dff7a" />,
    title: 'AltGr \u2192 Символы',
    description: '14+ типографских символов через AltGr. Тире, кавычки, стрелки \u2014 одним нажатием.',
  },
  {
    icon: <LuLayers size={20} color="#4dff7a" />,
    title: 'Shift-слой',
    description: 'Второй уровень символов через AltGr+Shift. Удвойте количество доступных символов.',
  },
  {
    icon: <LuEye size={20} color="#4dff7a" />,
    title: 'Визуальный оверлей',
    description: 'Удерживайте AltGr \u2014 появится подсказка со всеми доступными символами прямо на экране.',
  },
  {
    icon: <LuPencil size={20} color="#4dff7a" />,
    title: 'Редактор раскладок',
    description: 'Визуальный редактор с drag-and-drop. Перетаскивайте символы прямо на клавиши.',
  },
  {
    icon: <LuSearch size={20} color="#4dff7a" />,
    title: 'Unicode-пикер',
    description: 'Поиск по 11 категориям Unicode с русскими описаниями. 12\u202F000+ символов.',
  },
  {
    icon: <LuFolders size={20} color="#4dff7a" />,
    title: 'Профили',
    description: 'Несколько раскладок: Типографика, Математика, Стрелки. Переключайтесь мгновенно.',
  },
]

/**
 * Секция с фичами — 6 glass-карточек в сетке
 */
export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  /* Появление секции при входе в viewport */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) { return }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Box as="section" id="features" py={{ base: 16, md: 24 }} ref={sectionRef}>
      <Container maxW="6xl" px={{ base: 4, md: 8 }}>
        <VStack gap={{ base: 10, md: 14 }}>
          {/* Заголовок секции */}
          <VStack gap={3} textAlign="center">
            <Heading as="h2" className="gradient-text font-mono" fontSize={{ base: '2xl', md: '4xl' }} fontWeight="700">
              Возможности
            </Heading>
            <Text color="gray.400" fontSize={{ base: 'sm', md: 'md' }} maxW="xl">
              Всё, что нужно для комфортной работы с типографскими символами
            </Text>
          </VStack>

          {/* Сетка карточек */}
          <Grid
            templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
            gap={{ base: 4, md: 6 }}
            w="100%"
          >
            {FEATURES.map((feature, index) => (
              <Box
                key={feature.title}
                className="glass"
                borderRadius="xl"
                p={{ base: 5, md: 6 }}
                transition="all 0.3s ease"
                _hover={{
                  borderColor: 'rgba(57, 255, 20, 0.4)',
                  boxShadow: '0 0 30px rgba(57, 255, 20, 0.1)',
                  transform: 'translateY(-4px)',
                }}
                opacity={visible ? 1 : 0}
                transform={visible ? 'translateY(0)' : 'translateY(20px)'}
                style={{
                  transition: `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${
                    index * 0.1
                  }s, border-color 0.3s ease, box-shadow 0.3s ease`,
                }}
              >
                <VStack align="start" gap={3}>
                  {/* Иконка */}
                  <Box
                    p={2.5}
                    borderRadius="lg"
                    bg="rgba(57, 255, 20, 0.08)"
                    border="1px solid rgba(57, 255, 20, 0.15)"
                  >
                    {feature.icon}
                  </Box>

                  {/* Заголовок фичи */}
                  <Text className="font-mono" fontSize="md" fontWeight="600" color="gray.50">
                    {feature.title}
                  </Text>

                  {/* Описание */}
                  <Text fontSize="sm" color="gray.400" lineHeight="tall">
                    {feature.description}
                  </Text>
                </VStack>
              </Box>
            ))}
          </Grid>
        </VStack>
      </Container>
    </Box>
  )
}
