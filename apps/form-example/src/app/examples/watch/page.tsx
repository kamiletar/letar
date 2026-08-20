'use client'

import { PageH1 } from '@/components/page-h1'
import { Code, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'

/**
 * Транслитерация кириллицы в slug
 */
function transliterate(text: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'kh',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'shch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
    ' ': '-',
  }
  return text
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// --- Пример 1: onFieldChange ---

const ProductSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Product Name', placeholder: 'Widget Pro' } }),
    slug: z
      .string()
      .min(1)
      .meta({ ui: { title: 'URL Slug (auto-generated)' } }),
    price: z
      .number()
      .min(0)
      .meta({ ui: { title: 'Unit Price' } }),
    quantity: z
      .number()
      .min(1)
      .meta({ ui: { title: 'Quantity' } }),
    total: z.number().meta({ ui: { title: 'Total (auto-calculated)' } }),
  })
  .strip()

// --- Пример 2: Form.Watch ---

const ShippingSchema = z
  .object({
    country: z.enum(['US', 'GB', 'JP', 'DE']).meta({ ui: { title: 'Country' } }),
    currency: z.string().meta({ ui: { title: 'Currency (auto)' } }),
    greeting: z.string().meta({ ui: { title: 'Greeting (auto)' } }),
  })
  .strip()

const currencyMap: Record<string, string> = { US: 'USD', GB: 'GBP', JP: 'JPY', DE: 'EUR' }
const greetingMap: Record<string, string> = { US: 'Hello!', GB: 'Cheers!', JP: 'こんにちは!', DE: 'Hallo!' }

const countryOptions = [
  { value: 'US', title: 'United States' },
  { value: 'GB', title: 'United Kingdom' },
  { value: 'JP', title: 'Japan' },
  { value: 'DE', title: 'Germany' },
]

export default function WatchPage() {
  const [log, setLog] = useState<string[]>([])
  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-7), msg])

  return (
    <Stack gap={8}>
      <div>
        <PageH1 size="lg">Form.Watch & onFieldChange</PageH1>
        <Text color="fg.muted">
          React to field changes with side effects — auto-generate slugs, sync dependent fields, recalculate totals.
        </Text>
      </div>

      {/* Пример 1: onFieldChange prop */}
      <div>
        <Heading size="md" mb={3}>
          1. onFieldChange prop
        </Heading>
        <Text color="fg.muted" mb={3}>
          Type a product name — slug is auto-generated. Change price or quantity — total recalculates.
        </Text>

        <Form
          schema={ProductSchema}
          initialValue={{ name: '', slug: '', price: 10, quantity: 1, total: 10 }}
          onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
          onFieldChange={{
            name: (value, { setFieldValue }) => {
              addLog(`name → slug: "${transliterate(String(value ?? ''))}"`)
              setFieldValue('slug', transliterate(String(value ?? '')))
            },
            price: (value, { setFieldValue, getFieldValue }) => {
              const qty = getFieldValue('quantity') as number
              const total = (value as number) * qty
              addLog(`price × quantity = ${total}`)
              setFieldValue('total', total)
            },
            quantity: (value, { setFieldValue, getFieldValue }) => {
              const price = getFieldValue('price') as number
              const total = price * (value as number)
              addLog(`price × quantity = ${total}`)
              setFieldValue('total', total)
            },
          }}
        >
          <Stack gap={4}>
            <Form.Field.String name="name" />
            <Form.Field.String name="slug" />
            <Form.Field.Number name="price" />
            <Form.Field.Number name="quantity" />
            <Form.Field.Number name="total" />
            <Form.DebugValues showInProduction />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Stack>
        </Form>
      </div>

      {/* Пример 2: Form.Watch component */}
      <div>
        <Heading size="md" mb={3}>
          2. Form.Watch component
        </Heading>
        <Text color="fg.muted" mb={3}>
          Select a country — currency and greeting update automatically via a renderless watcher.
        </Text>

        <Form
          schema={ShippingSchema}
          initialValue={{ country: 'US', currency: 'USD', greeting: 'Hello!' }}
          onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
        >
          <Stack gap={4}>
            <Form.Field.NativeSelect name="country" options={countryOptions} />
            <Form.Field.String name="currency" />
            <Form.Field.String name="greeting" />

            <Form.Watch
              field="country"
              onChange={(value, { setFieldValue }) => {
                const country = String(value)
                addLog(`country → ${currencyMap[country]}, "${greetingMap[country]}"`)
                setFieldValue('currency', currencyMap[country] ?? '')
                setFieldValue('greeting', greetingMap[country] ?? '')
              }}
            />

            <Form.DebugValues showInProduction />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Stack>
        </Form>
      </div>

      {/* Лог изменений */}
      {log.length > 0 && (
        <VStack gap={1} align="stretch" p={3} bg="bg.subtle" borderRadius="md">
          <Text fontSize="xs" fontWeight="bold" color="fg.muted">
            Change log
          </Text>
          {log.map((l, i) => (
            <Code key={i} fontSize="xs">
              {l}
            </Code>
          ))}
        </VStack>
      )}
    </Stack>
  )
}
