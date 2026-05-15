'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { SimpleGrid, Stack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { LuBuilding } from 'react-icons/lu'
import { createSchoolAction } from '../_actions/create-school.action'
import { type CreateSchoolInput, CreateSchoolSchema } from '../_schemas/create-school.schema'

// Категории прав для выбора
const licenseCategoryOptions = [
  { value: 'A', label: 'A — мотоциклы' },
  { value: 'A1', label: 'A1 — лёгкие мотоциклы' },
  { value: 'B', label: 'B — легковые авто' },
  { value: 'B1', label: 'B1 — трициклы' },
  { value: 'BE', label: 'BE — легковые с прицепом' },
  { value: 'C', label: 'C — грузовые' },
  { value: 'C1', label: 'C1 — средние грузовые' },
  { value: 'CE', label: 'CE — грузовые с прицепом' },
  { value: 'C1E', label: 'C1E — средние с прицепом' },
  { value: 'D', label: 'D — автобусы' },
  { value: 'D1', label: 'D1 — малые автобусы' },
  { value: 'DE', label: 'DE — автобусы с прицепом' },
  { value: 'D1E', label: 'D1E — малые с прицепом' },
  { value: 'M', label: 'M — мопеды' },
  { value: 'Tm', label: 'Tm — трамваи' },
  { value: 'Tb', label: 'Tb — троллейбусы' },
]

/**
 * Форма создания автошколы
 *
 * Особенности:
 * - DrivingSchoolForm (декларативный API на TanStack Form)
 * - Field.CheckboxCard для категорий обучения
 * - Field.Phone для телефона
 * - Решает Bug #21 (form reset после Server Action)
 */
export function CreateSchoolForm() {
  const router = useRouter()

  const handleSubmit = async (value: CreateSchoolInput) => {
    // Вызываем Server Action напрямую с типизированными данными
    const result = await createSchoolAction(value)

    if (result.success) {
      toaster.success({
        title: 'Автошкола создана',
        description: 'Переходим на страницу настроек',
      })
      router.push(`/school/${result.organizationId}/settings`)
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <DrivingSchoolForm
      initialValue={{
        name: '',
        description: '',
        phone: '',
        email: '',
        licenseCategories: [],
      }}
      schema={CreateSchoolSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={6}>
        <DrivingSchoolForm.Errors />

        {/* Название */}
        <DrivingSchoolForm.Field.String
          name="name"
          label="Название автошколы"
          placeholder="Например: Автошкола Драйв"
          required
        />

        {/* Описание */}
        <DrivingSchoolForm.Field.Textarea
          name="description"
          label="Описание"
          placeholder="Краткое описание вашей автошколы"
          rows={3}
        />

        {/* Телефон и Email */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <DrivingSchoolForm.Field.Phone name="phone" label="Телефон" />
          <DrivingSchoolForm.Field.String
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="info@autoschool.ru"
          />
        </SimpleGrid>

        {/* Категории обучения */}
        <DrivingSchoolForm.Field.CheckboxCard
          name="licenseCategories"
          label="Категории обучения"
          helperText="Выберите категории, по которым проводите обучение"
          options={licenseCategoryOptions}
          size="sm"
          gap={3}
        />

        {/* Кнопка отправки */}
        <DrivingSchoolForm.Button.Submit colorPalette="brand" size="lg">
          <LuBuilding />
          Создать автошколу
        </DrivingSchoolForm.Button.Submit>
      </Stack>
    </DrivingSchoolForm>
  )
}
