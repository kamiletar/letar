'use client'

import { Link as LocalizedLink } from '@/i18n/navigation'
import { Box, Button, Heading, HStack, Link, Text } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { LuHeart, LuSparkles } from 'react-icons/lu'
import { useWelcomePortalState } from '../_hooks'

const MotionBox = motion.create(Box)

/** Мандала для навигации */
interface MandalaForNavigation {
  slug: string
}

interface WelcomePortalProps {
  /** Список мандал для случайного выбора */
  mandalas: MandalaForNavigation[]
}

/**
 * Приветственный портал на главной странице.
 * - Glassmorphism дизайн
 * - Анимированное приветствие
 * - Кнопка "Начать медитацию" → случайная мандала в fullscreen
 * - Сохраняет состояние в localStorage
 */
export function WelcomePortal({ mandalas }: WelcomePortalProps) {
  const t = useTranslations('welcomePortal')
  const { isVisible, isReady, handleClose, handleStartMeditation, handleBackdropClick } = useWelcomePortalState({
    mandalas,
  })

  // Не рендерим до проверки localStorage
  if (!isReady) {
    return null
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <MotionBox
          position="fixed"
          inset={0}
          zIndex={10000}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="blackAlpha.700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onClick={handleBackdropClick}
        >
          {/* Glassmorphism контейнер */}
          <MotionBox
            bg="blackAlpha.600"
            backdropFilter="blur(20px)"
            borderRadius="2xl"
            border="1px solid"
            borderColor="whiteAlpha.200"
            p={{ base: 6, md: 10 }}
            maxW={{ base: '90vw', md: '500px' }}
            textAlign="center"
            boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: {
                duration: 0.5,
                delay: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94],
              },
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
          >
            {/* Иконка */}
            <MotionBox
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { delay: 0.4, duration: 0.5 },
              }}
              mb={4}
            >
              <Box as={LuSparkles} color="brand.400" fontSize={{ base: '3xl', md: '4xl' }} mx="auto" />
            </MotionBox>

            {/* Заголовок */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { delay: 0.5, duration: 0.5 },
              }}
            >
              <Heading
                as="h1"
                size={{ base: 'xl', md: '2xl' }}
                fontWeight="light"
                color="white"
                mb={3}
                letterSpacing="wide"
              >
                {t('title')}
              </Heading>
              <Text fontSize={{ base: 'lg', md: 'xl' }} color="whiteAlpha.800" fontStyle="italic" mb={6}>
                {t('subtitle')}
              </Text>
            </MotionBox>

            {/* Описание */}
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: 0.7, duration: 0.5 },
              }}
            >
              <Text color="gray.400" fontSize="sm" mb={8} lineHeight="tall">
                {t('description')}
              </Text>
            </MotionBox>

            {/* Кнопка "Начать медитацию" */}
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { delay: 0.9, duration: 0.5 },
              }}
              mb={6}
            >
              <Button
                size="lg"
                colorPalette="brand"
                onClick={handleStartMeditation}
                _hover={{
                  transform: 'scale(1.05)',
                  boxShadow: '0 0 30px rgba(202, 158, 103, 0.4)',
                }}
                transitionProperty="transform, box-shadow"
                transitionDuration="0.3s"
              >
                <LuHeart />
                {t('startMeditation')}
              </Button>
            </MotionBox>

            {/* Навигационные ссылки */}
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: 1.1, duration: 0.5 },
              }}
            >
              <HStack gap={4} justify="center" flexWrap="wrap">
                <Link asChild color="whiteAlpha.600" fontSize="sm" _hover={{ color: 'white' }}>
                  <LocalizedLink href="/mandalas" onClick={handleClose}>
                    {t('gallery')}
                  </LocalizedLink>
                </Link>
                <Text color="whiteAlpha.300">•</Text>
                <Link asChild color="whiteAlpha.600" fontSize="sm" _hover={{ color: 'white' }}>
                  <LocalizedLink href="/about-elfafeya" onClick={handleClose}>
                    {t('aboutArtist')}
                  </LocalizedLink>
                </Link>
                <Text color="whiteAlpha.300">•</Text>
                <Link asChild color="whiteAlpha.600" fontSize="sm" _hover={{ color: 'white' }}>
                  <LocalizedLink href="/about-mandalas" onClick={handleClose}>
                    {t('aboutMandalas')}
                  </LocalizedLink>
                </Link>
              </HStack>
            </MotionBox>

            {/* Подсказка */}
            <MotionBox
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: 1.3, duration: 0.5 },
              }}
              mt={8}
            >
              <Text color="whiteAlpha.400" fontSize="xs">
                {t('clickToClose')}
              </Text>
            </MotionBox>
          </MotionBox>
        </MotionBox>
      )}
    </AnimatePresence>
  )
}
