import { Box, Container, Grid, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { getTranslations } from 'next-intl/server'
import type { IconType } from 'react-icons/lib'
import { LuApple, LuDownload, LuMonitor, LuSmartphone, LuTerminal } from 'react-icons/lu'

import { findAsset, findAssetByKind, formatSize, getLatestRelease } from '@/lib/github'

interface PortableLink {
  href: string
  label: string
}

interface PlatformCardProps {
  icon: IconType
  name: string
  description: string
  status: 'available' | 'soon'
  href?: string
  fileSize?: string
  fileFormat?: string
  downloadLabel: string
  portable?: PortableLink
}

/**
 * Derive a short, human-readable format label from a filename
 * ("aira-0.3.5-setup.msi" → "MSI", "Aira-0.3.5-arm64.dmg" → "DMG", ...).
 */
function fileFormatLabel(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.msi')) {
    return 'MSI'
  }
  if (lower.endsWith('.dmg')) {
    return 'DMG'
  }
  if (lower.endsWith('.appimage')) {
    return 'AppImage'
  }
  if (lower.endsWith('.apk')) {
    return 'APK'
  }
  if (lower.endsWith('.tar.gz')) {
    return 'tar.gz'
  }
  if (lower.endsWith('.zip')) {
    return 'ZIP'
  }
  return ''
}

/**
 * Карточка платформы для скачивания
 */
