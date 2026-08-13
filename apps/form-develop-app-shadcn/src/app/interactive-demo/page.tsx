'use client'

import { FieldPinInput, FieldRating, FieldSlider, FieldTags } from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

interface InteractiveValues {
  volume: number
  rating: number
  tags: string[]
  pin: string
}

const defaultValues: InteractiveValues = {
  volume: 50,
  rating: 0,
  tags: [],
  pin: '',
}

export default function InteractiveDemoPage() {
  const [submitted, setSubmitted] = useState<InteractiveValues | null>(null)

  return (
    <DemoPageLayout
      title="Интерактивные поля"
      description="Slider, Rating, Tags, PinInput"
    >
      <DemoForm<InteractiveValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldSlider name="volume" label="Громкость" showValue min={0} max={100} />
        <FieldRating name="rating" label="Оценка" count={5} />
        <FieldTags name="tags" label="Теги" placeholder="Enter — добавить" />
        <FieldPinInput name="pin" label="PIN-код" length={4} />

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
