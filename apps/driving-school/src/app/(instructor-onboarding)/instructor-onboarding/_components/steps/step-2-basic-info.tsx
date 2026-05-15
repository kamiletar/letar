'use client'

import { DrivingSchoolForm, ListboxLicenseCategories } from '@/driving-school-form'
import { Card, Field, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { FieldTooltip, useFieldActions } from '@letar/forms'
import { useMemo } from 'react'

/**
 * Шаг 2: Основная информация
 * Сегмент: basicInfo
 *
 * Поля:
 * - experienceStartDate (Date)
 * - licenseCategories (Listbox)
 * - bio (Textarea)
 */
export function Step2BasicInfo() {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Основная информация</Heading>
        <Text color="fg.muted">Расскажите ученикам о своём опыте</Text>
      </Card.Header>

      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* Дата начала деятельности с отображением стажа */}
          <ExperienceField />

          {/* Категории прав */}
          <LicenseCategoriesField />

          {/* Биография */}
          <DrivingSchoolForm.Field.Textarea name="bio" rows={4} maxLength={1000} />
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Поле стажа с автоматическим расчётом
 */
function ExperienceField() {
  const { value } = useFieldActions<Date | undefined>('experienceStartDate')

  // Вычисляем стаж
  const experience = useMemo(() => {
    if (!value) {
      return ''
    }

    const years = Math.floor((new Date().getTime() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

    if (years < 1) {
      return 'менее года'
    }
    if (years === 1) {
      return '1 год'
    }
    if (years < 5) {
      return `${years} года`
    }
    return `${years} лет`
  }, [value])

  return (
    <HStack align="end" gap={4}>
      <DrivingSchoolForm.Field.Date name="experienceStartDate" max={new Date().toISOString().split('T')[0]} />
      {experience && (
        <Text color="fg.muted" fontSize="sm" pb={2}>
          Стаж: {experience}
        </Text>
      )}
    </HStack>
  )
}

/**
 * Поле категорий прав с кастомным label + tooltip
 */
function LicenseCategoriesField() {
  const { value, onChange, isTouched, errors } = useFieldActions<string[]>('licenseCategories')

  return (
    <Field.Root invalid={isTouched && errors.length > 0}>
      <Field.Label>
        <HStack gap={1}>
          <span>Категории прав, которые преподаёте</span>
          <FieldTooltip
            description="Отметьте все категории прав, по которым вы можете проводить обучение."
            example="B, B1, A (если есть мотоцикл)"
            impact="Больше категорий = больше потенциальных учеников"
          />
        </HStack>
      </Field.Label>
      <ListboxLicenseCategories
        value={value ?? []}
        onChange={onChange}
        label=""
        helperText="Выберите все категории, по которым обучаете"
      />
      {isTouched && errors.length > 0 && <Field.ErrorText>{errors.join(', ')}</Field.ErrorText>}
    </Field.Root>
  )
}