function PlatformCard({
  icon: Icon,
  name,
  description,
  status,
  href,
  fileSize,
  fileFormat,
  downloadLabel,
  portable,
}: PlatformCardProps) {
  const isAvailable = status === 'available'

  return (
    <Box
      p={6}
      borderRadius="xl"
      bg="bg.surface"
      border="1px solid"
      borderColor={isAvailable ? 'brand.border' : 'border'}
      opacity={isAvailable ? 1 : 0.6}
      _hover={isAvailable ? { borderColor: 'brand.solid', transform: 'translateY(-2px)' } : undefined}
      transition="all 0.3s"
    >
      <VStack align="start" gap={4}>
        <Box color={isAvailable ? 'brand.fg' : 'fg.muted'}>
          <Icon size={32} />
        </Box>
        <Box>
          <Heading as="h3" size="md" mb={1}>
            {name}
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            {description}
          </Text>
        </Box>
        {isAvailable && href && (
          <VStack align="start" gap={2} w="full">
            <HStack gap={3} align="center">
              <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                display="flex"
                alignItems="center"
                gap={2}
                color="brand.fg"
                fontWeight="medium"
                fontSize="sm"
                _hover={{ color: 'brand.solid' }}
              >
                <LuDownload size={16} />
                {downloadLabel}
                {fileFormat && ` (${fileFormat})`}
              </Link>
              {fileSize && (
                <Text fontSize="xs" color="fg.muted">
                  {fileSize}
                </Text>
              )}
            </HStack>
            {portable && (
              <Link
                href={portable.href}
                target="_blank"
                rel="noopener noreferrer"
                fontSize="xs"
                color="fg.muted"
                _hover={{ color: 'brand.fg' }}
              >
                {portable.label}
              </Link>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  )
}

/**
 * Секция скачивания — динамически подтягивает релизы с GitHub
 */
export async function DownloadSection() {
  const [release, t] = await Promise.all([getLatestRelease(), getTranslations('download')])
  const assets = release?.assets ?? []

  const linuxAsset = findAsset(assets, 'linux', 'x86_64')
  const macArmAsset = findAsset(assets, 'macos', 'aarch64')
  const macIntelAsset = findAsset(assets, 'macos', 'x86_64')
  const windowsAsset = findAsset(assets, 'windows', 'x86_64')
  const androidAsset = findAsset(assets, 'android', 'aarch64')

  const linuxPortable = findAssetByKind(assets, 'linux', 'x86_64', 'portable')
  const macArmPortable = findAssetByKind(assets, 'macos', 'aarch64', 'portable')
  const macIntelPortable = findAssetByKind(assets, 'macos', 'x86_64', 'portable')
  const windowsPortable = findAssetByKind(assets, 'windows', 'x86_64', 'portable')

  const fallbackHref = 'https://github.com/kamiletar/aira/releases/latest'
  const downloadLabel = t('downloadLabel')
  const portableLabelKey = 'portableLabel'

  const portableLink = (asset: typeof linuxPortable): PortableLink | undefined => {
    if (!asset) {
      return undefined
    }
    const format = fileFormatLabel(asset.name)
    return {
      href: asset.url,
      label: `${t(portableLabelKey)} (${format}, ${formatSize(asset.size)})`,
    }
  }

  const platforms: PlatformCardProps[] = [
    {
      icon: LuTerminal,
      name: t('linuxName'),
      description: t('linuxDescription'),
      status: 'available',
      href: linuxAsset?.url ?? fallbackHref,
      fileSize: linuxAsset ? formatSize(linuxAsset.size) : undefined,
      fileFormat: linuxAsset ? fileFormatLabel(linuxAsset.name) : undefined,
      downloadLabel,
      portable: portableLink(linuxPortable),
    },
    {
      icon: LuApple,
      name: t('macArmName'),
      description: t('macArmDescription'),
      status: 'available',
      href: macArmAsset?.url ?? fallbackHref,
      fileSize: macArmAsset ? formatSize(macArmAsset.size) : undefined,
      fileFormat: macArmAsset ? fileFormatLabel(macArmAsset.name) : undefined,
      downloadLabel,
      portable: portableLink(macArmPortable),
    },
    {
      icon: LuApple,
      name: t('macIntelName'),
      description: t('macIntelDescription'),
      status: 'available',
      href: macIntelAsset?.url ?? fallbackHref,
      fileSize: macIntelAsset ? formatSize(macIntelAsset.size) : undefined,
      fileFormat: macIntelAsset ? fileFormatLabel(macIntelAsset.name) : undefined,
      downloadLabel,
      portable: portableLink(macIntelPortable),
    },
    {
      icon: LuMonitor,
      name: t('windowsName'),
      description: t('windowsDescription'),
      status: 'available',
      href: windowsAsset?.url ?? fallbackHref,
      fileSize: windowsAsset ? formatSize(windowsAsset.size) : undefined,
      fileFormat: windowsAsset ? fileFormatLabel(windowsAsset.name) : undefined,
      downloadLabel,
      portable: portableLink(windowsPortable),
    },
    {
      icon: LuSmartphone,
      name: t('androidName'),
      description: t('androidDescription'),
      status: 'available',
      href: androidAsset?.url ?? fallbackHref,
      fileSize: androidAsset ? formatSize(androidAsset.size) : undefined,
      fileFormat: androidAsset ? fileFormatLabel(androidAsset.name) : undefined,
      downloadLabel,
    },
  ]

  const subtitle = release ? t('subtitleWithVersion', { version: release.version }) : t('subtitle')

  return (
    <Box id="download" py={24}>
      <Container maxW="6xl">
        <VStack gap={12}>
          <VStack gap={4} textAlign="center" maxW="2xl">
            <Heading as="h2" size="3xl" fontWeight="bold">
              {t('title')}
            </Heading>
            <Text fontSize="lg" color="fg.muted">
              {subtitle}
            </Text>
          </VStack>

          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6} w="full">
            {platforms.map((platform) => (
              <PlatformCard key={platform.name} {...platform} />
            ))}
          </Grid>

          {/* Установка через Cargo */}
          <Box p={6} borderRadius="xl" bg="bg.surface" border="1px solid" borderColor="border" w="full" maxW="2xl">
            <Text fontSize="sm" color="fg.muted" mb={3}>
              {t('cargoLabel')}
            </Text>
            <Box p={4} borderRadius="lg" bg="bg.muted" fontFamily="mono" fontSize="sm">
              cargo install aira-cli
            </Box>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}
