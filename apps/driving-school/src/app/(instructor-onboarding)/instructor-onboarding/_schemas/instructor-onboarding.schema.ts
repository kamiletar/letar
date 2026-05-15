import { z } from 'zod/v4'

/**
 * Схема рабочего графика на неделю
 */
export const DayScheduleSchema = z
  .object({
    open: z.string(),
    close: z.string(),
  })
  .nullable()

export const WeeklyScheduleSchema = z.object({
  monday: DayScheduleSchema,
  tuesday: DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday: DayScheduleSchema,
  friday: DayScheduleSchema,
  saturday: DayScheduleSchema,
  sunday: DayScheduleSchema,
})

export type WeeklySchedule = z.infer<typeof WeeklyScheduleSchema>

/**
 * Схема района работы
 */
export const WorkingAreaSchema = z.object({
  cityId: z.string(),
  cityName: z.string(),
  districts: z.array(z.string()),
})

export type WorkingArea = z.infer<typeof WorkingAreaSchema>

/**
 * Zod схема для instructor-onboarding с 4 сегментами и UI метаданными
 *
 * Сегменты соответствуют шагам wizard:
 * - basicInfo: Шаг 2 (основная информация)
 * - vehicle: Шаг 3 (автомобиль)
 * - schedule: Шаг 4 (расписание)
 * - pricing: Шаг 5 (цены и районы)
 */
export const InstructorOnboardingSchema = z
  .object({
    // ─────────────────────────────────────────────────────────────
    // Сегмент 1: Основная информация (Шаг 2)
    // ─────────────────────────────────────────────────────────────
    basicInfo: z.object({
      experienceStartDate: z
        .date()
        .optional()
        .meta({
          ui: {
            title: 'Дата начала работы инструктором',
            tooltip: {
              description: 'Укажите дату, когда вы начали работать инструктором по вождению.',
              impact: 'Инструкторы с большим стажем чаще выбираются учениками',
            },
          },
        }),

      licenseCategories: z
        .array(z.string())
        .default([])
        .meta({
          ui: {
            title: 'Категории прав, которые преподаёте',
            tooltip: {
              description: 'Отметьте все категории прав, по которым вы можете проводить обучение.',
              example: 'B, B1, A (если есть мотоцикл)',
              impact: 'Больше категорий = больше потенциальных учеников',
            },
          },
        }),

      bio: z
        .string()
        .max(1000)
        .optional()
        .meta({
          ui: {
            title: 'О себе',
            placeholder: 'Расскажите о своём опыте, подходе к обучению, особенностях работы...',
            tooltip: {
              title: 'О себе',
              description: 'Расскажите о своём подходе к обучению, особенностях работы, достижениях.',
              example:
                'Спокойный и терпеливый подход. Обучил более 200 учеников. Специализируюсь на преодолении страха вождения.',
              impact: 'Профили с описанием получают на 35% больше заявок',
            },
          },
        }),
    }),

    // ─────────────────────────────────────────────────────────────
    // Сегмент 2: Автомобиль (Шаг 3)
    // ─────────────────────────────────────────────────────────────
    vehicle: z.object({
      brand: z
        .string()
        .min(1, 'Укажите марку автомобиля')
        .meta({
          ui: {
            title: 'Марка автомобиля',
            placeholder: 'Например: Hyundai',
            tooltip: {
              description: 'Укажите марку вашего учебного автомобиля.',
              example: 'Hyundai, Kia, Volkswagen',
              impact: 'Ученики часто ищут инструктора по марке авто',
            },
          },
        }),

      model: z
        .string()
        .min(1, 'Укажите модель автомобиля')
        .meta({
          ui: {
            title: 'Модель',
            placeholder: 'Например: Solaris',
            tooltip: {
              description: 'Укажите модель автомобиля.',
              example: 'Solaris, Rio, Polo',
            },
          },
        }),

      transmission: z
        .enum(['MANUAL', 'AUTOMATIC'])
        .default('MANUAL')
        .meta({
          ui: {
            title: 'Тип КПП',
            tooltip: {
              description: 'Тип коробки передач влияет на категорию прав, которую получит ученик.',
              impact: 'На механике сдают реже — это отображается в фильтрах поиска',
            },
          },
        }),

      year: z
        .number()
        .int()
        .min(1990)
        .max(new Date().getFullYear() + 1)
        .optional()
        .meta({
          ui: {
            title: 'Год выпуска',
            placeholder: String(new Date().getFullYear()),
            tooltip: {
              description: 'Год выпуска автомобиля.',
              impact: 'Современные авто привлекают больше учеников',
            },
          },
        }),

      color: z
        .string()
        .optional()
        .meta({
          ui: {
            title: 'Цвет',
            placeholder: 'Например: белый',
            tooltip: {
              description: 'Цвет автомобиля помогает ученику узнать вас на встрече.',
              example: 'белый, серебристый, красный',
            },
          },
        }),

      plateNumber: z
        .string()
        .optional()
        .meta({
          ui: {
            title: 'Госномер',
            placeholder: 'А123БВ777',
            tooltip: {
              description: 'Государственный регистрационный номер автомобиля.',
              example: 'А123БВ777',
              impact: 'Нужен для страховых случаев и документов',
            },
          },
        }),
    }),

    // ─────────────────────────────────────────────────────────────
    // Сегмент 3: Расписание (Шаг 4)
    // ─────────────────────────────────────────────────────────────
    schedule: z.object({
      workingHours: WeeklyScheduleSchema.meta({
        ui: {
          title: 'Рабочие часы',
          tooltip: {
            description: 'Укажите ваши рабочие часы. Ученики смогут записываться только в это время.',
            example: 'с 9:00 до 20:00',
            impact: 'Гибкое расписание привлекает больше учеников',
          },
        },
      }),

      lessonDuration: z
        .number()
        .int()
        .default(90)
        .meta({
          ui: {
            title: 'Длительность занятия',
            tooltip: {
              description: 'Стандартная длительность одного занятия по вождению.',
              example: '90 минут — оптимально для практики',
              impact: 'Занятия 90 мин популярнее, чем 60 мин',
            },
          },
        }),

      breakDuration: z
        .number()
        .int()
        .default(15)
        .meta({
          ui: {
            title: 'Перерыв между занятиями',
            tooltip: {
              description: 'Перерыв между занятиями для отдыха и переезда к следующему ученику.',
              example: '15-30 минут',
            },
          },
        }),
    }),

    // ─────────────────────────────────────────────────────────────
    // Сегмент 4: Цены и районы работы (Шаг 5)
    // ─────────────────────────────────────────────────────────────
    pricing: z.object({
      basePrice: z
        .number()
        .int()
        .min(1, 'Укажите цену за занятие')
        .meta({
          ui: {
            title: 'Цена за занятие (на вашем авто)',
            placeholder: '2000',
            tooltip: {
              description: 'Стоимость одного занятия по вождению.',
              example: '2000-3000 ₽ в Москве',
              impact: 'Конкурентная цена увеличивает количество заявок',
            },
          },
        }),

      studentCarPrice: z
        .number()
        .int()
        .min(1)
        .optional()
        .meta({
          ui: {
            title: 'Цена за занятие (на авто ученика)',
            placeholder: '1500',
            description: 'Обычно ниже, т.к. вы не предоставляете авто',
          },
        }),

      workingAreas: z
        .array(WorkingAreaSchema)
        .default([])
        .meta({
          ui: {
            title: 'Районы работы',
            tooltip: {
              description: 'Укажите районы и города, где вы проводите занятия.',
              example: 'Москва: Центральный, Северный АО',
              impact: 'Ученики ищут инструкторов рядом с домом или работой',
            },
          },
        }),
    }),
  })
  .strip()

