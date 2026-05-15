import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getLocationsAction } from './_actions/location.action'
import { LocationsList } from './_components/locations-list'

type Props = {
  params: Promise<{ schoolId: string }>
}

// Роли, имеющие доступ к управлению филиалами
const ALLOWED_ROLES = ['owner', 'super_manager', 'manager']

export async function generateMetadata({ params }: Props) {
  const { schoolId: organizationId } = await params

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  })

  if (!organization) {
    return { title: 'Филиалы' }
  }

  return {
    title: `Филиалы — ${organization.name}`,
    description: `Управление филиалами автошколы ${organization.name}`,
  }
}

export default async function SchoolLocationsPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId: organizationId } = await params

  // Проверяем, что организация существует
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  })

  if (!organization) {
    notFound()
  }

  // Проверяем, что пользователь — владелец или менеджер организации
  const userId = session.user.id
  if (!userId) {
    redirect('/sign-in')
  }

  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: { role: true },
  })

  if (!membership || !ALLOWED_ROLES.includes(membership.role)) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.error" p={6} textAlign="center">
            <Heading size="lg" color="error.fg">
              Доступ запрещён
            </Heading>
            <Text color="error.fg" mt={2}>
              Только владельцы и менеджеры могут управлять филиалами организации
            </Text>
            <Link href="/school/stats">
              <Button mt={4} colorPalette="brand">
                К списку организаций
              </Button>
            </Link>
          </Box>
        </VStack>
      </Container>
    )
  }

  const locationsResult = await getLocationsAction(organizationId)

  if (!locationsResult.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <Box layerStyle="panel.error" p={6} textAlign="center">
          <Text color="error.fg">Не удалось загрузить филиалы</Text>
        </Box>
      </Container>
    )
  }

  const { locations } = locationsResult

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <Box bg="bg.panel" p={6} borderRadius="lg" shadow="sm" borderWidth="1px">
          <LocationsList organizationId={organizationId} locations={locations} />
        </Box>
      </VStack>
    </Container>
  )
}
