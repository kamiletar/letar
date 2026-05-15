'use client'

/**
 * OnboardingWizard — визард онбординга пользователя на DrivingSchoolForm
 *
 * Использует возможности @letar/forms:
 * - DrivingSchoolForm.Steps с анимацией и валидацией
 * - DrivingSchoolForm.When для условных шагов по роли
 * - DrivingSchoolForm.Field.RadioCard с keyboardNavigation
 * - Confetti при успешном завершении
 */

import { useConfetti } from '@/app/_components/confetti'
import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Alert, Box, Card, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { LuBookOpen, LuBuilding2, LuCar, LuInfo } from 'react-icons/lu'
import { completeOnboarding, type CompleteOnboardingResult } from '../_actions/complete-onboarding.action'
import { getErrorMessage } from '../_lib/onboarding-context'
import { clearOnboardingState } from '../_lib/onboarding-storage'
import {
  getInitialFormData,
  type OnboardingFormData,
  OnboardingFormSchema,
  roleOptions,
} from '../_schemas/onboarding-form.schema'

interface OnboardingWizardProps {
  userId: string
  initialName?: string
}

export function OnboardingWizard({ userId, initialName = '' }: OnboardingWizardProps) {
  const router = useRouter()

  // Celebration animation при успешном завершении
  const { triggerConfetti, ConfettiComponent } = useConfetti({ count: 60, duration: 3 })

  // handleSubmit — async функция, которую TanStack Form отслеживает через form.state.isSubmitting.
  // Пока промис не разрешится, кнопка "Завершить" заблокирована (loading) в FormStepsNavigation.
  const handleSubmit = useCallback(
    async (formData: OnboardingFormData) => {
      let result: CompleteOnboardingResult

      switch (formData.role) {
        case 'STUDENT':
          result = await completeOnboarding({
            role: 'STUDENT',
            name: formData.name,
            preferredAreas: formData.preferredAreas.length > 0 ? formData.preferredAreas : undefined,
          })
          break
        case 'INSTRUCTOR':
          result = await completeOnboarding({
            role: 'INSTRUCTOR',
            name: formData.name,
            carBrand: formData.carBrand,
            carModel: formData.carModel,
            carTransmission: formData.carTransmission,
            experienceStartDate: formData.experienceStartDate || undefined,
            city: formData.city || undefined,
            isPublic: formData.isPublic,
          })
          break
        case 'SCHOOL_ADMIN':
          result = await completeOnboarding({
            role: 'SCHOOL_ADMIN',
            name: formData.name,
            schoolName: formData.schoolName,
            schoolCity: formData.schoolCity,
            schoolPhone: formData.schoolPhone || undefined,
            schoolEmail: formData.schoolEmail || undefined,
            schoolWebsite: formData.schoolWebsite || undefined,
            schoolDescription: formData.schoolDescription || undefined,
            schoolLicenseCategories:
              formData.schoolLicenseCategories.length > 0 ? formData.schoolLicenseCategories : undefined,
            schoolIsPublic: formData.schoolIsPublic,
          })
          break
        default:
          return
      }

      if (!result.success) {
        toaster.error({
          title: 'Ошибка',
          description: getErrorMessage(result.error),
        })
        return
      }

      // Очищаем localStorage
      clearOnboardingState(userId)

      // Celebration animation
      triggerConfetti()

      toaster.success({
        title: 'Добро пожаловать!',
        description: 'Профиль успешно настроен',
      })

      // Редирект: инструкторов на расширенный онбординг
      // Задержка для показа confetti
      setTimeout(() => {
        router.replace(formData.role === 'INSTRUCTOR' ? '/instructor-onboarding' : '/dashboard')
      }, 1500)
    },
    [router, userId, triggerConfetti]
  )

  return (
    <>
      {/* Confetti animation */}
      <ConfettiComponent />

      <DrivingSchoolForm
        initialValue={getInitialFormData(initialName)}
        schema={OnboardingFormSchema}
        onSubmit={handleSubmit}
      >
        <DrivingSchoolForm.Steps validateOnNext linear animated animationDuration={0.3}>
          <DrivingSchoolForm.Steps.Indicator />

          {/* Шаг 1: Имя */}
          <DrivingSchoolForm.Steps.Step title="Профиль">
            <StepNameContent />
          </DrivingSchoolForm.Steps.Step>

          {/* Шаг 2: Роль */}
          <DrivingSchoolForm.Steps.Step title="Роль">
            <StepRoleContent />
          </DrivingSchoolForm.Steps.Step>

          {/* Шаг 3: Профиль зависит от роли */}
          <DrivingSchoolForm.Steps.Step title="Детали" when={{ field: 'role', is: 'STUDENT' }}>
            <StepStudentProfile />
          </DrivingSchoolForm.Steps.Step>

          <DrivingSchoolForm.Steps.Step title="Детали" when={{ field: 'role', is: 'INSTRUCTOR' }}>
            <StepInstructorProfile />
          </DrivingSchoolForm.Steps.Step>

          <DrivingSchoolForm.Steps.Step title="Детали" when={{ field: 'role', is: 'SCHOOL_ADMIN' }}>
            <StepSchoolProfile />
          </DrivingSchoolForm.Steps.Step>

          <DrivingSchoolForm.Steps.Navigation submitLabel="Завершить" nextLabel="Продолжить" prevLabel="Назад" />
        </DrivingSchoolForm.Steps>
      </DrivingSchoolForm>
    </>
  )
}

