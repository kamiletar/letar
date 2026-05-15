'use client'

import { updateProfile } from '@/app/_actions/profile.actions'
import { toaster } from '@/app/_components/ui/toaster'
import { type ProfileEditInput, ProfileEditSchema } from '@/app/_schemas/profile.schema'
import { Stack, Text, VStack } from '@chakra-ui/react'
import { Form, useTypedFormContext } from '@letar/forms'
import { useState } from 'react'
import { RiSaveLine } from 'react-icons/ri'
import { AvatarUpload } from './avatar-upload'

interface ProfileEditFormProps {
  defaultValues: {
    name: string
    phoneNumber?: string | null
    image?: string | null
  }
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
  const { setFieldValue } = useTypedFormContext<ProfileEditInput>()

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

export function ProfileEditForm({ defaultValues }: ProfileEditFormProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(defaultValues.image || null)

  const handleSubmit = async (data: ProfileEditInput) => {
    const result = await updateProfile(data)

    if (result.success) {
      toaster.create({
        title: 'Успешно',
        description: 'Профиль обновлен',
        type: 'success',
      })
    } else {
      toaster.create({
        title: 'Ошибка',
        description: result.error,
        type: 'error',
      })
    }
  }

  return (
    <Form
      initialValue={{
        name: defaultValues.name,
        phoneNumber: defaultValues.phoneNumber ?? '',
        image: defaultValues.image ?? '',
      }}
      schema={ProfileEditSchema}
      onSubmit={handleSubmit}
    >
      <VStack gap={6} align="stretch">
        <Form.Errors />

        {/* Загрузка аватара */}
        <AvatarField currentImage={imageUrl} userName={defaultValues.name} onImageChange={setImageUrl} />

        {/* Поле имени */}
        <Form.Field.String name="name" label="Имя" placeholder="Введите ваше имя" required />

        {/* Поле телефона */}
        <Form.Field.String name="phoneNumber" label="Телефон" placeholder="+7 (XXX) XXX-XX-XX" type="tel" />

        {/* Кнопка сохранения */}
        <Form.Button.Submit colorPalette="fg" size="lg" width="full">
          <RiSaveLine />
          Сохранить изменения
        </Form.Button.Submit>
      </VStack>
    </Form>
  )
}
