import { Avatar, Box, Card, Flex, Heading, Stack, Stat, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getStudentBalance } from './_actions/balance.action'
import { AddBalanceForm } from './_components/add-balance-form'
import { LicenseVerification } from './_components/license-verification'

interface BalancePageProps {
  params: Promise<{ id: string }>
}

export default async function BalancePage({ params }: BalancePageProps) {
  const { id: studentUserId } = await params
  const result = await getStudentBalance(studentUserId)

  if (!result.success) {
    if (result.error === 'STUDENT_NOT_FOUND' || result.error === 'NO_CONNECTION') {
      notFound()
    }
    return (
      <Box p={6}>
        <Text color="error.solid">Ошибка загрузки данных</Text>
      </Box>
    )
  }

  const { data } = result

  return (
    <Box p={6}>
      <Stack gap={6}>
        {/* Заголовок с информацией об ученике */}
        <Flex align="center" gap={4}>
          <Link href={`/students/${studentUserId}`}>
            <Avatar.Root size="lg">
              <Avatar.Image src={data.studentImage ?? undefined} />
              <Avatar.Fallback>{data.studentName.charAt(0)}</Avatar.Fallback>
            </Avatar.Root>
          </Link>
          <Box>
            <Heading size="lg">{data.studentName}</Heading>
            <Text color="fg.muted">{data.studentEmail}</Text>
          </Box>
        </Flex>

        {/* Статистика */}
        <Flex gap={4} flexWrap="wrap">
          <Card.Root minW="200px" flex="1">
            <Card.Body>
              <Stat.Root>
                <Stat.Label>Баланс</Stat.Label>
                <Stat.ValueText fontSize="3xl" color={data.balance > 0 ? 'success.solid' : 'gray.solid'}>
                  {data.balance} занятий
                </Stat.ValueText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>

          <Card.Root minW="200px" flex="1">
            <Card.Body>
              <Stat.Root>
                <Stat.Label>Статус связи</Stat.Label>
                <Stat.ValueText fontSize="xl">{getStatusLabel(data.status)}</Stat.ValueText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </Flex>

        {/* Водительские права */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Водительские права</Heading>
          </Card.Header>
          <Card.Body>
            <LicenseVerification licenses={data.licenses} />
          </Card.Body>
        </Card.Root>

        {/* Форма пополнения */}
        {data.status === 'ACTIVE' && (
          <Card.Root>
            <Card.Body>
              <AddBalanceForm studentUserId={studentUserId} currentBalance={data.balance} />
            </Card.Body>
          </Card.Root>
        )}

        {data.status !== 'ACTIVE' && (
          <Card.Root layerStyle="panel.warning">
            <Card.Body>
              <Text color="warning.fg">Пополнение баланса недоступно — связь с учеником неактивна.</Text>
            </Card.Body>
          </Card.Root>
        )}
      </Stack>
    </Box>
  )
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Активна',
    PAUSED: 'На паузе',
    DISCONNECTED: 'Отключена',
  }
  return labels[status] || status
}
