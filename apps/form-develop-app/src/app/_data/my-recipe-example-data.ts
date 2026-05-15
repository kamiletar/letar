import type { RecipeType } from '@/generated/prisma'

/**
 * Тип данных формы рецепта (плоская структура для демонстрации API)
 */
export interface RecipeFormData {
  components: { title: string; weightGrams: number }[]
  info: {
    base: { type: RecipeType; rating: number }
    additional: { similarMyRecipes: RecipeFormData[] }
  }
  tags: string[]
  portions: number
  title: string
}

export const MyRecipe: RecipeFormData = {
  components: [
    {
      title: 'Яблоко',
      weightGrams: 200,
    },
    {
      title: 'Апельсин',
      weightGrams: 100,
    },
  ],
  info: {
    base: {
      type: 'SWEET',
      rating: 9.5,
    },
    additional: {
      similarMyRecipes: [],
    },
  },
  tags: ['фруктовый', 'салат'],
  portions: 5,
  title: 'Фруктовый Салат',
}
