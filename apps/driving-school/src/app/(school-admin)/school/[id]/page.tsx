import { formatCurrency, KPICard, KPIGrid } from '@/app/_components/kpi-card'
import { getSession } from '@/lib/auth'
import { Box, Button, Container, Heading, HStack, Tabs, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuDownload, LuFileSpreadsheet, LuLayoutDashboard, LuUsers } from 'react-icons/lu'
import { getDashboardDataAction } from './_actions/dashboard.action'
import { getOrganizationDetails } from './_actions/organization-management.action'
import { InvitationsCard } from './_components/invitations-card'
import { MembersTable } from './_components/members-table'
import { NeedsAttentionWidget } from './_components/needs-attention'
import { QuickActionsBar } from './_components/quick-actions-bar'
import { TodaySection } from './_components/today-section'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getOrganizationDetails(id)

  if (!result.success) {
    return { title: 'Школа не найдена' }
  }

  return {
    title: result.organization.name,
    description: result.organization.description || `Управление автошколой ${result.organization.name}`,
  }
}

export default async function SchoolManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { id: organizationId } = await params
  const result = await getOrganizationDetails(organizationId)

  if (!result.success) {
    if (result.error === 'ORGANIZATION_NOT_FOUND') {
      notFound()
    }
    if (result.error === 'NOT_ORG_MEMBER') {
      return (
        <Container maxW="container.lg" py={8}>
          <VStack gap={6} align="stretch">
            <Box layerStyle="panel.error" p={6} textAlign="center">
              <Heading size="lg" color="error.fg">
                Доступ запрещён
              </Heading>
              <Text color="error.fg" mt={2}>
                Вы не являетесь участником этой школы
              </Text>
              <Link href="/school/stats">
                <Button mt={4} colorPalette="brand">
                  К списку школ
                </Button>
              </Link>
            </Box>
          </VStack>
        </Container>
      )
    }
    redirect('/sign-in')
  }

  const { organization, members, invitations, isOwner, canManage, invitableRoles } = result

  // Получаем данные для дашборда (только для менеджеров)
  const dashboardResult = canManage ? await getDashboardDataAction(organizationId) : null
  const dashboardData = dashboardResult?.success ? dashboardResult.data : null

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="xl">{organization.name}</Heading>
            {organization.description && (
              <Text color="fg.muted" mt={1}>
                {organization.description}
              </Text>
            )}
          </Box>
          {canManage && (
            <HStack gap={3}>
              <Link href={`/school/${organizationId}/import`}>
                <Button variant="outline" colorPalette="brand" size="sm">
                  <LuFileSpreadsheet />
                  Импорт
                </Button>
              </Link>
              <Link href={`/school/${organizationId}/export`}>
                <Button variant="outline" colorPalette="brand" size="sm">
                  <LuDownload />
                  Экспорт
                </Button>
              </Link>
            </HStack>
          )}
        </HStack>

        {/* Табы: Дашборд / Участники */}
        {canManage && dashboardData ? (
          <Tabs.Root defaultValue="dashboard" variant="enclosed">
            <Tabs.List>
              <Tabs.Trigger value="dashboard">
                <LuLayoutDashboard />
                <Text ml={2}>Дашборд</Text>
              </Tabs.Trigger>
              <Tabs.Trigger value="members">
                <LuUsers />
                <Text ml={2}>Участники</Text>
              </Tabs.Trigger>
            </Tabs.List>

            {/* Таб: Дашборд */}
            <Tabs.Content value="dashboard">
              <VStack gap={6} align="stretch" pt={4}>
                {/* KPI карточки */}
                <KPIGrid columns={{ base: 2, lg: 4 }}>
                  <KPICard title="Активные ученики" value={dashboardData.kpi.activeStudents} colorPalette="blue" />
                  <KPICard title="Занятий за неделю" value={dashboardData.kpi.lessonsThisWeek} colorPalette="green" />
                  <KPICard
                    title="Выручка за месяц"
                    value={dashboardData.kpi.revenueThisMonth}
                    formatValue={formatCurrency}
                    colorPalette="purple"
                  />
                  <KPICard title="Сдали с 1 раза" value={`${dashboardData.kpi.passRate}%`} colorPalette="orange" />
                </KPIGrid>

                {/* Секция "Сегодня" */}
                <TodaySection data={dashboardData.today} />

                {/* Требуют внимания */}
                <NeedsAttentionWidget data={dashboardData.needsAttention} schoolId={organizationId} />

                {/* Быстрые действия */}
                <QuickActionsBar schoolId={organizationId} />
              </VStack>
            </Tabs.Content>

            {/* Таб: Участники */}
            <Tabs.Content value="members">
              <VStack gap={6} align="stretch" pt={4}>
                <InvitationsCard
                  organizationId={organizationId}
                  invitations={invitations}
                  canManage={canManage}
                  isOwner={isOwner}
                  invitableRoles={invitableRoles}
                />
                <MembersTable
                  organizationId={organizationId}
                  members={members}
                  canManage={canManage}
                  isOwner={isOwner}
                  currentUserId={session.user.id}
                  invitableRoles={invitableRoles}
                />
              </VStack>
            </Tabs.Content>
          </Tabs.Root>
        ) : (
          // Для обычных участников — только список членов
          <MembersTable
            organizationId={organizationId}
            members={members}
            canManage={canManage}
            isOwner={isOwner}
            currentUserId={session.user.id}
            invitableRoles={invitableRoles}
          />
        )}
      </VStack>
    </Container>
  )
}
