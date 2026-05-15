import { prisma } from '@/lib/db'
import { Badge, Box, Card, Heading, HStack, Icon, SimpleGrid, Stack, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuInfinity, LuUsers } from 'react-icons/lu'

// Конфигурация типов тарифов
const planTypeConfig = {
  FREE: { label: 'Бесплатный', color: 'gray' },
  INSTRUCTOR: { label: 'Инструктор', color: 'blue' },
  SCHOOL: { label: 'Школа', color: 'purple' },
} as const

export default async function PlansPage() {
  // Получаем тарифы и статистику параллельно
  const [plans, totalSubscriptions, activeSubscriptions] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    }),
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
  ])

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <Box>
        <Heading size="lg">Тарифные планы</Heading>
        <Text color="fg.muted" mt={1}>
          Управление тарифами платформы (монетизация пока не активна)
        </Text>
      </Box>

      {/* Статистика */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <Card.Root>
          <Card.Body>
            <VStack>
              <Text fontSize="3xl" fontWeight="bold">
                {plans.length}
              </Text>
              <Text color="fg.muted">Тарифных планов</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body>
            <VStack>
              <Text fontSize="3xl" fontWeight="bold">
                {totalSubscriptions}
              </Text>
              <Text color="fg.muted">Всего подписок</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body>
            <VStack>
              <Text fontSize="3xl" fontWeight="bold">
                {activeSubscriptions}
              </Text>
              <Text color="fg.muted">Активных подписок</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {/* Информация о текущем статусе */}
      <Card.Root borderColor="info.solid" borderWidth="2px">
        <Card.Body>
          <HStack gap={4}>
            <Box p={3} bg="info.subtle" borderRadius="full">
              <Icon as={LuInfinity} boxSize={6} color="info.solid" />
            </Box>
            <Box flex={1}>
              <Text fontWeight="medium">Монетизация пока не активна</Text>
              <Text fontSize="sm" color="fg.muted">
                В настоящее время все функции платформы бесплатны для всех пользователей. Когда монетизация будет
                активирована, инструкторы и школы получат уведомления о необходимости оформить подписку.
              </Text>
            </Box>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Тарифные планы */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
        {plans.length === 0 ? (
          // Показываем заглушки планов, если их ещё нет
          <>
            <PlanCard
              name="Ученик"
              type="FREE"
              priceMonthly={null}
              features={['Поиск инструкторов', 'Запись на занятия', 'Расписание', 'Отзывы']}
              subscriptionCount={0}
              isPlaceholder
            />
            <PlanCard
              name="Инструктор"
              type="INSTRUCTOR"
              priceMonthly={null}
              features={['Управление расписанием', 'Учёт учеников', 'Статистика', 'Telegram-бот', 'Push-уведомления']}
              subscriptionCount={0}
              isPlaceholder
            />
            <PlanCard
              name="Школа"
              type="SCHOOL"
              priceMonthly={null}
              features={[
                'Всё из тарифа Инструктор',
                'Неограниченные инструкторы',
                'Групповые занятия',
                'Экзамены',
                'Расширенная статистика',
              ]}
              subscriptionCount={0}
              isPlaceholder
            />
          </>
        ) : (
          // Cast для совместимости типов с _count между ZenStack и Prisma
          (plans as Array<(typeof plans)[number] & { _count: { subscriptions: number } }>).map((plan) => (
            <PlanCard
              key={plan.id}
              name={plan.name}
              type={plan.type}
              priceMonthly={plan.priceMonthly ? Number(plan.priceMonthly) : null}
              priceYearly={plan.priceYearly ? Number(plan.priceYearly) : undefined}
              features={(plan.features as string[]) || []}
              subscriptionCount={plan._count.subscriptions}
              maxStudents={plan.maxStudents}
              maxInstructors={plan.maxInstructors}
            />
          ))
        )}
      </SimpleGrid>

      {/* Инструкции */}
      <Card.Root>
        <Card.Body>
          <VStack align="start" gap={2}>
            <Text fontWeight="medium">Дальнейшие шаги:</Text>
            <Text fontSize="sm" color="fg.muted">
              1. Определите цены для тарифов Инструктор и Школа
            </Text>
            <Text fontSize="sm" color="fg.muted">
              2. Интегрируйте платёжную систему (ЮKassa, Тинькофф и др.)
            </Text>
            <Text fontSize="sm" color="fg.muted">
              3. Настройте автоматическое выставление счетов и напоминания
            </Text>
            <Text fontSize="sm" color="fg.muted">
              4. Активируйте монетизацию через переменную окружения
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}

interface PlanCardProps {
  name: string
  type: 'FREE' | 'INSTRUCTOR' | 'SCHOOL'
  priceMonthly: number | null
  priceYearly?: number
  features: string[]
  subscriptionCount: number
  maxStudents?: number | null
  maxInstructors?: number | null
  isPlaceholder?: boolean
}

function PlanCard({
  name,
  type,
  priceMonthly,
  priceYearly,
  features,
  subscriptionCount,
  maxStudents,
  maxInstructors,
  isPlaceholder,
}: PlanCardProps) {
  const config = planTypeConfig[type]

  return (
    <Card.Root opacity={isPlaceholder ? 0.7 : 1}>
      <Card.Header>
        <HStack justify="space-between">
          <Badge colorPalette={config.color}>{config.label}</Badge>
          {!isPlaceholder && (
            <HStack gap={1} color="fg.muted" fontSize="sm">
              <Icon as={LuUsers} />
              <Text>{subscriptionCount}</Text>
            </HStack>
          )}
        </HStack>
        <Card.Title mt={2}>{name}</Card.Title>
        <Box>
          {priceMonthly === null ? (
            <Text fontSize="2xl" fontWeight="bold">
              Бесплатно
            </Text>
          ) : (
            <>
              <Text fontSize="2xl" fontWeight="bold">
                {priceMonthly.toLocaleString('ru-RU')} ₽
                <Text as="span" fontSize="sm" fontWeight="normal" color="fg.muted">
                  /мес
                </Text>
              </Text>
              {priceYearly && (
                <Text fontSize="sm" color="fg.muted">
                  или {priceYearly.toLocaleString('ru-RU')} ₽/год
                </Text>
              )}
            </>
          )}
        </Box>
      </Card.Header>
      <Card.Body>
        <Stack gap={2}>
          {features.map((feature) => (
            <HStack key={feature} gap={2}>
              <Icon as={LuCheck} color="success.solid" flexShrink={0} />
              <Text fontSize="sm">{feature}</Text>
            </HStack>
          ))}
          {maxStudents && (
            <HStack gap={2}>
              <Icon as={LuUsers} color="fg.muted" flexShrink={0} />
              <Text fontSize="sm" color="fg.muted">
                До {maxStudents} учеников
              </Text>
            </HStack>
          )}
          {maxInstructors && (
            <HStack gap={2}>
              <Icon as={LuUsers} color="fg.muted" flexShrink={0} />
              <Text fontSize="sm" color="fg.muted">
                До {maxInstructors} инструкторов
              </Text>
            </HStack>
          )}
        </Stack>
      </Card.Body>
      {isPlaceholder && (
        <Card.Footer>
          <Text fontSize="xs" color="fg.muted" textAlign="center" width="full">
            Цена будет определена позже
          </Text>
        </Card.Footer>
      )}
    </Card.Root>
  )
}
