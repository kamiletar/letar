'use client'

import { Box, Code, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Form, FormI18nProvider, type TranslateFunction, type TranslateParams } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Демонстрация i18n в формах
 *
 * Схема с i18nKey в meta — ключи для переводов.
 * При наличии FormI18nProvider, label/placeholder/description
 * автоматически берутся из функции перевода.
 *
 * С setupZodErrorMap — ошибки валидации тоже переводятся!
 */
const I18nDemoSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .meta({
      ui: {
        title: 'Название товара', // fallback на русском
        placeholder: 'Введите название',
        description: 'Уникальное название товара',
        i18nKey: 'Product.name', // ключ для перевода
      },
    }),
  email: z
    .string()
    .email()
    .meta({
      ui: {
        title: 'Email',
        placeholder: 'example@mail.com',
        i18nKey: 'Product.email',
      },
    }),
  price: z
    .number()
    .min(1)
    .max(1000000)
    .meta({
      ui: {
        title: 'Цена',
        placeholder: '0',
        i18nKey: 'Product.price',
      },
    }),
  category: z.enum(['ELECTRONICS', 'CLOTHING', 'FOOD']).meta({
    ui: {
      options: [
        { value: 'ELECTRONICS', label: 'Электроника', i18nKey: 'Category.ELECTRONICS' },
        { value: 'CLOTHING', label: 'Одежда', i18nKey: 'Category.CLOTHING' },
        { value: 'FOOD', label: 'Еда', i18nKey: 'Category.FOOD' },
      ],
    },
  }),
})

type I18nDemoData = z.infer<typeof I18nDemoSchema>

/**
 * Мок переводов (в реальном приложении это будут JSON файлы)
 * Теперь включает секцию validation для ошибок
 */
const translations: Record<string, Record<string, string>> = {
  ru: {
    // Поля формы
    'Product.name.title': 'Название товара',
    'Product.name.placeholder': 'Введите название',
    'Product.name.description': 'Уникальное название товара',
    'Product.email.title': 'Email',
    'Product.email.placeholder': 'example@mail.com',
    'Product.price.title': 'Цена',
    'Product.price.placeholder': '0',
    'Category.ELECTRONICS.label': 'Электроника',
    'Category.CLOTHING.label': 'Одежда',
    'Category.FOOD.label': 'Еда',
    // Ошибки валидации (Zod v4 коды)
    'validation.too_small.string': 'Минимум {minimum} символов',
    'validation.too_small.number': 'Минимум {minimum}',
    'validation.too_big.string': 'Максимум {maximum} символов',
    'validation.too_big.number': 'Максимум {maximum}',
    'validation.invalid_format.email': 'Некорректный email', // Zod v4: invalid_format
    'validation.invalid_type': 'Обязательное поле',
  },
  en: {
    // Поля формы
    'Product.name.title': 'Product Name',
    'Product.name.placeholder': 'Enter name',
    'Product.name.description': 'Unique product name',
    'Product.email.title': 'Email',
    'Product.email.placeholder': 'example@mail.com',
    'Product.price.title': 'Price',
    'Product.price.placeholder': '0',
    'Category.ELECTRONICS.label': 'Electronics',
    'Category.CLOTHING.label': 'Clothing',
    'Category.FOOD.label': 'Food',
    // Ошибки валидации (Zod v4 коды)
    'validation.too_small.string': 'Minimum {minimum} characters',
    'validation.too_small.number': 'Minimum {minimum}',
    'validation.too_big.string': 'Maximum {maximum} characters',
    'validation.too_big.number': 'Maximum {maximum}',
    'validation.invalid_format.email': 'Invalid email address', // Zod v4: invalid_format
    'validation.invalid_type': 'Required field',
  },
}

const initialValues: I18nDemoData = {
  name: '',
  email: '',
  price: 0,
  category: 'ELECTRONICS',
}

/**
 * Интерполяция параметров в строку
 * Заменяет {param} на значение из params
 */
function interpolate(str: string, params?: TranslateParams): string {
  if (!params) {
    return str
  }
  return str.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key]
    return value !== undefined ? String(value) : `{${key}}`
  })
}

