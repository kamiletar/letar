'use client'

import { FieldImageChoice, FieldLikert, FieldMatrixChoice } from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

const imageChoiceOptions = [
  { value: 'modern', label: 'Современный', image: 'https://placehold.co/200x120?text=Modern' },
  {
    value: 'classic',
    label: 'Классический',
    image: 'https://placehold.co/200x120?text=Classic',
    description: 'Строгие линии',
  },
]

const matrixRows = [
  { value: 'speed', label: 'Скорость доставки' },
  { value: 'quality', label: 'Качество товара' },
]

const matrixColumns = [
  { value: '1', label: 'Плохо' },
  { value: '3', label: 'Нормально' },
  { value: '5', label: 'Отлично' },
]

interface SurveyValues {
  productStyle: string
  npsScore: number | undefined
  satisfaction: Record<string, string | string[]>
}

const defaultValues: SurveyValues = {
  productStyle: '',
  npsScore: undefined,
  satisfaction: {},
}

export default function SurveyDemoPage() {
  const [submitted, setSubmitted] = useState<SurveyValues | null>(null)

  return (
    <DemoPageLayout
      title="Поля опросов"
      description="ImageChoice, Likert (NPS-шкала), MatrixChoice"
    >
      <DemoForm<SurveyValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldImageChoice name="productStyle" label="Стиль товара" options={imageChoiceOptions} columns={2} />
        <FieldLikert
          name="npsScore"
          label="Насколько вы довольны сервисом?"
          anchors={['Совсем не доволен', 'Не доволен', 'Нейтрально', 'Доволен', 'Полностью доволен']}
          showNumbers
        />
        <FieldMatrixChoice
          name="satisfaction"
          label="Оцените аспекты заказа"
          rows={matrixRows}
          columns={matrixColumns}
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
