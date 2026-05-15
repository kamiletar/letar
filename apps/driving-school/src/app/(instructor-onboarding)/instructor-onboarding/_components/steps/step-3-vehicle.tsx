'use client'

import { DrivingSchoolForm } from '@/driving-school-form'
import { Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'

/**
 * Шаг 3: Информация об автомобиле
 * Сегмент: vehicle
 *
 * Поля:
 * - brand (String, required)
 * - model (String, required)
 * - transmission (SegmentedGroup)
 * - year (Number)
 * - color (String)
 * - plateNumber (PlateNumber)
 */
export function Step3Vehicle() {
  const currentYear = new Date().getFullYear()

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Информация об автомобиле</Heading>
        <Text color="fg.muted">Ученики часто ищут инструктора по автомобилю</Text>
      </Card.Header>

      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* Марка */}
          <DrivingSchoolForm.Field.String name="brand" required />

          {/* Модель */}
          <DrivingSchoolForm.Field.String name="model" required />

          {/* Тип КПП */}
          <DrivingSchoolForm.Field.SegmentedGroup
            name="transmission"
            options={[
              { value: 'MANUAL', label: 'Механика' },
              { value: 'AUTOMATIC', label: 'Автомат' },
            ]}
          />

          <HStack gap={4} align="start">
            {/* Год выпуска */}
            <DrivingSchoolForm.Field.Number name="year" min={1990} max={currentYear + 1} />

            {/* Цвет */}
            <DrivingSchoolForm.Field.String name="color" />
          </HStack>

          {/* Госномер */}
          <DrivingSchoolForm.Field.PlateNumber name="plateNumber" showHint />
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
