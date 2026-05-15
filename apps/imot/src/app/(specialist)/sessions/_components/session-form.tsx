'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { SessionStatus } from '@/generated/prisma'
import { Box, Button, Grid, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import Link from 'next/link'
import type { SessionFormData } from '../_schemas/session-form.schema'
import { SessionFormSchema } from '../_schemas/session-form.schema'

interface SessionFormProps {
  onSubmit: (data: SessionFormData) => Promise<{ success: boolean; error?: string; field?: string }>
  clients: Array<{ id: string; name: string }>
  defaultValue?: Partial<SessionFormData>
  submitLabel?: string
}

/**
 * Переиспользуемый компонент формы для создания и редактирования сессии.
 * Использует @letar/forms с TanStack Form.
 */
export function SessionForm({ onSubmit, clients, defaultValue, submitLabel = 'Сохранить' }: SessionFormProps) {
  const clientOptions = [
    { value: '', title: 'Выберите клиента' },
    ...clients.map((client) => ({ value: client.id, title: client.name })),
  ]

  const statusOptions = [
    { value: SessionStatus.SCHEDULED, title: 'Запланирована' },
    { value: SessionStatus.IN_PROGRESS, title: 'В процессе' },
    { value: SessionStatus.COMPLETED, title: 'Завершена' },
    { value: SessionStatus.CANCELLED, title: 'Отменена' },
  ]

  const handleSubmit = async (data: SessionFormData) => {
    const result = await onSubmit(data)

    if (!result.success && result.error) {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <Form
      initialValue={{
        clientId: defaultValue?.clientId ?? '',
        scheduledAt: defaultValue?.scheduledAt ?? '',
        duration: defaultValue?.duration ?? 60,
        status: defaultValue?.status ?? 'SCHEDULED',
        topic: defaultValue?.topic ?? '',
        notes: defaultValue?.notes ?? '',
        homework: defaultValue?.homework ?? '',
        meetingUrl: defaultValue?.meetingUrl ?? '',
        paymentUrl: defaultValue?.paymentUrl ?? '',
        paymentStatus: defaultValue?.paymentStatus,
      }}
      schema={SessionFormSchema}
      onSubmit={handleSubmit}
    >
      <Stack gap={4}>
        <Form.Errors />

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
          {/* Клиент */}
          <Form.Field.NativeSelect name="clientId" label="Клиент" options={clientOptions} required />

          {/* Дата и время */}
          <Form.Field.String name="scheduledAt" label="Дата и время" required />

          {/* Длительность */}
          <Form.Field.NumberInput name="duration" label="Длительность (минуты)" min={15} step={15} />

          {/* Статус */}
          <Form.Field.NativeSelect name="status" label="Статус" options={statusOptions} />
        </Grid>

        {/* Тема сессии */}
        <Form.Field.String name="topic" label="Тема сессии" placeholder="Например: Работа с детскими травмами" />

        {/* Заметки */}
        <Form.Field.Textarea
          name="notes"
          label="Заметки специалиста"
          placeholder="Заметки о сессии, наблюдения, ключевые моменты..."
          rows={4}
        />

        {/* Домашнее задание */}
        <Form.Field.Textarea
          name="homework"
          label="Домашнее задание"
          placeholder="Практики и упражнения для клиента..."
          rows={3}
        />

        {/* Кнопки */}
        <Box display="flex" gap={3}>
          <Form.Button.Submit colorPalette="fg">{submitLabel}</Form.Button.Submit>
          <Button type="button" variant="outline" asChild>
            <Link href="/sessions">Отмена</Link>
          </Button>
        </Box>
      </Stack>
    </Form>
  )
}
