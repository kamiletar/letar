'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Stack } from '@chakra-ui/react'
import { LuSend } from 'react-icons/lu'

import { replyToTicketAction } from '../_actions/ticket.action'
import { ReplyToTicketSchema } from '../_schemas/ticket.schema'

interface ReplyFormProps {
  ticketId: string
}

export function ReplyForm({ ticketId }: ReplyFormProps) {
  return (
    <DrivingSchoolForm
      schema={ReplyToTicketSchema}
      initialValue={{ ticketId, message: '' }}
      onSubmit={async (value) => {
        const result = await replyToTicketAction(value)

        if (result.success) {
          toaster.success({
            title: 'Ответ отправлен',
            description: 'Сообщение успешно добавлено',
          })
        } else {
          toaster.error({ title: result.error })
        }
      }}
    >
      <Stack gap={3}>
        <DrivingSchoolForm.Field.Textarea
          name="message"
          placeholder="Напишите ответ пользователю..."
          rows={4}
          required
        />

        <DrivingSchoolForm.Button.Submit colorPalette="brand">
          <LuSend />
          Отправить ответ
        </DrivingSchoolForm.Button.Submit>
      </Stack>
    </DrivingSchoolForm>
  )
}
