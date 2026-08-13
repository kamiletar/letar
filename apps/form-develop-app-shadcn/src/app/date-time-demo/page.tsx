'use client'

import { FieldDate, FieldDateRange, FieldDateTimePicker, FieldDuration, FieldTime } from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

interface DateTimeValues {
  birthday: string
  period: { start: string; end: string }
  duration: number
  appointmentAt: string
  openingTime: string
}

const defaultValues: DateTimeValues = {
  birthday: '',
  period: { start: '', end: '' },
  duration: 90,
  appointmentAt: '',
  openingTime: '09:00',
}

export default function DateTimeDemoPage() {
  const [submitted, setSubmitted] = useState<DateTimeValues | null>(null)

  return (
    <DemoPageLayout
      title="Дата и время"
      description="Date, DateRange, Duration, DateTimePicker, Time"
    >
      <DemoForm<DateTimeValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldDate name="birthday" label="Дата рождения" />
        <FieldDateRange name="period" label="Период" presets={['today', 'thisWeek', 'thisMonth']} />
        <FieldDuration name="duration" label="Длительность" />
        <FieldDateTimePicker name="appointmentAt" label="Встреча" />
        <FieldTime name="openingTime" label="Время открытия" min="06:00" max="23:00" />

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
