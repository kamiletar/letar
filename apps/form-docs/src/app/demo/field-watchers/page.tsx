'use client'

import { ChakraProvider, Code, defaultSystem, Heading, Stack, Text, VStack } from '@chakra-ui/react'
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

const CitySchema = z
  .object({
    name: z
      .string()
      .min(1)
      .meta({ ui: { title: 'City Name' } }),
    slug: z
      .string()
      .min(1)
      .meta({ ui: { title: 'Slug (auto)' } }),
  })
  .strip()

const CountrySchema = z
  .object({
    country: z.enum(['RU', 'US', 'EU', 'JP']).meta({ ui: { title: 'Country' } }),
    currency: z.string().meta({ ui: { title: 'Currency (auto)' } }),
  })
  .strip()

const currencyMap: Record<string, string> = { RU: 'RUB', US: 'USD', EU: 'EUR', JP: 'JPY' }

const countryOptions = [
  { value: 'RU', title: 'Russia' },
  { value: 'US', title: 'United States' },
  { value: 'EU', title: 'France' },
  { value: 'JP', title: 'Japan' },
]

export default function FieldWatchersDemoPage() {
  const [log, setLog] = useState<string[]>([])
  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-4), msg])

  return (
    <ChakraProvider value={defaultSystem}>
      <VStack gap={8} align="stretch">
        {/* Пример 1: onFieldChange */}
        <div>
          <Heading size="sm" mb={2}>
            onFieldChange — auto slug
          </Heading>
          <Form
            schema={CitySchema}
            initialValue={{ name: '', slug: '' }}
            onSubmit={async () => {}}
            onFieldChange={{
              name: (value, { setFieldValue }) => {
                addLog(`name → slug: "${transliterate(String(value))}"`)
                setFieldValue('slug', transliterate(String(value ?? '')))
              },
            }}
          >
            <Stack gap={3}>
              <Form.Field.String name="name" />
              <Form.Field.String name="slug" />
            </Stack>
          </Form>
        </div>

        {/* Пример 2: Form.Watch */}
        <div>
          <Heading size="sm" mb={2}>
            Form.Watch — country → currency
          </Heading>
          <Form schema={CountrySchema} initialValue={{ country: 'RU', currency: 'RUB' }} onSubmit={async () => {}}>
            <Stack gap={3}>
              <Form.Field.NativeSelect name="country" options={countryOptions} />
              <Form.Field.String name="currency" />
              <Form.Watch
                field="country"
                onChange={(value, { setFieldValue }) => {
                  addLog(`country → currency: "${currencyMap[String(value)]}"`)
                  setFieldValue('currency', currencyMap[String(value)] ?? '')
                }}
              />
            </Stack>
          </Form>
        </div>

        {/* Лог */}
        {log.length > 0 && (
          <VStack gap={1} align="stretch">
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
      </VStack>
    </ChakraProvider>
  )
}