/**
 * Шаг 1: Ввод имени
 */
function StepNameContent() {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Как вас зовут?</Heading>
        <Text color="fg.muted">Это имя будет видно другим пользователям</Text>
      </Card.Header>
      <Card.Body>
        <DrivingSchoolForm.Field.String name="name" />
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Шаг 2: Выбор роли
 */
function StepRoleContent() {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Выберите вашу роль</Heading>
        <Text color="fg.muted">Вы всегда сможете изменить её позже. Используйте ← → для выбора</Text>
      </Card.Header>
      <Card.Body>
        <DrivingSchoolForm.Field.RadioCard
          name="role"
          keyboardNavigation
          orientation="horizontal"
          options={roleOptions.map((opt) => ({
            value: opt.value,
            label: opt.label,
            description: opt.description,
            addon: (
              <Box color="fg.muted" mb={2}>
                {opt.value === 'STUDENT' && <LuBookOpen size={32} />}
                {opt.value === 'INSTRUCTOR' && <LuCar size={32} />}
                {opt.value === 'SCHOOL_ADMIN' && <LuBuilding2 size={32} />}
              </Box>
            ),
          }))}
        />
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Шаг 3 (STUDENT): Профиль ученика
 * Упрощённая версия без useFieldActions для избежания infinite loop
 */
function StepStudentProfile() {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Расскажите о себе</Heading>
        <Text color="fg.muted">Эта информация поможет инструкторам лучше подготовиться</Text>
      </Card.Header>
      <Card.Body>
        <DrivingSchoolForm.Field.City name="city" label="Город" />
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Шаг 3 (INSTRUCTOR): Профиль инструктора
 * Упрощённая версия без useFieldActions для избежания infinite loop
 */
function StepInstructorProfile() {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Информация об автомобиле</Heading>
        <Text color="fg.muted">Ученики смогут видеть, на чём вы обучаете</Text>
      </Card.Header>
      <Card.Body>
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          {/* Левая колонка - личные данные */}
          <Stack gap={4}>
            <DrivingSchoolForm.Field.City name="city" label="Город" />

            <DrivingSchoolForm.Field.Date name="experienceStartDate" max={new Date().toISOString().split('T')[0]} />

            <DrivingSchoolForm.Field.Switch
              name="isPublic"
              label="Публичный профиль"
              helperText="Ученики смогут найти вас в каталоге"
            />
          </Stack>

          {/* Правая колонка - данные автомобиля */}
          <Stack gap={4}>
            <DrivingSchoolForm.Field.String name="carBrand" required />
            <DrivingSchoolForm.Field.String name="carModel" required />
            <DrivingSchoolForm.Field.SegmentedGroup
              name="carTransmission"
              label="Тип КПП"
              options={[
                { value: 'MANUAL', label: 'Механика' },
                { value: 'AUTOMATIC', label: 'Автомат' },
              ]}
            />

            <Alert.Root status="info" size="sm">
              <Alert.Indicator>
                <LuInfo />
              </Alert.Indicator>
              <Alert.Title>Дополнительные автомобили можно добавить позже в профиле</Alert.Title>
            </Alert.Root>
          </Stack>
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Шаг 3 (SCHOOL_ADMIN): Профиль школы
 * Упрощённая версия без useFieldActions для избежания infinite loop
 */
function StepSchoolProfile() {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Данные автошколы</Heading>
        <Text color="fg.muted">Базовая информация о вашей автошколе</Text>
      </Card.Header>
      <Card.Body>
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
          {/* Левая колонка — основные данные */}
          <Stack gap={4}>
            <DrivingSchoolForm.Field.String name="schoolName" required />
            <DrivingSchoolForm.Field.City name="schoolCity" label="Город" required />
            <DrivingSchoolForm.Field.Phone name="schoolPhone" />
            <DrivingSchoolForm.Field.String name="schoolEmail" />
            <DrivingSchoolForm.Field.String name="schoolWebsite" />
          </Stack>

          {/* Правая колонка — описание и настройки */}
          <Stack gap={4}>
            <DrivingSchoolForm.Field.Textarea name="schoolDescription" />
            <DrivingSchoolForm.Listbox.LicenseCategories name="schoolLicenseCategories" />
            <DrivingSchoolForm.Field.Switch
              name="schoolIsPublic"
              label="Показывать в каталоге"
              helperText="Школа будет видна в публичном каталоге"
            />
          </Stack>
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  )
}
