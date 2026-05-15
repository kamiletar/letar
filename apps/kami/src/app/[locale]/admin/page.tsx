import { prisma } from '@/lib/prisma'
import { Badge, Box, Card, Grid, Heading, HStack, Icon, Stat, Text, VStack } from '@chakra-ui/react'
import { Briefcase, Calendar, Star, Users } from 'lucide-react'

/**
 * Dashboard админ-панели
 * Показывает статистику по контенту
 */
export default async function AdminDashboardPage() {
  // Получаем статистику
  const [requestsCount, testimonialsCount, casesCount, slotsCount] = await Promise.all([
    prisma.consultingRequest.count(),
    prisma.testimonial.count(),
    prisma.consultingCase.count(),
    prisma.bookedSlot.count({
      where: {
        startAt: { gte: new Date() },
      },
    }),
  ])

  // Последние заявки
  const recentRequests = await prisma.consultingRequest.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      serviceType: true,
      status: true,
      createdAt: true,
    },
  })

  const stats = [
    {
      label: 'Заявки',
      value: requestsCount,
      icon: Briefcase,
      color: 'blue',
    },
    {
      label: 'Отзывы',
      value: testimonialsCount,
      icon: Star,
      color: 'yellow',
    },
    {
      label: 'Кейсы',
      value: casesCount,
      icon: Users,
      color: 'green',
    },
    {
      label: 'Предстоящие слоты',
      value: slotsCount,
      icon: Calendar,
      color: 'purple',
    },
  ]

  const statusColors: Record<string, string> = {
    new: 'blue',
    contacted: 'yellow',
    scheduled: 'purple',
    completed: 'green',
    cancelled: 'red',
  }

  const statusLabels: Record<string, string> = {
    new: 'Новая',
    contacted: 'Связались',
    scheduled: 'Назначено',
    completed: 'Завершено',
    cancelled: 'Отменено',
  }

  return (
    <VStack gap={8} align="stretch">
      <Heading size="xl">Дашборд</Heading>

      {/* Статистика */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
        {stats.map((stat) => (
          <Card.Root key={stat.label}>
            <Card.Body>
              <Stat.Root>
                <HStack justify="space-between">
                  <VStack align="start" gap={1}>
                    <Stat.Label color="fg.muted">{stat.label}</Stat.Label>
                    <Stat.ValueText fontSize="3xl">{stat.value}</Stat.ValueText>
                  </VStack>
                  <Box p={3} borderRadius="full" bg={`${stat.color}.100`} color={`${stat.color}.600`}>
                    <Icon boxSize={6}>
                      <stat.icon />
                    </Icon>
                  </Box>
                </HStack>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        ))}
      </Grid>

      {/* Последние заявки */}
      <Card.Root>
        <Card.Header>
          <HStack justify="space-between">
            <Heading size="md">Последние заявки</Heading>
            <Text color="fg.muted" fontSize="sm">
              Всего: {requestsCount}
            </Text>
          </HStack>
        </Card.Header>
        <Card.Body>
          {recentRequests.length === 0 ? (
            <Text color="fg.muted">Заявок пока нет</Text>
          ) : (
            <VStack gap={3} align="stretch">
              {recentRequests.map((request) => (
                <HStack
                  key={request.id}
                  justify="space-between"
                  p={3}
                  borderRadius="md"
                  bg={{ base: 'gray.50', _dark: 'gray.800' }}
                >
                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium">{request.name}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {request.email}
                    </Text>
                  </VStack>
                  <HStack gap={2}>
                    {request.serviceType && (
                      <Badge variant="subtle" colorPalette="gray">
                        {request.serviceType}
                      </Badge>
                    )}
                    <Badge variant="subtle" colorPalette={statusColors[request.status] || 'gray'}>
                      {statusLabels[request.status] || request.status}
                    </Badge>
                    <Text fontSize="sm" color="fg.muted">
                      {new Date(request.createdAt).toLocaleDateString('ru-RU')}
                    </Text>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          )}
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
