'use client'

import { useCreateCategory, useCreateRecipe, useFindManyCategory } from '@/lib/hooks'
import { Badge, Box, Code, Heading, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import { Form, type RelationConfig, RelationFieldProvider, relationMeta, withUIMeta } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Демонстрация RelationFieldProvider для автозагрузки опций
 *
 * Показывает:
 * 1. Автозагрузку опций из ZenStack hooks
 * 2. Использование relationMeta() для обогащения схемы
 * 3. Интеграцию с Form.AutoFields
 */

// === Схема с relationMeta ===
const RecipeFormSchema = withUIMeta(
  z.object({
    title: z.string().min(2),
    portions: z.number().min(1).max(100),
    categoryId: z.string().optional(),
  }),
  {
    title: { title: 'Название рецепта', placeholder: 'Введите название...' },
    portions: { title: 'Количество порций', fieldType: 'numberInput' },
    categoryId: relationMeta({
      title: 'Категория',
      model: 'Category',
      labelField: 'name',
      fieldType: 'select',
    }),
  }
)

type RecipeFormData = z.infer<typeof RecipeFormSchema>

const recipeInitialValues: RecipeFormData = {
  title: '',
  portions: 4,
  categoryId: undefined,
}

// === Схема для создания категории ===
const CategorySchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Название', placeholder: 'Например: Десерты' } }),
  description: z
    .string()
    .optional()
    .meta({ ui: { title: 'Описание', fieldType: 'textarea' } }),
  color: z.string().meta({ ui: { title: 'Цвет', fieldType: 'colorPicker' } }),
})

type CategoryFormData = z.infer<typeof CategorySchema>

const categoryInitialValues: CategoryFormData = {
  name: '',
  description: '',
  color: '#3182CE',
}

