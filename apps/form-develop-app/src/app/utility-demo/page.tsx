'use client'

import { Box, Code, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout } from '../_components'

const DemoSchema = z
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
      .email()
      .meta({ ui: { title: 'Email' } }),
    phone: z
      .string()
      .optional()
      .meta({ ui: { title: 'Телефон' } }),
    type: z.enum(['individual', 'company']).meta({
      ui: {
        title: 'Тип клиента',
        options: [
          { value: 'individual', label: 'Физлицо' },
          { value: 'company', label: 'Компания' },
        ],
      },
    }),
    companyName: z
      .string()
      .optional()
      .meta({ ui: { title: 'Название компании' } }),
    inn: z
      .string()
      .optional()
      .meta({ ui: { title: 'ИНН' } }),
    utm_source: z.string().optional(),
    referralCode: z.string().optional(),
  })
  .strip()

export default function UtilityDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout title="Утилитарные компоненты" description="Form.InfoBlock, Form.Divider, Form.Field.Hidden">
      <VStack gap={6} align="stretch">
        <Form
          debug
          schema={DemoSchema}
          initialValue={{
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            type: 'individual' as const,
            companyName: '',
            inn: '',
            utm_source: '',
            referralCode: '',
          }}
          onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
        >
          {/* InfoBlock — информационный блок */}
          <Heading size="md">Form.InfoBlock</Heading>

          <Form.InfoBlock variant="info" title="Информация">
            Заполните форму для регистрации. Все поля с * обязательны.
          </Form.InfoBlock>

          <Form.InfoBlock variant="warning">Данные нельзя изменить после отправки.</Form.InfoBlock>

          <Form.InfoBlock variant="success" title="Успех">
            Ваша скидка 10% будет применена автоматически.
          </Form.InfoBlock>

          <Form.InfoBlock variant="error">Сервис временно недоступен. Попробуйте позже.</Form.InfoBlock>

          <Form.InfoBlock variant="tip" title="Совет">
            Используйте корпоративный email для быстрой верификации.
          </Form.InfoBlock>

          {/* Divider — разделитель */}
          <Heading size="md" mt={4}>
            Form.Divider
          </Heading>

          <Form.Divider label="Персональные данные" />

          <HStack gap={4}>
            <Form.Field.String name="firstName" />
            <Form.Field.String name="lastName" />
          </HStack>

          <Form.Divider label="Контактные данные" />

          <Form.Field.String name="email" />
          <Form.Field.String name="phone" />

          <Form.Divider />

          <Form.Field.Select name="type" />

          {/* InfoBlock с условным рендерингом */}
          <Form.When field="type" is="company">
            <Form.InfoBlock variant="warning">Для компаний требуется ИНН.</Form.InfoBlock>
            <Form.Field.String name="companyName" />
            <Form.Field.String name="inn" />
          </Form.When>

          <Form.Divider variant="dashed" label="Системные данные" />

          {/* Hidden — скрытые поля */}
          <Heading size="md">Form.Field.Hidden</Heading>
          <Text fontSize="sm" color="fg.muted">
            Скрытые поля не рендерятся в DOM, но передаются при отправке. Проверьте значения в DebugValues внизу.
          </Text>

          <Form.Field.Hidden name="utm_source" value="demo-page" />
          <Form.Field.Hidden name="referralCode" value="PARTNER2026" />

          <Box p={3} bg="bg.subtle" borderRadius="md">
            <Code>Form.Field.Hidden name="utm_source" value="demo-page"</Code>
            <br />
            <Code>Form.Field.Hidden name="referralCode" value="PARTNER2026"</Code>
          </Box>

          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </Form>

        {submittedData && (
          <Box p={4} bg="green.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Отправленные данные:
            </Heading>
            <Code whiteSpace="pre" display="block">
              {JSON.stringify(submittedData, null, 2)}
            </Code>
          </Box>
        )}
      </VStack>
    </DemoPageLayout>
  )
}
