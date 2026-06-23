'use client'

import { Pressable } from '@/app/_components/pressable'
import { Link } from '@/i18n/navigation'
import { GLOW } from '@/lib/utils/constants'
import { Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useColorMode } from '@letar/chakra-provider'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
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

export function Hero() {
  const t = useTranslations('hero')
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
            </HStack>
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
