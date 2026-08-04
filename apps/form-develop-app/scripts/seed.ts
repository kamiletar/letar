/**
 * Seed script для form-develop-app
 * Запуск: nx db:seed form-develop-app
 *
 * Структура данных соответствует my-recipe-example-data.ts
 */

import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Очищаем старые данные
  await prisma.recipe.deleteMany()
  console.log('Cleared old data')

  // Создаём похожий рецепт для демонстрации self-reference
  const similarRecipe = await prisma.recipe.create({
    data: {
      title: 'Похожий рецепт',
      portions: 2,
      tags: ['фрукты'],
    },
  })
  console.log(`Created similar recipe: ${similarRecipe.id}`)

  // Создаём основной рецепт со всеми вложенными связями
  const recipe = await prisma.recipe.create({
    data: {
      title: 'Фруктовый Салат',
      portions: 5,

      // components: RecipeComponent[] (1:N)
      components: {
        create: [
          { title: 'Яблоко', weightGrams: 200 },
          { title: 'Апельсин', weightGrams: 100 },
        ],
      },

      // info: RecipeInfo (1:1)
      info: {
        create: {
          // info.base: RecipeInfoBase (1:1)
          base: {
            create: {
              type: 'SWEET',
              rating: 9.5,
            },
          },
          // info.additional: RecipeInfoAdditional (1:1)
          additional: {
            create: {
              // similarMyRecipes: Recipe[] (implicit M:N)
              similarMyRecipes: {
                connect: [{ id: similarRecipe.id }],
              },
            },
          },
        },
      },

      // tags: String[]
      tags: ['фруктовый', 'салат'],
    },
    include: {
      components: true,
      info: {
        include: {
          base: true,
          additional: {
            include: {
              similarMyRecipes: true, // Recipe[]
            },
          },
        },
      },
    },
  })

  console.log('Created recipe:', {
    id: recipe.id,
    title: recipe.title,
    portions: recipe.portions,
    components: recipe.components.map((c) => ({
      title: c.title,
      weightGrams: c.weightGrams,
    })),
    info: {
      base: recipe.info?.base ? { type: recipe.info.base.type, rating: recipe.info.base.rating } : null,
      additional: recipe.info?.additional
        ? {
            similarMyRecipes: recipe.info.additional.similarMyRecipes.map((r) => ({
              id: r.id,
              title: r.title,
            })),
          }
        : null,
    },
    tags: recipe.tags,
  })

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
