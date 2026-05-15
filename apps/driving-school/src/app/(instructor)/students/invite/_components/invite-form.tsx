'use client'

import { useRouter } from 'next/navigation'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { VStack } from '@chakra-ui/react'

import { createInvitationAction } from '../_actions/invite.action'
import { type CreateInviteByEmailData, CreateInviteByEmailSchema } from '../_schemas/invite.schema'

export function InviteForm() {
  const router = useRouter()

  return (
    <DrivingSchoolForm<CreateInviteByEmailData>
      schema={CreateInviteByEmailSchema}
      initialValue={{ email: '' }}
      onSubmit={async (value) => {
        const result = await createInvitationAction(value)

        if (result.success) {
          // Редирект на страницу успеха с токеном
          router.push(`/students/invite/success?token=${result.token}`)
        } else {
          const errorMessages: Record<string, string> = {
            UNAUTHORIZED: 'Необходимо войти в систему',
            NOT_INSTRUCTOR: 'Только инструкторы могут создавать приглашения',
            ALREADY_CONNECTED: 'Этот ученик уже связан с вами',
            UNKNOWN_ERROR: 'Произошла ошибка при создании приглашения',
          }
          toaster.error({ title: errorMessages[result.error] || 'Ошибка' })
        }
      }}
    >
      <VStack gap={4} align="stretch">
        <DrivingSchoolForm.Errors />

        <DrivingSchoolForm.Field.String
          name="email"
          label="Email ученика"
          placeholder="student@example.com"
          helperText="Ученик получит ссылку на этот email (опционально)"
        />

        <DrivingSchoolForm.Button.Submit colorPalette="brand" size="lg">
          Создать приглашение
        </DrivingSchoolForm.Button.Submit>
      </VStack>
    </DrivingSchoolForm>
  )
}
