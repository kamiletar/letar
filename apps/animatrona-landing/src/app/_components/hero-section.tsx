'use client'

import type { MacArch, ParsedRelease, Platform } from '@/types/release'
import {
  Badge,
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Icon,
  Link,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa6'
import { LuDownload, LuExternalLink, LuMonitor, LuSparkles, LuZap } from 'react-icons/lu'

interface HeroSectionProps {
  release: ParsedRelease | null
}

/**
 * Определяет платформу пользователя
 */
function detectPlatform(): Platform | null {
  if (typeof window === 'undefined') {
    return null
  }
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) {
    return 'windows'
  }
  if (ua.includes('mac')) {
    return 'macos'
  }
  if (ua.includes('linux')) {
    return 'linux'
  }
  return null
}

/**
 * Определяет архитектуру Mac (Apple Silicon или Intel)
 */
function detectMacArch(): MacArch {
  if (typeof window === 'undefined') {
    return 'arm64'
  }

  // Проверяем через userAgentData (Chrome 90+, Edge 90+)
  const uaData = (navigator as Navigator & { userAgentData?: { architecture?: string } }).userAgentData
  if (uaData?.architecture === 'arm') {
    return 'arm64'
  }
  if (uaData?.architecture === 'x86') {
    return 'x64'
  }

  // По умолчанию — Apple Silicon (более популярные Mac сейчас)
  return 'arm64'
}

/**
 * Возвращает иконку и название платформы
 */
function getPlatformInfo(platform: Platform | null) {
  switch (platform) {
    case 'windows':
      return { icon: FaWindows, name: 'Windows' }
    case 'macos':
      return { icon: FaApple, name: 'macOS' }
    case 'linux':
      return { icon: FaLinux, name: 'Linux' }
    default:
      return { icon: LuDownload, name: 'приложение' }
  }
}

/**
 * Анимированный счётчик
 */
function AnimatedCounter({ value, suffix = '', duration = 2 }: { value: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) {
      return
    }

    let startTime: number
    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp
      }
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * value))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [isInView, value, duration])

  return (
    <Box as="span" ref={ref} fontSize="2xl" fontWeight="bold" color="white">
      {count}
      {suffix}
    </Box>
  )
}

/**
 * Typing effect для подзаголовка
 */
function TypingText({ phrases }: { phrases: string[] }) {
  const [currentPhrase, setCurrentPhrase] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const phrase = phrases[currentPhrase]
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          // Печатаем
          if (displayText.length < phrase.length) {
            setDisplayText(phrase.slice(0, displayText.length + 1))
          } else {
            // Пауза перед удалением
            setTimeout(() => setIsDeleting(true), 2000)
          }
        } else {
          // Удаляем
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1))
          } else {
            setIsDeleting(false)
            setCurrentPhrase((prev) => (prev + 1) % phrases.length)
          }
        }
      },
      isDeleting ? 30 : 80,
    )

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, currentPhrase, phrases])

  return (
    <Text as="span" color="brand.400">
      {displayText}
      <Text as="span" animation="blink 1s step-end infinite" color="brand.400">
        |
      </Text>
    </Text>
  )
}

/**
 * Placeholder компонент для отсутствующего скриншота
 */
function ScreenshotPlaceholder() {
  return (
    <VStack gap={4} justify="center" align="center" h="full">
      <Icon as={LuMonitor} boxSize={16} color="gray.700" />
      <Text color="gray.600" fontSize="lg">
        Скриншот приложения
      </Text>
    </VStack>
  )
}

// Motion компоненты
const MotionBox = motion.create(Box)
const MotionVStack = motion.create(VStack)

