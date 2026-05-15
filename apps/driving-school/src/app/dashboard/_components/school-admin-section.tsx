/**
 * Секция для администратора школы
 *
 * @module school-admin-section
 */

import { prisma } from '@/lib/db'
import { Avatar, Badge, Box, Button, Card, Heading, HStack, LinkBox, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuBuilding, LuChevronRight, LuPlus } from 'react-icons/lu'

import { getSchoolAdminAlerts } from '../_actions/alerts.action'
import { AlertsPanel } from './alerts-panel'
import { roleLabels } from './dashboard.types'

interface SchoolAdminSectionProps {
  userId: string
}

/**
 * Секция дашборда для администраторов школ (async)
 */
export async function SchoolAdminSection({ userId }: SchoolAdminSectionProps) {
  // Получаем организации пользователя и алерты параллельно
  const [memberships, alertsResult] = await Promise.all([
    prisma.member.findMany({
      where: {
        userId,
        role: { in: ['owner', 'super_manager', 'manager'] },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
            metadata: true, // cities хранятся в metadata как JSON
          },
        },
      },
      orderBy: {
        organization: { name: 'asc' },
      },
    }),
    getSchoolAdminAlerts(),
  ])

  // Парсим cities из metadata для каждой организации
  const membershipsWithCities = memberships.map((m) => {
    let cities: string[] = []
    if (m.organization.metadata) {
      try {
        const meta = JSON.parse(m.organization.metadata)
        cities = meta.cities || []
      } catch {
        // Игнорируем ошибки парсинга
      }
    }
    return { ...m, organization: { ...m.organization, cities } }
  })

  return (
    <VStack gap={6} align="stretch">
      {/* Панель алертов */}
      {alertsResult.alerts.length > 0 && <AlertsPanel alerts={alertsResult.alerts} />}

      <Box>
        <HStack justify="space-between" mb={4}>
          <Heading size="lg">Мои автошколы</Heading>
          <Button asChild variant="outline" size="sm">
            <Link href="/school/create">
              <LuPlus size={16} />
              Добавить школу
            </Link>
          </Button>
        </HStack>

        {membershipsWithCities.length === 0 ? (
          <Card.Root>
            <Card.Body>
              <VStack py={6} gap={4}>
                <Box p={4} borderRadius="full" bg="bg.subtle" color="fg.muted">
                  <LuBuilding size={32} />
                </Box>
                <Text color="fg.muted" textAlign="center">
                  У вас пока нет автошкол
                </Text>
                <Button asChild colorPalette="brand">
                  <Link href="/school/create">
                    <LuPlus size={16} />
                    Зарегистрировать школу
                  </Link>
                </Button>
              </VStack>
            </Card.Body>
          </Card.Root>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {membershipsWithCities.map((membership) => (
              <LinkBox key={membership.organization.id} asChild>
                <Card.Root
                  _hover={{ shadow: 'md', borderColor: 'fg.muted' }}
                  transition="all 0.2s"
                  cursor="pointer"
                  asChild
                >
                  <Link href={`/school/stats/${membership.organization.id}`}>
                    <Card.Body>
                      <HStack justify="space-between">
                        <HStack gap={4}>
                          <Avatar.Root size="lg">
                            {membership.organization.logo && <Avatar.Image src={membership.organization.logo} />}
                            <Avatar.Fallback>{membership.organization.name.charAt(0)}</Avatar.Fallback>
                          </Avatar.Root>
                          <Box>
                            <Heading size="md">{membership.organization.name}</Heading>
                            <HStack gap={2} mt={1}>
                              <Badge colorPalette="brand" size="sm">
                                {roleLabels[membership.role] || membership.role}
                              </Badge>
                              {membership.organization.cities.length > 0 && (
                                <Text fontSize="sm" color="fg.muted">
                                  {membership.organization.cities.join(', ')}
                                </Text>
                              )}
                            </HStack>
                          </Box>
                        </HStack>
                        <Box color="fg.muted">
                          <LuChevronRight size={20} />
                        </Box>
                      </HStack>
                    </Card.Body>
                  </Link>
                </Card.Root>
              </LinkBox>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </VStack>
  )
}
