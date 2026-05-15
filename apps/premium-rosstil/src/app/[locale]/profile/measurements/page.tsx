import { Gender } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Card, DataList, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { FaEdit, FaRuler } from 'react-icons/fa'
import { SizeRecommendation } from './_components/size-recommendation'

export const metadata = {
  title: 'Мои замеры — Премиум РосСтиль',
  description: 'Просмотр моих замеров для подбора размера',
}

export default async function MeasurementsPage() {
  const authUser = await requireAuth()

  const db = getEnhancedPrisma(authUser)

  // Получаем замеры пользователя
  const measurements = await db.userMeasurements.findUnique({
    where: { userId: authUser.id },
  })

  return (
    <VStack gap={6} align="stretch">
      {!measurements ? (
        // Если замеров нет - показываем empty state
        <Card.Root>
          <Card.Body>
            <VStack gap={4} py={8}>
              <Box fontSize="4xl" color="fg.muted">
                <FaRuler />
              </Box>
              <Heading size="lg" textAlign="center">
                У вас пока нет сохраненных замеров
              </Heading>
              <Text color="fg.muted" textAlign="center" maxW="md">
                Добавьте ваши измерения, чтобы получать точные рекомендации по размеру при выборе одежды
              </Text>
              <Button asChild colorPalette="fg" size="lg" mt={4}>
                <NextLink href="/profile/measurements/edit">
                  <FaEdit />
                  Добавить замеры
                </NextLink>
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        // Если замеры есть - показываем их
        <>
          <Card.Root>
            <Card.Body>
              <VStack gap={6} align="stretch">
                {/* Основная информация */}
                <Box>
                  <HStack justify="space-between" mb={4}>
                    <Heading size="md" textTransform="none">
                      Измерения
                    </Heading>
                    <Badge colorPalette="green" variant="subtle">
                      {measurements.gender === Gender.MALE ? 'Мужской' : 'Женский'}
                    </Badge>
                  </HStack>

                  <DataList.Root orientation="horizontal" divideY="1px">
                    {measurements.bust && (
                      <DataList.Item pt={4}>
                        <DataList.ItemLabel>Обхват груди</DataList.ItemLabel>
                        <DataList.ItemValue fontWeight="medium">{measurements.bust} см</DataList.ItemValue>
                      </DataList.Item>
                    )}

                    {measurements.waist && (
                      <DataList.Item pt={4}>
                        <DataList.ItemLabel>Обхват талии</DataList.ItemLabel>
                        <DataList.ItemValue fontWeight="medium">{measurements.waist} см</DataList.ItemValue>
                      </DataList.Item>
                    )}

                    {measurements.hips && (
                      <DataList.Item pt={4}>
                        <DataList.ItemLabel>Обхват бедер</DataList.ItemLabel>
                        <DataList.ItemValue fontWeight="medium">{measurements.hips} см</DataList.ItemValue>
                      </DataList.Item>
                    )}

                    {measurements.height && (
                      <DataList.Item pt={4}>
                        <DataList.ItemLabel>Рост</DataList.ItemLabel>
                        <DataList.ItemValue fontWeight="medium">{measurements.height} см</DataList.ItemValue>
                      </DataList.Item>
                    )}

                    {measurements.preferredSize && (
                      <DataList.Item pt={4}>
                        <DataList.ItemLabel>Предпочтительный размер</DataList.ItemLabel>
                        <DataList.ItemValue fontWeight="medium">{measurements.preferredSize} (RU)</DataList.ItemValue>
                      </DataList.Item>
                    )}
                  </DataList.Root>
                </Box>

                {/* Заметки */}
                {measurements.notes && (
                  <Box>
                    <Heading size="md" mb={3} textTransform="none">
                      Дополнительные заметки
                    </Heading>
                    <Text color="fg.muted" whiteSpace="pre-wrap">
                      {measurements.notes}
                    </Text>
                  </Box>
                )}

                {/* Кнопка редактирования */}
                <Button asChild variant="outline" colorPalette="fg" size="lg">
                  <NextLink href="/profile/measurements/edit">
                    <FaEdit />
                    Редактировать замеры
                  </NextLink>
                </Button>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Рекомендация размера */}
          <Card.Root bg="bg.subtle">
            <Card.Header>
              <Heading size="md" textTransform="none">
                Рекомендованный размер
              </Heading>
            </Card.Header>
            <Card.Body>
              <SizeRecommendation
                measurements={{
                  gender: measurements.gender,
                  bust: measurements.bust,
                  waist: measurements.waist,
                  hips: measurements.hips,
                }}
              />
            </Card.Body>
          </Card.Root>
        </>
      )}
    </VStack>
  )
}
