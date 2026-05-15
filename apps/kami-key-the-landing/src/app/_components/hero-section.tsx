'use client'

import { Box, Container, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FaDownload, FaWindows } from 'react-icons/fa6'

/** Примеры маппингов для демонстрации в герое */
const HERO_MAPPINGS = [
  { keys: 'AltGr + -', symbol: '\u2014', name: 'длинное тире' },
  { keys: 'AltGr + [', symbol: '\u00AB', name: 'кавычки' },
  { keys: 'AltGr + =', symbol: '\u2260', name: 'не равно' },
  { keys: 'AltGr + e', symbol: '\u20AC', name: 'евро' },
] as const

/** Текст для typing-эффекта */
const TYPING_TEXT = 'Типографские символы одной клавишей'

/**
 * Герой-секция — первый экран лендинга
 * Большой заголовок, typing-эффект, примеры маппингов, кнопка скачивания
 */
export function HeroSection() {
  const [typedLength, setTypedLength] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [activeMapping, setActiveMapping] = useState(0)

  /* Typing-эффект для подзаголовка */
  useEffect(() => {
    if (typedLength < TYPING_TEXT.length) {
      const timeout = setTimeout(() => setTypedLength((prev) => prev + 1), 55)
      return () => clearTimeout(timeout)
    }
  }, [typedLength])

  /* Мигающий курсор */
  useEffect(() => {
    const interval = setInterval(() => setShowCursor((prev) => !prev), 530)
    return () => clearInterval(interval)
  }, [])

  /* Автопереключение активного маппинга */
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMapping((prev) => (prev + 1) % HERO_MAPPINGS.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <Box as="section" position="relative" minH="100dvh" display="flex" alignItems="center" overflow="hidden" pt="64px">
      {/* Фоновый grid-паттерн */}
      <Box
        position="absolute"
        inset={0}
        backgroundImage="linear-gradient(rgba(57, 255, 20, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(57, 255, 20, 0.03) 1px, transparent 1px)"
        backgroundSize="60px 60px"
        pointerEvents="none"
      />

      {/* Радиальное свечение по центру */}
      <Box
        position="absolute"
        top="30%"
        left="50%"
        transform="translate(-50%, -50%)"
        w="600px"
        h="600px"
        borderRadius="full"
        bg="radial-gradient(circle, rgba(57, 255, 20, 0.08) 0%, transparent 70%)"
        pointerEvents="none"
        filter="blur(40px)"
      />

      <Container maxW="5xl" px={{ base: 4, md: 8 }} position="relative" zIndex={1}>
        <VStack gap={{ base: 8, md: 10 }} textAlign="center">
          {/* Заголовок */}
          <VStack gap={4}>
            <Text
              as="h1"
              className="font-mono neon-text"
              fontSize={{ base: '4xl', sm: '5xl', md: '7xl', lg: '8xl' }}
              fontWeight="700"
              letterSpacing="tight"
              lineHeight="1.1"
            >
              KamiKeyThe
            </Text>

            {/* Подзаголовок с typing-эффектом */}
            <Box h={{ base: '28px', md: '36px' }}>
              <Text className="font-mono" fontSize={{ base: 'md', md: 'xl' }} color="gray.300" letterSpacing="wide">
                {TYPING_TEXT.slice(0, typedLength)}
                <Box as="span" opacity={showCursor ? 1 : 0} color="brand.400" ml="1px">
                  _
                </Box>
              </Text>
            </Box>
          </VStack>

          {/* Примеры маппингов */}
          <Flex
            direction={{ base: 'column', sm: 'row' }}
            gap={3}
            justify="center"
            flexWrap="wrap"
            className="animate-fade-in-up delay-300"
            style={{ opacity: 0 }}
          >
            {HERO_MAPPINGS.map((mapping, index) => (
              <HStack
                key={mapping.keys}
                className="glass"
                borderRadius="lg"
                px={4}
                py={3}
                gap={3}
                transition="all 0.3s ease"
                borderColor={activeMapping === index ? 'rgba(57, 255, 20, 0.5)' : 'rgba(57, 255, 20, 0.1)'}
                boxShadow={activeMapping === index ? '0 0 20px rgba(57, 255, 20, 0.15)' : 'none'}
                cursor="default"
                onMouseEnter={() => setActiveMapping(index)}
              >
                {/* Клавиши */}
                <HStack gap={1}>
                  {mapping.keys.split(' + ').map((key) => (
                    <Box key={key} className={`kbd ${activeMapping === index ? 'active' : ''}`} fontSize="xs">
                      {key}
                    </Box>
                  ))}
                </HStack>

                {/* Стрелка */}
                <Text color="gray.500" fontSize="sm">
                  {'\u2192'}
                </Text>

                {/* Символ-результат */}
                <Text
                  className="font-mono"
                  fontSize="xl"
                  fontWeight="700"
                  color={activeMapping === index ? 'brand.400' : 'gray.300'}
                  transition="color 0.2s ease"
                  minW="28px"
                  textAlign="center"
                >
                  {mapping.symbol}
                </Text>

                {/* Название (только на десктопе) */}
                <Text display={{ base: 'none', md: 'block' }} fontSize="xs" color="gray.500" className="font-mono">
                  {mapping.name}
                </Text>
              </HStack>
            ))}
          </Flex>

          {/* Кнопка скачивания */}
          <VStack gap={3} className="animate-fade-in-up delay-400" style={{ opacity: 0 }}>
            <Box
              display="inline-flex"
              alignItems="center"
              gap={2}
              px={8}
              py={3.5}
              borderRadius="lg"
              bg="brand.500"
              color="black"
              fontWeight="700"
              fontSize="md"
              className="font-mono glow"
              transition="all 0.3s ease"
              _hover={{
                bg: 'brand.400',
                transform: 'translateY(-2px)',
                textDecoration: 'none',
              }}
              _active={{ transform: 'translateY(0)' }}
              asChild
            >
              <a href="#downloads">
                <FaDownload size={16} />
                Скачать для Windows
                <FaWindows size={16} style={{ opacity: 0.7 }} />
              </a>
            </Box>

            <Text className="font-mono" fontSize="xs" color="gray.500">
              v1.2.0 {'\u00B7'} Windows 10+ {'\u00B7'} Бесплатно
            </Text>
          </VStack>
        </VStack>
      </Container>

      {/* Стрелка вниз */}
      <Box
        position="absolute"
        bottom={8}
        left="50%"
        transform="translateX(-50%)"
        animation="float 3s ease-in-out infinite"
        cursor="pointer"
        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        aria-label="Перейти к возможностям"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
          }
        }}
      >
        <Text color="brand.400" fontSize="2xl" opacity={0.5}>
          {'\u2304'}
        </Text>
      </Box>
    </Box>
  )
}
