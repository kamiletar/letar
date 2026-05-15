'use client'

import { Navigation } from '@/app/_components/navigation'
import { Link } from '@/i18n/navigation'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

/**
 * Красивая страница 404 с анимированной мандалой
 */
export default function NotFound() {
  const t = useTranslations('notFound')
  const tNav = useTranslations('nav')
  const [rotation, setRotation] = useState(0)

  // Плавное вращение мандалы
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 0.5) % 360)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Navigation />

      <Box
        minH="100vh"
        bg="black"
        position="relative"
        overflow="hidden"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {/* Анимированный градиентный фон */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          opacity={0.3}
          background="radial-gradient(ellipse at center, #CA9E67 0%, transparent 70%)"
          animation="pulse 4s ease-in-out infinite"
        />

        {/* Декоративные круги */}
        {[1, 2, 3].map((i) => (
          <Box
            key={i}
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            width={`${200 + i * 150}px`}
            height={`${200 + i * 150}px`}
            borderRadius="full"
            border="1px solid"
            borderColor="whiteAlpha.100"
            opacity={0.5 - i * 0.1}
          />
        ))}

        {/* SVG мандала */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform={`translate(-50%, -50%) rotate(${rotation}deg)`}
          width={{ base: '300px', md: '400px' }}
          height={{ base: '300px', md: '400px' }}
          opacity={0.15}
        >
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Лепестки мандалы — статичные декоративные элементы */}
            {Array.from({ length: 12 }).map((_, i) => (
              <path
                key={`petal-${i}`}
                d="M50 10 Q60 30 50 50 Q40 30 50 10"
                fill="#CA9E67"
                transform={`rotate(${i * 30} 50 50)`}
              />
            ))}
            {/* Внутренние круги */}
            <circle cx="50" cy="50" r="20" stroke="#CA9E67" strokeWidth="0.5" fill="none" />
            <circle cx="50" cy="50" r="30" stroke="#CA9E67" strokeWidth="0.3" fill="none" />
            <circle cx="50" cy="50" r="40" stroke="#CA9E67" strokeWidth="0.2" fill="none" />
            {/* Центральная точка */}
            <circle cx="50" cy="50" r="5" fill="#CA9E67" />
          </svg>
        </Box>

        {/* Контент */}
        <Container maxW="container.md" position="relative" zIndex={10}>
          <VStack gap={6} textAlign="center">
            <Heading
              as="h1"
              fontSize={{ base: '8xl', md: '9xl' }}
              fontWeight="thin"
              color="whiteAlpha.800"
              letterSpacing="wider"
              textShadow="0 0 40px rgba(202, 158, 103, 0.5)"
            >
              404
            </Heading>

            <Heading as="h2" size="xl" color="whiteAlpha.700" fontWeight="normal">
              {t('title')}
            </Heading>

            <Text fontSize="lg" color="whiteAlpha.500" maxW="md">
              {t('description')}
            </Text>

            <Box display="flex" gap={4} mt={4} flexWrap="wrap" justifyContent="center">
              <Button asChild size="lg" colorPalette="yellow" variant="solid">
                <Link href="/mandalas">{tNav('gallery')}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" colorPalette="whiteAlpha">
                <Link href="/">{t('backHome')}</Link>
              </Button>
            </Box>
          </VStack>
        </Container>

        {/* CSS анимация */}
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 0.2; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(1.1); }
            }
          `}
        </style>
      </Box>
    </>
  )
}
