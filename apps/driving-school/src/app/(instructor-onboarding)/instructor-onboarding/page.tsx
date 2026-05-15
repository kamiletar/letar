import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { LogoutButton } from '@/app/dashboard/_components/logout-button'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Container, Flex, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { InstructorOnboardingWizard } from './_components/instructor-onboarding-wizard'

export default async function InstructorOnboardingPage() {
  const session = await getSession()

  // Если не авторизован - на страницу входа
  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  // Проверяем, является ли пользователь инструктором
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      instructorOnboarding: true,
      instructorProfile: {
        include: {
          vehicles: true,
          scheduleSettings: true,
          lessonTypes: {
            include: {
              pricingOptions: true,
            },
          },
        },
      },
    },
  })

  // Если не инструктор - на dashboard
  if (!user?.roles.includes('FREELANCE_INSTRUCTOR')) {
    redirect('/dashboard')
  }

  // Если расширенный онбординг уже завершён или пропущен - на dashboard
  if (user.instructorOnboarding?.isCompleted || user.instructorOnboarding?.skippedAt) {
    redirect('/dashboard')
  }

  // Создаём запись онбординга если её нет
  let onboarding = user.instructorOnboarding
  if (!onboarding) {
    onboarding = await prisma.userOnboarding.create({
      data: {
        userId: session.user.id,
        currentStep: 1,
        startedAt: new Date(),
      },
    })
  }

  return (
    <Container maxW="4xl" py={12}>
      {/* Кнопки управления */}
      <Flex justify="flex-end" gap={2} mb={4} suppressHydrationWarning>
        <ColorModeButton />
        <LogoutButton />
      </Flex>

      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <VStack gap={2} textAlign="center">
          <Text fontSize="3xl" fontWeight="bold" color="fg">
            Настройка профиля инструктора
          </Text>
          <Text
            fontSize="xl"
            fontWeight="medium"
            bgGradient="to-r"
            gradientFrom="orange.500"
            gradientTo="orange.700"
            bgClip="text"
          >
            Заполните профиль, чтобы ученики могли вас найти
          </Text>
        </VStack>

        {/* Wizard */}
        {/* ZenStack v3: типы JsonValue могут отличаться, используем type assertion */}
        <InstructorOnboardingWizard
          userId={session.user.id}
          userName={user.name ?? ''}
          initialStep={onboarding.currentStep}
          completedSteps={onboarding.completedSteps}
          instructorProfile={
            user.instructorProfile as Parameters<typeof InstructorOnboardingWizard>[0]['instructorProfile']
          }
        />
      </VStack>
    </Container>
  )
}