export default function I18nDemoPage() {
  const [locale, setLocale] = useState<'ru' | 'en'>('ru')
  const [submittedData, setSubmittedData] = useState<I18nDemoData | null>(null)

  // Мок функции перевода (совместима с next-intl useTranslations)
  // Теперь поддерживает параметры для интерполяции
  const t: TranslateFunction = (key: string, params?: TranslateParams) => {
    const translation = translations[locale][key]
    if (!translation) {
      return key
    }
    return interpolate(translation, params)
  }

  const handleSubmit = (data: I18nDemoData) => {
    setSubmittedData(data)
  }

  return (
    <DemoPageLayout
      title="i18n Demo"
      description="Демонстрация мультиязычности в формах. Переключайте локаль и смотрите как меняются label, placeholder и ошибки валидации."
      maxW="800px"
    >
      {/* Переключатель локали */}
      <HStack mb={6} gap={4}>
        <Text fontWeight="bold">Локаль:</Text>
        <HStack gap={2}>
          <Box
            as="button"
            px={3}
            py={1}
            borderRadius="md"
            bg={locale === 'ru' ? 'blue.500' : 'gray.200'}
            color={locale === 'ru' ? 'white' : 'gray.700'}
            onClick={() => setLocale('ru')}
          >
            Русский
          </Box>
          <Box
            as="button"
            px={3}
            py={1}
            borderRadius="md"
            bg={locale === 'en' ? 'blue.500' : 'gray.200'}
            color={locale === 'en' ? 'white' : 'gray.700'}
            onClick={() => setLocale('en')}
          >
            English
          </Box>
        </HStack>
      </HStack>

      {/* Форма с i18n провайдером и setupZodErrorMap */}
      <FormI18nProvider t={t} locale={locale} setupZodErrorMap>
        <Form initialValue={initialValues} schema={I18nDemoSchema} onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <Box>
              <Form.Field.String name="name" />
              <Code fontSize="xs" mt={1}>
                Попробуй ввести 1 символ — ошибка будет на {locale === 'ru' ? 'русском' : 'английском'}
              </Code>
            </Box>

            <Box>
              <Form.Field.String name="email" />
              <Code fontSize="xs" mt={1}>
                Введи невалидный email — ошибка &apos;{locale === 'ru' ? 'Некорректный email' : 'Invalid email address'}
                &apos;
              </Code>
            </Box>

            <Box>
              <Form.Field.Number name="price" />
              <Code fontSize="xs" mt={1}>
                Введи 0 — ошибка &apos;{locale === 'ru' ? 'Минимум 1' : 'Minimum 1'}&apos;
              </Code>
            </Box>

            <Box>
              <Form.Field.Select name="category" />
              <Code fontSize="xs" mt={1}>
                i18nKey: &apos;Category.VALUE&apos; → опции переводятся
              </Code>
            </Box>

            <Form.Button.Submit>{locale === 'ru' ? 'Отправить' : 'Submit'}</Form.Button.Submit>
          </VStack>
        </Form>
      </FormI18nProvider>

      {/* Как это работает */}
      <Box mt={8} p={4} bg="gray.50" borderRadius="md">
        <Heading size="sm" mb={2}>
          Как это работает:
        </Heading>
        <VStack align="stretch" gap={2} fontSize="sm">
          <Text>
            1. <strong>zenstack-form-plugin</strong> генерирует схемы с <Code>i18nKey</Code> и <Code>validation.*</Code>
            {' '}
            ключами
          </Text>
          <Text>
            2. <strong>FormI18nProvider</strong> с <Code>setupZodErrorMap</Code> настраивает глобальный Zod error map
          </Text>
          <Text>
            3. <strong>createFormErrorMap</strong> преобразует Zod ошибки в ключи:{' '}
            <Code>validation.too_small.string</Code>
          </Text>
          <Text>
            4. Параметры <Code>{'{minimum}'}</Code>, <Code>{'{maximum}'}</Code> интерполируются в сообщения
          </Text>
        </VStack>
      </Box>

      {/* Структура ключей */}
      <Box mt={4} p={4} bg="blue.50" borderRadius="md">
        <Heading size="sm" mb={2}>
          Структура ключей валидации:
        </Heading>
        <Code display="block" whiteSpace="pre" fontSize="xs" p={2} bg="white" borderRadius="md">
          {`{
  "validation": {
    "too_small": {
      "string": "Минимум {minimum} символов",
      "number": "Минимум {minimum}"
    },
    "too_big": {
      "string": "Максимум {maximum} символов"
    },
    "invalid_string": {
      "email": "Некорректный email"
    }
  }
}`}
        </Code>
      </Box>

      <SubmittedDataPreview data={submittedData} title="Отправленные данные:" />
    </DemoPageLayout>
  )
}
