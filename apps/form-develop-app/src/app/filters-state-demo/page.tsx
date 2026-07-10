'use client'

import { Badge, Box, Button, Card, Grid, Heading, HStack, SimpleGrid, Tag, Text, VStack } from '@chakra-ui/react'
import { Form, useActiveFiltersCount, useFormRef, useFormUrlSync } from '@letar/forms'
import { z } from 'zod/v4'

// --- Схема фильтров ---

const FiltersSchema = z.object({
  search: z.string().meta({ ui: { title: 'Поиск', placeholder: 'Введите название...' } }),
  category: z.enum(['all', 'frontend', 'backend', 'devops']).meta({ ui: { title: 'Категория' } }),
  minRating: z
    .number()
    .min(0)
    .max(5)
    .meta({ ui: { title: 'Минимальный рейтинг' } }),
  tags: z.array(z.string()).meta({ ui: { title: 'Теги' } }),
  onlyFavorites: z.boolean().meta({ ui: { title: 'Только избранные' } }),
})

type Filters = z.infer<typeof FiltersSchema>

const defaultFilters: Filters = {
  search: '',
  category: 'all',
  minRating: 0,
  tags: [],
  onlyFavorites: false,
}

// --- Демо-данные ---

const allItems = [
  { id: 1, title: 'React', category: 'frontend', rating: 5, tags: ['ui', 'jsx'], favorite: true },
  { id: 2, title: 'TypeScript', category: 'frontend', rating: 5, tags: ['types', 'js'], favorite: true },
  { id: 3, title: 'Node.js', category: 'backend', rating: 4, tags: ['js', 'server'], favorite: false },
  { id: 4, title: 'PostgreSQL', category: 'backend', rating: 4, tags: ['sql', 'database'], favorite: true },
  { id: 5, title: 'Docker', category: 'devops', rating: 4, tags: ['containers', 'devops'], favorite: false },
  { id: 6, title: 'Nginx', category: 'devops', rating: 3, tags: ['server', 'proxy'], favorite: false },
  { id: 7, title: 'Vue.js', category: 'frontend', rating: 4, tags: ['ui', 'framework'], favorite: false },
  { id: 8, title: 'Prisma', category: 'backend', rating: 5, tags: ['orm', 'database'], favorite: true },
]

// --- Секция с результатами (использует Form.Subscribe) ---

function FilteredResults() {
  return (
    <Form.Subscribe debounce={150}>
      {(values) => {
        const filters = values as unknown as Filters
        const results = allItems.filter((item) => {
          if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) {
            return false
          }
          if (filters.category !== 'all' && item.category !== filters.category) return false
          if (item.rating < filters.minRating) return false
          if (filters.onlyFavorites && !item.favorite) return false
          if (filters.tags.length > 0 && !filters.tags.some((tag) => item.tags.includes(tag))) {
            return false
          }
          return true
        })

        return (
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Результаты</Heading>
              <Badge colorPalette={results.length > 0 ? 'green' : 'gray'}>
                {results.length} из {allItems.length}
              </Badge>
            </HStack>

            {results.length === 0 ? (
              <Box py={8} textAlign="center" color="gray.500">
                Ничего не найдено. Измените фильтры.
              </Box>
            ) : (
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                {results.map((item) => (
                  <Card.Root key={item.id} variant="outline" size="sm">
                    <Card.Body>
                      <HStack justify="space-between">
                        <Text fontWeight="medium">{item.title}</Text>
                        {item.favorite && <Text color="yellow.500">★</Text>}
                      </HStack>
                      <HStack gap={1} mt={2} wrap="wrap">
                        <Badge colorPalette="blue" size="sm">
                          {item.category}
                        </Badge>
                        {'★'
                          .repeat(item.rating)
                          .split('')
                          .map((s, i) => (
                            <Text key={i} color="yellow.400" fontSize="xs">
                              {s}
                            </Text>
                          ))}
                      </HStack>
                      <HStack gap={1} mt={1} wrap="wrap">
                        {item.tags.map((tag) => (
                          <Tag.Root key={tag} size="sm" variant="subtle">
                            <Tag.Label>{tag}</Tag.Label>
                          </Tag.Root>
                        ))}
                      </HStack>
                    </Card.Body>
                  </Card.Root>
                ))}
              </SimpleGrid>
            )}
          </Box>
        )
      }}
    </Form.Subscribe>
  )
}

// --- Счётчик активных фильтров ---

function ActiveFiltersCount() {
  const count = useActiveFiltersCount(defaultFilters)
  if (count === 0) return null
  return (
    <Badge colorPalette="red" borderRadius="full">
      {count}
    </Badge>
  )
}

// --- Панель внешнего управления (использует useFormRef) ---

