import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuArrowLeft } from 'react-icons/lu'
import { getLessonType } from '../../../_actions/lesson-type.action'
import { PricingOptionForm } from '../../../_components/pricing-option-form'

export const metadata = {
  title: 'Новый вариант цены',
  description: 'Добавление нового варианта цены',
}

interface NewPricingPageProps {
  params: Promise<{ id: string }>
}

export default async function NewPricingPage({ params }: NewPricingPageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/lesson-types')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const { id } = await params
  const result = await getLessonType(id)

  if (!result.success) {
    if (result.error === 'NOT_FOUND') {
      notFound()
    }
    return (
      <Container maxW="container.md" py={8}>
        <Box layerStyle="panel.error" p={6} textAlign="center">
          <Heading size="lg" color="error.fg">
            Ошибка
          </Heading>
          <Text color="error.fg" mt={2}>
            Не удалось загрузить тип занятия
          </Text>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <Button asChild variant="ghost" size="sm" alignSelf="flex-start">
          <Link href={`/lesson-types/${id}/pricing`}>
            <LuArrowLeft />
            Назад к вариантам цен
          </Link>
        </Button>

        {/* Заголовок */}
        <Box>
          <Heading size="xl">Новый вариант цены</Heading>
          <Text color="fg.muted" mt={2}>
            Тип занятия: <strong>{result.lessonType.name}</strong>
          </Text>
        </Box>

        {/* Форма */}
        <Box bg="bg.panel" p={6} borderRadius="lg" borderWidth="1px">
          <PricingOptionForm lessonTypeId={id} />
        </Box>
      </VStack>
    </Container>
  )
}
