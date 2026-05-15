import { LicenseCategoryFormSchema } from '@letar/driving-school-db/form-schemas/enums/LicenseCategory.form'
import { nameSchema } from '@letar/validation-utils'
import { z } from 'zod/v4'

/**
 * Роли при onboarding (для RadioCard)
 */
export const OnboardingRoleSchema = z.enum(['STUDENT', 'INSTRUCTOR', 'SCHOOL_ADMIN'], {
  error: 'Выберите роль',
})

export type OnboardingRole = z.infer<typeof OnboardingRoleSchema>

/**
 * Единая схема формы онбординга с UI метаданными
 *
 * Использует Form.When для условной валидации полей в зависимости от роли.
 * Поля скрытые через Form.When автоматически исключаются из валидации.
 */
export const OnboardingFormSchema = z
  .object({
    // Шаг 1: Имя (обязательно для всех)
    name: nameSchema.meta({
      ui: {
        title: 'Ваше имя',
        placeholder: 'Например: Александр',
        description: 'Это имя будет видно другим пользователям',
      },
    }),

    // Шаг 2: Роль (обязательно для всех)
    role: OnboardingRoleSchema.meta({
      ui: {
        title: 'Ваша роль',
        description: 'Вы всегда сможете изменить её позже',
      },
    }),

    // Шаг 3 (STUDENT): Город — опционально
    city: z
      .string()
      .optional()
      .meta({
        ui: {
          title: 'Город',
          placeholder: 'Введите город',
          description: 'Город для поиска инструкторов',
          tooltip: {
            description: 'Укажите город, в котором планируете учиться вождению',
            example: 'Москва, Санкт-Петербург, Казань',
            impact: 'Мы покажем вам инструкторов, работающих в этом городе',
          },
        },
      }),

    preferredAreas: z.array(z.string()).default([]),

    // Шаг 3 (INSTRUCTOR): Данные инструктора
    // Валидация через superRefine на основе роли
    carBrand: z
      .string()
      .default('')
      .meta({
        ui: {
          title: 'Марка автомобиля',
          placeholder: 'Например: Hyundai',
          tooltip: {
            description: 'Укажите марку вашего учебного автомобиля',
            example: 'Hyundai, Kia, Volkswagen, Renault',
            impact: 'Ученики часто ищут инструктора по марке авто',
          },
        },
      }),

    carModel: z
      .string()
      .default('')
      .meta({
        ui: {
          title: 'Модель',
          placeholder: 'Например: Solaris',
          tooltip: {
            description: 'Укажите модель вашего учебного автомобиля',
            example: 'Solaris, Rio, Polo, Logan',
            impact: 'Модель помогает ученикам понять уровень комфорта авто',
          },
        },
      }),

    carTransmission: z
      .enum(['MANUAL', 'AUTOMATIC'])
      .default('MANUAL')
      .meta({
        ui: {
          title: 'Тип КПП',
          tooltip: {
            description: 'Тип трансмиссии вашего учебного автомобиля',
            example: 'Механика (МКПП) или Автомат (АКПП)',
            impact: 'Многие ученики целенаправленно ищут автомат или механику',
          },
        },
      }),

    experienceStartDate: z
      .string()
      .optional()
      .meta({
        ui: {
          title: 'Дата начала деятельности',
          description: 'Стаж будет рассчитан автоматически',
          tooltip: {
            description: 'Когда вы начали работать инструктором по вождению',
            example: 'Март 2018',
            impact: 'Отображается как "опыт X лет" в вашем профиле',
          },
        },
      }),

    isPublic: z
      .boolean()
      .default(true)
      .meta({
        ui: {
          title: 'Публичный профиль',
          description: 'Ваш профиль будет виден в каталоге',
          tooltip: {
            description: 'Публичный профиль виден в каталоге инструкторов и в поиске',
            impact: 'Отключите, если хотите работать только с учениками по приглашению',
          },
        },
      }),

    // Шаг 3 (SCHOOL_ADMIN): Данные школы
    // Валидация через superRefine на основе роли
    schoolName: z
      .string()
      .default('')
      .meta({
        ui: {
          title: 'Название автошколы',
          placeholder: 'Например: Автошкола Профи',
          tooltip: {
            description: 'Официальное или рабочее название вашей автошколы',
            example: 'Автошкола Профи, ДОСААФ №1',
            impact: 'Это название увидят ученики при поиске школы',
          },
        },
      }),

    schoolCity: z
      .string()
      .default('')
      .meta({
        ui: {
          title: 'Город',
          placeholder: 'Введите город',
          tooltip: {
            description: 'Город, в котором расположена автошкола',
            example: 'Москва, Санкт-Петербург',
            impact: 'Школа будет отображаться в результатах поиска этого города',
          },
        },
      }),

    schoolPhone: z
      .string()
      .optional()
      .meta({
        ui: {
          title: 'Телефон',
          placeholder: '+7 (999) 123-45-67',
          description: 'Опционально',
          tooltip: {
            description: 'Контактный телефон автошколы для связи с учениками',
            example: '+7 (495) 123-45-67',
            impact: 'Телефон будет виден на странице школы',
          },
        },
      }),

    schoolEmail: z
      .email('Некорректный email')
      .or(z.literal(''))
      .optional()
      .meta({
        ui: {
          title: 'Email',
          placeholder: 'info@school.ru',
        },
      }),

    schoolWebsite: z
      .url('Некорректный URL')
      .or(z.literal(''))
      .optional()
      .meta({
        ui: {
          title: 'Сайт',
          placeholder: 'https://example.com',
        },
      }),

    schoolDescription: z
      .string()
      .max(500)
      .optional()
      .meta({
        ui: {
          title: 'Краткое описание',
          placeholder: 'Расскажите о вашей автошколе',
          description: 'До 500 символов',
        },
      }),

    schoolLicenseCategories: z
      .array(LicenseCategoryFormSchema)
      .default([])
      .meta({
        ui: {
          title: 'Категории обучения',
          description: 'Какие категории прав преподаёте',
        },
      }),

    schoolIsPublic: z
      .boolean()
      .default(false)
      .meta({
        ui: {
          title: 'Показывать в каталоге',
          description: 'Школа будет видна в публичном каталоге',
        },
      }),
  })
  .strip()
  .superRefine((data, ctx) => {
    // Условная валидация полей инструктора
    if (data.role === 'INSTRUCTOR') {
      if (!data.carBrand || data.carBrand.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Укажите марку автомобиля',
          path: ['carBrand'],
        })
      }
      if (!data.carModel || data.carModel.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Укажите модель автомобиля',
          path: ['carModel'],
        })
      }
    }

    // Условная валидация полей автошколы
    if (data.role === 'SCHOOL_ADMIN') {
      if (!data.schoolName || data.schoolName.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Название автошколы должно содержать минимум 3 символа',
          path: ['schoolName'],
        })
      }
      if (!data.schoolCity || data.schoolCity.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Укажите город',
          path: ['schoolCity'],
        })
      }
    }
  })

