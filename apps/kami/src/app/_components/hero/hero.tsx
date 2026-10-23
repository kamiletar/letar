'use client'

import { Pressable } from '@/app/_components/pressable'
import { Link } from '@/i18n/navigation'
import { GLOW } from '@/lib/utils/constants'
import { Box, Button, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useColorMode } from '@letar/chakra-provider'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { MatrixRain } from '../matrix-rain'

// Варианты анимаций
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut' as const,
    },
  },
}

const buttonVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
}

/** Адрес студии: заявка на сайт ведёт туда, у студии своё приложение и свои адреса по языкам */
const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL || 'https://studio.letar.best'

const TILES = [
  { key: 'about', href: '/about/' },
  { key: 'projects', href: '/projects/' },
  { key: 'blog', href: '/blog/' },
  { key: 'consulting', href: '/consulting/' },
  { key: 'cv', href: '/cv/' },
] as const

export function Hero() {
  const t = useTranslations('hero')
  const locale = useLocale()
  const studioOrderHref = `${STUDIO_URL}${locale === 'ru' ? '/zayavka' : '/en/contact'}?topic=site`
  const { resolvedColorMode } = useColorMode()
  const isLight = resolvedColorMode === 'light'

  return (
    <Box
      position="relative"
      minH="100vh"
      mt="-60px"
      pt="60px"
      overflow="hidden"
      bg={{ base: 'gray.50', _dark: 'gray.900' }}
    >
      {/* Matrix Rain Background */}
      <MatrixRain
        color={isLight ? '#0a7a4a' : GLOW.color}
        fontSize={25}
        speed={40}
        fadeOpacity={isLight ? 0.03 : 0.04}
        bgRgb={isLight ? '249, 250, 251' : '0, 0, 0'}
      />

      {/* Content */}
      <VStack
        position="relative"
        zIndex={1}
        justify="center"
        align="center"
        minH="calc(100vh - 60px)"
        px={6}
        textAlign="center"
      >
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <VStack gap={4}>
            <motion.div variants={itemVariants}>
              <Text
                fontSize={{ base: 'lg', md: 'xl' }}
                color={{ base: 'gray.600', _dark: 'whiteAlpha.800' }}
                fontFamily="mono"
              >
                {t('greeting')}
              </Text>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Heading
                as="h1"
                fontSize={{ base: '4xl', md: '6xl', lg: '8xl' }}
                fontWeight="bold"
                color={{ base: 'gray.900', _dark: 'white' }}
                fontFamily="mono"
                textShadow={{ base: 'none', _dark: GLOW.textShadow }}
              >
                {t('name')}
              </Heading>
            </motion.div>

            <motion.div variants={itemVariants}>
              <VStack gap={0}>
                <Heading
                  as="h2"
                  fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }}
                  fontWeight="normal"
                  color={{ base: 'green.700', _dark: 'fg.300' }}
                >
                  {t('roleLine1')}
                </Heading>
                <Text fontSize={{ base: 'lg', md: 'xl', lg: '2xl' }} color={{ base: 'gray.700', _dark: 'fg.300' }}>
                  {t('roleLine2')}
                </Text>
              </VStack>
            </motion.div>
          </VStack>

          <motion.div variants={buttonVariants}>
            <HStack gap={4} mt={8} justify="center">
              {/* Вторичный CTA */}
              <Pressable borderRadius="md" display="inline-flex">
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  borderColor={{ base: 'green.600', _dark: 'fg.500' }}
                  color={{ base: 'gray.800', _dark: 'white' }}
                  _hover={{ bg: { base: 'white/30', _dark: 'whiteAlpha.100' } }}
                  backdropFilter={{ base: 'blur(8px)', _dark: 'none' }}
                >
                  <Link href="/about/">{t('cta.about')}</Link>
                </Button>
              </Pressable>

              {/* Основной CTA */}
              <Pressable borderRadius="md" display="inline-flex">
                <Button asChild size="lg" colorPalette="fg">
                  <Link href="/hire/">{t('cta.hire')}</Link>
                </Button>
              </Pressable>
            </HStack>
          </motion.div>

          {/* Плитки-развилка: короткий путь в основные разделы */}
          <motion.div variants={buttonVariants}>
            <SimpleGrid columns={{ base: 2, md: 3 }} gap={3} mt={10} maxW="2xl" mx="auto" textAlign="start">
              <Box
                asChild
                gridColumn={{ base: 'span 2', md: 'span 3' }}
                p={4}
                borderRadius="md"
                bg={{ base: 'green.700', _dark: 'whiteAlpha.900' }}
                color={{ base: 'white', _dark: 'gray.900' }}
              >
                <a href={studioOrderHref} rel="noopener">
                  <Text fontWeight="bold">{t('tiles.order.title')}</Text>
                  <Text fontSize="sm">{t('tiles.order.hint')}</Text>
                </a>
              </Box>
              {TILES.map((tile) => (
                <Pressable key={tile.key} borderRadius="md" display="block">
                  <Box
                    asChild
                    display="block"
                    h="full"
                    p={4}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={{ base: 'green.600', _dark: 'fg.500' }}
                    backdropFilter={{ base: 'blur(8px)', _dark: 'none' }}
                    _hover={{ bg: { base: 'white/30', _dark: 'whiteAlpha.100' } }}
                  >
                    <Link href={tile.href}>
                      <Text fontWeight="bold">{t(`tiles.${tile.key}.title`)}</Text>
                      <Text fontSize="sm" color={{ base: 'gray.700', _dark: 'fg.300' }}>
                        {t(`tiles.${tile.key}.hint`)}
                      </Text>
                    </Link>
                  </Box>
                </Pressable>
              ))}
            </SimpleGrid>
          </motion.div>
        </motion.div>
      </VStack>

      {/* Scroll indicator — декоративный, скрыт от screen readers */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1,
        }}
        role="presentation"
        aria-hidden="true"
      >
        <Box
          w={6}
          h={10}
          border="2px solid"
          borderColor={{ base: 'gray.400', _dark: 'fg.500' }}
          borderRadius="full"
          position="relative"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 4,
              height: 8,
              backgroundColor: 'var(--chakra-colors-fg-500)',
              borderRadius: 9999,
            }}
          />
        </Box>
      </motion.div>
    </Box>
  )
}
