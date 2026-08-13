'use client'

import type { WeeklySchedule } from '@letar/forms-shadcn'
import { FieldSchedule } from '@letar/forms-shadcn'

import { DemoForm, DemoPageLayout } from '../_components'

export default function ScheduleDemoPage() {
  return (
    <DemoPageLayout
      title="FieldSchedule (beta)"
      description={'Редактор недельного расписания — изолированная песочница, значение объектное (WeeklySchedule), не '
        + 'завязана на поля других демо.'}
    >
      <DemoForm<{ hours: WeeklySchedule }>
        defaultValues={{
          hours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: null,
            sunday: null,
          },
        }}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('schedule submit', value)
        }}
      >
        <FieldSchedule name="hours" label="Часы работы" />

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
