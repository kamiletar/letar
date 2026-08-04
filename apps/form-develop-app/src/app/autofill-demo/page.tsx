'use client'

import { Code, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout } from '../_components'

const ContactSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'Обязательное')
      .meta({ ui: { title: 'Имя' } }),
    lastName: z
      .string()
      .min(1, 'Обязательное')
      .meta({ ui: { title: 'Фамилия' } }),
    email: z
      .string()
      .email('Некорректный')
      .meta({ ui: { title: 'Email' } }),
    phone: z
      .string()
      .optional()
      .meta({ ui: { title: 'Телефон' } }),
    company: z
      .string()
      .optional()
      .meta({ ui: { title: 'Компания' } }),
    address: z
      .string()
      .optional()
      .meta({ ui: { title: 'Адрес' } }),
    city: z
      .string()
      .optional()
      .meta({ ui: { title: 'Город' } }),
    postalCode: z
      .string()
      .optional()
      .meta({ ui: { title: 'Индекс' } }),
    country: z
      .string()
      .optional()
      .meta({ ui: { title: 'Страна' } }),
    // Поле без автоопределения — проверяем что не ставится
    notes: z
      .string()
      .optional()
      .meta({ ui: { title: 'Заметки' } }),
    // Явное отключение через meta
    secretCode: z
      .string()
      .optional()
      .meta({ ui: { title: 'Секретный код', autocomplete: 'off' } }),
  })
  .strip()

/**
 * Компонент для отображения autocomplete атрибутов из DOM
 */
function AutocompleteInspector() {
  const [attrs, setAttrs] = useState<Array<{ name: string; autocomplete: string | null }>>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    // Даём время на рендер полей
    timerRef.current = setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input[data-field-name], textarea[data-field-name]'
      )
      const result = Array.from(inputs).map((input) => ({
        name: input.getAttribute('data-field-name') ?? '?',
        autocomplete: input.getAttribute('autocomplete'),
      }))
      setAttrs(result)
    }, 500)

    return () => clearTimeout(timerRef.current)
  }, [])

  if (attrs.length === 0) return null

  return (
    <VStack gap={1} align="stretch" p={4} bg="bg.subtle" borderRadius="md">
      <Heading size="sm" mb={2}>
        Autocomplete атрибуты в DOM
      </Heading>
      {attrs.map((a) => (
        <Text key={a.name} fontSize="sm">
          <Code>{a.name}</Code> →{' '}
          <Code colorPalette={a.autocomplete ? 'green' : 'gray'}>{a.autocomplete ?? 'не установлен'}</Code>
        </Text>
      ))}
    </VStack>
  )
}

export default function AutofillDemoPage() {
  return (
    <DemoPageLayout
      title="Smart Autofill Demo"
      description="Автоматическое проставление autocomplete атрибутов по имени поля. Проверяйте в DevTools."
    >
      <Form
        schema={ContactSchema}
        initialValue={{ firstName: '', lastName: '', email: '' }}
        onSubmit={async (data) => alert(JSON.stringify(data, null, 2))}
      >
        <VStack gap={4} align="stretch">
          <Form.Field.String name="firstName" />
          <Form.Field.String name="lastName" />
          <Form.Field.String name="email" />
          <Form.Field.String name="phone" />
          <Form.Field.String name="company" />
          <Form.Field.String name="address" />
          <Form.Field.String name="city" />
          <Form.Field.String name="postalCode" />
          <Form.Field.String name="country" />
          <Form.Field.String name="notes" />
          <Form.Field.String name="secretCode" />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </VStack>

        <AutocompleteInspector />
      </Form>
    </DemoPageLayout>
  )
}
