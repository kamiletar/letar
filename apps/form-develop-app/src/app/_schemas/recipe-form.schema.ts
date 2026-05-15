import { RecipeTypeFormSchema as RecipeTypeSchema } from '@/generated/form-schemas/enums/RecipeType.form'
import { z } from 'zod/v4'

/**
 * Schema for recipe component (ingredient)
 */
const RecipeComponentSchema = z.object({
  title: z
    .string()
    .min(1, 'Название обязательно')
    .meta({ ui: { title: 'Название ингредиента', placeholder: 'Мука' } }),
  weightGrams: z
    .number()
    .min(0, 'Вес не может быть отрицательным')
    .meta({ ui: { title: 'Вес (г)', placeholder: '100' } }),
})

/**
 * Schema for RecipeFormData
 * Note: similarMyRecipes uses z.unknown() to avoid circular reference issues
 */
export const RecipeFormDataSchema = z.object({
  components: z
    .array(RecipeComponentSchema)
    .min(1, 'Добавьте хотя бы один компонент')
    .meta({ ui: { title: 'Ингредиенты' } }),
  info: z.object({
    base: z.object({
      type: RecipeTypeSchema.meta({ ui: { title: 'Тип блюда' } }),
      rating: z
        .number()
        .min(0, 'Минимум 0')
        .max(10, 'Максимум 10')
        .meta({ ui: { title: 'Рейтинг', description: 'От 0 до 10' } }),
    }),
    additional: z
      .object({
        // Simplified: avoid recursive type for now
        similarMyRecipes: z.array(z.unknown()),
      })
      .optional(),
  }),
  tags: z
    .array(z.string().min(1, 'Тег не может быть пустым'))
    .meta({ ui: { title: 'Теги', placeholder: 'Введите тег' } }),
  portions: z
    .number()
    .int('Должно быть целым числом')
    .min(1, 'Минимум 1 порция')
    .meta({ ui: { title: 'Порции', description: 'Количество порций' } }),
  title: z
    .string()
    .min(2, 'Название минимум 2 символа')
    .meta({
      ui: {
        title: 'Название',
        description: 'Введи название своего блюда',
        placeholder: 'Яблоко',
      },
    }),
  isVegetarian: z
    .boolean()
    .default(false)
    .meta({ ui: { title: 'Вегетарианское', description: 'Блюдо не содержит мяса' } }),
  isPublished: z
    .boolean()
    .default(false)
    .meta({ ui: { title: 'Опубликовано' } }),
})

export type RecipeFormDataFromSchema = z.infer<typeof RecipeFormDataSchema>
