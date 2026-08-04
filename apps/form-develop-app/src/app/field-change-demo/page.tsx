'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Простая транслитерация для демонстрации onFieldChange
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

// --- Пример 1: onFieldChange prop ---

const CitySchema = z
  .object({
    name: z.string().min(1, 'Обязательное поле'),
    slug: z.string().min(1, 'Обязательное поле'),
    population: z.number().optional(),
  })
  .strip()

type CityData = z.infer<typeof CitySchema>

const cityInitial: CityData = { name: '', slug: '' }

// --- Пример 2: Form.Watch ---

const CountrySchema = z
  .object({
    country: z.enum(['RU', 'US', 'EU', 'JP']),
    currency: z.string(),
    greeting: z.string(),
  })
  .strip()

type CountryData = z.infer<typeof CountrySchema>

const countryInitial: CountryData = { country: 'RU', currency: 'RUB', greeting: 'Привет' }

const currencyMap: Record<string, string> = {
  RU: 'RUB',
  US: 'USD',
  EU: 'EUR',
  JP: 'JPY',
}

const greetingMap: Record<string, string> = {
  RU: 'Привет',
  US: 'Hello',
  EU: 'Bonjour',
  JP: 'こんにちは',
}

/**
 * Демо-страница для onFieldChange и Form.Watch
 */
export default function FieldChangeDemoPage() {
  const [submitted1, setSubmitted1] = useState<CityData | null>(null)
  const [submitted2, setSubmitted2] = useState<CountryData | null>(null)
  const [changeLog, setChangeLog] = useState<string[]>([])

  const addLog = (msg: string) => {
    setChangeLog((prev) => [...prev.slice(-9), msg])
  }

  return (
    <DemoPageLayout
      title="Field Change Demo"
      description="onFieldChange prop и Form.Watch компонент для реактивных побочных эффектов"
    >
      <VStack gap={8} align="stretch">
        {/* Пример 1: onFieldChange */}
        <Box>
          <Heading size="md" mb={4}>
            1. onFieldChange — автогенерация slug
          </Heading>
          <Text mb={4} color="fg.muted">
            При вводе названия автоматически генерируется slug через транслитерацию.
          </Text>

          <Form
            schema={CitySchema}
            initialValue={cityInitial}
            onSubmit={(data) => setSubmitted1(data)}
            onFieldChange={{
              name: (value, { setFieldValue }) => {
                addLog(`onFieldChange: name → "${value}"`)
                setFieldValue('slug', transliterate(String(value ?? '')))
              },
            }}
          >
            <VStack gap={4} align="stretch">
              <Form.Field.String name="name" label="Название города" />
              <Form.Field.String name="slug" label="Slug (автогенерация)" />
              <Form.Field.Number name="population" label="Население" />
              <Form.Button.Submit>Сохранить город</Form.Button.Submit>
            </VStack>
          </Form>

          {submitted1 && <SubmittedDataPreview data={submitted1} />}
        </Box>

        {/* Пример 2: Form.Watch */}
        <Box>
          <Heading size="md" mb={4}>
            2. Form.Watch — страна → валюта + приветствие
          </Heading>
          <Text mb={4} color="fg.muted">
            При выборе страны автоматически обновляются валюта и приветствие.
          </Text>

          <Form schema={CountrySchema} initialValue={countryInitial} onSubmit={(data) => setSubmitted2(data)}>
            <VStack gap={4} align="stretch">
              <Form.Field.NativeSelect
                name="country"
                label="Страна"
                options={[
                  { value: 'RU', title: 'Россия' },
                  { value: 'US', title: 'США' },
                  { value: 'EU', title: 'Франция' },
                  { value: 'JP', title: 'Япония' },
                ]}
              />
              <Form.Field.String name="currency" label="Валюта (автозаполнение)" />
              <Form.Field.String name="greeting" label="Приветствие (автозаполнение)" />

              <Form.Watch
                field="country"
                onChange={(value, { setFieldValue }) => {
                  const country = String(value)
                  addLog(`Form.Watch: country → "${country}"`)
                  setFieldValue('currency', currencyMap[country] ?? '')
                  setFieldValue('greeting', greetingMap[country] ?? '')
                }}
              />

              <Form.Button.Submit>Сохранить</Form.Button.Submit>
            </VStack>
          </Form>

          {submitted2 && <SubmittedDataPreview data={submitted2} />}
        </Box>

        {/* Лог изменений */}
        {changeLog.length > 0 && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Лог изменений
            </Heading>
            <VStack gap={1} align="stretch">
              {changeLog.map((log, i) => (
                <Code key={i} fontSize="sm">
                  {log}
                </Code>
              ))}
            </VStack>
          </Box>
        )}
      </VStack>
    </DemoPageLayout>
  )
}
