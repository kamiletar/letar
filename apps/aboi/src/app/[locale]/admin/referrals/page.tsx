import { Badge, Box, Heading, Stack, Table, Text } from '@chakra-ui/react'
import { prismaAuth } from '@/lib/prisma'
import { ReferralApproveButton } from './_components/approve-button'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  APPROVED: 'Начислено',
  PAID: 'Выплачено',
  REVERSED: 'Отменено',
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  PAID: 'teal',
  REVERSED: 'red',
}

export default async function AdminReferralsPage() {
  const earnings = await prismaAuth.referralEarning.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    include: {
      referral: { select: { code: true, ownerUserId: true } },
    },
  })

  const totalPending = earnings.filter((e) => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0)
  const totalApproved = earnings.filter((e) => e.status === 'APPROVED').reduce((s, e) => s + e.amount, 0)

  return (
    <Stack gap={6}>
      <Heading as="h1" size="2xl">
        Партнёрские заработки
      </Heading>

      <Box>
        <Text color="fg.muted" fontSize="sm">
          В ожидании: <strong>{(totalPending / 100).toFixed(0)} ₽</strong> · Начислено всего:{' '}
          <strong>{(totalApproved / 100).toFixed(0)} ₽</strong>
        </Text>
      </Box>

      {earnings.length === 0
        ? (
          <Box p={12} bg="bg.subtle" borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Заработков пока нет</Text>
          </Box>
        )
        : (
          <Table.Root size="md" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Код</Table.ColumnHeader>
                <Table.ColumnHeader>Дата</Table.ColumnHeader>
                <Table.ColumnHeader>Заказ</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Сумма</Table.ColumnHeader>
                <Table.ColumnHeader>До</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {earnings.map((e) => (
                <Table.Row key={e.id}>
                  <Table.Cell fontFamily="mono" fontSize="sm">{e.referral.code}</Table.Cell>
                  <Table.Cell fontSize="sm">{e.createdAt.toLocaleDateString('ru-RU')}</Table.Cell>
                  <Table.Cell fontFamily="mono" fontSize="sm">{e.orderId.slice(0, 10)}…</Table.Cell>
                  <Table.Cell textAlign="end" fontWeight="semibold">
                    {(e.amount / 100).toFixed(0)} ₽
                  </Table.Cell>
                  <Table.Cell fontSize="xs" color="fg.muted">
                    {e.pendingUntil.toLocaleDateString('ru-RU')}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={STATUS_COLORS[e.status] ?? 'gray'}>
                      {STATUS_LABELS[e.status] ?? e.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {e.status === 'PENDING' && <ReferralApproveButton earningId={e.id} />}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
    </Stack>
  )
}
