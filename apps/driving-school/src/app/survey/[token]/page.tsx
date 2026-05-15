import { Box, Card, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuCircleAlert, LuCircleCheck, LuClock } from 'react-icons/lu'

import { getSurveyByTokenAction } from '../../(school-admin)/school/surveys/_actions/survey.action'

import { SurveyPageClient } from './_components/survey-page-client'

export const metadata: Metadata = {
  title: 'Опрос',
  description: 'Помогите нам стать лучше — оставьте отзыв о нашей автошколе',
}

interface SurveyPageProps {
  params: Promise<{ token: string }>
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { token } = await params

  const result = await getSurveyByTokenAction(token)

  // Ошибка загрузки
  if (!result.success) {
    return (
      <SurveyLayout>
        <Card.Root maxW="md" mx="auto">
          <Card.Body>
            <VStack gap={4} textAlign="center">
              <Icon boxSize={12} color="red.500">
                <LuCircleAlert />
              </Icon>
              <Heading size="md">Опрос не найден</Heading>
              <Text color="fg.muted">Возможно, ссылка устарела или опрос был удалён.</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </SurveyLayout>
    )
  }

  const { surveyName, surveyDescription, studentName, schoolName, isExpired, isCompleted } = result.data

  // Опрос уже заполнен
  if (isCompleted) {
    return (
      <SurveyLayout schoolName={schoolName}>
        <Card.Root maxW="md" mx="auto">
          <Card.Body>
            <VStack gap={4} textAlign="center">
              <Icon boxSize={12} color="green.500">
                <LuCircleCheck />
              </Icon>
              <Heading size="md">Спасибо за ваш отзыв!</Heading>
              <Text color="fg.muted">Вы уже заполнили этот опрос. Ваше мнение очень важно для нас.</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </SurveyLayout>
    )
  }

  // Опрос просрочен
  if (isExpired) {
    return (
      <SurveyLayout schoolName={schoolName}>
        <Card.Root maxW="md" mx="auto">
          <Card.Body>
            <VStack gap={4} textAlign="center">
              <Icon boxSize={12} color="orange.500">
                <LuClock />
              </Icon>
              <Heading size="md">Срок действия истёк</Heading>
              <Text color="fg.muted">К сожалению, время для заполнения этого опроса уже прошло.</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </SurveyLayout>
    )
  }

  // Активный опрос
  return (
    <SurveyLayout schoolName={schoolName}>
      <Card.Root maxW="lg" mx="auto">
        <Card.Header>
          <VStack align="start" gap={1}>
            <Heading size="lg">{surveyName}</Heading>
            {surveyDescription && <Text color="fg.muted">{surveyDescription}</Text>}
            <Text fontSize="sm" color="fg.muted" mt={2}>
              Здравствуйте, {studentName}! Пожалуйста, уделите минуту вашего времени.
            </Text>
          </VStack>
        </Card.Header>

        <Card.Body>
          <SurveyPageClient token={token} />
        </Card.Body>
      </Card.Root>
    </SurveyLayout>
  )
}

/**
 * Layout для страницы опроса.
 */
function SurveyLayout({ children, schoolName }: { children: React.ReactNode; schoolName?: string }) {
  return (
    <Box minH="100vh" bg="bg.muted" py={{ base: 6, md: 12 }} px={4}>
      <VStack gap={6}>
        {/* Логотип школы */}
        {schoolName && (
          <Text fontSize="lg" fontWeight="semibold" color="fg.muted">
            {schoolName}
          </Text>
        )}

        {/* Контент */}
        {children}

        {/* Footer */}
        <Text fontSize="xs" color="fg.muted" textAlign="center" mt={8}>
          Ваши данные защищены и используются только для улучшения качества обучения.
        </Text>
      </VStack>
    </Box>
  )
}
