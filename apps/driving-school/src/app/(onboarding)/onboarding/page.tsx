import { LogoIcon } from '@/app/_components/icons/logo-icon'
import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { LogoutButton } from '@/app/dashboard/_components/logout-button'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Container, Flex, HStack, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './_components/onboarding-wizard'

export default async function OnboardingPage() {
  const session = await getSession()

  // Если не авторизован - на страницу входа
  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  // Проверяем, завершён ли onboarding
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isOnboardingComplete: true },
  })

  // Если уже завершён - на dashboard
  if (user?.isOnboardingComplete) {
    redirect('/dashboard')
  }

  return (
    <Container maxW="3xl" py={12}>
      {/* Кнопки управления */}
      <Flex justify="flex-end" gap={2} mb={4} suppressHydrationWarning>
        <ColorModeButton />
        <LogoutButton />
      </Flex>

      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={2} textAlign="center">
          <HStack justify="center">
            <LogoIcon boxSize={10} />
            <Text fontSize="3xl" fontWeight="bold" color="fg">
              Добро пожаловать!
            </Text>
          </HStack>
          <Text
            fontSize="xl"
            fontWeight="medium"
            bgGradient="to-r"
            gradientFrom="orange.500"
            gradientTo="orange.700"
            bgClip="text"
          >
            Давайте настроим ваш профиль
          </Text>
        </VStack>

        {/* Wizard */}
        <OnboardingWizard userId={session.user.id} initialName={session.user.name ?? ''} />
      </VStack>
    </Container>
  )
}
