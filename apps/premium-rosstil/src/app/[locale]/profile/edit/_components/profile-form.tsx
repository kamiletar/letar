'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { VStack } from '@chakra-ui/react'
import { updateProfile, type UpdateProfileResult } from '../_actions/update-profile'
import { type ProfileEditData, ProfileEditSchema } from '../_schemas/profile-edit.schema'

interface ProfileFormProps {
  defaultValue: ProfileEditData
}

/**
 * Форма редактирования профиля пользователя.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function ProfileForm({ defaultValue }: ProfileFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: ProfileEditData) => {
    const result: UpdateProfileResult = await updateProfile(data)

    if (result.success) {
      toaster.success({
        title: 'Профиль обновлён',
        description: 'Ваши данные успешно сохранены',
      })
      router.push('/profile')
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <PremiumRosstilForm initialValue={defaultValue} schema={ProfileEditSchema} onSubmit={handleSubmit}>
      <VStack align="stretch" gap={4}>
        <PremiumRosstilForm.Field.String name="name" label="Имя" placeholder="Введите ваше имя" required />

        <PremiumRosstilForm.Field.String
          name="email"
          label="Email"
          type="email"
          placeholder="email@example.com"
          helperText="Используется для входа и восстановления пароля"
          required
        />

        <PremiumRosstilForm.Field.Phone
          name="phoneNumber"
          label="Телефон"
          placeholder="+7 (999) 123-45-67"
          helperText="Формат: +7 (999) 123-45-67"
        />

        <PremiumRosstilForm.Select.Gender name="gender" label="Пол" placeholder="Выберите пол" />

        <PremiumRosstilForm.Field.Date name="birthdate" label="Дата рождения" />

        <PremiumRosstilForm.Button.Submit colorPalette="fg" size="lg" width="full">
          Сохранить изменения
        </PremiumRosstilForm.Button.Submit>
      </VStack>
    </PremiumRosstilForm>
  )
}
