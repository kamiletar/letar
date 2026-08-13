'use client'

import {
  FieldCheckboxCard,
  FieldListbox,
  FieldRadioCard,
  FieldRadioGroup,
  FieldSegmentGroup,
} from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

const sizeOptions = [
  { label: 'Малый', value: 'sm' },
  { label: 'Средний', value: 'md' },
  { label: 'Большой', value: 'lg' },
]

const billingOptions = [
  { label: 'Месяц', value: 'monthly' },
  { label: 'Год', value: 'yearly' },
]

interface ChoiceValues {
  size: string
  billing: string
  plan: string
  addons: string[]
  features: string[]
}

const defaultValues: ChoiceValues = {
  size: 'md',
  billing: 'monthly',
  plan: '',
  addons: [],
  features: [],
}

export default function ChoiceDemoPage() {
  const [submitted, setSubmitted] = useState<ChoiceValues | null>(null)

  return (
    <DemoPageLayout
      title="Поля выбора"
      description="RadioGroup, SegmentGroup, RadioCard, CheckboxCard, Listbox (multiple)"
    >
      <DemoForm<ChoiceValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldRadioGroup name="size" label="Размер" options={sizeOptions} />
        <FieldSegmentGroup name="billing" label="Тариф" options={billingOptions} />
        <FieldRadioCard
          name="plan"
          label="Тариф"
          options={[
            { label: 'Free', value: 'free', description: 'Базовые функции' },
            { label: 'Pro', value: 'pro', description: 'Все функции' },
          ]}
        />
        <FieldCheckboxCard
          name="addons"
          label="Дополнения"
          options={[
            { label: 'SSL', value: 'ssl', description: 'HTTPS-сертификат' },
            { label: 'Backup', value: 'backup', description: 'Автобэкапы' },
          ]}
        />
        <FieldListbox
          name="features"
          label="Особенности"
          selectionMode="multiple"
          options={[
            { label: 'TypeScript', value: 'ts', group: 'Frontend' },
            { label: 'React', value: 'react', group: 'Frontend' },
            { label: 'Python', value: 'py', group: 'Backend' },
          ]}
        />

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