export type OnboardingFormData = z.infer<typeof OnboardingFormSchema>

/**
 * Начальные значения для формы онбординга
 */
export function getInitialFormData(initialName = ''): OnboardingFormData {
  return {
    name: initialName,
    // @ts-expect-error: роль не выбрана, будет ошибка валидации при попытке продолжить
    role: undefined,
    city: '',
    preferredAreas: [],
    carBrand: '',
    carModel: '',
    carTransmission: 'MANUAL',
    experienceStartDate: '',
    isPublic: true,
    schoolName: '',
    schoolCity: '',
    schoolPhone: '',
    schoolEmail: '',
    schoolWebsite: '',
    schoolDescription: '',
    schoolLicenseCategories: [],
    schoolIsPublic: false,
  }
}

/**
 * Опции для выбора роли (RadioCard)
 */
export const roleOptions: {
  value: OnboardingRole
  label: string
  description: string
}[] = [
  {
    value: 'STUDENT',
    label: 'Ученик',
    description: 'Записывайтесь на занятия к инструкторам',
  },
  {
    value: 'INSTRUCTOR',
    label: 'Инструктор',
    description: 'Ведите расписание и принимайте учеников',
  },
  {
    value: 'SCHOOL_ADMIN',
    label: 'Автошкола',
    description: 'Управляйте школой, инструкторами и учениками',
  },
]
