'use client'

import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

const RenderOptionSchema = z
  .object({
    city: z.number().meta({ ui: { title: 'Город (Select)' } }),
    manager: z.string().meta({ ui: { title: 'Менеджер (Combobox)' } }),
  })
  .strip()

type RenderOptionData = z.infer<typeof RenderOptionSchema>

interface City {
  id: number
  name: string
  region: string
  population: string
}

interface Manager {
  id: string
  name: string
  role: string
}

const cities: City[] = [
  { id: 1, name: 'Москва', region: 'Центральный', population: '13 млн' },
  { id: 2, name: 'Казань', region: 'Приволжский', population: '1,3 млн' },
  { id: 3, name: 'Томск', region: 'Сибирский', population: '0,6 млн' },
]

const managers: Manager[] = [
  { id: 'm1', name: 'Анна Смирнова', role: 'Продажи' },
  { id: 'm2', name: 'Борис Орлов', role: 'Логистика' },
  { id: 'm3', name: 'Вера Ким', role: 'Поддержка' },
]

const cityOptions = cities.map((c) => ({ value: c.id, label: c.name, data: c }))

// label — узел, поэтому textValue обязателен: по нему идут поиск, typeahead и подпись в триггере
const managerOptions = managers.map((m) => ({
  value: m.id,
  label: <b>{m.name}</b>,
  textValue: m.name,
  data: m,
}))

export default function RenderOptionDemoPage() {
  const [submitted, setSubmitted] = useState<RenderOptionData | null>(null)

  return (
    <DemoPageLayout
      title="Render Option Demo"
      description="renderOption / renderValue / textValue / data у Form.Field.Select и Form.Field.Combobox"
    >
      <Form initialValue={{ city: 2, manager: '' }} schema={RenderOptionSchema} onSubmit={setSubmitted}>
        <VStack gap={6} align="stretch">
          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Select</Heading>
            <Text color="fg.muted" mb={4}>
              Пункт рисует город и регион из <code>data</code>; в триггере — своя подпись через{' '}
              <code>renderValue</code>.
            </Text>
            <Form.Field.Select
              name="city"
              valueType="number"
              options={cityOptions}
              renderOption={(o, { selected }) => (
                <HStack justify="space-between" w="full">
                  <span>{o.label}</span>
                  <Text as="span" fontSize="xs" color="fg.muted">
                    {o.data?.region}
                    {selected ? ' ✓' : ''}
                  </Text>
                </HStack>
              )}
              renderValue={(o) => <span>{o.data?.name} · {o.data?.population}</span>}
            />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Combobox</Heading>
            <Text color="fg.muted" mb={4}>
              <code>label</code> — жирный узел, поиск идёт по <code>textValue</code>. <code>renderOption</code>{' '}
              добавляет роль.
            </Text>
            <Form.Field.Combobox
              name="manager"
              options={managerOptions}
              renderOption={(o) => (
                <span>
                  {o.label} <Text as="span" fontSize="xs" color="fg.muted">{o.data?.role}</Text>
                </span>
              )}
            />
          </Box>

          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </VStack>
      </Form>
      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
