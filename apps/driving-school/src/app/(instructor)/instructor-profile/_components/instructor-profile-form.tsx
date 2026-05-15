'use client'

import { updateInstructorProfileAction } from '@/app/(instructor)/instructor-profile/_actions/update-instructor-profile.action'
import { InstructorPhotoUpload } from '@/app/_components/instructor-photo'
import { toaster } from '@/app/_components/ui/toaster'
import { type WorkingArea, WorkingAreasInput } from '@/app/_components/working-areas-input'
import { DrivingSchoolForm } from '@/driving-school-form'
import { useOfflineForm } from '@/hooks'
import { Box, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useDeclarativeForm } from '@letar/forms'
import { FormOfflineIndicator, FormSyncStatus } from '@letar/forms/offline'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuCloudOff, LuSave } from 'react-icons/lu'

/**
 * Расчёт стажа в годах на основе даты начала деятельности
 */
function calculateExperienceYears(startDate: string): number {
  const start = new Date(startDate)
  const now = new Date()
  const years = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  return Math.max(0, years)
}

const LICENSE_CATEGORIES = [
  { value: 'A', label: 'A - мотоциклы' },
  { value: 'A1', label: 'A1 - лёгкие мотоциклы' },
  { value: 'B', label: 'B - легковые авто' },
  { value: 'B1', label: 'B1 - трициклы' },
  { value: 'BE', label: 'BE - легковые с прицепом' },
  { value: 'C', label: 'C - грузовые' },
  { value: 'C1', label: 'C1 - средние грузовые' },
  { value: 'CE', label: 'CE - грузовые с прицепом' },
  { value: 'C1E', label: 'C1E - средние с прицепом' },
  { value: 'D', label: 'D - автобусы' },
  { value: 'D1', label: 'D1 - малые автобусы' },
  { value: 'DE', label: 'DE - автобусы с прицепом' },
  { value: 'D1E', label: 'D1E - малые с прицепом' },
  { value: 'M', label: 'M - мопеды' },
  { value: 'Tm', label: 'Tm - трамваи' },
  { value: 'Tb', label: 'Tb - троллейбусы' },
] as const

/** Тип данных формы профиля */
interface ProfileFormData {
  name: string
  phone: string
  bio: string
  experienceStartDate: string
  licenseCategories: string[]
  workingAreas: WorkingArea[]
  isPublic: boolean
}

interface InstructorProfileFormProps {
  initialData: {
    name: string | null
    phone: string | null
    bio: string | null
    experienceStartDate: Date | null
    licenseCategories: string[] | null
    workingAreas: WorkingArea[] | null
    isPublic: boolean
    photoUrl: string | null
  } | null
}

/**
 * Форма профиля инструктора с оффлайн поддержкой
 *
 * Особенности:
 * - DrivingSchoolForm (декларативный API) для управления состоянием
 * - useOfflineForm для работы без интернета
 * - Автоматическая синхронизация при восстановлении соединения
 */
