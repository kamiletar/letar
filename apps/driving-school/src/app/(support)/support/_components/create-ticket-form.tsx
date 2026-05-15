'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Stack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { LuSend } from 'react-icons/lu'

import { createTicketAction } from '../_actions/support.action'
import { type CreateTicketData, CreateTicketSchema } from '../_schemas/support-ticket.schema'

export function CreateTicketForm() {
  const router = useRouter()

  const handleSubmit = async (value: CreateTicketData) => {
    // Вызываем Server Action напрямую с типизированными данными
    const result = await createTicketAction(value)

    if (result.success) {
      toaster.success({ title: 'Обращение создано' })
      if (result.ticketId) {
        router.push(`/support/${result.ticketId}`)
      } else {
        router.push('/support')
      }
    } else {
      toaster.error({ title: result.error })
    }
  }

  return (
    <DrivingSchoolForm
      schema={CreateTicketSchema}
      initialValue={{ category: '' as unknown as CreateTicketData['category'], subject: '', description: '' }}
      onSubmit={handleSubmit}
    >
      <Stack gap={6}>
        <DrivingSchoolForm.Errors />

        <DrivingSchoolForm.Select.TicketCategory
          name="category"
          label="Тема обращения"
          placeholder="Выберите тему"
          required
        />

        <DrivingSchoolForm.Field.String
          name="subject"
          label="Заголовок"
          placeholder="Кратко опишите проблему"
          helperText="От 5 до 100 символов"
          required
        />

        <DrivingSchoolForm.Field.Textarea
          name="description"
          label="Описание"
          placeholder="Подробно опишите проблему или предложение..."
          helperText="Чем подробнее описание, тем быстрее мы сможем помочь"
          rows={6}
          required
        />

        <DrivingSchoolForm.Button.Submit colorPalette="brand" size="lg">
          <LuSend />
          Отправить обращение
        </DrivingSchoolForm.Button.Submit>
      </Stack>
    </DrivingSchoolForm>
  )
}