export default function RelationDemoPage() {
  const [recipeData, setRecipeData] = useState<RecipeFormData | null>(null)
  const [categoryData, setCategoryData] = useState<CategoryFormData | null>(null)

  // ZenStack mutations
  const createCategory = useCreateCategory()
  const createRecipe = useCreateRecipe()

  const handleCategorySubmit = async (data: CategoryFormData) => {
    await createCategory.mutateAsync({ data })
    setCategoryData(data)
  }

  const handleRecipeSubmit = async (data: RecipeFormData) => {
    await createRecipe.mutateAsync({
      data: {
        title: data.title,
        portions: data.portions,
        categoryId: data.categoryId || undefined,
      },
    })
    setRecipeData(data)
  }

  return (
    <DemoPageLayout
      title="Relation Field Provider Demo"
      description="Демонстрация автозагрузки опций для relation полей с использованием RelationFieldProvider и relationMeta()."
      maxW="1200px"
    >
      <VStack gap={8} align="stretch">
        {/* === СЕКЦИЯ 1: Создание категории === */}
        <Box p={6} borderWidth={1} borderRadius="lg">
          <HStack mb={4}>
            <Heading size="md">1. Создайте категорию</Heading>
            <Badge colorPalette="blue">Справочник</Badge>
          </HStack>
          <Text color="fg.muted" mb={4}>
            Сначала создайте несколько категорий, которые будут загружены в select ниже.
          </Text>

          <Form.FromSchema
            schema={CategorySchema}
            initialValue={categoryInitialValues}
            onSubmit={handleCategorySubmit}
            submitLabel="Создать категорию"
          />

          {categoryData && <SubmittedDataPreview data={categoryData} title="Создана категория:" />}
        </Box>

        <Separator />

        {/* === СЕКЦИЯ 2: RelationFieldProvider === */}
        <Box p={6} borderWidth={1} borderRadius="lg">
          <HStack mb={4}>
            <Heading size="md">2. RelationFieldProvider</Heading>
            <Badge colorPalette="green">Автозагрузка опций</Badge>
          </HStack>
          <Text color="fg.muted" mb={4}>
            Категории автоматически загружаются через <Code>useFindManyCategory</Code> и передаются в поле{' '}
            <Code>categoryId</Code>.
          </Text>

          <Code
            display="block"
            whiteSpace="pre"
            mb={4}
            p={3}
            bg="gray.100"
            borderRadius="md"
            _dark={{ bg: 'gray.800' }}
          >
            {`<RelationFieldProvider
  relations={[
    { model: 'Category', useQuery: useFindManyCategory, labelField: 'name' },
  ]}
>
  <Form schema={RecipeFormSchema} ...>
    <Form.AutoFields />  {/* categoryId получит options автоматически */}
  </Form>
</RelationFieldProvider>`}
          </Code>

          {/* Форма с RelationFieldProvider */}
          <RelationFieldProvider
            relations={[
              {
                model: 'Category',
                // RelationConfig объявлен без параметров типа, поэтому useQuery в нём —
                // (args?: unknown). Хук с типизированными args под него не подходит по
                // контравариантности параметров, отсюда приведение типа.
                useQuery: useFindManyCategory as RelationConfig['useQuery'],
                labelField: 'name',
                descriptionField: 'description',
              },
            ]}
          >
            <Form schema={RecipeFormSchema} initialValue={recipeInitialValues} onSubmit={handleRecipeSubmit}>
              <VStack gap={4} align="stretch">
                <Form.AutoFields />

                <HStack justify="flex-end" gap={2}>
                  <Form.Button.Reset variant="outline">Сбросить</Form.Button.Reset>
                  <Form.Button.Submit>Создать рецепт</Form.Button.Submit>
                </HStack>
              </VStack>
            </Form>
          </RelationFieldProvider>

          {recipeData && <SubmittedDataPreview data={recipeData} title="Создан рецепт:" />}
        </Box>

        <Separator />

        {/* === СЕКЦИЯ 3: Как это работает === */}
        <Box p={6} borderWidth={1} borderRadius="lg" bg="gray.50" _dark={{ bg: 'gray.900' }}>
          <Heading size="md" mb={4}>
            Как это работает
          </Heading>

          <VStack align="stretch" gap={4}>
            <Box>
              <Text fontWeight="bold" mb={2}>
                1. Обогащаем схему с relationMeta:
              </Text>
              <Code display="block" whiteSpace="pre" p={3} bg="white" borderRadius="md">
                {`const RecipeFormSchema = withUIMeta(Schema, {
  categoryId: relationMeta({
    title: 'Категория',
    model: 'Category',    // Имя модели
    labelField: 'name',   // Поле для отображения
  }),
})`}
              </Code>
            </Box>

            <Box>
              <Text fontWeight="bold" mb={2}>
                2. Оборачиваем форму в RelationFieldProvider:
              </Text>
              <Code display="block" whiteSpace="pre" p={3} bg="white" borderRadius="md">
                {`<RelationFieldProvider
  relations={[
    {
      model: 'Category',           // Должно совпадать!
      useQuery: useFindManyCategory,
      labelField: 'name',
    },
  ]}
>`}
              </Code>
            </Box>

            <Box>
              <Text fontWeight="bold" mb={2}>
                3. SchemaFieldWithRelations автоматически:
              </Text>
              <VStack align="start" gap={1} pl={4}>
                <Text>
                  • Находит поле с <Code>fieldProps.relation.model === &apos;Category&apos;</Code>
                </Text>
                <Text>• Берёт options из контекста RelationFieldProvider</Text>
                <Text>• Передаёт их в компонент Select</Text>
              </VStack>
            </Box>
          </VStack>
        </Box>

        <Separator />

        {/* === СЕКЦИЯ 4: Дополнительные возможности === */}
        <Box p={6} borderWidth={1} borderRadius="lg">
          <Heading size="md" mb={4}>
            Дополнительные возможности
          </Heading>

          <HStack gap={8} flexWrap="wrap" align="start">
            <VStack align="start" gap={2}>
              <Text fontWeight="bold">Фильтрация и сортировка</Text>
              <Code display="block" whiteSpace="pre" p={2} bg="gray.100" borderRadius="md" fontSize="sm">
                {`{
  model: 'Category',
  useQuery: useFindManyCategory,
  labelField: 'name',
  queryArgs: {
    where: { isActive: true },
    orderBy: { name: 'asc' },
  },
}`}
              </Code>
            </VStack>

            <VStack align="start" gap={2}>
              <Text fontWeight="bold">Хуки для кастомных компонентов</Text>
              <Code display="block" whiteSpace="pre" p={2} bg="gray.100" borderRadius="md" fontSize="sm">
                {`import { useRelationOptions } from '@letar/forms'

function CustomSelect() {
  const { options, isLoading } = useRelationOptions('Category')
  return <MySelect options={options} loading={isLoading} />
}`}
              </Code>
            </VStack>

            <VStack align="start" gap={2}>
              <Text fontWeight="bold">HOC withRelations</Text>
              <Code display="block" whiteSpace="pre" p={2} bg="gray.100" borderRadius="md" fontSize="sm">
                {`import { withRelations } from '@letar/forms'

const FormWithRelations = withRelations(MyForm, [
  { model: 'Category', useQuery: useFindManyCategory, labelField: 'name' },
])`}
              </Code>
            </VStack>
          </HStack>
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
