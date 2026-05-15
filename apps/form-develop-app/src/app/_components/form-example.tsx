'use client'

import { RecipeFormDataSchema } from '@/app/_schemas/recipe-form.schema'
import { DevelopAppForm } from '@/develop-app-form/develop-app-form'
import {
  useCreateManyRecipeComponent,
  useCreateRecipe,
  useDeleteManyRecipeComponent,
  useFindUniqueRecipe,
  useUpdateRecipe,
} from '@/lib/hooks'
import { Box, HStack, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

// Используем DevelopAppForm который расширяет базовый Form через createForm
const Form = DevelopAppForm

const RECIPE_ID = 'cmj7opseo0001mxhkoiubuusg'

/**
 * Transform form data to Prisma-compatible format for mutations
 * NOTE: ZenStack REST API doesn't support nested create in update!
 * Components are handled separately via useDeleteMany + useCreateMany
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformRecipeData(values: any, mode: 'create' | 'update') {
  const { title, portions, tags } = values
  const components = values.components || []
  const info = values.info || {}

  const componentData = components.map((c: { title: string; weightGrams: number }) => ({
    title: c.title,
    weightGrams: c.weightGrams,
  }))

  const baseData = {
    type: info.base?.type,
    rating: info.base?.rating,
  }

  if (mode === 'create') {
    // Create mode: use nested create (works in ZenStack)
    return {
      title,
      portions,
      tags,
      components: { create: componentData },
      info: { create: { base: { create: baseData } } },
    }
  }

  // Update mode: DON'T include components here - they're handled separately!
  // ZenStack REST API doesn't support nested create in update
  return {
    title,
    portions,
    tags,
    // NO components field - handled in onSubmit
    info: {
      update: {
        base: { update: baseData },
      },
    },
  }
}

export const FormExample = () => {
  // Hooks for handling components separately (ZenStack workaround)
  const deleteComponents = useDeleteManyRecipeComponent()
  const createComponents = useCreateManyRecipeComponent()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (values: any) => {
    // After recipe update, handle components separately
    // This is needed because ZenStack REST API doesn't support nested create in update
    const components = values.components || []

    if (RECIPE_ID && components.length > 0) {
      // 1. Delete existing components
      await deleteComponents.mutateAsync({
        where: { recipeId: RECIPE_ID },
      })

      // 2. Create new components
      const componentData = components.map((c: { title: string; weightGrams: number }) => ({
        title: c.title,
        weightGrams: c.weightGrams,
        recipeId: RECIPE_ID,
      }))

      await createComponents.mutateAsync({
        data: componentData,
      })
    }

    // eslint-disable-next-line no-console
    console.log('Saved successfully!')
  }

  return (
    <Box>
      <Form
        api={{
          id: RECIPE_ID, // ид может быть пустым, это означает, что нужно создать
          query: {
            hook: useFindUniqueRecipe,
            include: {
              components: true,
              info: {
                include: {
                  base: true,
                },
              },
            },
          },
          mutations: {
            create: useCreateRecipe,
            update: useUpdateRecipe,
          },
          transformData: transformRecipeData,
        }}
        schema={RecipeFormDataSchema}
        onSubmit={handleSubmit}
      >
        <VStack gap={4}>
          <Form.Group.List
            name={'components'}
            sortable
            wrapper={({ children }: { children: ReactNode }) => {
              return (
                <VStack>
                  {children}
                  <Form.Group.List.Button.Add />
                </VStack>
              )
            }}
          >
            <HStack gap={4}>
              <Form.Group.List.Button.DragHandle />
              <Form.Field.String name={'title'} />
              <Form.Field.Number name={'weightGrams'} />
              <Form.Group.List.Button.Remove />
            </HStack>
          </Form.Group.List>

          <Form.Group name={'info'}>
            <Form.Group name={'base'}>
              <Form.Select.Type name={'type'} />
              <Form.Field.Number name={'rating'} />
            </Form.Group>
            <Form.Group name={'additional'}>
              {/* Этот блок оставим на потом */}
              <></>
            </Form.Group>
          </Form.Group>
          <HStack gap={4}>
            <Form.Group.List name={'tags'}>
              <Form.Field.String />
            </Form.Group.List>
          </HStack>

          <Form.Field.Number name={'portions'} />
          <Form.Field.String name={'title'} />

          {/* Тестирование Checkbox и Switch */}
          <Form.Field.Checkbox name={'isVegetarian'} />
          <Form.Field.Switch name={'isPublished'} />

          <Form.Errors />
          <Form.Button.Submit />
        </VStack>
      </Form>
    </Box>
  )
}
