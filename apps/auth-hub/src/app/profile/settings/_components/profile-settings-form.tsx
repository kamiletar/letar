'use client'

import { Button, Field, Input, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateProfileAction, type UpdateProfileResult } from '../_actions/update-profile.action'

interface ProfileSettingsFormProps {
  /** Текущее имя пользователя */
  currentName: string
}

/**
 * Форма редактирования профиля (имя)
 */
export function ProfileSettingsForm({ currentName }: ProfileSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UpdateProfileResult | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const formData = new FormData(e.currentTarget)
    const res = await updateProfileAction(formData)
    setResult(res)
    setLoading(false)

    if (res.success) {
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        <Field.Root>
          <Field.Label>Имя</Field.Label>
          <Input
            name="name"
            defaultValue={currentName}
            placeholder="Ваше имя"
            maxLength={100}
            required
          />
          <Field.HelperText>Отображается в профиле и приложениях</Field.HelperText>
        </Field.Root>

        {result?.error && (
          <Text color="fg.error" fontSize="sm">
            {result.error}
          </Text>
        )}

        {result?.success && (
          <Text color="fg.success" fontSize="sm">
            Профиль обновлён
          </Text>
        )}

        <Button type="submit" colorPalette="brand" loading={loading}>
          Сохранить
        </Button>
      </Stack>
    </form>
  )
}
