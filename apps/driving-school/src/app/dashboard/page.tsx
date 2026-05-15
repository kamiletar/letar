/**
 * Страница личного кабинета
 *
 * @module dashboard-page
 */

import { prisma } from '@/lib/db'
import { Badge, Box, Button, Container, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuHouse, LuMessageSquare, LuSettings } from 'react-icons/lu'

import { NotificationBell } from '@/app/_components/notification-bell'
import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { getSession } from '@/lib/auth'
import { legalService } from '@/lib/legal'

import {
  DashboardCard,
  getRoleName,
  InstructorSection,
  LogoutButton,
  NewUserSection,
  OwnerSection,
  SchoolAdminSection,
  StudentSection,
} from './_components'

export const metadata = {
  title: 'Личный кабинет',
  description: 'Управление вашим аккаунтом',
}

export default async function DashboardPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // Проверка принятия оферты (для новых OAuth юзеров)
  const hasAcceptedOffer = await legalService.hasUserAcceptedCurrentOffer(session.user.id)
  if (!hasAcceptedOffer) {
    redirect('/oauth-consent')
  }

  // Защита от случая когда roles не массив (может быть null или undefined при первом входе)
  const rawRoles = session.user.roles
  const roles: string[] = Array.isArray(rawRoles) ? rawRoles : []
  const isInstructor = roles.includes('FREELANCE_INSTRUCTOR')
  const isOwner = roles.includes('OWNER')

  // Получаем актуальный аватар из базы (сессия может быть устаревшей)
  // Аватар может быть: user.avatarId (загруженный) или user.image (OAuth)
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true, avatarId: true, avatar: { select: { path: true } } },
  })
  // Для ProfileCompleteness нужен URL аватара
  const userImage = currentUser?.avatar
    ? `/api/images/${currentUser.avatar.path}`
    : (currentUser?.image ?? session.user.image)

  // Проверяем, есть ли у пользователя роль админа/менеджера в какой-либо организации
  const orgManagerMembership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ['owner', 'super_manager', 'manager'] },
    },
  })
  const isSchoolAdmin = !!orgManagerMembership

  // Проверяем, есть ли у пользователя профиль ученика
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      instructorConnections: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
    },
  })
  const isStudent = !!studentProfile
  const hasInstructors = (studentProfile?.instructorConnections?.length ?? 0) > 0

  // Обычный пользователь без специальных ролей
  const hasNoSpecialRoles = !isInstructor && !isSchoolAdmin && !isOwner && !isStudent

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Навигация */}
        <HStack justify="space-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <LuHouse />
              На главную
            </Link>
          </Button>
          <HStack gap={2}>
            <NotificationBell userId={session.user.id} />
            <ColorModeButton />
            <LogoutButton />
          </HStack>
        </HStack>

        {/* Приветствие с индикацией ролей */}
        <Box>
          <HStack gap={4} flexWrap="wrap" align="center">
            <Heading size="xl">Привет, {session.user.name || 'Пользователь'}!</Heading>
            <HStack gap={2} flexWrap="wrap">
              {roles.map((role) => (
                <Badge key={role} colorPalette="brand" size="lg">
                  {getRoleName(role)}
                </Badge>
              ))}
            </HStack>
          </HStack>
          <Text color="fg.muted" mt={2}>
            Добро пожаловать в личный кабинет
          </Text>
        </Box>

        {/* Секции по ролям */}
        {hasNoSpecialRoles && <NewUserSection />}
        {isStudent && <StudentSection userId={session.user.id} hasInstructors={hasInstructors} />}
        {isInstructor && <InstructorSection userId={session.user.id} userImage={userImage} />}
        {isSchoolAdmin && <SchoolAdminSection userId={session.user.id} />}
        {isOwner && <OwnerSection />}

        {/* Общие ссылки */}
        <Box>
          <Heading size="lg" mb={4}>
            Общее
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            <DashboardCard
              icon={<LuMessageSquare size={24} />}
              title="Чаты"
              description="Сообщения и переписка"
              href="/chats"
            />
            <DashboardCard
              icon={<LuSettings size={24} />}
              title="Настройки"
              description="Настройки профиля и уведомлений"
              href="/profile"
            />
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  )
}
