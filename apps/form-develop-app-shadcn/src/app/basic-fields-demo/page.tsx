'use client'

import { FieldCheckbox, FieldNumber, FieldPassword, FieldString, FieldSwitch, FieldTextarea } from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

interface BasicFieldsValues {
  name: string
  bio: string
  portions: number
  password: string
  agree: boolean
  notifications: boolean
}

const defaultValues: BasicFieldsValues = {
  name: '',
  bio: '',
  portions: 1,
  password: '',
  agree: false,
  notifications: true,
}

export default function BasicFieldsDemoPage() {
  const [submitted, setSubmitted] = useState<BasicFieldsValues | null>(null)

  return (
    <DemoPageLayout
      title="Базовые поля"
      description="String, Textarea, Number, Password, Checkbox, Switch"
    >
      <DemoForm<BasicFieldsValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldString name="name" label="Имя" placeholder="Введите имя" required />
        <FieldTextarea name="bio" label="О себе" rows={3} />
        <FieldNumber name="portions" label="Порции" min={1} max={10} step={1} />
        <FieldPassword name="password" label="Пароль" />
        <FieldCheckbox name="agree" label="Согласен с условиями" />
        <FieldSwitch name="notifications" label="Уведомления" />

        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>

      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
