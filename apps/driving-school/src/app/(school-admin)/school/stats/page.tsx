import { getSession } from '@/lib/auth'
import { Avatar, Box, Button, Card, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuBuilding, LuChartBar, LuPlus, LuSettings } from 'react-icons/lu'
import { getUserSchools } from './_actions/school-stats.action'

export const metadata = {
  title: 'Мои школы',
  description: 'Управление автошколами',
}

export default async function SchoolsStatsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const result = await getUserSchools()

  if (!result.success) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Ошибка
        </Heading>
        <Text color="error.fg" mt={2}>
          Не удалось загрузить список школ
        </Text>
      </Box>
    )
  }

  const { schools } = result

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок с кнопкой добавления */}
      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="xl">Мои школы</Heading>
          <Text color="fg.muted" mt={1}>
            {schools.length === 0
              ? 'У вас пока нет школ'
              : schools.length === 1
                ? '1 автошкола'
                : `${schools.length} автошколы`}
          </Text>
        </Box>
        <Button asChild colorPalette="brand">
          <Link href="/school/create">
            <LuPlus />
            Зарегистрировать школу
          </Link>
        </Button>
      </HStack>

      {/* Список школ или пустое состояние */}
      {schools.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <VStack py={8} gap={4}>
              <Box p={4} borderRadius="full" bg="bg.subtle">
                <LuBuilding size={32} />
              </Box>
              <Heading size="md">Нет школ</Heading>
              <Text color="fg.muted" textAlign="center" maxW="md">
                Зарегистрируйте свою автошколу, чтобы управлять учениками, инструкторами и расписанием
              </Text>
              <Button asChild colorPalette="brand" size="lg">
                <Link href="/school/create">
                  <LuPlus />
                  Зарегистрировать школу
                </Link>
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {schools.map((school) => (
            <SchoolCard key={school.id} school={school} />
          ))}
        </SimpleGrid>
      )}
    </VStack>
  )
}

interface SchoolCardProps {
  school: {
    id: string
    name: string
    logo: string | null
    role: string
  }
}

function SchoolCard({ school }: SchoolCardProps) {
  const roleLabels: Record<string, string> = {
    ADMIN: 'Администратор',
    MANAGER: 'Менеджер',
  }

  return (
    <Card.Root>
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Информация о школе */}
          <HStack gap={4}>
            <Avatar.Root size="lg">
              {school.logo && <Avatar.Image src={school.logo} />}
              <Avatar.Fallback>{school.name.charAt(0)}</Avatar.Fallback>
            </Avatar.Root>
            <Box flex={1}>
              <Heading size="md">{school.name}</Heading>
              <Text color="fg.muted" fontSize="sm">
                {roleLabels[school.role] || school.role}
              </Text>
            </Box>
          </HStack>

          {/* Быстрые действия */}
          <HStack gap={2}>
            <Button asChild variant="outline" size="sm" flex={1}>
              <Link href={`/school/stats/${school.id}`}>
                <LuChartBar />
                Статистика
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" flex={1}>
              <Link href={`/school/${school.id}/settings`}>
                <LuSettings />
                Настройки
              </Link>
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
