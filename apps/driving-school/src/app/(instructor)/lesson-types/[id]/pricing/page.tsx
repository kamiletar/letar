import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Button, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuArrowLeft, LuPlus } from 'react-icons/lu'
import { getLessonType, getPricingOptions } from '../../_actions/lesson-type.action'
import { PricingOptionsList } from '../../_components/pricing-options-list'

export const metadata = {
  title: 'Варианты цен',
  description: 'Управление вариантами цен для типа занятия',
}

interface PricingPageProps {
  params: Promise<{ id: string }>
}

export default async function PricingPage({ params }: PricingPageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/lesson-types')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const { id } = await params

  // Получаем тип занятия и варианты цен параллельно
  const [lessonTypeResult, pricingResult] = await Promise.all([getLessonType(id), getPricingOptions(id)])

  if (!lessonTypeResult.success) {
    if (lessonTypeResult.error === 'NOT_FOUND') {
      notFound()
    }
    return (
      <Container maxW="container.lg" py={8}>
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

  const lessonType = lessonTypeResult.lessonType
  const pricingOptions = pricingResult.success ? pricingResult.pricingOptions : []

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Button asChild variant="ghost" size="sm">
            <Link href="/lesson-types">
              <LuArrowLeft />К типам занятий
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/lesson-types/${id}/edit`}>Редактировать тип</Link>
          </Button>
        </HStack>

        {/* Заголовок */}
        <Box>
          <Heading size="xl">Варианты цен: {lessonType.name}</Heading>
          <Text color="fg.muted" mt={2}>
            Настройте разные цены для разных условий: на вашей машине, на машине ученика, курсы со скидками
          </Text>
        </Box>

        {/* Кнопка добавления */}
        <Box>
          <Button asChild colorPalette="brand">
            <Link href={`/lesson-types/${id}/pricing/new`}>
              <LuPlus />
              Добавить вариант цены
            </Link>
          </Button>
        </Box>

        {/* Список вариантов цен */}
        <PricingOptionsList lessonTypeId={id} pricingOptions={pricingOptions} />

        {/* Подсказка если нет вариантов */}
        {pricingOptions.length === 0 && (
          <Box bg="bg.info" p={4} borderRadius="lg" borderWidth="1px" borderColor="border.info">
            <Text fontSize="sm">
              Пока нет вариантов цен. Добавьте первый вариант, чтобы ученики могли видеть стоимость занятий.
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
