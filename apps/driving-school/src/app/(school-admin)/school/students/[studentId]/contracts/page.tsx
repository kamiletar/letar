import { Badge, Box, Button, Card, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuDownload, LuFileText, LuPlus } from 'react-icons/lu'

import { TEMPLATE_TYPE_LABELS } from '@/app/(school-admin)/school/contracts/contract-constants'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = {
  title: 'Договоры ученика',
  description: 'Список договоров ученика',
}

interface Props {
  params: Promise<{ studentId: string }>
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Черновик', color: 'gray' },
  PENDING_SIGN: { label: 'Ожидает подписи', color: 'orange' },
  SIGNED: { label: 'Подписан', color: 'green' },
  VOID: { label: 'Аннулирован', color: 'red' },
}

export default async function StudentContractsPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { studentId } = await params

  // Загружаем информацию об ученике
  const studentProgress = await prisma.studentProgress.findFirst({
    where: {
      id: studentId,
      OR: [
        { userId: session.user.id },
        {
          organization: {
            members: {
              some: {
                userId: session.user.id,
                role: { in: ['owner', 'super_manager', 'manager'] },
              },
            },
          },
        },
      ],
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      organization: {
        select: {
          name: true,
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

  // Загружаем договоры
  const contracts = await prisma.generatedContract.findMany({
    where: {
      studentProgressId: studentId,
    },
    select: {
      id: true,
      contractNumber: true,
      status: true,
      createdAt: true,
      pdfFileId: true,
      templateVersionId: true,
      templateVersion: {
        select: {
          version: true,
          template: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      },
      pdfFile: {
        select: {
          path: true,
          filename: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Проверяем является ли пользователь менеджером
  const isManager = await prisma.member.findFirst({
    where: {
      organizationId: studentProgress.organizationId,
      userId: session.user.id,
      role: { in: ['owner', 'super_manager', 'manager'] },
    },
  })

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <VStack align="start" gap={1}>
          <HStack gap={3}>
            <LuFileText size={28} />
            <Heading size="xl">Договоры</Heading>
          </HStack>
          <Text color="fg.muted">
            {studentProgress.user.name || studentProgress.user.email} · {studentProgress.organization.name}
          </Text>
        </VStack>

        {isManager && (
          <Button asChild colorPalette="blue">
            <Link href={`/school/contracts/generate/${studentId}`}>
              <LuPlus />
              Создать договор
            </Link>
          </Button>
        )}
      </HStack>

      {contracts.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <VStack gap={4} py={8}>
              <LuFileText size={48} color="var(--chakra-colors-fg-muted)" />
              <Text color="fg.muted">Договоров пока нет</Text>
              {isManager && (
                <Button asChild colorPalette="blue">
                  <Link href={`/school/contracts/generate/${studentId}`}>Создать первый договор</Link>
                </Button>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <Card.Root>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Номер</Table.ColumnHeader>
                <Table.ColumnHeader>Тип</Table.ColumnHeader>
                <Table.ColumnHeader>Шаблон</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader>Дата</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {contracts.map((contract) => {
                const status = STATUS_LABELS[contract.status] || {
                  label: contract.status,
                  color: 'gray',
                }
                const templateType =
                  TEMPLATE_TYPE_LABELS[contract.templateVersion.template.type] || contract.templateVersion.template.type

                return (
                  <Table.Row key={contract.id}>
                    <Table.Cell fontWeight="medium">№ {contract.contractNumber || '—'}</Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{templateType}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <VStack align="start" gap={0}>
                        <Text fontSize="sm">{contract.templateVersion.template.name}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          v{contract.templateVersion.version}
                        </Text>
                      </VStack>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={status.color}>{status.label}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{new Date(contract.createdAt).toLocaleDateString('ru-RU')}</Text>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      {contract.pdfFile && (
                        <Button asChild size="sm" variant="ghost">
                          {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- внешняя ссылка на PDF файл */}
                          <a href={contract.pdfFile.path} target="_blank" rel="noopener noreferrer">
                            <LuDownload />
                            Скачать
                          </a>
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        </Card.Root>
      )}
    </VStack>
  )
}
