import { Badge, Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LuCalendar, LuClock, LuHistory } from 'react-icons/lu'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = {
  title: 'История версий шаблона',
  description: 'Просмотр истории версий шаблона договора',
}

interface Props {
  params: Promise<{ schoolId: string; templateId: string }>
}

export default async function TemplateVersionsPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId, templateId } = await params
  void schoolId // Используется для маршрутизации

  // Загружаем шаблон с версиями
  const template = await prisma.contractTemplate.findFirst({
    where: {
      id: templateId,
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
      versions: {
        orderBy: { createdAt: 'desc' },
      },
      currentVersion: true,
      organization: {
        select: { name: true },
      },
    },
  })

  if (!template) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Шаблон не найден
        </Heading>
        <Text color="error.fg" mt={2}>
          Шаблон не существует или у вас нет прав доступа
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <VStack align="start" gap={1}>
        <HStack gap={3}>
          <LuHistory size={28} />
          <Heading size="xl">История версий</Heading>
        </HStack>
        <Text color="fg.muted">
          {template.name} · {template.organization.name}
        </Text>
      </VStack>

      <VStack align="stretch" gap={4}>
        {template.versions.length === 0 ? (
          <Card.Root>
            <Card.Body>
              <Text color="fg.muted" textAlign="center">
                У шаблона нет версий
              </Text>
            </Card.Body>
          </Card.Root>
        ) : (
          template.versions.map((version) => {
            const isCurrent = template.currentVersionId === version.id
            return (
              <Card.Root
                key={version.id}
                borderColor={isCurrent ? 'blue.500' : undefined}
                borderWidth={isCurrent ? 2 : 1}
              >
                <Card.Body>
                  <HStack justify="space-between" flexWrap="wrap" gap={4}>
                    <VStack align="start" gap={2}>
                      <HStack gap={2}>
                        <Heading size="md">Версия {version.version}</Heading>
                        {isCurrent && (
                          <Badge colorPalette="blue" variant="solid">
                            Текущая
                          </Badge>
                        )}
                      </HStack>

                      {version.changelog && <Text color="fg.muted">{version.changelog}</Text>}

                      <HStack gap={4} fontSize="sm" color="fg.muted">
                        <HStack gap={1}>
                          <LuCalendar size={14} />
                          <Text>
                            {new Date(version.effectiveAt).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </Text>
                        </HStack>
                        <HStack gap={1}>
                          <LuClock size={14} />
                          <Text>
                            {new Date(version.createdAt).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </HStack>
                      </HStack>
                    </VStack>

                    <VStack align="end" gap={2}>
                      <Text fontSize="sm" color="fg.muted">
                        {version.content.length.toLocaleString('ru-RU')} символов
                      </Text>
                    </VStack>
                  </HStack>
                </Card.Body>
              </Card.Root>
            )
          })
        )}
      </VStack>
    </VStack>
  )
}
