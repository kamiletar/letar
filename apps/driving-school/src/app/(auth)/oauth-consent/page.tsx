import { LogoIcon } from '@/app/_components/icons/logo-icon'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { legalService } from '@/lib/legal'
import { Box, Container, HStack, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { OAuthConsentForm } from './_components/oauth-consent-form'

export const metadata = {
  title: 'Принятие условий',
  description: 'Примите условия использования сервиса',
}

export default async function OAuthConsentPage() {
  // Проверяем авторизацию
  const session = await getSession()

  if (!session?.user?.id) {
    // Если не авторизован - на страницу входа
    redirect('/sign-in')
  }

  // Проверяем, не принял ли юзер уже оферту
  const hasAcceptedOffer = await legalService.hasUserAcceptedCurrentOffer(session.user.id)

  if (hasAcceptedOffer) {
    // Если уже принял - проверяем onboarding и редиректим
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isOnboardingComplete: true },
    })
    redirect(user?.isOnboardingComplete ? '/dashboard' : '/onboarding')
  }

  return (
    <Container maxW="md" py={12}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={2} textAlign="center">
          <HStack justify="center">
            <LogoIcon boxSize={10} />
            <Text fontSize="3xl" fontWeight="bold" color="fg">
              НаПрава.РФ
            </Text>
          </HStack>
          <Text
            fontSize="2xl"
            fontWeight="semibold"
            bgGradient="to-r"
            gradientFrom="orange.500"
            gradientTo="orange.700"
            bgClip="text"
          >
            Принятие условий
          </Text>
          <Text color="fg.muted" fontSize="md">
            Добро пожаловать, {session.user.name || session.user.email}!
          </Text>
        </VStack>

        {/* Форма принятия */}
        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <OAuthConsentForm />
        </Box>
      </VStack>
    </Container>
  )
}
