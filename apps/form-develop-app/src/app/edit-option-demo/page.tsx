'use client'

import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

const EditOptionSchema = z
  .object({
    workType: z.string().meta({ ui: { title: 'Вид работ (Select)' } }),
    category: z.string().meta({ ui: { title: 'Категория (Combobox)' } }),
    custom: z.string().meta({ ui: { title: 'Свой рендер (Select)' } }),
  })
  .strip()

type EditOptionData = z.infer<typeof EditOptionSchema>

interface Record {
  id: string
  name: string
  system?: boolean
}

const initialRecords: Record[] = [
  { id: 'w1', name: 'Кровля' },
  { id: 'w2', name: 'Фасад' },
  { id: 'w3', name: 'Системная запись', system: true },
]

/** Имитация окна приложения: `window.prompt` вместо диалога и server action */
async function askName(current: string): Promise<string | null> {
  const name = window.prompt('Новое название', current)
  return name && name.trim() ? name.trim() : null
}

export default function EditOptionDemoPage() {
  const [submitted, setSubmitted] = useState<EditOptionData | null>(null)
  const [records] = useState(initialRecords)

  const options = records.map((r) => ({ value: r.id, label: r.name, data: r, editable: !r.system }))

  return (
    <DemoPageLayout
      title="Edit Option Demo"
      description="onUpdate / EditButton / CreateButton / listFooter / renderEmpty у Form.Field.Select и Form.Field.Combobox"
    >
      <Form
        initialValue={{ workType: 'w1', category: '', custom: 'w2' }}
        schema={EditOptionSchema}
        onSubmit={setSubmitted}
      >
        <VStack gap={6} align="stretch">
          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Select: карандаш у пункта и у значения</Heading>
            <Text color="fg.muted" mb={4}>
              Наведи на пункт или нажми <kbd>F2</kbd>. «Системная запись» —{' '}
              <code>editable: false</code>. Введи новое название — подпись обновится, форма не станет dirty.
            </Text>
            <Form.Field.Select
              name="workType"
              options={options}
              onUpdate={async (option) => {
                const name = await askName(String(option.label))
                return name ? { label: name, value: option.value } : null
              }}
              onCreate={async () => {
                const name = await askName('')
                return name ? { label: name, value: `new-${crypto.randomUUID()}` } : null
              }}
            />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Combobox: пустой результат + «+ Добавить»</Heading>
            <Text color="fg.muted" mb={4}>
              Введи несуществующий текст: сообщение своим <code>renderEmpty</code> и пункт создания под ним.
            </Text>
            <Form.Field.Combobox
              name="category"
              options={options}
              onUpdate={async (option) => {
                const name = await askName(String(option.label))
                return name ? { label: name, value: `${option.value}-v2` } : null
              }}
              onCreate={async (search) => {
                const name = await askName(search)
                return name ? { label: name, value: `cat-${Date.now()}` } : null
              }}
              renderEmpty={({ search }) => <span>Нет записи «{search}»</span>}
            />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Свой renderOption + свои слоты</Heading>
            <Text color="fg.muted" mb={4}>
              Со своим <code>renderOption</code> карандаш по умолчанию не рисуется — ставим{' '}
              <code>Form.Field.Select.EditButton</code> сами; кнопка создания — в <code>listFooter</code>.
            </Text>
            <Form.Field.Select
              name="custom"
              options={options}
              createItem={false}
              onUpdate={async (option) => {
                const name = await askName(String(option.label))
                return name ? { label: name, value: option.value } : null
              }}
              onCreate={async () => {
                const name = await askName('')
                return name ? { label: name, value: `n-${Date.now()}` } : null
              }}
              renderOption={(o) => (
                <HStack justify="space-between" w="full">
                  <span>{o.label}</span>
                  <Form.Field.Select.EditButton />
                </HStack>
              )}
              listFooter={<Form.Field.Select.CreateButton />}
            />
          </Box>

          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </VStack>
      </Form>
      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
