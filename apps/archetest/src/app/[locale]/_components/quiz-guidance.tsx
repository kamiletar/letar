'use client'

import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { getQuizSignInHref } from '../_lib/quiz-navigation'

interface QuizGuidanceProps {
  isAuthenticated: boolean
  onContinue: () => void
}

/** Короткая инструкция перед вопросами; вход остаётся добровольным. */
export function QuizGuidance({ isAuthenticated, onContinue }: QuizGuidanceProps) {
  const t = useTranslations('quiz.guidance')
  const locale = useLocale()
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <Container
      id="quiz-guidance"
      maxW="2xl"
      pt={{ base: 8, md: 14 }}
      pb="calc(var(--letar-cookie-banner-height, 0px) + 2rem)"
    >
      <VStack gap={6} align="stretch">
        <VStack gap={3} textAlign="center">
          <Text fontSize="sm" fontWeight="semibold" color="brand.fg">{t('eyebrow')}</Text>
          <Heading ref={headingRef} tabIndex={-1} size="xl">{t('title')}</Heading>
          <Text color="fg.muted">{t('intro')}</Text>
        </VStack>
        <Box p={{ base: 5, md: 6 }} borderRadius="xl" bg="bg.subtle" borderWidth="1px" borderColor="border">
          <VStack gap={4} align="stretch">
            <Text>{t('answer')}</Text>
            <Text color="fg.muted">{t('honesty')}</Text>
            <Text fontSize="sm" color="fg.muted">{t('skip')}</Text>
          </VStack>
        </Box>
        {!isAuthenticated && (
          <Box p={{ base: 5, md: 6 }} borderRadius="xl" borderWidth="1px" borderColor="border">
            <VStack gap={3} align="stretch">
              <Heading size="md">{t('guestTitle')}</Heading>
              <Text fontSize="sm" color="fg.muted">{t('guestDescription')}</Text>
              <Button asChild variant="outline" size="lg" alignSelf={{ base: 'stretch', sm: 'start' }}>
                <Link href={getQuizSignInHref(locale, 'guidance')}>{t('signIn')}</Link>
              </Button>
              <Text fontSize="sm" color="fg.muted">{t('guestChoice')}</Text>
            </VStack>
          </Box>
        )}
        <Button
          size="lg"
          colorPalette="brand"
          alignSelf={{ base: 'stretch', sm: 'center' }}
          minW="12rem"
          onClick={onContinue}
        >
          {t('continue')}
        </Button>
      </VStack>
    </Container>
  )
}
