'use client'

import { Button, ChakraProvider, defaultSystem, HStack, Stack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

const translations: Record<string, Record<string, { title: string; placeholder?: string }>> = {
  en: {
    name: { title: 'Product Name', placeholder: 'Enter name' },
    description: { title: 'Description', placeholder: 'Product description...' },
    price: { title: 'Price ($)' },
    active: { title: 'Active product' },
  },
  ru: {
    name: { title: 'Название товара', placeholder: 'Введите название' },
    description: { title: 'Описание', placeholder: 'Описание товара...' },
    price: { title: 'Цена (₽)' },
    active: { title: 'Активный товар' },
  },
}

export default function I18nDemoPage() {
  const [locale, setLocale] = useState('en')
  const t = translations[locale]!

  const Schema = z.object({
    name: z.string().meta({ ui: { title: t.name.title, placeholder: t.name.placeholder } }),
    description: z.string().meta({ ui: { title: t.description.title, placeholder: t.description.placeholder } }),
    price: z.number().meta({ ui: { title: t.price.title } }),
    active: z.boolean().meta({ ui: { title: t.active.title } }),
  })

  return (
    <ChakraProvider value={defaultSystem}>
      <Stack gap={4}>
        <HStack>
          <Button size="sm" variant={locale === 'en' ? 'solid' : 'outline'} onClick={() => setLocale('en')}>
            English
          </Button>
          <Button size="sm" variant={locale === 'ru' ? 'solid' : 'outline'} onClick={() => setLocale('ru')}>
            Русский
          </Button>
        </HStack>

        <Form
          key={locale}
          schema={Schema}
          initialValue={{ name: '', description: '', price: 0, active: true }}
          onSubmit={async () => {}}
        >
          <Stack gap={3}>
            <Form.Field.String name="name" />
            <Form.Field.Textarea name="description" />
            <Form.Field.Number name="price" />
            <Form.Field.Switch name="active" />
            <Form.DebugValues showInProduction />
            <Form.Button.Submit>{locale === 'ru' ? 'Сохранить' : 'Save'}</Form.Button.Submit>
          </Stack>
        </Form>
      </Stack>
    </ChakraProvider>
  )
}
