import { Box, Container, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import { getTranslations } from 'next-intl/server'

import { getLatestRelease } from '@/lib/github'

/**
 * Hero секция — главный экран лендинга.
 * Анимированный градиентный фон, крупный заголовок, CTA.
 */
export async function Hero() {
  const [release, t] = await Promise.all([getLatestRelease(), getTranslations('hero')])
  const version = release?.version ?? t('fallbackVersion')
  return (
    <Box position="relative" overflow="hidden" minH="100vh" display="flex" alignItems="center">
      {/* Анимированные декоративные круги */}
      <Box
        position="absolute"
        top="-20%"
        right="-10%"
        w="600px"
        h="600px"
        borderRadius="full"
        bg="brand.500/10"
        filter="blur(100px)"
        animation="float 8s ease-in-out infinite"
        willChange="transform"
      />
      <Box
        position="absolute"
        bottom="-20%"
        left="-10%"
        w="500px"
        h="500px"
        borderRadius="full"
        bg="accent.500/10"
        filter="blur(100px)"
        animation="float 10s ease-in-out infinite 2s"
        willChange="transform"
      />
      <Box
        position="absolute"
        top="30%"
        left="40%"
        w="300px"
        h="300px"
        borderRadius="full"
        bg="brand.400/5"
        filter="blur(80px)"
        animation="pulse 6s ease-in-out infinite 1s"
        willChange="transform, opacity"
      />

      <Container maxW="4xl" position="relative" zIndex={1}>
        <VStack gap={8} textAlign="center">
          {/* Бейдж */}
          <Box
            px={4}
            py={1.5}
            borderRadius="full"
            border="1px solid"
            borderColor="brand.border"
            bg="brand.subtle"
            fontSize="sm"
            color="brand.fg"
            fontWeight="medium"
          >
            {t('badge', { version })}
          </Box>

          {/* Заголовок */}
          <Heading
            as="h1"
            fontSize={{ base: '4xl', md: '6xl', lg: '7xl' }}
            fontWeight="extrabold"
            lineHeight={1.1}
            letterSpacing="tight"
          >
            {t('title1')}
            <br />
            <Text as="span" bgGradient="to-r" gradientFrom="brand.400" gradientTo="accent.400" bgClip="text">
              {t('title2')}
            </Text>
          </Heading>

          {/* Подзаголовок */}
          <Text fontSize={{ base: 'lg', md: 'xl' }} color="fg.muted" maxW="2xl" lineHeight="tall">
            {t('subtitle')}
          </Text>

          {/* CTA кнопки */}
          <HStack gap={4} flexWrap="wrap" justify="center">
            <Link
              href="#download"
              px={8}
              py={3}
              borderRadius="lg"
              bg="brand.solid"
              color="brand.contrast"
              fontWeight="semibold"
              fontSize="lg"
              _hover={{ opacity: 0.9, transform: 'translateY(-1px)' }}
              transition="all 0.2s"
              textDecoration="none"
            >
              {t('ctaDownload')}
            </Link>
            <Link
              href="https://github.com/kamiletar/aira"
              target="_blank"
              rel="noopener noreferrer"
              px={8}
              py={3}
              borderRadius="lg"
              border="1px solid"
              borderColor="border.emphasized"
              color="fg"
              fontWeight="semibold"
              fontSize="lg"
              _hover={{ bg: 'bg.subtle', transform: 'translateY(-1px)' }}
              transition="all 0.2s"
              textDecoration="none"
            >
              {t('ctaSource')}
            </Link>
          </HStack>

          {/* Теги */}
          <HStack gap={3} flexWrap="wrap" justify="center" mt={4}>
            {['ML-KEM-768', 'ML-DSA-65', 'P2P', 'Rust', t('tagOpenSource')].map((tag) => (
              <Box
                key={tag}
                px={3}
                py={1}
                borderRadius="md"
                bg="bg.subtle"
                fontSize="xs"
                color="fg.muted"
                fontFamily="mono"
              >
                {tag}
              </Box>
            ))}
          </HStack>
        </VStack>
      </Container>
    </Box>
  )
}
