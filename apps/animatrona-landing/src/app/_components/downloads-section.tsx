'use client'

import { formatFileSize } from '@/lib/github'
import type { MacArch, ParsedRelease, Platform, ReleaseAsset } from '@/types/release'
import { Badge, Box, Button, Card, Container, Heading, HStack, Link, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa6'
import { LuCheck, LuDownload } from 'react-icons/lu'

interface DownloadsSectionProps {
  release: ParsedRelease | null
}

interface PlatformCardProps {
  platform: Platform
  release: ParsedRelease | null
  isCurrentPlatform: boolean
}

const PLATFORM_INFO: Record<
  Platform,
  {
    name: string
    icon: typeof FaWindows
    requirements: string[]
    color: string
  }
> = {
  windows: {
    name: 'Windows',
    icon: FaWindows,
    requirements: ['Windows 10+', 'NVIDIA GPU (опционально)'],
    color: '#0078D4',
  },
  macos: {
    name: 'macOS',
    icon: FaApple,
    requirements: ['macOS 10.13+', 'Intel или Apple Silicon', 'Разрешить в настройках*'],
    color: '#FFFFFF',
  },
  linux: {
    name: 'Linux',
    icon: FaLinux,
    requirements: ['Ubuntu 18.04+', 'Debian, Fedora, Arch'],
    color: '#FCC624',
  },
}

/**
 * Определяет платформу пользователя по userAgent
 */
function detectPlatform(): Platform | null {
  if (typeof window === 'undefined') {
    return null
  }

  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes('win')) {
    return 'windows'
  }
  if (userAgent.includes('mac')) {
    return 'macos'
  }
  if (userAgent.includes('linux')) {
    return 'linux'
  }

  return null
}

/**
 * Определяет архитектуру Mac (Apple Silicon или Intel)
 */
function detectMacArch(): MacArch | null {
  if (typeof window === 'undefined') {
    return null
  }

  // Проверяем через userAgentData (Chrome 90+, Edge 90+)
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string; architecture?: string } })
    .userAgentData
  if (uaData?.architecture === 'arm') {
    return 'arm64'
  }
  if (uaData?.architecture === 'x86') {
    return 'x64'
  }

  // Fallback: проверяем WebGL renderer для Apple Silicon
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        // Apple Silicon GPU содержит "Apple" в названии
        if (typeof renderer === 'string' && renderer.includes('Apple')) {
          return 'arm64'
        }
      }
    }
  } catch {
    // Игнорируем ошибки WebGL
  }

  // По умолчанию для Mac — Intel (безопаснее для совместимости)
  return 'x64'
}

/**
 * Кнопка скачивания для одного ассета
 */
function DownloadButton({
  asset,
  label,
  isPrimary,
}: {
  asset: ReleaseAsset | null
  label: string
  isPrimary: boolean
}) {
  if (!asset) {
    return (
      <Button colorPalette="purple" size="lg" w="full" disabled opacity={0.5} cursor="not-allowed">
        <LuDownload />
        {label}
      </Button>
    )
  }

  return (
    <Button asChild colorPalette="purple" size="lg" w="full" variant={isPrimary ? 'solid' : 'outline'}>
      <Link href={asset.browser_download_url} target="_blank" rel="noopener noreferrer">
        <LuDownload />
        {label}
      </Link>
    </Button>
  )
}

interface MacOSCardProps {
  release: ParsedRelease | null
  isCurrentPlatform: boolean
  detectedArch: MacArch | null
}

/**
 * Карточка macOS с двумя кнопками скачивания (Apple Silicon и Intel)
 */
