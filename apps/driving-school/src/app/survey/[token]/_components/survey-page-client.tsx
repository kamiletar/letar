'use client'

/**
 * Клиентская обёртка страницы опроса.
 */

import { useState } from 'react'

import { Heading, Icon, Text, VStack } from '@chakra-ui/react'
import { LuCircleCheck, LuHeart } from 'react-icons/lu'

import { SurveyForm } from './survey-form'

interface SurveyPageClientProps {
  token: string
}

export function SurveyPageClient({ token }: SurveyPageClientProps) {
  const [isSubmitted, setIsSubmitted] = useState(false)

  if (isSubmitted) {
    return (
      <VStack gap={4} textAlign="center" py={8}>
        <Icon boxSize={16} color="green.500">
          <LuCircleCheck />
        </Icon>
        <Heading size="lg">Спасибо!</Heading>
        <Text color="fg.muted" maxW="sm">
          Ваш отзыв получен. Мы ценим ваше мнение и используем его для улучшения качества обучения.
        </Text>
        <Icon boxSize={6} color="red.500" mt={4}>
          <LuHeart />
        </Icon>
      </VStack>
    )
  }

  return <SurveyForm token={token} onSuccess={() => setIsSubmitted(true)} />
}
