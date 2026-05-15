'use client'

/**
 * InstructorOnboardingWizard — визард онбординга инструктора на DrivingSchoolForm
 *
 * Использует возможности @letar/forms:
 * - Form.Steps с segment prop
 * - Form.Steps.Step с stepPersistence
 * - Tooltip из Zod schema meta
 * - useFormStepsContext для навигации
 */

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Box, Button, Card, HStack, Icon, Text } from '@chakra-ui/react'
import type {
  InstructorProfile,
  InstructorVehicle,
  LessonType,
  PricingOption,
  ScheduleSettings,
} from '@letar/driving-school-db/prisma'
import { useFormStepsContext } from '@letar/forms'
import { useCallback, useMemo, useState, useTransition } from 'react'
import {
  LuCalendar,
  LuCar,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuDollarSign,
  LuUser,
  LuUsers,
} from 'react-icons/lu'
import { completeOnboardingV2Action, saveStepAction, skipOnboardingAction } from '../_actions/onboarding.action'
import {
  getInitialFormData,
  type InstructorOnboardingFormData,
  InstructorOnboardingSchema,
} from '../_schemas/instructor-onboarding.schema'
import { InstructorFaqDialog } from './instructor-faq-dialog'
import { Step1Welcome, Step2BasicInfo, Step3Vehicle, Step4Schedule, Step5Pricing, Step6Complete } from './steps'

const STORAGE_KEY_PREFIX = 'driving-school-instructor-onboarding-v2'

interface InstructorOnboardingWizardProps {
  userId: string
  userName: string
  initialStep: number
  completedSteps: number[]
  instructorProfile:
    | (InstructorProfile & {
        vehicles: InstructorVehicle[]
        scheduleSettings: ScheduleSettings | null
        lessonTypes: (LessonType & { pricingOptions: PricingOption[] })[]
      })
    | null
}

