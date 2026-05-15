import { Gender } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Card, Heading, Text, VStack } from '@chakra-ui/react'
import { MeasurementsFormWithRecommendations } from '../_components/measurements-form-with-recommendations'

export const metadata = {
  title: 'Мои замеры — Премиум РосСтиль',
  description: 'Редактирование замеров для подбора размера',
}

export default async function EditMeasurementsPage() {
  const authUser = await requireAuth()

  const db = getEnhancedPrisma(authUser)

  // Получаем замеры пользователя (если есть) и профиль для пола
  const [measurements, userProfile] = await Promise.all([
    db.userMeasurements.findUnique({
      where: { userId: authUser.id },
    }),
    db.userProfile.findUnique({
      where: { userId: authUser.id },
      select: { gender: true },
    }),
  ])

  // Получаем все размеры для рекомендации
  const sizes = await db.productSize.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
  })

  // Подготовка данных для формы
  const defaultValue = measurements
    ? {
        gender: measurements.gender,
        bust: measurements.bust ?? undefined,
        waist: measurements.waist ?? undefined,
        hips: measurements.hips ?? undefined,
        height: measurements.height ?? undefined,
        preferredSize: measurements.preferredSize ?? undefined,
        notes: measurements.notes ?? undefined,
      }
    : {
        // Если замеров нет, используем пол из профиля или FEMALE по умолчанию
        gender: userProfile?.gender ?? Gender.FEMALE,
      }

  return (
    <VStack align="stretch" gap={6}>
      {/* Форма с живой рекомендацией размеров */}
      <MeasurementsFormWithRecommendations defaultValue={defaultValue} sizes={sizes} />

      {/* Инструкция по измерению */}
      <Card.Root bg="bg.muted">
        <Card.Body>
          <Heading size="md" mb={3}>
            Как правильно снять мерки
          </Heading>
          <VStack align="start" gap={2}>
            <Text>
              <strong>Обхват груди:</strong> измеряется по самым выступающим точкам груди
            </Text>
            <Text>
              <strong>Обхват талии:</strong> измеряется в самой узкой части туловища
            </Text>
            <Text>
              <strong>Обхват бедер:</strong> измеряется по самым выступающим точкам ягодиц
            </Text>
            <Text>
              <strong>Рост:</strong> измеряется без обуви, от макушки до пола
            </Text>
            <Text color="fg.muted" fontSize="sm" mt={2}>
              💡 Для точного измерения используйте мягкую сантиметровую ленту. Лента должна прилегать плотно, но не
              сдавливать.
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
