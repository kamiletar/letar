'use client'

import { FieldAuto } from '@letar/forms-shadcn'
import { z } from 'zod/v4'

import { DemoForm, DemoPageLayout } from '../_components'

const autoDemoSchema = z.object({
  fullName: z.string(),
  bio: z.string().max(500),
  age: z.number(),
  subscribed: z.boolean(),
  plan: z.enum(['free', 'pro', 'enterprise']),
})

export default function AutoFieldsDemoPage() {
  return (
    <DemoPageLayout
      title="FieldAuto (beta)"
      description={'Автоопределение типа поля из Zod-схемы — изолированная песочница со своей схемой (единственная демо-форма '
        + 'на приложении, где DemoForm получает schema).'}
    >
      <DemoForm<{ fullName: string; bio: string; age: number; subscribed: boolean; plan: string }>
        schema={autoDemoSchema}
        defaultValues={{ fullName: '', bio: '', age: 18, subscribed: false, plan: 'free' }}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('auto submit', value)
        }}
      >
        <FieldAuto name="fullName" />
        <FieldAuto name="bio" />
        <FieldAuto name="age" />
        <FieldAuto name="subscribed" config={{ booleanAsSwitch: true }} />
        <FieldAuto name="plan" />

        <button
          type="submit"
          className="bg-primary text-primary-foreground mt-4 rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>
    </DemoPageLayout>
  )
}