export function InstructorOnboardingWizard({
  userId,
  userName,
  initialStep,
  completedSteps: _completedSteps,
  instructorProfile,
}: InstructorOnboardingWizardProps) {
  const [isPending, startTransition] = useTransition()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Уникальный ключ localStorage для каждого пользователя
  const storageKey = `${STORAGE_KEY_PREFIX}-${userId}`

  // Мемоизируем конфигурацию stepPersistence — иначе новый объект на каждом рендере
  // вызывает бесконечный цикл в useStepPersistence useEffect
  const stepPersistenceConfig = useMemo(() => ({ key: storageKey, debounceMs: 500 }), [storageKey])

  // Начальные данные из профиля
  const initialFormData = getInitialFormData(instructorProfile)

  // Обработчик пропуска онбординга
  // Используем hard navigation (window.location) вместо router.replace —
  // soft navigation вызывает "Rendered fewer hooks" из-за re-render wizard во время transition
  const handleSkip = useCallback(() => {
    startTransition(async () => {
      const result = await skipOnboardingAction()
      if (result.success) {
        localStorage.removeItem(storageKey)
        toaster.info({
          title: 'Онбординг пропущен',
          description: 'Вы можете вернуться к настройке профиля в любое время',
        })
        window.location.href = '/dashboard'
      } else {
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось пропустить онбординг',
        })
      }
    })
  }, [storageKey])

  // Обработчик завершения формы
  const handleSubmit = useCallback(
    async (formData: InstructorOnboardingFormData) => {
      setIsSubmitting(true)

      startTransition(async () => {
        const result = await completeOnboardingV2Action(formData)

        if (result.success) {
          localStorage.removeItem(storageKey)
          toaster.success({
            title: 'Профиль настроен!',
            description: 'Теперь ученики смогут вас найти',
          })
          window.location.href = '/dashboard'
        } else {
          toaster.error({
            title: 'Ошибка',
            description: result.error ?? 'Не удалось сохранить профиль',
          })
          setIsSubmitting(false)
        }
      })
    },
    [storageKey]
  )

  // Обработчик сохранения шага на сервере
  const handleStepComplete = useCallback(async (stepIndex: number) => {
    // stepIndex is 0-based, currentStep is 1-based
    await saveStepAction({
      currentStep: stepIndex + 2,
      completedSteps: Array.from({ length: stepIndex + 1 }, (_, i) => i + 1),
    })
  }, [])

  return (
    <DrivingSchoolForm initialValue={initialFormData} schema={InstructorOnboardingSchema} onSubmit={handleSubmit}>
      <DrivingSchoolForm.Steps
        validateOnNext
        linear
        animated
        animationDuration={0.3}
        defaultStep={Math.max(0, initialStep - 1)}
        stepPersistence={stepPersistenceConfig}
        onStepComplete={handleStepComplete}
      >
        {/* Indicator with FAQ button */}
        <HStack mb={4} gap={4}>
          <Box flex={1}>
            <DrivingSchoolForm.Steps.Indicator />
          </Box>
          <InstructorFaqDialog variant="icon" size="sm" />
        </HStack>

        {/* Шаг 1: Приветствие */}
        <DrivingSchoolForm.Steps.Step title="Обзор" icon={<LuUsers />}>
          <Step1Welcome userName={userName} onSkip={handleSkip} isPending={isPending} />
        </DrivingSchoolForm.Steps.Step>

        {/* Шаг 2: Основная информация */}
        <DrivingSchoolForm.Steps.Step title="Профиль" icon={<LuUser />} segment="basicInfo">
          <Step2BasicInfo />
        </DrivingSchoolForm.Steps.Step>

        {/* Шаг 3: Автомобиль */}
        <DrivingSchoolForm.Steps.Step title="Авто" icon={<LuCar />} segment="vehicle">
          <Step3Vehicle />
        </DrivingSchoolForm.Steps.Step>

        {/* Шаг 4: Расписание */}
        <DrivingSchoolForm.Steps.Step title="Расписание" icon={<LuCalendar />} segment="schedule">
          <Step4Schedule />
        </DrivingSchoolForm.Steps.Step>

        {/* Шаг 5: Цены */}
        <DrivingSchoolForm.Steps.Step title="Цены" icon={<LuDollarSign />} segment="pricing">
          <Step5Pricing />
        </DrivingSchoolForm.Steps.Step>

        {/* Шаг 6: Завершение */}
        <DrivingSchoolForm.Steps.Step title="Готово" icon={<LuCheck />}>
          <Step6Complete userName={userName} />
        </DrivingSchoolForm.Steps.Step>

        {/* Кастомная навигация */}
        <CustomNavigation isPending={isPending || isSubmitting} />
      </DrivingSchoolForm.Steps>
    </DrivingSchoolForm>
  )
}

/**
 * Кастомная навигация для wizard
 */
function CustomNavigation({ isPending }: { isPending: boolean }) {
  const { goToNext, goToPrev, isFirstStep, isLastStep, currentStep, triggerSubmit } = useFormStepsContext()

  const handleNext = useCallback(async () => {
    if (isLastStep) {
      triggerSubmit()
    } else {
      await goToNext()
    }
  }, [isLastStep, goToNext, triggerSubmit])

  // Первый шаг уже имеет свою кнопку "Начать настройку" в Step1Welcome
  if (currentStep === 0) {
    return null
  }

  return (
    <Card.Root mt={4}>
      <Card.Body>
        <HStack gap={4} justify="space-between">
          <Button variant="ghost" onClick={goToPrev} disabled={isPending || isFirstStep}>
            <Icon>
              <LuChevronLeft />
            </Icon>
            <Text>Назад</Text>
          </Button>
          <Button colorPalette="brand" size="lg" onClick={handleNext} loading={isPending}>
            {isLastStep ? (
              <>
                <Icon>
                  <LuCheck />
                </Icon>
                <Text>Перейти в личный кабинет</Text>
              </>
            ) : (
              <>
                <Text>Продолжить</Text>
                <Icon>
                  <LuChevronRight />
                </Icon>
              </>
            )}
          </Button>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
