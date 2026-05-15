'use client'

import { DrivingSchoolForm } from '@/driving-school-form'
import { Box, Card, Field, Heading, HStack, NativeSelect, Text, VStack } from '@chakra-ui/react'
import { useFieldActions } from '@letar/forms'

const DURATION_OPTIONS = [
  { value: 60, label: '60 минут' },
  { value: 90, label: '90 минут (рекомендуется)' },
  { value: 120, label: '120 минут' },
]

const BREAK_OPTIONS = [
  { value: 0, label: 'Без перерыва' },
  { value: 15, label: '15 минут' },
  { value: 30, label: '30 минут' },
]

const DAY_NAMES = {
  monday: 'Пн',
  tuesday: 'Вт',
  wednesday: 'Ср',
  thursday: 'Чт',
  friday: 'Пт',
  saturday: 'Сб',
  sunday: 'Вс',
}

/**
 * Шаг 4: Расписание работы
 * Сегмент: schedule
 *
 * Поля:
 * - workingHours (Schedule)
 * - lessonDuration (NativeSelect)
 * - breakDuration (NativeSelect)
 */
export function Step4Schedule() {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Расписание работы</Heading>
        <Text color="fg.muted">Настройте дни и время для занятий</Text>
      </Card.Header>

      <Card.Body>
        <HStack gap={6} align="start" flexDirection={{ base: 'column', lg: 'row' }}>
          {/* Длительность и перерыв - на мобилках сверху, на lg справа */}
          <VStack gap={4} w={{ base: 'full', lg: '240px' }} order={{ base: 0, lg: 1 }} flexShrink={0}>
            <LessonDurationField />
            <BreakDurationField />
          </VStack>

          {/* Расписание по дням - на мобилках снизу, на lg слева */}
          <Box flex={1} order={{ base: 1, lg: 0 }} w="full">
            <DrivingSchoolForm.Field.Schedule
              name="workingHours"
              dayNames={DAY_NAMES}
              offLabel="Выходной"
              copyToWeekdaysLabel="Скопировать Пн на будни"
            />
          </Box>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Поле длительности занятия с числовым значением
 */
function LessonDurationField() {
  const { value, onChange, isTouched, errors } = useFieldActions<number>('lessonDuration')

  return (
    <Field.Root invalid={isTouched && errors.length > 0} w="full">
      <Field.Label>Длительность занятия</Field.Label>
      <NativeSelect.Root size="md" w="full">
        <NativeSelect.Field value={String(value)} onChange={(e) => onChange(parseInt(e.target.value, 10))}>
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      {isTouched && errors.length > 0 && <Field.ErrorText>{errors.join(', ')}</Field.ErrorText>}
    </Field.Root>
  )
}

/**
 * Поле перерыва между занятиями с числовым значением
 */
function BreakDurationField() {
  const { value, onChange, isTouched, errors } = useFieldActions<number>('breakDuration')

  return (
    <Field.Root invalid={isTouched && errors.length > 0} w="full">
      <Field.Label>Перерыв между занятиями</Field.Label>
      <NativeSelect.Root size="md" w="full">
        <NativeSelect.Field value={String(value)} onChange={(e) => onChange(parseInt(e.target.value, 10))}>
          {BREAK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      {isTouched && errors.length > 0 && <Field.ErrorText>{errors.join(', ')}</Field.ErrorText>}
    </Field.Root>
  )
}
