'use client'

import { DrivingSchoolForm } from '@/driving-school-form'
import { Box, Card, Checkbox, Field, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useFieldActions } from '@letar/forms'
import { useCallback } from 'react'
import { LuInfo } from 'react-icons/lu'

/**
 * Шаг 5: Цены и районы работы
 * Сегмент: pricing
 *
 * Поля:
 * - basePrice (Currency)
 * - studentCarPrice (Currency, опционально)
 * - workingAreas (WorkingAreas)
 */
export function Step5Pricing() {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="lg">Цены и районы работы</Heading>
        <Text color="fg.muted">Укажите базовую стоимость занятий и где вы работаете</Text>
      </Card.Header>

      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* Цена за занятие на авто инструктора */}
          <DrivingSchoolForm.Field.Currency name="basePrice" required />

          {/* Опция: занятия на авто ученика */}
          <StudentCarPriceToggle />

          {/* Районы работы */}
          <DrivingSchoolForm.Field.WorkingAreas name="workingAreas" maxCities={5} />

          {/* Информационное сообщение */}
          <Box bg="bg.info" p={4} borderRadius="lg" borderWidth="1px" borderColor="border.info">
            <HStack align="flex-start" gap={3}>
              <Box color="fg.info" mt={0.5}>
                <LuInfo size={18} />
              </Box>
              <Box>
                <Text fontWeight="semibold" mb={1}>
                  Расширенные настройки цен
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  После регистрации вы сможете настроить разные типы занятий (парковка, дрифт, контраварийное), курсы со
                  скидками и цены для разных автомобилей в разделе «Типы занятий».
                </Text>
              </Box>
            </HStack>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Переключатель цены на авто ученика
 */
function StudentCarPriceToggle() {
  const { value: basePrice } = useFieldActions<number>('basePrice')
  const { value: studentCarPrice, onChange } = useFieldActions<number | undefined>('studentCarPrice')

  const hasStudentCarOption = studentCarPrice !== undefined

  const handleToggle = useCallback(
    (checked: boolean) => {
      if (checked) {
        // Включили — ставим дефолтную цену (чуть ниже базовой)
        const suggestedPrice = basePrice ? Math.round(basePrice * 0.8) : 1500
        onChange(suggestedPrice)
      } else {
        // Выключили — убираем цену
        onChange(undefined)
      }
    },
    [basePrice, onChange]
  )

  return (
    <Box>
      <Checkbox.Root checked={hasStudentCarOption} onCheckedChange={(e) => handleToggle(!!e.checked)}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label>
          <Text fontWeight="medium">Обучаю на автомобиле ученика</Text>
        </Checkbox.Label>
      </Checkbox.Root>

      {hasStudentCarOption && (
        <Field.Root mt={4} ml={6}>
          <DrivingSchoolForm.Field.Currency
            name="studentCarPrice"
            label="Цена за занятие (на авто ученика)"
            helperText="Обычно ниже, т.к. вы не предоставляете авто"
          />
        </Field.Root>
      )}
    </Box>
  )
}
