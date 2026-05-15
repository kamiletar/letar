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
import { Button, HStack, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

const Form = DevelopAppForm

interface RecipeFormProps {
  recipeId?: string // undefined = create mode
}

/**
 * Transform form data to Prisma-compatible format for mutations
 * NOTE: ZenStack REST API doesn't support nested create in update!
 * Components are handled separately via useDeleteMany + useCreateMany
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformRecipeData(values: any, mode: 'create' | 'update') {
  const { title, portions, tags, isVegetarian, isPublished } = values
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
    isVegetarian,
    isPublished,
    // NO components field - handled in onSubmit
    info: {
      update: {
        base: { update: baseData },
      },
    },
  }
}

const defaultValues = {
  title: '',
  portions: 1,
  tags: [] as string[],
  components: [{ title: '', weightGrams: 0 }],
  info: {
    base: {
      type: 'SWEET' as const,
      rating: 0,
    },
  },
  isVegetarian: false,
  isPublished: false,
}

export function RecipeForm({ recipeId }: RecipeFormProps) {
  const router = useRouter()
  const isEditMode = !!recipeId

  // Hooks for handling components separately (ZenStack workaround)
  const deleteComponents = useDeleteManyRecipeComponent()
  const createComponents = useCreateManyRecipeComponent()
  const createRecipe = useCreateRecipe()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = async (values: any, createdId?: string) => {
    const id = createdId || recipeId
    const components = values.components || []

    if (id && components.length > 0 && isEditMode) {
      // For update: handle components separately
      // 1. Delete existing components
      await deleteComponents.mutateAsync({
        where: { recipeId: id },
      })

      // 2. Create new components
      const componentData = components.map((c: { title: string; weightGrams: number }) => ({
        title: c.title,
        weightGrams: c.weightGrams,
        recipeId: id,
      }))

      await createComponents.mutateAsync({
        data: componentData,
      })
    }

    // Navigate back to list
    router.push('/recipes')
    router.refresh()
  }

  // For create mode, handle everything in onSubmit
  const handleCreateSubmit = async (values: typeof defaultValues) => {
    const data = transformRecipeData(values, 'create')
    await createRecipe.mutateAsync({ data })
    router.push('/recipes')
    router.refresh()
  }

  if (!isEditMode) {
    // Create mode - simple form without API integration
    return (
      <Form initialValue={defaultValues} schema={RecipeFormDataSchema} onSubmit={handleCreateSubmit}>
        <RecipeFormFields />
      </Form>
    )
  }

  // Edit mode - use API integration
  return (
    <Form
      api={{
        id: recipeId,
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
      <RecipeFormFields />
    </Form>
  )
}

function RecipeFormFields() {
  return (
    <VStack gap={6} align="stretch">
      {/* Basic info */}
      <Form.Field.String name="title" />
      <Form.Field.Number name="portions" />

      {/* Recipe type and rating */}
      <Form.Group name="info">
        <Form.Group name="base">
          <HStack gap={4}>
            <Form.Select.Type name="type" />
            <Form.Field.Number name="rating" />
          </HStack>
        </Form.Group>
      </Form.Group>

      {/* Ingredients list */}
      <Form.Group.List
        name="components"
        sortable
        wrapper={({ children }: { children: ReactNode }) => (
          <VStack align="stretch" gap={2}>
            {children}
            <Form.Group.List.Button.Add />
          </VStack>
        )}
      >
        <HStack gap={4}>
          <Form.Group.List.Button.DragHandle />
          <Form.Field.String name="title" />
          <Form.Field.Number name="weightGrams" />
          <Form.Group.List.Button.Remove />
        </HStack>
      </Form.Group.List>

      {/* Tags */}
      <Form.Group.List
        name="tags"
        wrapper={({ children }: { children: ReactNode }) => (
          <VStack align="stretch" gap={2}>
            {children}
            <Form.Group.List.Button.Add />
          </VStack>
        )}
      >
        <HStack gap={2}>
          <Form.Field.String />
          <Form.Group.List.Button.Remove />
        </HStack>
      </Form.Group.List>

      {/* Checkboxes */}
      <HStack gap={6}>
        <Form.Field.Checkbox name="isVegetarian" />
        <Form.Field.Switch name="isPublished" />
      </HStack>

      {/* Errors */}
      <Form.Errors />

      {/* Actions */}
      <HStack gap={4}>
        <Form.Button.Submit />
        <Button asChild variant="ghost">
          <Link href="/recipes">Отмена</Link>
        </Button>
      </HStack>
    </VStack>
  )
}
