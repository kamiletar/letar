'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { ImotForm } from '@/imot-form'
import { Box, Button, Grid, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { type ClientFormData, ClientFormSchema } from '../_schemas/client-form.schema'

interface ClientFormProps {
  onSubmit: (
    data: ClientFormData
  ) => Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }>
  defaultValue?: Partial<ClientFormData>
  submitLabel?: string
  cancelHref?: string
}

/**
 * Переиспользуемый компонент формы для создания и редактирования клиента.
 * Использует @letar/forms с TanStack Form.
 */
export function ClientForm({
  onSubmit,
  defaultValue,
  submitLabel = 'Сохранить',
  cancelHref = '/clients',
}: ClientFormProps) {
  const handleSubmit = async (data: ClientFormData) => {
    const result = await onSubmit(data)

    if (!result.success && result.error) {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <ImotForm
      initialValue={{
        name: defaultValue?.name ?? '',
        email: defaultValue?.email ?? '',
        phone: defaultValue?.phone ?? '',
        gender: defaultValue?.gender ?? undefined,
        birthdate: defaultValue?.birthdate ?? '',
        mainRequest: defaultValue?.mainRequest ?? '',
        notes: defaultValue?.notes ?? '',
      }}
      schema={ClientFormSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={4}>
        <ImotForm.Errors />

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
          {/* Имя */}
          <ImotForm.Field.String name="name" label="Имя" placeholder="Введите имя клиента" required />

          {/* Email */}
          <ImotForm.Field.String name="email" label="Email" type="email" placeholder="example@mail.com" required />

          {/* Телефон */}
          <ImotForm.Field.String name="phone" label="Телефон" type="tel" placeholder="+7 (999) 123-45-67" />

          {/* Пол */}
          <ImotForm.Select.Gender name="gender" label="Пол" />

          {/* Дата рождения */}
          <Box>
            <ImotForm.Field.Date name="birthdate" label="Дата рождения" />
            <Text fontSize="xs" color="fg.muted" mt={1}>
              Важно для расчета нумерологической матрицы судьбы
            </Text>
          </Box>
        </Grid>

        {/* Основной запрос */}
        <ImotForm.Field.Textarea
          name="mainRequest"
          label="Основной запрос клиента"
          placeholder="С чем пришел клиент? Что хочет изменить в жизни?"
          rows={4}
        />

        {/* Заметки специалиста */}
        <ImotForm.Field.Textarea name="notes" label="Заметки" placeholder="Ваши заметки о клиенте" rows={4} />

        {/* Кнопки */}
        <Box display="flex" gap={3}>
          <ImotForm.Button.Submit colorPalette="fg">{submitLabel}</ImotForm.Button.Submit>
          <Button type="button" variant="outline" asChild>
            <Link href={cancelHref}>Отмена</Link>
          </Button>
        </Box>
      </Stack>
    </ImotForm>
  )
}
