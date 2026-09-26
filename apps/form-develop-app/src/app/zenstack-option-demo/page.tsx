'use client'

import {
  useCreateCategory,
  useCreateCategoryOptimistic,
  useFindManyCategory,
  useFindUniqueCategory,
  useUpdateCategory,
} from '@/lib/hooks'
import { Box, Button, Code, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import {
  fromSearchQuery,
  fromSelectedQuery,
  type SearchQueryOptions,
  type SelectedQueryOptions,
} from '@letar/forms-query'
import { useZenStackOptions } from '@letar/forms-query/zenstack'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

const Schema = z
  .object({
    selectCategory: z.string().optional().meta({ ui: { title: 'Категория (Select, весь справочник из useFindMany)' } }),
    comboCategory: z.string().optional().meta({ ui: { title: 'Категория (Combobox, поиск + useSelected)' } }),
    queryCategory: z.string().optional().meta({ ui: { title: 'Категория (Combobox, @letar/forms-query)' } }),
    loadCategory: z.string().optional().meta({ ui: { title: 'Категория (Combobox, loadOptions по fetch)' } }),
    optimisticCategory: z.string().optional().meta({ ui: { title: 'Категория (Select, оптимистичный режим)' } }),
  })
  .strip()

type FormData = z.infer<typeof Schema>

interface CategoryRecord {
  id: string
  name: string
  color: string
}

/** `useQuery` Combobox: поиск на сервере (обычный хук — его имя `use*` снимает вопросы линтера) */
function useSearchCategories(search: string): { data?: CategoryRecord[]; isLoading?: boolean } {
  return useFindManyCategory({
    where: { name: { contains: search, mode: 'insensitive' } },
    orderBy: { name: 'asc' },
    take: 20,
  }) as { data?: CategoryRecord[]; isLoading?: boolean }
}

/** `useSelected` Combobox: запись текущего значения по id; пустой id выключает запрос */
function useSelectedCategory(id: string): { data?: CategoryRecord | null; isLoading?: boolean } {
  return useFindUniqueCategory({ where: { id } }, { enabled: !!id }) as {
    data?: CategoryRecord | null
    isLoading?: boolean
  }
}

/** Хуки поиска и записи значения для `@letar/forms-query`: обычные `use*` на уровне модуля (правила хуков) */
function useCategorySearch(search: string, options: SearchQueryOptions) {
  return useFindManyCategory(
    { where: { name: { contains: search, mode: 'insensitive' } }, orderBy: { name: 'asc' }, take: 20 },
    options,
  ) as { data?: CategoryRecord[]; isLoading?: boolean }
}

function useCategoryById(id: string, options: SelectedQueryOptions) {
  return useFindUniqueCategory({ where: { id } }, options) as { data?: CategoryRecord | null }
}

/** Строка справочника в оптимистичном режиме ZenStack: временная запись несёт `$optimistic` */
type OptimisticCategory = CategoryRecord & { $optimistic?: boolean }
const mapOptimisticCategory = (c: OptimisticCategory) => ({ label: c.name, value: c.id })

const searchCategoriesQuery = fromSearchQuery(useCategorySearch)
const selectedCategoryQuery = fromSelectedQuery(useCategoryById)

/** `loadOptions` Combobox: обычный `fetch` к RPC-API ZenStack, без TanStack Query; `signal` отменяет устаревший запрос */
async function loadCategories(search: string, { signal }: { signal: AbortSignal }): Promise<CategoryRecord[]> {
  const args = { where: { name: { contains: search, mode: 'insensitive' } }, orderBy: { name: 'asc' }, take: 20 }
  const response = await fetch(`/api/model/category/findMany?q=${encodeURIComponent(JSON.stringify(args))}`, { signal })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return ((await response.json()) as { data: CategoryRecord[] }).data
}

/** `loadSelected` Combobox: запись текущего значения по id */
async function loadCategory(id: string, { signal }: { signal: AbortSignal }): Promise<CategoryRecord | null> {
  const response = await fetch(
    `/api/model/category/findUnique?q=${encodeURIComponent(JSON.stringify({ where: { id } }))}`,
    {
      signal,
    },
  )
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return ((await response.json()) as { data: CategoryRecord | null }).data
}

/** Окно приложения — `window.prompt` вместо настоящего диалога: важно не окно, а связка с хуками ZenStack */
function askName(current: string): string | null {
  const name = window.prompt('Название категории', current)
  return name && name.trim() ? name.trim() : null
}

/**
 * Настоящие хуки ZenStack + TanStack Query (§16.2 плана): `await mutateAsync` возвращается, когда активный
 * `useFindMany` уже перезапрошен, поэтому к моменту результата `onUpdate` у поля обычно уже новые `options`
 */
export default function ZenstackOptionDemoPage() {
  const [submitted, setSubmitted] = useState<FormData | null>(null)
  const [initialId, setInitialId] = useState('')

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const createCategoryOptimistic = useCreateCategoryOptimistic()

  // Оптимистичный Select: строки `$optimistic` ZenStack → pending (видны, не выбираются)
  const optimisticAll = useFindManyCategory({ orderBy: { name: 'asc' } })
  const optimisticCategories = useZenStackOptions(
    optimisticAll as { data?: OptimisticCategory[]; isLoading?: boolean },
    mapOptimisticCategory,
  )

  // Select: справочник целиком
  const all = useFindManyCategory({ orderBy: { name: 'asc' } })
  const selectOptions = ((all.data ?? []) as CategoryRecord[]).map((c) => ({ value: c.id, label: c.name, data: c }))

  const onUpdate = async (option: { value: string | number; label: unknown; data?: CategoryRecord }) => {
    const name = askName(String(option.label))
    if (!name) {
      return null
    }
    // Возвращаем ОТВЕТ сервера, а не введённое в окне
    const saved = (await updateCategory.mutateAsync({ where: { id: String(option.value) }, data: { name } })) as
      | CategoryRecord
      | null
    return saved ? { label: saved.name, value: saved.id, data: saved } : null
  }

  const onCreate = async (search: string) => {
    const name = askName(search)
    if (!name) {
      return null
    }
    const created = (await createCategory.mutateAsync({ data: { name } })) as CategoryRecord | null
    return created ? { label: created.name, value: created.id, data: created } : null
  }

  /** Окно закрыто — запись видна и выбрана сразу (`optimistic`), настоящий id придёт с ответом сервера */
  const onCreateOptimistic = async (
    _search: string,
    { optimistic }: { optimistic: (preview: { label: string }) => void },
  ) => {
    const name = askName('')
    if (!name) {
      return null
    }
    optimistic({ label: name })
    const created = (await createCategoryOptimistic.mutateAsync({ data: { name } })) as CategoryRecord | null
    return created ? { label: created.name, value: created.id, data: created } : null
  }

  return (
    <DemoPageLayout
      title="ZenStack Option Demo"
      description="onUpdate / onCreate / useSelected / loading у Select и Combobox на настоящих хуках ZenStack (модель Category)"
    >
      <Form
        key={initialId}
        initialValue={{
          selectCategory: initialId,
          comboCategory: initialId,
          queryCategory: initialId,
          loadCategory: initialId,
          optimisticCategory: '',
        }}
        schema={Schema}
        onSubmit={setSubmitted}
      >
        <VStack gap={6} align="stretch">
          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Select: справочник из useFindMany</Heading>
            <Text color="fg.muted" mb={4}>
              <Code>loading</Code>{' '}
              пока справочник грузится; карандаш → новое название → подпись в списке и триггере обновляется без
              перезагрузки (одним запросом <Code>findMany</Code>). «+ Добавить…» создаёт категорию и выбирает её.
            </Text>
            <Form.Field.Select
              name="selectCategory"
              options={selectOptions}
              loading={all.isLoading}
              onUpdate={onUpdate}
              onCreate={() => onCreate('')}
            />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Combobox: поиск на сервере + useSelected</Heading>
            <Text color="fg.muted" mb={4}>
              Список — <Code>useFindMany(contains)</Code>, подпись выбранного значения вне выдачи —{' '}
              <Code>useFindUnique</Code> через <Code>useSelected</Code>.
            </Text>
            <Form.Field.Combobox<string, CategoryRecord>
              name="comboCategory"
              useQuery={useSearchCategories}
              useSelected={useSelectedCategory}
              getLabel={(c) => c.name}
              getValue={(c) => c.id}
              onUpdate={onUpdate}
              onCreate={onCreate}
            />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Combobox: @letar/forms-query</Heading>
            <Text color="fg.muted" mb={4}>
              Те же хуки ZenStack, но через <Code>fromSearchQuery</Code> и{' '}
              <Code>fromSelectedQuery</Code>: пакет сам добавляет <Code>enabled</Code> по <Code>minChars</Code> и{' '}
              <Code>keepPreviousData</Code>.
            </Text>
            <Form.Field.Combobox<string, CategoryRecord>
              name="queryCategory"
              useQuery={searchCategoriesQuery}
              useSelected={selectedCategoryQuery}
              getLabel={(c) => c.name}
              getValue={(c) => c.id}
              minChars={0}
            />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Combobox: loadOptions по fetch</Heading>
            <Text color="fg.muted" mb={4}>
              Без TanStack Query: <Code>loadOptions(search, {'{ signal }'})</Code> и <Code>loadSelected</Code> — обычный
              {' '}
              <Code>fetch</Code>. Запрос уходит после первого открытия списка; при ошибке — «Повторить».
            </Text>
            <Form.Field.Combobox<string, CategoryRecord>
              name="loadCategory"
              loadOptions={loadCategories}
              loadSelected={loadCategory}
              getLabel={(c) => c.name}
              getValue={(c) => c.id}
              minChars={0}
            />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Select: оптимистичный режим (§16.7)</Heading>
            <Text color="fg.muted" mb={4}>
              «+ Добавить…» → название → категория выбрана сразу и приглушена, пока мутация ZenStack{' '}
              (<Code>optimisticUpdate</Code>) ждёт сервер; «Отправить» ждёт подтверждения и уходит с настоящим id. При
              отказе сервера значение возвращается, а под полем появляется сообщение.
            </Text>
            <Form.Field.Select
              name="optimisticCategory"
              {...optimisticCategories.fieldProps}
              onCreate={onCreateOptimistic}
            />
          </Box>

          <HStack>
            <Form.Button.Submit>Отправить</Form.Button.Submit>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInitialId((selectOptions[selectOptions.length - 1]?.value as string) ?? '')}
            >
              Открыть с выбранной последней категорией
            </Button>
          </HStack>
        </VStack>
      </Form>
      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
