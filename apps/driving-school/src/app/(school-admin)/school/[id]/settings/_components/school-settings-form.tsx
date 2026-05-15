'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { ALL_LICENSE_CATEGORIES, getCategoryDisplayName } from '@/lib/license-categories/license-categories'
import { parseOrganizationMetadata } from '@/lib/organization-metadata'
import { Box, SimpleGrid, Stack } from '@chakra-ui/react'
import type { Organization } from '@letar/driving-school-db/models'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import { updateSchoolAction } from '../_actions/update-school.action'
import { UpdateSchoolSchema } from '../_schemas/update-school.schema'

type Props = {
  school: Organization
}

/**
 * Форма настроек школы
 *
 * Особенности:
 * - DrivingSchoolForm (декларативный API на TanStack Form)
 * - Field.CheckboxCard для выбора категорий
 * - Field.Switch для публичности
 * - Решает Bug #21 (form reset после Server Action)
 */
export function SchoolSettingsForm({ school }: Props) {
  // Парсим metadata для получения licenseCategories
  const metadata = parseOrganizationMetadata(school.metadata)

  // Опции для категорий обучения
  const categoryOptions = ALL_LICENSE_CATEGORIES.map((category) => ({
    label: getCategoryDisplayName(category as LicenseCategory),
    value: category,
  }))

  const handleSubmit = async (value: {
    schoolId: string
    name: string
    description?: string
    phone?: string
    email?: string
    website?: string
    licenseCategories?: string[]
    isPublic?: boolean
  }) => {
    // Вызываем Server Action напрямую с типизированными данными
    // Приводим licenseCategories к типу LicenseCategory[]
    const result = await updateSchoolAction({
      ...value,
      licenseCategories: value.licenseCategories as LicenseCategory[] | undefined,
    })

    if (result.success) {
      toaster.success({
        title: 'Настройки сохранены',
        description: 'Изменения успешно применены',
      })
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
        schoolId: school.id,
        name: school.name,
        description: school.description || '',
        phone: school.phone || '',
        email: school.email || '',
        website: school.website || '',
        licenseCategories: metadata.licenseCategories as string[],
        isPublic: school.isPublic,
      }}
      schema={UpdateSchoolSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={6}>
        <DrivingSchoolForm.Errors />

        <DrivingSchoolForm.Field.String
          name="name"
          label="Название автошколы"
          placeholder="Например: Автошкола Драйв"
          required
        />

        <DrivingSchoolForm.Field.Textarea
          name="description"
          label="Описание"
          placeholder="Краткое описание вашей автошколы"
          rows={3}
        />

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <DrivingSchoolForm.Field.Phone name="phone" label="Телефон" country="RU" autoUnmask />

          <DrivingSchoolForm.Field.String
            name="email"
            label="Email"
            type="email"
            placeholder="info@autoschool.ru"
            autoComplete="email"
          />
        </SimpleGrid>

        <DrivingSchoolForm.Field.String
          name="website"
          label="Сайт"
          type="url"
          placeholder="https://autoschool.ru"
          autoComplete="url"
        />

        <DrivingSchoolForm.Field.CheckboxCard
          name="licenseCategories"
          label="Категории обучения"
          helperText="Выберите категории, по которым проводите обучение"
          options={categoryOptions}
          size="sm"
          gap={3}
        />

        <Box p={4} bg="bg.muted" borderRadius="md">
          <DrivingSchoolForm.Field.Switch
            name="isPublic"
            label="Показывать в каталоге"
            helperText="Когда включено, школа будет отображаться в публичном каталоге автошкол"
            colorPalette="brand"
          />
        </Box>

        <DrivingSchoolForm.Button.Submit colorPalette="brand" size="lg">
          Сохранить изменения
        </DrivingSchoolForm.Button.Submit>
      </Stack>
    </DrivingSchoolForm>
  )
}
