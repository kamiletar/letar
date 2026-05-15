import { Box, Container, Heading, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { requireAuth } from '@/lib/auth-utils'
import { prismaAuth } from '@/lib/prisma'
import { getOrCreateBalance, getOrCreateReferralForUser } from '@/lib/referral'
import { REFERRAL_CONFIG } from '@/lib/referral-config'
import { CopyReferralLink } from './_components/copy-referral-link'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'В ожидании',
  APPROVED: 'Начислено',
  PAID: 'Выплачено',
  REVERSED: 'Отменено',
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3018'

export default async function ReferralsPage() {
  const user = await requireAuth()
  const [referral, balance, earnings] = await Promise.all([
    getOrCreateReferralForUser(user.id),
    getOrCreateBalance(user.id),
    prismaAuth.referralEarning.findMany({
      where: { referral: { ownerUserId: user.id } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  const referralLink = `${BASE_URL}/?ref=${referral.code}`
  const totalPending = earnings.filter((e) => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0)

  return (
    <Container maxW="4xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Stack gap={2}>
          <Heading as="h1" size="3xl">
            Партнёрская программа
          </Heading>
          <Text color="fg.muted">
            Делитесь ссылкой — друзья получают обои, вы — <strong>{REFERRAL_CONFIG.percent}%</strong> бонусом
            на счёт после их оплаты. Бонусы можно тратить в следующих заказах.
          </Text>
        </Stack>

        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          <Stack p={5} bg="bg.surface" borderWidth="1px" borderColor="border" borderRadius="xl" gap={1}>
            <Text fontSize="xs" color="fg.muted" textTransform="uppercase">Доступно</Text>
            <Text fontSize="3xl" fontWeight="bold">
              {(balance.balance / 100).toFixed(0)} ₽
            </Text>
            <Text fontSize="xs" color="fg.muted">К списанию в чекауте</Text>
          </Stack>
          <Stack p={5} bg="bg.surface" borderWidth="1px" borderColor="border" borderRadius="xl" gap={1}>
            <Text fontSize="xs" color="fg.muted" textTransform="uppercase">Всего заработано</Text>
            <Text fontSize="3xl" fontWeight="bold">
              {(balance.lifetimeEarned / 100).toFixed(0)} ₽
            </Text>
          </Stack>
          <Stack p={5} bg="bg.surface" borderWidth="1px" borderColor="border" borderRadius="xl" gap={1}>
            <Text fontSize="xs" color="fg.muted" textTransform="uppercase">В ожидании ({REFERRAL_CONFIG.pendingDays} дней)</Text>
            <Text fontSize="3xl" fontWeight="bold">
              {(totalPending / 100).toFixed(0)} ₽
            </Text>
          </Stack>
        </SimpleGrid>

        <Stack gap={3} p={5} bg="bg.subtle" borderRadius="xl">
          <Text fontWeight="semibold">Ваша партнёрская ссылка</Text>
          <CopyReferralLink link={referralLink} />
        </Stack>

        <Stack gap={3}>
          <Text fontSize="sm" fontWeight="semibold" color="fg.muted" textTransform="uppercase">
            История заработков
          </Text>
          {earnings.length === 0
            ? (
              <Box p={8} bg="bg.subtle" borderRadius="md" textAlign="center">
                <Text color="fg.muted">Пока никто не оформил заказ по вашей ссылке.</Text>
              </Box>
            )
            : (
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Дата</Table.ColumnHeader>
                    <Table.ColumnHeader>Заказ</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Сумма</Table.ColumnHeader>
                    <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {earnings.map((e) => (
                    <Table.Row key={e.id}>
                      <Table.Cell fontSize="sm">{e.createdAt.toLocaleDateString('ru-RU')}</Table.Cell>
                      <Table.Cell fontFamily="mono" fontSize="sm">{e.orderId.slice(0, 8)}…</Table.Cell>
                      <Table.Cell textAlign="end" fontWeight="semibold">
                        {(e.amount / 100).toFixed(0)} ₽
                      </Table.Cell>
                      <Table.Cell fontSize="sm">{STATUS_LABELS[e.status] ?? e.status}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
        </Stack>
      </Stack>
    </Container>
  )
}
