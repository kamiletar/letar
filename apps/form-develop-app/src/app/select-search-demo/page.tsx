'use client'

import { Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

const SearchSchema = z
  .object({
    auto: z.string().meta({ ui: { title: 'Авто (порог 9)' } }),
    thirty: z.string().meta({ ui: { title: '30 опций' } }),
    grouped: z.string().meta({ ui: { title: 'С группами' } }),
    all: z.string().meta({ ui: { title: '«Все категории» (value "")' } }),
    creatable: z.string().meta({ ui: { title: 'С onCreate (текст поиска)' } }),
    off: z.string().meta({ ui: { title: 'searchable={false}' } }),
  })
  .strip()

type SearchData = z.infer<typeof SearchSchema>

const WORKS = [
  'Кровля',
  'Фасад',
  'Фундамент',
  'Отопление',
  'Электрика',
  'Сантехника',
  'Вентиляция',
  'Утепление',
  'Отделка',
  'Ремонт бани',
  'Ёлочная гирлянда',
  'Установка окон',
]

const makeOptions = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    value: `w${i}`,
    label: i < WORKS.length ? WORKS[i]! : `Работа ${i + 1}`,
  }))

export default function SelectSearchDemoPage() {
  const [submitted, setSubmitted] = useState<SearchData | null>(null)
  const [count, setCount] = useState(9)
  const [created, setCreated] = useState<string[]>([])

  const many = makeOptions(30)
  const grouped = many.slice(0, 14).map((o, i) => ({ ...o, group: i < 7 ? 'Стройка' : 'Инженерка' }))
  const withAll = [{ value: '', label: 'Все категории' }, ...many.slice(0, 12)]

  return (
    <DemoPageLayout
      title="Select Search Demo"
      description="searchable у Form.Field.Select: поле поиска внутри списка с 10-й опции"
    >
      <Form
        initialValue={{ auto: 'w2', thirty: 'w5', grouped: '', all: '', creatable: '', off: '' }}
        schema={SearchSchema}
        onSubmit={setSubmitted}
      >
        <VStack gap={6} align="stretch">
          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Порог: {count} опций</Heading>
            <Text color="fg.muted" mb={4}>
              9 опций — поля поиска нет, 10 — есть. Переключи число при закрытом и при открытом списке: значение и фокус
              не теряются, Root не перемонтируется.
            </Text>
            <HStack mb={4}>
              <Button size="sm" onClick={() => setCount(9)}>9</Button>
              <Button size="sm" onClick={() => setCount(10)}>10</Button>
              <Button size="sm" onClick={() => setCount(30)}>30</Button>
            </HStack>
            <Form.Field.Select name="auto" options={makeOptions(count)} />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>30 опций: раскладка, ё/е, выбранное в триггере</Heading>
            <Text color="fg.muted" mb={4}>
              Набери <code>rhjdkz</code> (найдёт «Кровля»), <code>tkjxyfz</code> (найдёт «Ёлочная гирлянда»),{' '}
              <code>,fyb</code> («Ремонт бани»). Выбранное значение остаётся в кнопке, пока список отфильтрован.
            </Text>
            <Form.Field.Select name="thirty" options={many} />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>Группы</Heading>
            <Text color="fg.muted" mb={4}>Пустые группы при поиске исчезают.</Text>
            <Form.Field.Select name="grouped" options={grouped} getGroup={(o) => (o as { group?: string }).group} />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>«Все категории» (value «»)</Heading>
            <Text color="fg.muted" mb={4}>Выбор не сбрасывается посреди поиска.</Text>
            <Form.Field.Select name="all" options={withAll} clearable={false} />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>onCreate получает текст поиска</Heading>
            <Text color="fg.muted" mb={4}>
              Введи несуществующее — под сообщением появится «+ Добавить "…"» (подсвечен). Создано: {created.join(', ')
                || '—'}
            </Text>
            <Form.Field.Select
              name="creatable"
              options={many.slice(0, 12)}
              onCreate={async (search) => {
                const name = window.prompt('Название', search)
                if (!name?.trim()) {
                  return null
                }
                setCreated((prev) => [...prev, name.trim()])
                return { label: name.trim(), value: `new-${Date.now()}` }
              }}
            />
          </Box>

          <Box borderWidth={1} borderRadius="md" p={4}>
            <Heading size="md" mb={2}>searchable=false при 30 опциях</Heading>
            <Form.Field.Select name="off" options={many} searchable={false} />
          </Box>

          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </VStack>
      </Form>
      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
