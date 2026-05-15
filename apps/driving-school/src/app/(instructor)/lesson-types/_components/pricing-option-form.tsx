'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Box, Button, HStack, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuInfo } from 'react-icons/lu'
import { createPricingOption } from '../_actions/lesson-type.action'
import { PricingOptionFormSchema } from '../_schemas/pricing-option-form.schema'

interface PricingOptionFormProps {
  lessonTypeId: string
}

interface PricingOptionFormValues {
  vehicleOwner: string
  lessonsCount: string
  pricePerLesson: string
  discountPercent: string
}

export function PricingOptionForm({ lessonTypeId }: PricingOptionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const initialValues: PricingOptionFormValues = {
    vehicleOwner: 'INSTRUCTOR',
    lessonsCount: '1',
    pricePerLesson: '',
    discountPercent: '0',
  }

  const handleSubmit = async (values: PricingOptionFormValues) => {
    setIsSubmitting(true)

    try {
      // Валидация
      const data = {
        vehicleOwner: values.vehicleOwner,
        lessonsCount: values.lessonsCount,
        pricePerLesson: values.pricePerLesson,
        discountPercent: values.discountPercent,
      }

      const validation = PricingOptionFormSchema.safeParse(data)
      if (!validation.success) {
        toaster.error({
          title: 'Ошибка валидации',
          description: validation.error.issues.map((i) => i.message).join(', '),
        })
        return
      }

      // Создаём FormData
      const formData = new FormData()
      formData.set('vehicleOwner', values.vehicleOwner)
      formData.set('lessonsCount', values.lessonsCount)
      formData.set('pricePerLesson', values.pricePerLesson)
      formData.set('discountPercent', values.discountPercent)

      const result = await createPricingOption(lessonTypeId, formData)

      if (result.success) {
        toaster.success({ title: 'Вариант цены создан' })
        router.push(`/lesson-types/${lessonTypeId}/pricing`)
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Произошла ошибка',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DrivingSchoolForm<PricingOptionFormValues> initialValue={initialValues} onSubmit={handleSubmit}>
      <DrivingSchoolForm.DirtyGuard />
      <Stack gap={6}>
        <DrivingSchoolForm.Errors title="Ошибки формы" />

        {/* Чья машина */}
        <DrivingSchoolForm.Field.VehicleOwner
          name="vehicleOwner"
          label="Чья машина"
          helperText="На чьём автомобиле будет проходить занятие"
        />

        {/* Количество занятий */}
        <DrivingSchoolForm.Field.String
          name="lessonsCount"
          label="Количество занятий"
          placeholder="1"
          helperText="1 — разовое занятие, больше — курс (пакет занятий)"
          required
        />

        {/* Цена за занятие */}
        <DrivingSchoolForm.Field.String
          name="pricePerLesson"
          label="Цена за занятие (₽)"
          placeholder="2000"
          helperText="Стоимость одного занятия в рублях"
          required
        />

        {/* Скидка */}
        <DrivingSchoolForm.Field.String
          name="discountPercent"
          label="Скидка (%)"
          placeholder="0"
          helperText="Скидка в процентах для курсов (0-50%)"
        />

        {/* Подсказка */}
        <Box bg="bg.info" p={4} borderRadius="lg" borderWidth="1px" borderColor="border.info">
          <HStack align="flex-start" gap={3}>
            <Box color="fg.info" mt={0.5}>
              <LuInfo size={18} />
            </Box>
            <Box>
              <Text fontWeight="semibold" mb={1}>
                Как работают курсы
              </Text>
              <Text fontSize="sm" color="fg.muted">
                Для курсов укажите количество занятий больше 1 и (опционально) скидку. Например: курс из 10 занятий по
                1800₽ со скидкой 10% = 16200₽ вместо 18000₽.
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Кнопки */}
        <Stack direction="row" gap={4}>
          <Button type="submit" colorPalette="brand" size="lg" loading={isSubmitting} loadingText="Сохранение...">
            Создать
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()} disabled={isSubmitting}>
            Отмена
          </Button>
        </Stack>
      </Stack>
    </DrivingSchoolForm>
  )
}