export function HeroSection({ release }: HeroSectionProps) {
  const version = release?.version || '0.8.0'
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [macArch, setMacArch] = useState<MacArch>('arm64')
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const detected = detectPlatform()
    setPlatform(detected)
    if (detected === 'macos') {
      setMacArch(detectMacArch())
    }
  }, [])

  const platformInfo = getPlatformInfo(platform)

  // Получаем URL для скачивания (для macOS выбираем подходящую архитектуру)
  const downloadUrl = (() => {
    if (!platform || !release) {
      return null
    }
    if (platform === 'macos') {
      const macAssets = release.assets.macos
      return (
        macAssets[macArch]?.browser_download_url
        || macAssets.arm64?.browser_download_url
        || macAssets.x64?.browser_download_url
      )
    }
    return release.assets[platform]?.browser_download_url
  })()

  return (
    <Box as="section" pt={{ base: 24, md: 32 }} pb={{ base: 16, md: 24 }} position="relative" overflow="hidden">
      {/* Aurora gradient background */}
      <Box position="absolute" inset={0} overflow="hidden" pointerEvents="none">
        {/* Primary gradient blob */}
        <MotionBox
          position="absolute"
          top="-30%"
          left="20%"
          width="60%"
          height="60%"
          bgGradient="radial-gradient(circle at center, rgba(139, 61, 255, 0.25) 0%, transparent 70%)"
          filter="blur(60px)"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Secondary gradient blob */}
        <MotionBox
          position="absolute"
          top="10%"
          right="10%"
          width="40%"
          height="40%"
          bgGradient="radial-gradient(circle at center, rgba(88, 28, 135, 0.2) 0%, transparent 70%)"
          filter="blur(80px)"
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Accent gradient blob */}
        <MotionBox
          position="absolute"
          bottom="0%"
          left="40%"
          width="50%"
          height="50%"
          bgGradient="radial-gradient(circle at center, rgba(192, 132, 252, 0.15) 0%, transparent 70%)"
          filter="blur(100px)"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </Box>

      <Container maxW="container.xl" position="relative">
        <Stack direction={{ base: 'column', lg: 'row' }} gap={{ base: 12, lg: 16 }} align="center">
          {/* Текстовый контент */}
          <MotionVStack
            flex={1}
            align={{ base: 'center', lg: 'start' }}
            gap={6}
            textAlign={{ base: 'center', lg: 'left' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Бейдж версии */}
            <Badge colorPalette="purple" px={3} py={1} borderRadius="full" fontSize="sm">
              v{version} — Новый релиз
            </Badge>

            {/* Заголовок */}
            <Heading as="h1" size={{ base: '3xl', md: '4xl', lg: '5xl' }} fontWeight="bold" lineHeight="1.1">
              <Text as="span" className="gradient-text">
                Animatrona
              </Text>
              <br />
              <Text as="span" color="gray.100">
                <TypingText
                  phrases={['Умная библиотека аниме', 'GPU-транскодирование', 'Импорт из Shikimori', 'Автоподбор VMAF']}
                />
              </Text>
            </Heading>

            {/* Описание */}
            <Text fontSize={{ base: 'lg', md: 'xl' }} color="gray.400" maxW="xl">
              Desktop приложение для управления аниме-коллекцией с GPU-ускоренным транскодированием, автоподбором
              качества VMAF и импортом метаданных с Shikimori.
            </Text>

            {/* Кнопки */}
            <HStack gap={4} pt={2} flexWrap="wrap" justify={{ base: 'center', lg: 'start' }}>
              {/* Smart Download Button */}
              {downloadUrl
                ? (
                  <Button
                    asChild
                    size={{ base: 'lg', md: 'xl' }}
                    colorPalette="purple"
                    className="glow"
                    transitionProperty="transform, box-shadow"
                    transitionDuration="0.2s"
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: '0 0 40px rgba(139, 61, 255, 0.5)',
                    }}
                  >
                    <Link href={downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Icon as={platformInfo.icon} />
                      Скачать для {platformInfo.name}
                    </Link>
                  </Button>
                )
                : (
                  <Button
                    asChild
                    size={{ base: 'lg', md: 'xl' }}
                    colorPalette="purple"
                    className="glow"
                    transitionProperty="transform, box-shadow"
                    transitionDuration="0.2s"
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: '0 0 40px rgba(139, 61, 255, 0.5)',
                    }}
                  >
                    <Link href="#downloads">
                      <Icon as={LuDownload} />
                      Скачать
                    </Link>
                  </Button>
                )}

              <Button
                asChild
                size={{ base: 'lg', md: 'xl' }}
                variant="outline"
                borderColor="gray.700"
                color="gray.300"
                _hover={{ borderColor: 'gray.600', bg: 'gray.900' }}
              >
                <Link
                  href="https://github.com/kamiletar/letar/tree/main/apps/animatrona"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon as={LuExternalLink} />
                  GitHub
                </Link>
              </Button>
            </HStack>

            {/* Статистика с анимированными счётчиками */}
            <SimpleGrid columns={3} gap={8} pt={4}>
              <VStack gap={0}>
                <HStack gap={1}>
                  <Icon as={LuZap} color="brand.400" />
                  <AnimatedCounter value={2} suffix="x" />
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  Dual NVENC
                </Text>
              </VStack>
              <VStack gap={0}>
                <HStack gap={1}>
                  <Icon as={LuSparkles} color="brand.400" />
                  <AnimatedCounter value={95} suffix="+" />
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  VMAF качество
                </Text>
              </VStack>
              <VStack gap={0}>
                <HStack gap={1}>
                  <Icon as={LuMonitor} color="brand.400" />
                  <AnimatedCounter value={3} />
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  Платформы
                </Text>
              </VStack>
            </SimpleGrid>
          </MotionVStack>

          {/* Превью приложения */}
          <MotionBox
            flex={1}
            maxW={{ base: 'full', lg: '600px' }}
            position="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Box
              className="glass"
              borderRadius="2xl"
              overflow="hidden"
              boxShadow="0 0 60px rgba(139, 61, 255, 0.2)"
              animation="float 6s ease-in-out infinite"
            >
              {/* Скриншот или placeholder */}
              <Box
                bg="gray.900"
                aspectRatio={16 / 10}
                position="relative"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {imageError ? <ScreenshotPlaceholder /> : (
                  <Image
                    src="/screenshots/library.png"
                    alt="Animatrona - Библиотека аниме"
                    fill
                    style={{ objectFit: 'cover' }}
                    priority
                    onError={() => setImageError(true)}
                  />
                )}
              </Box>
            </Box>

            {/* Декоративные элементы */}
            <Box
              position="absolute"
              top={-4}
              right={-4}
              width={24}
              height={24}
              bgGradient="radial-gradient(circle, rgba(139, 61, 255, 0.3), transparent)"
              borderRadius="full"
              filter="blur(20px)"
              pointerEvents="none"
            />
            <Box
              position="absolute"
              bottom={-6}
              left={-6}
              width={32}
              height={32}
              bgGradient="radial-gradient(circle, rgba(88, 28, 135, 0.3), transparent)"
              borderRadius="full"
              filter="blur(30px)"
              pointerEvents="none"
            />

            {/* Маскот — floating справа-снизу */}
            <MotionBox
              position="absolute"
              bottom={{ md: -6, lg: -10 }}
              right={{ md: -6, lg: -10, xl: -14 }}
              display={{ base: 'none', md: 'block' }}
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              zIndex={10}
            >
              <Image
                src="/mascot.png"
                alt="Animatrona Mascot"
                width={140}
                height={140}
                style={{
                  filter: 'drop-shadow(0 0 25px rgba(139, 61, 255, 0.5))',
                  width: 'auto',
                  height: 'auto',
                }}
                sizes="(max-width: 1024px) 120px, (max-width: 1280px) 140px, 180px"
              />
            </MotionBox>
          </MotionBox>
        </Stack>
      </Container>
    </Box>
  )
}