function ExternalControls({ formRef }: { formRef: ReturnType<typeof useFormRef<Filters>> }) {
  const presets: Array<{ label: string; values: Partial<Filters> }> = [
    { label: 'Frontend топ', values: { category: 'frontend', minRating: 4 } },
    { label: 'Избранные', values: { onlyFavorites: true } },
    { label: 'Database', values: { tags: ['database'] } },
  ]

  return (
    <VStack align="stretch" gap={2}>
      <Text fontSize="sm" fontWeight="medium" color="gray.500">
        Быстрые пресеты (useFormRef):
      </Text>
      <HStack wrap="wrap" gap={2}>
        {presets.map((preset) => (
          <Button
            key={preset.label}
            size="xs"
            variant="outline"
            colorPalette="purple"
            onClick={() => {
              if (!formRef.current) return
              // Сбрасываем до дефолтов, потом применяем пресет
              const form = formRef.current
              Object.entries(defaultFilters).forEach(([key, val]) => {
                form.setFieldValue(key as keyof Filters, val as never)
              })
              Object.entries(preset.values).forEach(([key, val]) => {
                form.setFieldValue(key as keyof Filters, val as never)
              })
            }}
          >
            {preset.label}
          </Button>
        ))}
      </HStack>
    </VStack>
  )
}

// --- Главная страница ---

export default function FiltersStateDemoPage() {
  // useFormUrlSync читает начальные значения из URL
  const { initialValue } = useFormUrlSync({
    fields: ['search', 'category', 'minRating', 'onlyFavorites'],
    defaults: defaultFilters,
    debounce: 400,
  })

  // useFormRef для доступа к form API снаружи компонента Form
  const formRef = useFormRef<Filters>()

  return (
    <Box p={8} maxW="1200px" mx="auto">
      <VStack gap={6} align="stretch">
        <Box>
          <Heading mb={2}>Filters State Demo</Heading>
          <Text color="gray.600" _dark={{ color: 'gray.400' }}>
            Form как менеджер состояния фильтров. Без onSubmit, с URL-синхронизацией.
            <br />
            Компоненты: <Badge>Form.Subscribe</Badge> · <Badge>Form.UrlSync</Badge> · <Badge>useFormRef</Badge> ·{' '}
            <Badge>useActiveFiltersCount</Badge>
          </Text>
        </Box>

        <Form initialValue={initialValue} schema={FiltersSchema} formRef={formRef}>
          {/* Form.UrlSync: записывает фильтры в URL с дебаунсом */}
          <Form.UrlSync
            fields={['search', 'category', 'minRating', 'onlyFavorites']}
            defaults={defaultFilters}
            debounce={400}
          />

          <Grid templateColumns={{ base: '1fr', lg: '280px 1fr' }} gap={6}>
            {/* Панель фильтров */}
            <Card.Root>
              <Card.Header>
                <HStack justify="space-between">
                  <Card.Title>Фильтры</Card.Title>
                  <ActiveFiltersCount />
                </HStack>
              </Card.Header>
              <Card.Body>
                <VStack gap={4} align="stretch">
                  <Form.Field.String name="search" />
                  <Form.Field.Select
                    name="category"
                    options={[
                      { label: 'Все категории', value: 'all' },
                      { label: 'Frontend', value: 'frontend' },
                      { label: 'Backend', value: 'backend' },
                      { label: 'DevOps', value: 'devops' },
                    ]}
                  />
                  <Form.Field.Slider
                    name="minRating"
                    min={0}
                    max={5}
                    step={1}
                    showValue
                    marks={[0, 1, 2, 3, 4, 5]}
                    colorPalette="yellow"
                  />
                  <Form.Field.Checkbox name="onlyFavorites" />
                  <Form.Button.Reset colorPalette="gray" variant="ghost">
                    Сбросить фильтры
                  </Form.Button.Reset>

                  <ExternalControls formRef={formRef} />
                </VStack>
              </Card.Body>
            </Card.Root>

            {/* Результаты через Form.Subscribe */}
            <Box>
              <FilteredResults />
            </Box>
          </Grid>
        </Form>

        {/* Пример кода */}
        <Box mt={4}>
          <Heading size="md" mb={4}>
            Как это работает
          </Heading>
          <Box
            as="pre"
            p={4}
            bg="gray.900"
            color="gray.100"
            borderRadius="md"
            fontSize="xs"
            overflow="auto"
            whiteSpace="pre-wrap"
          >
            {`// 1. Читаем начальные значения из URL
const { initialValue } = useFormUrlSync({
  fields: ['search', 'category', 'minRating'],
  defaults: defaultFilters,
})

// 2. Получаем ref для внешнего управления
const formRef = useFormRef<Filters>()

// 3. Форма без onSubmit — только state management
<Form initialValue={initialValue} schema={FiltersSchema} formRef={formRef}>
  {/* Синхронизируем изменения обратно в URL */}
  <Form.UrlSync
    fields={['search', 'category', 'minRating']}
    defaults={defaultFilters}
    debounce={400}
  />

  {/* Поля фильтров */}
  <Form.Field.String name="search" />

  {/* Подписываемся на значения без ре-рендера родителя */}
  <Form.Subscribe debounce={150}>
    {(values) => <FilteredResults filters={values} />}
  </Form.Subscribe>
</Form>

// 4. Счётчик активных фильтров — вне Form
function ActiveCount() {
  const count = useActiveFiltersCount(defaultFilters)
  return <Badge>{count}</Badge>
}

// 5. Внешнее управление через ref
formRef.current?.setFieldValue('category', 'frontend')`}
          </Box>
        </Box>
      </VStack>
    </Box>
  )
}
