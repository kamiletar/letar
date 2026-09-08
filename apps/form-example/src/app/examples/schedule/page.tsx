'use client'

/**
 * Form.Field.Schedule — недельный редактор расписания (Working Hours).
 */

import { PageH1 } from '@/components/page-h1'
import { Card, Heading, Separator, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { z } from 'zod/v4'

// --- 1. Базовый пример: расписание инструктора ---

const InstructorScheduleSchema = z.object({
  instructorName: z.string().meta({ ui: { title: 'Instructor Name', placeholder: 'Jane Smith' } }),
  specialty: z.enum(['manual', 'automatic', 'both']).meta({ ui: { title: 'Transmission Specialty' } }),
  workingHours: z.record(z.string(), z.any()).meta({ ui: { title: 'Working Hours' } }),
})

const specialtyOptions = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'both', label: 'Both' },
]

const defaultWorkingHours = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
}

// --- 2. Кастомизация: только будни, короткие названия дней, без Copy-кнопки ---

const WeekdaysOnlySchema = z.object({
  workingHours: z.record(z.string(), z.any()).meta({ ui: { title: 'Business Hours (Mon–Fri)' } }),
})

const shortDayNames = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
}

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const

export default function SchedulePage() {
  return (
    <Stack gap={8}>
      <div>
        <PageH1 size="lg">Schedule</PageH1>
        <Text color="fg.muted">
          Form.Field.Schedule — weekly working-hours editor with per-day toggles, time ranges and a &quot;copy to
          weekdays&quot; shortcut.
        </Text>
      </div>

      {/* === 1. Базовый: расписание инструктора === */}
      <Card.Root p={5}>
        <Card.Body>
          <Heading size="md" mb={2}>
            1. Instructor Schedule
          </Heading>
          <Text color="fg.muted" mb={4}>
            Toggle a day off/on, set open/close time, or copy Monday&apos;s hours to the rest of the working week.
          </Text>

          <Form
            schema={InstructorScheduleSchema}
            initialValue={{
              instructorName: '',
              specialty: 'both',
              workingHours: defaultWorkingHours,
            }}
            onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
          >
            <Stack gap={4}>
              <Form.Field.String name="instructorName" />
              <Form.Field.Select name="specialty" options={specialtyOptions} />
              <Form.Field.Schedule name="workingHours" />

              <Form.DebugValues showInProduction />
              <Form.Button.Submit>Submit</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>

      <Separator />

      {/* === 2. Кастомизация: будни, короткие названия, без copy === */}
      <Card.Root p={5}>
        <Card.Body>
          <Heading size="md" mb={2}>
            2. Weekdays Only (Customized)
          </Heading>
          <Text color="fg.muted" mb={4}>
            Restricted to <code>days</code>, custom <code>dayNames</code> and <code>showCopyToWeekdays=false</code>.
          </Text>

          <Form
            schema={WeekdaysOnlySchema}
            initialValue={{
              workingHours: defaultWorkingHours,
            }}
            onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
          >
            <Stack gap={4}>
              <Form.Field.Schedule
                name="workingHours"
                days={[...weekdays]}
                dayNames={shortDayNames}
                showCopyToWeekdays={false}
              />

              <Form.DebugValues showInProduction />
              <Form.Button.Submit>Submit</Form.Button.Submit>
            </Stack>
          </Form>
        </Card.Body>
      </Card.Root>
    </Stack>
  )
}
