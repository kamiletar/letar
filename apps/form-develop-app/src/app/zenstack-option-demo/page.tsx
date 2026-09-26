'use client'

import { useCreateCategory, useFindManyCategory, useFindUniqueCategory, useUpdateCategory } from '@/lib/hooks'
import { Box, Button, Code, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

const Schema = z
  .object({
    selectCategory: z.string().optional().meta({ ui: { title: 'Категория (Select, весь справочник из useFindMany)' } }),
    comboCategory: z.string().optional().meta({ ui: { title: 'Категория (Combobox, поиск + useSelected)' } }),
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

  return (
    <DemoPageLayout
      title="ZenStack Option Demo"
      description="onUpdate / onCreate / useSelected / loading у Select и Combobox на настоящих хуках ZenStack (модель Category)"
    >
      <Form
        key={initialId}
        initialValue={{ selectCategory: initialId, comboCategory: initialId }}
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