export function InstructorProfileForm({ initialData }: InstructorProfileFormProps) {
  const router = useRouter()

  // Хук для оффлайн поддержки
  const { submit, isOffline } = useOfflineForm<ProfileFormData>({
    actionType: 'UPDATE_INSTRUCTOR_PROFILE',
    onlineSubmit: async (value: ProfileFormData) => {
      // Преобразуем данные формы в формат для Server Action
      const result = await updateInstructorProfileAction({
        name: value.name,
        phone: value.phone || undefined,
        bio: value.bio || undefined,
        experienceStartDate: value.experienceStartDate || undefined,
        licenseCategories: value.licenseCategories as (
          | 'A'
          | 'A1'
          | 'B'
          | 'B1'
          | 'BE'
          | 'C'
          | 'C1'
          | 'C1E'
          | 'CE'
          | 'D'
          | 'D1'
          | 'D1E'
          | 'DE'
          | 'M'
          | 'Tb'
          | 'Tm'
        )[],
        workingAreas: JSON.stringify(value.workingAreas),
        isPublic: value.isPublic,
      })

      if (result?.success) {
        return { success: true }
      }

      return { success: false, error: result?.error || 'Ошибка сохранения' }
    },
    onSuccess: () => {
      toaster.create({
        title: 'Профиль обновлён',
        description: 'Ваши данные успешно сохранены',
        type: 'success',
      })
      // Обновляем серверные компоненты (ProfileCta и др.)
      router.refresh()
    },
    onQueued: () => {
      toaster.create({
        title: 'Сохранено локально',
        description: 'Данные будут отправлены при подключении к сети',
        type: 'info',
      })
    },
    onError: (error: string) => {
      toaster.create({
        title: 'Ошибка сохранения',
        description: error,
        type: 'error',
      })
    },
  })

  // Начальные значения формы
  const initialValue: ProfileFormData = {
    name: initialData?.name ?? '',
    phone: initialData?.phone ?? '',
    bio: initialData?.bio ?? '',
    experienceStartDate: initialData?.experienceStartDate
      ? new Date(initialData.experienceStartDate).toISOString().split('T')[0]
      : '',
    licenseCategories: (initialData?.licenseCategories as string[]) ?? [],
    workingAreas: initialData?.workingAreas ?? [],
    isPublic: initialData?.isPublic ?? false,
  }

  // Обёртка для onSubmit - form ожидает void, а submit возвращает OfflineSubmitResult
  const handleSubmit = async (value: ProfileFormData) => {
    await submit(value)
  }

  // Скролл к элементу по hash при загрузке страницы и фокус на input/textarea
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      // Небольшая задержка чтобы DOM успел отрендериться
      setTimeout(() => {
        const element = document.querySelector(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Найти и сфокусировать input/textarea внутри элемента
          const input = element.querySelector('input, textarea, select') as HTMLElement | null
          if (input) {
            input.focus()
          }
        }
      }, 100)
    }
  }, [])

  return (
    <DrivingSchoolForm<ProfileFormData> initialValue={initialValue} onSubmit={handleSubmit}>
      {/* Защита от случайного ухода с несохранёнными изменениями */}
      <DrivingSchoolForm.DirtyGuard />

      {/* Индикатор оффлайн режима */}
      <HStack gap={2} mb={4}>
        <FormOfflineIndicator variant="solid" />
        <FormSyncStatus showWhenEmpty={false} pendingLabel={(count) => `Ожидает синхронизации: ${count}`} />
      </HStack>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={6} alignItems="start">
        {/* Левая колонка: Фото + Личные данные */}
        <VStack gap={6} align="stretch">
          {/* Фото профиля */}
          <Box>
            <Heading size="md" mb={4}>
              Фото профиля
            </Heading>
            <PhotoUploadField initialData={initialData} />
          </Box>

          {/* Публичность профиля */}
          <IsPublicField />

          {/* Личные данные */}
          <Box>
            <Heading size="md" mb={4}>
              Личные данные
            </Heading>
            <VStack gap={4} align="stretch">
              <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr' }} gap={4}>
                <DrivingSchoolForm.Field.String name="name" label="Имя" placeholder="Ваше имя" autoComplete="name" />
                <DrivingSchoolForm.Field.Phone name="phone" label="Телефон" country="RU" autoUnmask />
              </Grid>

              <ExperienceStartDateField />

              <Box id="bio">
                <DrivingSchoolForm.Field.Textarea
                  name="bio"
                  label="О себе"
                  placeholder="Расскажите о своём опыте, подходе к обучению..."
                  rows={4}
                  helperText="Максимум 1000 символов"
                />
              </Box>
            </VStack>
          </Box>
        </VStack>

        {/* Правая колонка: Рабочие зоны + Категории */}
        <VStack gap={6} align="stretch">
          {/* Категории прав */}
          <Box>
            <DrivingSchoolForm.Field.CheckboxCard
              name="licenseCategories"
              label="Категории водительских прав"
              options={LICENSE_CATEGORIES.map((cat) => ({
                label: cat.label,
                value: cat.value,
              }))}
              orientation="horizontal"
              size="sm"
              gap={2}
            />
          </Box>

          {/* Рабочие зоны */}
          <Box id="working-areas">
            <Heading size="md" mb={4}>
              Рабочие зоны
            </Heading>
            <WorkingAreasField />
          </Box>
        </VStack>
      </Grid>

      {/* Кнопка сохранения */}
      <Box mt={6}>
        <DrivingSchoolForm.Button.Submit colorPalette="brand" size="lg" width={{ base: 'full', md: 'auto' }}>
          {isOffline ? <LuCloudOff /> : <LuSave />}
          {isOffline ? 'Сохранить локально' : 'Сохранить профиль'}
        </DrivingSchoolForm.Button.Submit>
      </Box>
    </DrivingSchoolForm>
  )
}

