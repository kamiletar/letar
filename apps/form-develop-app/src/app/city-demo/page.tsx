'use client'

import { Code, Heading, Text, VStack } from '@chakra-ui/react'
import { Form, matchCity } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

const CitySchema = z
  .object({
    city: z.string().min(1, 'Выберите город'),
  })
  .strip()

export default function CityDemoPage() {
  const [result, setResult] = useState<unknown>(null)
  const [closedResult, setClosedResult] = useState<unknown>(null)
  const [legacy, setLegacy] = useState<string>('')

  return (
    <DemoPageLayout
      title="Form.Field.City"
      description="Выбор города из справочника России: поиск по вводу, без внешнего API"
    >
      <VStack gap={6} align="stretch">
        <Heading size="lg">1. Справочник с пунктом «Другой город»</Heading>
        <Text color="fg.muted">
          Пустой запрос показывает самые крупные города. Попробуйте <Code>королев</Code>, <Code>мск</Code> или{' '}
          <Code>советск</Code>{' '}
          — одноимённые города различаются регионом, и в значении он тоже есть. Город вне справочника (например{' '}
          <Code>Бишкек</Code>) вводится последним пунктом.
        </Text>
        <Form initialValue={{ city: '' }} schema={CitySchema} onSubmit={(data) => setResult(data)}>
          <Form.Field.City name="city" label="Город" otherLabel="Другой город" />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </Form>
        <SubmittedDataPreview data={result} />

        <Heading size="lg">2. Закрытый список</Heading>
        <Form initialValue={{ city: 'Тверь' }} schema={CitySchema} onSubmit={(data) => setClosedResult(data)}>
          <Form.Field.City name="city" label="Город" allowOther={false} />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </Form>
        <SubmittedDataPreview data={closedResult} />

        <Heading size="lg">3. Миграция старых значений — matchCity</Heading>
        <Text color="fg.muted">Свободный текст → город справочника или null (опечатка, посёлок, другая страна).</Text>
        <Form
          initialValue={{ text: '' }}
          onSubmit={async (data) => {
            const match = await matchCity(String(data.text))
            setLegacy(JSON.stringify(match, null, 2))
          }}
        >
          <Form.Field.String name="text" label="Старое значение" placeholder="г. Москва, Мск, Масква…" />
          <Form.Button.Submit>Сопоставить</Form.Button.Submit>
        </Form>
        <SubmittedDataPreview data={legacy} />
      </VStack>
    </DemoPageLayout>
  )
}
