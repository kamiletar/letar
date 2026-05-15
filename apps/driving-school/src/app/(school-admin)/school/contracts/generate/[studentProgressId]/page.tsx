import { Badge, Box, Button, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuFileText, LuTriangleAlert, LuUser } from 'react-icons/lu'

import { TEMPLATE_TYPE_LABELS } from '@/app/(school-admin)/school/contracts/contract-constants'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { GenerateContractButton } from './_components/generate-contract-button'

export const metadata = {
  title: 'Генерация договора',
  description: 'Генерация договора для ученика',
}

interface Props {
  params: Promise<{ studentProgressId: string }>
}

export default async function GenerateContractPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { studentProgressId } = await params

  // Загружаем данные ученика
  const studentProgress = await prisma.studentProgress.findFirst({
    where: {
      id: studentProgressId,
      organization: {
        members: {
          some: {
            userId: session.user.id,
            role: { in: ['owner', 'super_manager', 'manager'] },
          },
        },
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          metadata: true,
        },
      },
    },
  })

  if (!studentProgress) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Ученик не найден
        </Heading>
        <Text color="error.fg" mt={2}>
          Ученик не существует или у вас нет прав доступа
        </Text>
      </Box>
    )
  }

  // Проверяем наличие паспортных данных
  const hasPassportData = !!studentProgress.passport && !!studentProgress.registrationAddress

  // Загружаем доступные шаблоны
  const templates = await prisma.contractTemplate.findMany({
    where: {
      organizationId: studentProgress.organizationId,
      isActive: true,
      currentVersionId: { not: null },
    },
    include: {
      currentVersion: {
        select: {
          version: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  return (
    <VStack gap={6} align="stretch">
      <VStack align="start" gap={1}>
        <HStack gap={3}>
          <LuFileText size={28} />
          <Heading size="xl">Генерация договора</Heading>
        </HStack>
        <Text color="fg.muted">
          {studentProgress.user.name || studentProgress.user.email} · {studentProgress.organization.name}
        </Text>
      </VStack>

      {/* Информация об ученике */}
      <Card.Root>
        <Card.Header>
          <HStack>
            <LuUser />
            <Heading size="md">Данные ученика</Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack align="start" gap={3}>
            <HStack gap={4} flexWrap="wrap">
              <Box>
                <Text fontSize="sm" color="fg.muted">
                  ФИО
                </Text>
                <Text fontWeight="medium">{studentProgress.user.name || '—'}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">
                  Email
                </Text>
                <Text>{studentProgress.user.email}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted">
                  Телефон
                </Text>
                <Text>{studentProgress.user.phone || '—'}</Text>
              </Box>
            </HStack>

            {!hasPassportData && (
              <Box p={4} bg="orange.subtle" borderRadius="md" borderWidth={1} borderColor="orange.emphasized" w="full">
                <HStack gap={2}>
                  <LuTriangleAlert color="var(--chakra-colors-orange-fg)" />
                  <VStack align="start" gap={1}>
                    <Text fontWeight="semibold" color="orange.fg">
                      Паспортные данные не заполнены
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      Для генерации договора необходимо заполнить паспортные данные ученика
                    </Text>
                    <Button asChild size="sm" colorPalette="orange" mt={2}>
                      <Link href={`/school/students/${studentProgressId}/personal-data`}>Заполнить данные</Link>
                    </Button>
                  </VStack>
                </HStack>
              </Box>
            )}

            {hasPassportData && (
              <Box>
                <Badge colorPalette="green">Паспортные данные заполнены</Badge>
              </Box>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Выбор шаблона и генерация */}
      {hasPassportData && (
        <Card.Root>
          <Card.Header>
            <Heading size="md">Выберите шаблон договора</Heading>
          </Card.Header>
          <Card.Body>
            {templates.length === 0 ? (
              <VStack gap={4}>
                <Text color="fg.muted">Нет доступных шаблонов договоров</Text>
                <Button asChild colorPalette="blue">
                  <Link href={`/school/contracts/templates/new?schoolId=${studentProgress.organizationId}`}>
                    Создать шаблон
                  </Link>
                </Button>
              </VStack>
            ) : (
              <GenerateContractButton
                studentProgressId={studentProgressId}
                schoolId={studentProgress.organizationId}
                templates={templates.map((t) => ({
                  id: t.id,
                  name: t.name,
                  type: t.type,
                  typeLabel: TEMPLATE_TYPE_LABELS[t.type] || t.type,
                  version: t.currentVersion?.version || '1.0',
                }))}
              />
            )}
          </Card.Body>
        </Card.Root>
      )}
    </VStack>
  )
}