/**
 * Компонент для загрузки фото (использует имя из формы)
 */
function PhotoUploadField({ initialData }: { initialData: InstructorProfileFormProps['initialData'] }) {
  const { form } = useDeclarativeForm()
  const [name, setName] = useState(initialData?.name ?? 'Инструктор')

  useEffect(() => {
    const unsubscribe = form.store.subscribe(() => {
      const values = form.state.values as ProfileFormData
      setName(values.name || 'Инструктор')
    })
    return unsubscribe
  }, [form])

  return <InstructorPhotoUpload currentPhotoUrl={initialData?.photoUrl ?? null} instructorName={name} />
}

/**
 * Переключатель публичности профиля с динамическим фоном
 */
function IsPublicField() {
  const { form } = useDeclarativeForm()
  const [isPublic, setIsPublic] = useState(() => (form.state.values as ProfileFormData).isPublic)

  useEffect(() => {
    // Начальная синхронизация
    setIsPublic((form.state.values as ProfileFormData).isPublic)

    const unsubscribe = form.store.subscribe(() => {
      const values = form.state.values as ProfileFormData
      setIsPublic(values.isPublic)
    })
    return unsubscribe
  }, [form])

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg={isPublic ? 'green.subtle' : 'bg.subtle'}>
      <DrivingSchoolForm.Field.Switch name="isPublic" label="Публичный профиль" />
      <Text mt={3} fontSize="sm" color="fg.muted">
        {isPublic
          ? 'Ваш профиль виден всем в каталоге инструкторов'
          : 'Ваш профиль скрыт из каталога. Только ваши ученики смогут его видеть.'}
      </Text>
    </Box>
  )
}

/**
 * Поле даты начала деятельности с расчётом стажа
 */
function ExperienceStartDateField() {
  const { form } = useDeclarativeForm()
  const [experienceStartDate, setExperienceStartDate] = useState('')

  useEffect(() => {
    const unsubscribe = form.store.subscribe(() => {
      const values = form.state.values as ProfileFormData
      setExperienceStartDate(values.experienceStartDate)
    })
    return unsubscribe
  }, [form])

  const helperText = experienceStartDate
    ? `Стаж ${calculateExperienceYears(experienceStartDate)} лет`
    : 'Стаж будет рассчитан автоматически'

  return (
    <DrivingSchoolForm.Field.Date
      name="experienceStartDate"
      label="Дата начала деятельности"
      max={new Date().toISOString().split('T')[0]}
      helperText={helperText}
    />
  )
}

/**
 * Поле рабочих зон (кастомный компонент через form.Field)
 */
function WorkingAreasField() {
  const { form } = useDeclarativeForm()

  return (
    <form.Field name="workingAreas">
      {(field: { state: { value: WorkingArea[] }; handleChange: (areas: WorkingArea[]) => void }) => (
        <WorkingAreasInput value={field.state.value} onChange={(areas) => field.handleChange(areas)} />
      )}
    </form.Field>
  )
}
