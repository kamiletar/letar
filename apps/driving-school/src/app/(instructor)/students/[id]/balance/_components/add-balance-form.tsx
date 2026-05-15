'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Fieldset, Stack } from '@chakra-ui/react'

import { addBalanceAction } from '../_actions/balance.action'
import { AddBalanceSchema } from '../_schemas/add-balance.schema'

interface AddBalanceFormProps {
  studentUserId: string
  currentBalance: number
}

export function AddBalanceForm({ studentUserId, currentBalance }: AddBalanceFormProps) {
  return (
    <DrivingSchoolForm
      schema={AddBalanceSchema}
      initialValue={{ amount: 1, comment: '' }}
      onSubmit={async (value) => {
        const result = await addBalanceAction(studentUserId, value)

        if (result.success) {
          toaster.success({ title: 'Баланс пополнен' })
        } else {
          toaster.error({ title: result.error })
        }
      }}
    >
      <Fieldset.Root>
        <Fieldset.Legend fontSize="lg" fontWeight="bold">
          Пополнить баланс
        </Fieldset.Legend>
        <Fieldset.HelperText color="fg.muted">Текущий баланс: {currentBalance} занятий</Fieldset.HelperText>

        <Stack gap={4} mt={4}>
          <DrivingSchoolForm.Errors />

          <DrivingSchoolForm.Field.Number
            name="amount"
            label="Количество занятий"
            placeholder="Введите количество"
            min={1}
            max={50}
            required
          />

          <DrivingSchoolForm.Field.Textarea
            name="comment"
            label="Комментарий (необязательно)"
            placeholder="Например: оплата за декабрь"
            rows={2}
          />

          <DrivingSchoolForm.Button.Submit colorPalette="brand">Пополнить</DrivingSchoolForm.Button.Submit>
        </Stack>
      </Fieldset.Root>
    </DrivingSchoolForm>
  )
}