function MacOSCard({ release, isCurrentPlatform, detectedArch }: MacOSCardProps) {
  const info = PLATFORM_INFO.macos
  const PlatformIcon = info.icon
  const macAssets = release?.assets.macos

  // Определяем рекомендуемую архитектуру
  const recommendedArch = detectedArch || 'arm64'

  return (
    <Card.Root
      className="glass"
      borderRadius="xl"
      overflow="hidden"
      transitionProperty="border-color, box-shadow, transform"
      transitionDuration="0.3s"
      transitionTimingFunction="ease"
      position="relative"
      borderWidth={isCurrentPlatform ? '2px' : '1px'}
      borderColor={isCurrentPlatform ? 'brand.500' : 'gray.800'}
      _hover={{
        borderColor: isCurrentPlatform ? 'brand.400' : 'brand.500/50',
        boxShadow: '0 0 30px rgba(139, 61, 255, 0.15)',
        transform: 'translateY(-4px)',
      }}
    >
      {/* Бейдж "Ваша система" */}
      {isCurrentPlatform && (
        <Badge
          position="absolute"
          top={3}
          right={3}
          colorPalette="purple"
          px={2}
          py={0.5}
          borderRadius="full"
          fontSize="xs"
        >
          Ваша система
        </Badge>
      )}

      <Card.Body p={6}>
        <VStack gap={4} align="stretch">
          {/* Заголовок платформы */}
          <HStack justify="center" gap={3}>
            <PlatformIcon size={24} color={info.color} />
            <Heading as="h3" size="lg">
              {info.name}
            </Heading>
          </HStack>

          {/* Две кнопки скачивания */}
          <VStack gap={2} w="full">
            {/* Apple Silicon (рекомендуется для M1/M2/M3) */}
            <VStack gap={1} w="full">
              <DownloadButton
                asset={macAssets?.arm64 || null}
                label="Apple Silicon (M1/M2/M3)"
                isPrimary={isCurrentPlatform && recommendedArch === 'arm64'}
              />
              {macAssets?.arm64 && (
                <Text color="gray.600" fontSize="xs">
                  {formatFileSize(macAssets.arm64.size)}
                </Text>
              )}
            </VStack>

            {/* Intel */}
            <VStack gap={1} w="full">
              <DownloadButton
                asset={macAssets?.x64 || null}
                label="Intel"
                isPrimary={isCurrentPlatform && recommendedArch === 'x64'}
              />
              {macAssets?.x64 && (
                <Text color="gray.600" fontSize="xs">
                  {formatFileSize(macAssets.x64.size)}
                </Text>
              )}
            </VStack>
          </VStack>

          {/* Требования */}
          <VStack gap={1} align="start" pt={2}>
            {info.requirements.map((req) => (
              <HStack key={req} gap={2}>
                <LuCheck color="var(--chakra-colors-green-400)" size={12} />
                <Text fontSize="xs" color="gray.500">
                  {req}
                </Text>
              </HStack>
            ))}
          </VStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

function PlatformCard({ platform, release, isCurrentPlatform }: PlatformCardProps) {
  const info = PLATFORM_INFO[platform]
  const PlatformIcon = info.icon
  // Для Windows и Linux — обычный ассет
  const asset = platform === 'macos' ? null : (release?.assets[platform] as ReleaseAsset | null)

  return (
    <Card.Root
      className="glass"
      borderRadius="xl"
      overflow="hidden"
      transitionProperty="border-color, box-shadow, transform"
      transitionDuration="0.3s"
      transitionTimingFunction="ease"
      position="relative"
      borderWidth={isCurrentPlatform ? '2px' : '1px'}
      borderColor={isCurrentPlatform ? 'brand.500' : 'gray.800'}
      _hover={{
        borderColor: isCurrentPlatform ? 'brand.400' : 'brand.500/50',
        boxShadow: '0 0 30px rgba(139, 61, 255, 0.15)',
        transform: 'translateY(-4px)',
      }}
    >
      {/* Бейдж "Ваша система" */}
      {isCurrentPlatform && (
        <Badge
          position="absolute"
          top={3}
          right={3}
          colorPalette="purple"
          px={2}
          py={0.5}
          borderRadius="full"
          fontSize="xs"
        >
          Ваша система
        </Badge>
      )}

      <Card.Body p={6}>
        <VStack gap={4} align="stretch">
          {/* Заголовок платформы */}
          <HStack justify="center" gap={3}>
            <PlatformIcon size={24} color={info.color} />
            <Heading as="h3" size="lg">
              {info.name}
            </Heading>
          </HStack>

          {/* Размер файла */}
          {asset && (
            <Text color="gray.500" fontSize="sm" textAlign="center">
              {asset.name} • {formatFileSize(asset.size)}
            </Text>
          )}

          {/* Кнопка скачивания */}
          <DownloadButton asset={asset} label="Скачать" isPrimary={isCurrentPlatform} />

          {/* Требования */}
          <VStack gap={1} align="start" pt={2}>
            {info.requirements.map((req) => (
              <HStack key={req} gap={2}>
                <LuCheck color="var(--chakra-colors-green-400)" size={12} />
                <Text fontSize="xs" color="gray.500">
                  {req}
                </Text>
              </HStack>
            ))}
          </VStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

export function DownloadsSection({ release }: DownloadsSectionProps) {
  const [currentPlatform, setCurrentPlatform] = useState<Platform | null>(null)
  const [macArch, setMacArch] = useState<MacArch | null>(null)

  useEffect(() => {
    const platform = detectPlatform()
    setCurrentPlatform(platform)

    // Определяем архитектуру Mac только если платформа macOS
    if (platform === 'macos') {
      setMacArch(detectMacArch())
    }
  }, [])

  // Сортируем платформы так, чтобы текущая была первой
  const platforms: Platform[] = ['windows', 'macos', 'linux']
  const sortedPlatforms = currentPlatform
    ? [currentPlatform, ...platforms.filter((p) => p !== currentPlatform)]
    : platforms

  return (
    <Box as="section" id="downloads" py={{ base: 16, md: 24 }} bg="gray.900/50">
      <Container maxW="container.xl">
        <VStack gap={12}>
          {/* Заголовок */}
          <VStack gap={4} textAlign="center">
            <Heading as="h2" size={{ base: '2xl', md: '3xl' }}>
              Скачать
            </Heading>
            {release && (
              <HStack gap={2}>
                <Badge colorPalette="purple" px={3} py={1} borderRadius="full">
                  v{release.version}
                </Badge>
                <Text color="gray.500" fontSize="sm">
                  {release.date}
                </Text>
              </HStack>
            )}
          </VStack>

          {/* Карточки платформ */}
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} w="full" maxW="4xl">
            {sortedPlatforms.map((platform) =>
              platform === 'macos'
                ? (
                  <MacOSCard
                    key={platform}
                    release={release}
                    isCurrentPlatform={currentPlatform === 'macos'}
                    detectedArch={macArch}
                  />
                )
                : (
                  <PlatformCard
                    key={platform}
                    platform={platform}
                    release={release}
                    isCurrentPlatform={platform === currentPlatform}
                  />
                )
            )}
          </SimpleGrid>

          {/* Системные требования */}
          <VStack gap={2} textAlign="center">
            <Text color="gray.500" fontSize="sm">
              Рекомендуется: NVIDIA GPU с NVENC для GPU-ускорения (RTX серия)
            </Text>
            <Text color="gray.600" fontSize="xs">
              Без GPU приложение использует CPU кодирование (libsvtav1)
            </Text>
            <Text color="gray.600" fontSize="xs" pt={2}>
              * macOS: Приложение не подписано. При первом запуске откройте{' '}
              <Text as="span" color="gray.400">
                Системные настройки → Конфиденциальность → Основные → «Всё равно открыть»
              </Text>
            </Text>
          </VStack>
        </VStack>
      </Container>
    </Box>
  )
}