export type InstructorOnboardingFormData = z.infer<typeof InstructorOnboardingSchema>

/**
 * Типы отдельных сегментов для удобства
 */
export type BasicInfoData = InstructorOnboardingFormData['basicInfo']
export type VehicleData = InstructorOnboardingFormData['vehicle']
export type ScheduleData = InstructorOnboardingFormData['schedule']
export type PricingData = InstructorOnboardingFormData['pricing']

/**
 * Дефолтные рабочие часы
 */
const DEFAULT_HOURS = { open: '09:00', close: '18:00' }

/**
 * Получение начальных значений для формы из данных профиля инструктора
 */
export function getInitialFormData(
  instructorProfile?: {
    experienceStartDate?: Date | null
    licenseCategories?: string[]
    bio?: string | null
    vehicles?: Array<{
      brand?: string
      model?: string
      transmission?: string
      year?: number | null
      color?: string | null
      plateNumber?: string | null
    }>
    scheduleSettings?: {
      lessonDuration?: number
      breakDuration?: number
    } | null
    lessonTypes?: Array<{
      pricingOptions?: Array<{
        vehicleOwner?: string
        pricePerLesson?: number | string | { toNumber?: () => number }
      }>
    }>
    workingAreas?: unknown
  } | null
): InstructorOnboardingFormData {
  const vehicle = instructorProfile?.vehicles?.[0]
  const settings = instructorProfile?.scheduleSettings
  const lessonType = instructorProfile?.lessonTypes?.[0]

  const instructorOption = lessonType?.pricingOptions?.find((o) => o.vehicleOwner === 'INSTRUCTOR')
  const studentOption = lessonType?.pricingOptions?.find((o) => o.vehicleOwner === 'STUDENT')

  // Извлечение числа из Decimal или строки
  const extractPrice = (
    option?: { pricePerLesson?: number | string | { toNumber?: () => number } } | null
  ): number | undefined => {
    if (!option?.pricePerLesson) {
      return undefined
    }
    const price = option.pricePerLesson
    if (typeof price === 'number') {
      return price
    }
    if (typeof price === 'string') {
      return Number(price)
    }
    if (typeof price === 'object' && 'toNumber' in price) {
      return price.toNumber?.()
    }
    return undefined
  }

  return {
    basicInfo: {
      experienceStartDate: instructorProfile?.experienceStartDate ?? undefined,
      licenseCategories: instructorProfile?.licenseCategories ?? [],
      bio: instructorProfile?.bio ?? undefined,
    },
    vehicle: {
      brand: vehicle?.brand ?? '',
      model: vehicle?.model ?? '',
      transmission: (vehicle?.transmission as 'MANUAL' | 'AUTOMATIC') ?? 'MANUAL',
      year: vehicle?.year ?? undefined,
      color: vehicle?.color ?? undefined,
      plateNumber: vehicle?.plateNumber ?? undefined,
    },
    schedule: {
      workingHours: {
        monday: DEFAULT_HOURS,
        tuesday: DEFAULT_HOURS,
        wednesday: DEFAULT_HOURS,
        thursday: DEFAULT_HOURS,
        friday: DEFAULT_HOURS,
        saturday: null,
        sunday: null,
      },
      lessonDuration: settings?.lessonDuration ?? 90,
      breakDuration: settings?.breakDuration ?? 15,
    },
    pricing: {
      basePrice: extractPrice(instructorOption) ?? 2000,
      studentCarPrice: extractPrice(studentOption),
      workingAreas: (instructorProfile?.workingAreas as WorkingArea[]) ?? [],
    },
  }
}
