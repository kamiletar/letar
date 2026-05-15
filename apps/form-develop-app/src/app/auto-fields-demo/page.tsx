'use client'

import { Badge, Box, Code, Heading, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Демонстрация автоматической генерации форм из Zod схемы
 *
 * Три подхода:
 * 1. Form.FromSchema — полностью автоматическая форма
 * 2. Form.AutoFields — генерация полей внутри Form
 * 3. Смешанный подход — AutoFields + ручные поля
 */

// === Схема для Form.FromSchema ===
const UserSchema = z.object({
  firstName: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Имя', placeholder: 'Введите имя' } }),
  lastName: z
    .string()
    .min(2)
    .meta({ ui: { title: 'Фамилия', placeholder: 'Введите фамилию' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email', placeholder: 'user@example.com' } }),
  age: z
    .number()
    .min(18)
    .max(120)
    .meta({ ui: { title: 'Возраст' } }),
  bio: z
    .string()
    .max(500)
    .meta({ ui: { title: 'О себе', fieldType: 'textarea', placeholder: 'Расскажите о себе...' } }),
  role: z.enum(['admin', 'user', 'guest']).meta({ ui: { title: 'Роль' } }),
  isActive: z.boolean().meta({ ui: { title: 'Активен' } }),
})

type UserFormData = z.infer<typeof UserSchema>

const userInitialValues: UserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  age: 25,
  bio: '',
  role: 'user',
  isActive: true,
}

// === Схема для AutoFields с вложенными объектами ===
const ProfileSchema = z.object({
  name: z.string().meta({ ui: { title: 'Имя профиля' } }),
  settings: z.object({
    theme: z.enum(['light', 'dark', 'auto']).meta({ ui: { title: 'Тема' } }),
    notifications: z.boolean().meta({ ui: { title: 'Уведомления' } }),
    language: z.enum(['ru', 'en', 'de']).meta({ ui: { title: 'Язык' } }),
  }),
})

type ProfileFormData = z.infer<typeof ProfileSchema>

const profileInitialValues: ProfileFormData = {
  name: 'Мой профиль',
  settings: {
    theme: 'auto',
    notifications: true,
    language: 'ru',
  },
}

// === Схема для смешанного подхода ===
const ArticleSchema = z.object({
  title: z
    .string()
    .min(5)
    .max(100)
    .meta({ ui: { title: 'Заголовок' } }),
  slug: z.string().meta({ ui: { title: 'URL slug' } }),
  category: z.enum(['news', 'blog', 'tutorial']).meta({ ui: { title: 'Категория' } }),
  content: z.string().meta({ ui: { title: 'Содержимое', fieldType: 'richText' } }),
  published: z.boolean().meta({ ui: { title: 'Опубликовано', fieldType: 'switch' } }),
  rating: z
    .number()
    .min(1)
    .max(5)
    .meta({ ui: { title: 'Рейтинг', fieldType: 'rating' } }),
})

type ArticleFormData = z.infer<typeof ArticleSchema>

const articleInitialValues: ArticleFormData = {
  title: '',
  slug: '',
  category: 'blog',
  content: '',
  published: false,
  rating: 3,
}

export default function AutoFieldsDemoPage() {
  const [fromSchemaData, setFromSchemaData] = useState<UserFormData | null>(null)
  const [autoFieldsData, setAutoFieldsData] = useState<ProfileFormData | null>(null)
  const [mixedData, setMixedData] = useState<ArticleFormData | null>(null)

  return (
    <DemoPageLayout
      title="Auto Fields Demo"
      description="Демонстрация автоматической генерации форм из Zod схемы с использованием Form.FromSchema, Form.AutoFields и смешанного подхода."
      maxW="1200px"
    >
      <VStack gap={8} align="stretch">
        {/* === СЕКЦИЯ 1: Form.FromSchema === */}
        <Box p={6} borderWidth={1} borderRadius="lg">
          <HStack mb={4}>
            <Heading size="md">1. Form.FromSchema</Heading>
            <Badge colorPalette="green">Полностью автоматически</Badge>
          </HStack>
          <Text color="fg.muted" mb={4}>
            Генерирует всю форму из схемы одной строкой. Поля, кнопки — всё автоматически.
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
            {`<Form.FromSchema
  schema={UserSchema}
  initialValue={initialValues}
  onSubmit={handleSubmit}
  submitLabel="Создать пользователя"
/>`}
          </Code>

          <Form.FromSchema
            schema={UserSchema}
            initialValue={userInitialValues}
            onSubmit={setFromSchemaData}
            submitLabel="Создать пользователя"
            showReset
            resetLabel="Очистить"
          />

          {fromSchemaData && <SubmittedDataPreview data={fromSchemaData} title="Отправленные данные:" />}
        </Box>

        <Separator />

        {/* === СЕКЦИЯ 2: Form.AutoFields === */}
        <Box p={6} borderWidth={1} borderRadius="lg">
          <HStack mb={4}>
            <Heading size="md">2. Form.AutoFields</Heading>
            <Badge colorPalette="blue">С кастомным layout</Badge>
          </HStack>
          <Text color="fg.muted" mb={4}>
            Генерирует поля из схемы, но layout контролируется вручную. Поддерживает include/exclude.
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
            {`<Form schema={ProfileSchema} ...>
  <HStack>
    <Form.AutoFields include={['name']} />
  </HStack>
  <Form.AutoFields exclude={['name']} />
  <Form.Button.Submit />
</Form>`}
          </Code>

          <Form schema={ProfileSchema} initialValue={profileInitialValues} onSubmit={setAutoFieldsData}>
            <VStack gap={4} align="stretch">
              {/* Имя отдельно сверху */}
              <Form.AutoFields include={['name']} />

              {/* Настройки — автоматически развернётся вложенный объект */}
              <Box p={4} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold" mb={2}>
                  Настройки (автоматическая вложенность)
                </Text>
                <Form.AutoFields include={['settings']} />
              </Box>

              <HStack justify="flex-end">
                <Form.Button.Submit>Сохранить профиль</Form.Button.Submit>
              </HStack>
            </VStack>
          </Form>

          {autoFieldsData && <SubmittedDataPreview data={autoFieldsData} title="Отправленные данные:" />}
        </Box>

        <Separator />

        {/* === СЕКЦИЯ 3: Смешанный подход === */}
        <Box p={6} borderWidth={1} borderRadius="lg">
          <HStack mb={4}>
            <Heading size="md">3. Смешанный подход</Heading>
            <Badge colorPalette="purple">AutoFields + ручные поля</Badge>
          </HStack>
          <Text color="fg.muted" mb={4}>
            Часть полей генерируется автоматически, часть — вручную с кастомной логикой. fieldType в meta определяет
            компонент.
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
            {`// В схеме:
content: z.string().meta({ ui: { fieldType: 'richText' } })
rating: z.number().meta({ ui: { fieldType: 'rating' } })
published: z.boolean().meta({ ui: { fieldType: 'switch' } })

// В JSX:
<Form.AutoFields exclude={['content']} />
<Form.Field.RichText name="content" />  // Кастомная обёртка`}
          </Code>

          <Form schema={ArticleSchema} initialValue={articleInitialValues} onSubmit={setMixedData}>
            <VStack gap={4} align="stretch">
              {/* Основные поля автоматически */}
              <HStack gap={4} align="flex-start">
                <Box flex={2}>
                  <Form.Field.Auto name="title" />
                </Box>
                <Box flex={1}>
                  <Form.Field.Auto name="slug" />
                </Box>
              </HStack>

              <HStack gap={4}>
                <Box flex={1}>
                  <Form.Field.Auto name="category" />
                </Box>
                <Box flex={1}>
                  <Form.Field.Auto name="rating" />
                </Box>
                <Box flex={1}>
                  <Form.Field.Auto name="published" />
                </Box>
              </HStack>

              {/* Контент — вручную с кастомной высотой */}
              <Box>
                <Form.Field.RichText name="content" label="Содержимое статьи" />
              </Box>

              <HStack justify="flex-end" gap={2}>
                <Form.Button.Reset variant="outline">Сбросить</Form.Button.Reset>
                <Form.Button.Submit>Опубликовать статью</Form.Button.Submit>
              </HStack>
            </VStack>
          </Form>

          {mixedData && <SubmittedDataPreview data={mixedData} title="Отправленные данные:" />}
        </Box>

        <Separator />

        {/* === Документация fieldType === */}
        <Box p={6} borderWidth={1} borderRadius="lg" bg="gray.50">
          <Heading size="md" mb={4}>
            Поддерживаемые fieldType
          </Heading>
          <Text color="fg.muted" mb={4}>
            В <Code>meta(&#123; ui: &#123; fieldType: &apos;...&apos; &#125; &#125;)</Code> можно указать любой тип
            поля:
          </Text>

          <HStack gap={8} flexWrap="wrap">
            <VStack align="start" gap={1}>
              <Text fontWeight="bold">Текстовые</Text>
              <Code>string</Code>
              <Code>textarea</Code>
              <Code>password</Code>
              <Code>richText</Code>
              <Code>editable</Code>
              <Code>maskedInput</Code>
            </VStack>

            <VStack align="start" gap={1}>
              <Text fontWeight="bold">Числовые</Text>
              <Code>number</Code>
              <Code>numberInput</Code>
              <Code>slider</Code>
              <Code>rating</Code>
              <Code>currency</Code>
              <Code>percentage</Code>
            </VStack>

            <VStack align="start" gap={1}>
              <Text fontWeight="bold">Дата/время</Text>
              <Code>date</Code>
              <Code>time</Code>
              <Code>dateRange</Code>
              <Code>dateTimePicker</Code>
              <Code>duration</Code>
              <Code>schedule</Code>
            </VStack>

            <VStack align="start" gap={1}>
              <Text fontWeight="bold">Выбор</Text>
              <Code>select</Code>
              <Code>nativeSelect</Code>
              <Code>combobox</Code>
              <Code>radioGroup</Code>
              <Code>checkboxCard</Code>
              <Code>tags</Code>
            </VStack>

            <VStack align="start" gap={1}>
              <Text fontWeight="bold">Булевые</Text>
              <Code>checkbox</Code>
              <Code>switch</Code>
            </VStack>

            <VStack align="start" gap={1}>
              <Text fontWeight="bold">Специализированные</Text>
              <Code>phone</Code>
              <Code>address</Code>
              <Code>pinInput</Code>
              <Code>colorPicker</Code>
              <Code>fileUpload</Code>
            </VStack>
          </HStack>
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
