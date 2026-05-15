import { VehicleOwnerFormSchema as VehicleOwnerSchema } from '@letar/driving-school-db/form-schemas/enums/VehicleOwner.form'
import { z } from 'zod/v4'

/**
 * Схема формы для создания/редактирования варианта цены
 *
 * Варианты цен позволяют:
 * - Разные цены для авто ученика / инструктора
 * - Цены для конкретных машин инструктора
 * - Курсы (пакеты занятий) со скидками
 */
export const PricingOptionFormSchema = z
  .object({
    // На чьей машине (обязательное)
    vehicleOwner: VehicleOwnerSchema.meta({
      ui: {
        title: 'Автомобиль',
        fieldType: 'select',
        description: 'На чьей машине проводится занятие',
      },
    }),

    // ID конкретной машины инструктора (опциональное, только для INSTRUCTOR)
    vehicleId: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val))
      .meta({
        ui: {
          title: 'Конкретный автомобиль',
          fieldType: 'select',
          description: 'Выберите конкретную машину (опционально)',
        },
      }),

    // Количество занятий в курсе (1 = разовое занятие)
    lessonsCount: z.coerce
      .number({ message: 'Введите количество занятий' })
      .int({ message: 'Количество должно быть целым числом' })
      .min(1, { message: 'Минимум 1 занятие' })
      .max(100, { message: 'Максимум 100 занятий в курсе' })
      .meta({
        ui: {
          title: 'Кол-во занятий',
          placeholder: '1',
          fieldType: 'number',
          description: '1 — разовое, больше — курс',
        },
      }),

    // Цена за одно занятие (обязательное)
    pricePerLesson: z.coerce
      .number({ message: 'Введите цену' })
      .min(100, { message: 'Минимальная цена — 100 ₽' })
      .max(1000000, { message: 'Максимальная цена — 1 000 000 ₽' })
      .meta({
        ui: {
          title: 'Цена за занятие',
          placeholder: '2500',
          fieldType: 'number',
          description: 'Стоимость одного занятия в рублях',
        },
      }),

    // Процент скидки для курса (0-50%)
    discountPercent: z.coerce
      .number({ message: 'Введите процент скидки' })
      .int({ message: 'Скидка должна быть целым числом' })
      .min(0, { message: 'Скидка не может быть отрицательной' })
      .max(50, { message: 'Максимальная скидка — 50%' })
      .default(0)
      .meta({
        ui: {
          title: 'Скидка за курс',
          placeholder: '0',
          fieldType: 'number',
          description: 'Процент скидки при покупке курса',
        },
      }),
  })
  .strip()

export type PricingOptionFormData = z.infer<typeof PricingOptionFormSchema>
