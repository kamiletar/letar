/**
 * Секция для инструктора
 *
 * @module instructor-section
 */

import { ProfileCompleteness } from '@/app/_components/profile-completeness'
import { prisma } from '@/lib/db'
import { Box, Heading, SimpleGrid, VStack } from '@chakra-ui/react'
import { Suspense } from 'react'
import { LuBookOpen, LuCalendar, LuCar, LuSettings, LuStar, LuUsers } from 'react-icons/lu'

import { getInstructorAlerts } from '../_actions/alerts.action'
import { AlertsPanel } from './alerts-panel'
import { DashboardCard } from './dashboard-card'
import { OnboardingReminder } from './onboarding-reminder'
import { TodayWidgetInstructor } from './today-widget-instructor'

interface InstructorSectionProps {
  userId: string
  userImage?: string | null
}

/**
 * Секция дашборда для инструкторов (async)
 */
export async function InstructorSection({ userId, userImage }: InstructorSectionProps) {
  // Проверяем, является ли пользователь преподавателем теории в какой-либо организации
  const [theoryMembership, instructorProfile, userOnboarding, alertsResult] = await Promise.all([
    prisma.member.findFirst({
      where: {
        userId,
        role: 'theory_instructor',
      },
    }),
    prisma.instructorProfile.findUnique({
      where: { userId },
      include: {
        vehicles: { take: 1 },
        scheduleSettings: true,
        lessonTypes: {
          take: 1,
          include: {
            pricingOptions: {
              where: { isActive: true, isPrimary: true },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.userOnboarding.findUnique({
      where: { userId },
    }),
    getInstructorAlerts(),
  ])
  const isTheoryInstructor = !!theoryMembership

  // Показываем напоминание если онбординг существует и не завершён
  const showOnboardingReminder = userOnboarding && !userOnboarding.isCompleted

  return (
    <VStack gap={6} align="stretch">
      {/* Панель алертов — критичные уведомления */}
      {alertsResult.alerts.length > 0 && <AlertsPanel alerts={alertsResult.alerts} />}

      {/* Виджет "Сегодня" */}
      <Suspense fallback={null}>
        <TodayWidgetInstructor userId={userId} />
      </Suspense>

      <Box>
        <Heading size="lg" mb={4}>
          Инструктор
        </Heading>

        {/* Напоминание о незавершённом онбординге */}
        {showOnboardingReminder && (
          <Box mb={4}>
            <OnboardingReminder
              currentStep={userOnboarding.currentStep}
              completedSteps={userOnboarding.completedSteps}
              wasSkipped={!!userOnboarding.skippedAt}
              skippedAt={userOnboarding.skippedAt}
            />
          </Box>
        )}

        {/* Прогресс-бар заполненности профиля */}
        <Box mb={4}>
          <ProfileCompleteness
            profile={
              instructorProfile
                ? {
                    bio: instructorProfile.bio,
                    experienceStartDate: instructorProfile.experienceStartDate,
                    licenseCategories: instructorProfile.licenseCategories,
                    workingAreas: instructorProfile.workingAreas,
                    basePrice: instructorProfile.lessonTypes[0]?.pricingOptions[0]?.pricePerLesson
                      ? Number(instructorProfile.lessonTypes[0].pricingOptions[0].pricePerLesson)
                      : null,
                    photoId: instructorProfile.photoId,
                  }
                : null
            }
            scheduleSettings={instructorProfile?.scheduleSettings ?? null}
            vehicles={instructorProfile?.vehicles ?? []}
            userImage={userImage}
          />
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          <DashboardCard
            icon={<LuCalendar size={24} />}
            title="Расписание"
            description="Управление расписанием занятий"
            href="/schedule"
          />
          <DashboardCard
            icon={<LuCar size={24} />}
            title="Занятия"
            description="Управление занятиями"
            href="/lessons"
          />
          <DashboardCard
            icon={<LuUsers size={24} />}
            title="Мои ученики"
            description="Список ваших учеников"
            href="/students"
          />
          <DashboardCard
            icon={<LuCar size={24} />}
            title="Мои автомобили"
            description="Автомобили для обучения"
            href="/vehicles"
          />
          <DashboardCard
            icon={<LuStar size={24} />}
            title="Отзывы обо мне"
            description="Что говорят ученики"
            href="/reviews"
          />
          {isTheoryInstructor && (
            <DashboardCard
              icon={<LuBookOpen size={24} />}
              title="Теоретические занятия"
              description="Расписание теории"
              href="/theory-lessons"
            />
          )}
          <DashboardCard
            icon={<LuSettings size={24} />}
            title="Профиль инструктора"
            description="Настройки профиля"
            href="/instructor-profile"
          />
        </SimpleGrid>
      </Box>
    </VStack>
  )
}
