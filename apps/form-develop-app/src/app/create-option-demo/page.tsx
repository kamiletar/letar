'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { createAsyncActionQuery, Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Демо-схема: три поля с созданием записи справочника прямо из поля (`onCreate`)
 */
const CreateOptionSchema = z
  .object({
    category: z.string().meta({ ui: { title: 'Категория (Select)' } }),
    supplier: z.string().meta({ ui: { title: 'Поставщик (Combobox, статические опции)' } }),
    client: z.string().meta({ ui: { title: 'Клиент (Combobox, async useQuery)' } }),
  })
  .strip()

type CreateOptionData = z.infer<typeof CreateOptionSchema>

const initialValues: CreateOptionData = { category: 'roof', supplier: '', client: '' }

interface DemoOption {
  label: string
  value: string
}

const baseCategories: DemoOption[] = [
  { label: 'Кровля', value: 'roof' },
  { label: 'Стены', value: 'walls' },
]

const baseSuppliers: DemoOption[] = [
  { label: 'Северсталь', value: 'severstal' },
  { label: 'Технониколь', value: 'technonikol' },
  { label: 'Ондулин', value: 'ondulin' },
]

const baseClients: DemoOption[] = [
  { label: 'Иванов Пётр', value: 'c1' },
  { label: 'Петрова Анна', value: 'c2' },
  { label: 'Сидоров Олег', value: 'c3' },
]

/** Имитация окна создания в приложении: задержка вместо диалога и серверного действия */
function fakeCreateDialog(name: string): Promise<DemoOption> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ label: name.trim() || 'Новая запись', value: `new-${Math.random().toString(36).slice(2, 8)}` })
    }, 400)
  })
}

/** Имитация async-поиска клиентов на сервере */
async function searchClients(search: string): Promise<DemoOption[]> {
  await new Promise((r) => setTimeout(r, 250))
  const needle = search.trim().toLowerCase()
  return baseClients.filter((c) => c.label.toLowerCase().includes(needle))
}

/** Хук поиска создаётся на верхнем уровне модуля, а не на каждый рендер */
const useSearchClients = createAsyncActionQuery(searchClients, { minChars: 0 })

export default function CreateOptionDemoPage() {
  const [submitted, setSubmitted] = useState<CreateOptionData | null>(null)
  const [current, setCurrent] = useState<Partial<CreateOptionData>>(initialValues)

  const track = (field: keyof CreateOptionData) => (value: unknown) =>
    setCurrent((prev) => ({ ...prev, [field]: String(value ?? '') }))

  return (
    <DemoPageLayout
      title="Create Option Demo"
      description="onCreate у Form.Field.Select и Form.Field.Combobox — создать запись справочника, не покидая форму"
    >
      <Form initialValue={initialValues} schema={CreateOptionSchema} onSubmit={setSubmitted}>
        <VStack gap={6} align="stretch">
          {/* Select: последний пункт «+ Добавить…», onCreate('') */}
          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>
              Select
            </Heading>
            <Text color="fg.muted" mb={4}>
              Последний пункт списка — «+ Добавить категорию…». Приложение открывает своё окно и возвращает созданную
              опцию — она выбирается сразу.
            </Text>
            <Form.Field.Select
              name="category"
              options={baseCategories}
              createLabel="Добавить категорию…"
              onCreate={async () => fakeCreateDialog('Новая категория')}
            />
          </Box>

          {/* Combobox со статическими опциями */}
          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>
              Combobox (статические опции)
            </Heading>
            <Text color="fg.muted" mb={4}>
              Введите название, которого нет в списке, — появится «+ Добавить "текст"». Если текст начинается с
              «Отмена», окно вернёт <Code>null</Code>, значение и текст поиска остаются как были.
            </Text>
            <Form.Field.Combobox
              name="supplier"
              options={baseSuppliers}
              onCreate={async (text) => {
                // Путь «пользователь закрыл окно»: null — ничего не меняется
                if (text.trim().toLowerCase().startsWith('отмена')) {
                  return null
                }
                return fakeCreateDialog(text)
              }}
            />
          </Box>

          {/* Combobox с async useQuery */}
          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>
              Combobox (async useQuery)
            </Heading>
            <Text color="fg.muted" mb={4}>
              Список приходит из имитации серверного поиска; пункт создания добавляется так же. Созданная опция живёт,
              пока поле смонтировано.
            </Text>
            <Form.Field.Combobox
              name="client"
              useQuery={useSearchClients}
              getLabel={(item) => (item as DemoOption).label}
              getValue={(item) => (item as DemoOption).value}
              minChars={0}
              onCreate={async (text) => fakeCreateDialog(text)}
            />
          </Box>

          <Form.Watch field="category" onChange={track('category')} />
          <Form.Watch field="supplier" onChange={track('supplier')} />
          <Form.Watch field="client" onChange={track('client')} />

          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Текущее значение формы
            </Heading>
            <Code display="block" whiteSpace="pre-wrap" data-testid="current-value">
              {JSON.stringify(current, null, 2)}
            </Code>
            <Text color="fg.muted" mt={2} fontSize="sm">
              Служебное значение пункта «+ Добавить…» сюда никогда не попадает.
            </Text>
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
