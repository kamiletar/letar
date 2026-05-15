import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Box, Button, Container, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuArrowLeft, LuBell, LuLink, LuLock, LuSchool, LuUser } from 'react-icons/lu'

export const metadata = {
  title: 'Настройки',
  description: 'Настройки аккаунта и уведомлений',
}

export default async function SettingsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // Проверяем, состоит ли пользователь в какой-либо организации (школе)
  const memberCount = await prisma.member.count({
    where: { userId: session.user.id },
  })
  const hasOrganization = memberCount > 0

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <Box>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <LuArrowLeft />В личный кабинет
            </Link>
          </Button>
        </Box>

        {/* Заголовок */}
        <Box>
          <Heading size="xl">Настройки</Heading>
          <Text color="fg.muted" mt={2}>
            Управление вашим аккаунтом
          </Text>
        </Box>

        {/* Секции настроек */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <SettingsCard
            icon={<LuUser size={24} />}
            title="Профиль"
            description="Имя, аватар и контактные данные"
            href="/settings/profile"
          />
          <SettingsCard
            icon={<LuBell size={24} />}
            title="Уведомления"
            description="Настройки email и push-уведомлений"
            href="/settings/notifications"
          />
          <SettingsCard
            icon={<LuLock size={24} />}
            title="Безопасность"
            description="Пароль и способы входа"
            href="/settings/security"
          />
          <SettingsCard
            icon={<LuLink size={24} />}
            title="Связанные аккаунты"
            description="Google, Яндекс, ВКонтакте"
            href="/settings/connected-accounts"
          />
          {!hasOrganization && (
            <SettingsCard
              icon={<LuSchool size={24} />}
              title="Создать автошколу"
              description="Зарегистрируйте свою автошколу на платформе"
              href="/school/create"
            />
          )}
        </SimpleGrid>
      </VStack>
    </Container>
  )
}

interface SettingsCardProps {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}

function SettingsCard({ icon, title, description, href }: SettingsCardProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <Box
        p={6}
        borderWidth={1}
        borderRadius="lg"
        bg="bg.panel"
        _hover={{ shadow: 'md', borderColor: 'fg.muted' }}
        transition="all 0.2s"
        cursor="pointer"
        display="flex"
        gap={4}
        alignItems="center"
      >
        <Box color="fg.muted">{icon}</Box>
        <Box>
          <Heading size="md">{title}</Heading>
          <Text color="fg.muted" fontSize="sm">
            {description}
          </Text>
        </Box>
      </Box>
    </Link>
  )
}
