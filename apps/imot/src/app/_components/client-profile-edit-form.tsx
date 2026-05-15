'use client'

import { updateClientProfile } from '@/app/_actions/client-profile.actions'
import { toaster } from '@/app/_components/ui/toaster'
import {
  type ClientProfileEditData,
  type ClientProfileEditInput,
  ClientProfileEditSchema,
} from '@/app/_schemas/client-profile.schema'
import { ImotForm } from '@/imot-form'
import { Stack, Text, VStack } from '@chakra-ui/react'
import { useTypedFormContext } from '@letar/forms'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RiSaveLine } from 'react-icons/ri'
import { AvatarUpload } from './avatar-upload'

interface ClientProfileEditFormProps {
  defaultValue: ClientProfileEditData
}

/**
 * Компонент для синхронизации аватара с формой
 */
function AvatarField({
  currentImage,
  userName,
  onImageChange,
}: {
  currentImage: string | null
  userName: string
  onImageChange: (url: string | null) => void
}) {
  const { setFieldValue } = useTypedFormContext<ClientProfileEditInput>()

  const handleImageChange = (url: string | null) => {
    onImageChange(url)
    setFieldValue('image', url ?? '')
  }

  return (
    <Stack gap={2}>
      <Text fontSize="sm" fontWeight="medium" color="fg">
        Фото профиля
      </Text>
      <AvatarUpload currentImage={currentImage} userName={userName} onImageChange={handleImageChange} />
    </Stack>
  )
}

export function ClientProfileEditForm({ defaultValue }: ClientProfileEditFormProps) {
  const [imageUrl, setImageUrl] = useState<string>(defaultValue.image || '')
  const router = useRouter()

  const handleSubmit = async (data: ClientProfileEditInput) => {
    const result = await updateClientProfile(data)

    if (result.success) {
      toaster.success({
        title: 'Профиль обновлён',
        description: 'Ваши данные успешно сохранены',
      })

      setTimeout(() => {
        router.push('/my-profile')
      }, 300)
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <ImotForm initialValue={defaultValue} schema={ClientProfileEditSchema} onSubmit={handleSubmit}>
      <VStack gap={6} align="stretch">
        <ImotForm.Errors />

        {/* Загрузка аватара */}
        <AvatarField
          currentImage={imageUrl}
          userName={defaultValue.name}
          onImageChange={(url) => setImageUrl(url || '')}
        />

        {/* Поле имени */}
        <ImotForm.Field.String name="name" label="Имя" placeholder="Введите ваше имя" required />

        {/* Поле телефона (User) */}
        <ImotForm.Field.String
          name="phoneNumber"
          label="Телефон (основной)"
          placeholder="+7 (XXX) XXX-XX-XX"
          type="tel"
        />

        {/* Поле телефона (Client) */}
        <ImotForm.Field.String
          name="phone"
          label="Телефон (дополнительный)"
          placeholder="+7 (XXX) XXX-XX-XX"
          type="tel"
        />

        {/* Поле пола */}
        <ImotForm.Select.Gender name="gender" label="Пол" />

        {/* Поле даты рождения */}
        <Stack gap={2}>
          <ImotForm.Field.Date name="birthdate" label="Дата рождения" />
          <Text fontSize="xs" color="fg.muted">
            Используется для нумерологических расчетов в Матрице Судьбы
          </Text>
        </Stack>

        {/* Кнопка сохранения */}
        <ImotForm.Button.Submit colorPalette="fg" size="lg" width="full">
          <RiSaveLine />
          Сохранить изменения
        </ImotForm.Button.Submit>
      </VStack>
    </ImotForm>
  )
}
