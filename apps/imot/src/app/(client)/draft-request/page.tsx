import { submitDraftRequest } from '@/app/(client)/draft-request/_actions/submit-draft-request'
import { DraftRequestFormV2 } from '@/app/(client)/draft-request/_components/draft-request-form-v2'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'
import { Box, Card, Container, Heading, Stack, Text } from '@chakra-ui/react'
import { redirect } from 'next/navigation'

export default async function DraftRequestPage() {
  const user = await requireAuth()

  // Роль уже проверена в (client)/layout.tsx

  // Получаем профиль клиента
  const clientProfile = await prisma.client.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      mainRequest: true,
      name: true,
      specialist: {
        select: {
          name: true,
        },
      },
    },
  })

  // Если запрос уже заполнен, редирект на основную страницу
  if (clientProfile?.mainRequest) {
    redirect('/my-profile')
  }

  return (
    <Container maxW="3xl" py={10}>
      <Stack gap={8} align="stretch">
        {/* Заголовок */}
        <Box textAlign="center">
          <Heading size="2xl" color="fg" mb={3}>
            Добро пожаловать{clientProfile?.name ? `, ${clientProfile.name}` : ''}!
          </Heading>
          {clientProfile?.specialist && (
            <Text fontSize="lg" color="fg.muted">
              Ваш специалист:{' '}
              <Text as="span" fontWeight="semibold">
                {clientProfile.specialist.name}
              </Text>
            </Text>
          )}
        </Box>

        {/* Инструкция */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Первый шаг к трансформации</Heading>
          </Card.Header>
          <Card.Body>
            <Stack gap={3}>
              <Text fontSize="sm">
                Прежде чем начать работу с методикой ИМОТ, важно сформулировать ваш основной запрос. Это поможет:
              </Text>
              <Stack gap={2} pl={4}>
                <Text fontSize="sm">• Осознать, что именно вы хотите изменить в своей жизни</Text>
                <Text fontSize="sm">• Специалисту создать индивидуальный план трансформации</Text>
                <Text fontSize="sm">• Отслеживать прогресс на пути к вашим целям</Text>
              </Stack>
              <Text fontSize="sm" color="fg.muted" mt={2}>
                Не переживайте, если запрос покажется вам неточным - вы сможете вернуться к нему и скорректировать в
                процессе работы.
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Форма запроса */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Мой запрос</Heading>
          </Card.Header>
          <Card.Body>
            <DraftRequestFormV2
              onSubmit={submitDraftRequest.bind(null, { clientId: clientProfile?.id, userId: user.id })}
            />
          </Card.Body>
        </Card.Root>

        {/* Подсказки */}
        <Card.Root>
          <Card.Header>
            <Heading size="sm">Как сформулировать запрос?</Heading>
          </Card.Header>
          <Card.Body>
            <Stack gap={2}>
              <Text fontSize="sm">
                <Text as="span" fontWeight="semibold">
                  Примеры запросов:
                </Text>
              </Text>
              <Stack gap={1} pl={4} fontSize="sm" color="fg.muted">
                <Text>• "Хочу научиться выстраивать здоровые границы в отношениях"</Text>
                <Text>• "Нужно разобраться с постоянной тревожностью и страхами"</Text>
                <Text>• "Хочу найти свое предназначение и начать заниматься любимым делом"</Text>
                <Text>• "Хочу улучшить отношения с партнером и собой"</Text>
              </Stack>
              <Text fontSize="sm" color="fg.muted" mt={2}>
                Главное - быть честным с собой. Запишите то, что действительно важно для вас прямо сейчас.
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Stack>
    </Container>
  )
}
