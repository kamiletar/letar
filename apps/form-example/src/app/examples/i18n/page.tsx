'use client'

import { Button, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

// Переводы (в реальном проекте — из JSON файлов через next-intl)
const translations: Record<string, Record<string, { title: string; placeholder?: string }>> = {
  en: {
    'Product.name': { title: 'Product Name', placeholder: 'Enter name' },
    'Product.description': { title: 'Description', placeholder: 'Product description...' },
    'Product.price': { title: 'Price ($)' },
    'Product.active': { title: 'Active product' },
  },
  ru: {
    'Product.name': { title: 'Название товара', placeholder: 'Введите название' },
    'Product.description': { title: 'Описание', placeholder: 'Описание товара...' },
    'Product.price': { title: 'Цена (₽)' },
    'Product.active': { title: 'Активный товар' },
  },
}

export default function I18nPage() {
  const [locale, setLocale] = useState('en')
  const t = translations[locale] ?? translations.en

  // Создаём переведённую схему
  const TranslatedSchema = z.object({
    name: z.string().meta({ ui: { title: t['Product.name']!.title, placeholder: t['Product.name']!.placeholder } }),
    description: z.string().meta({
      ui: { title: t['Product.description']!.title, placeholder: t['Product.description']!.placeholder },
    }),
    price: z.number().meta({ ui: { title: t['Product.price']!.title } }),
    active: z.boolean().meta({ ui: { title: t['Product.active']!.title } }),
  })

  return (
    <Stack gap={6}>
      <div>
        <Heading size="lg">i18n — Multi-Language Forms</Heading>
        <Text color="fg.muted">
          Switch language to see form labels change. ZenStack plugin generates i18nKey in .meta() for each field, which
          maps to translation files.
        </Text>
      </div>

      <HStack>
        <Button size="sm" variant={locale === 'en' ? 'solid' : 'outline'} onClick={() => setLocale('en')}>
          English
        </Button>
        <Button size="sm" variant={locale === 'ru' ? 'solid' : 'outline'} onClick={() => setLocale('ru')}>
          Русский
        </Button>
      </HStack>

      <Form.FromSchema
        key={locale}
        schema={TranslatedSchema}
        initialValue={{ name: '', description: '', price: 0, active: true }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
        submitLabel={locale === 'ru' ? 'Сохранить' : 'Save'}
        debug
      />
    </Stack>
  )
}
