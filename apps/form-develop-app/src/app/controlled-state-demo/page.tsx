'use client'

import { Badge, Box, Card, Grid, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { Form, useTypedFormSubscribe } from '@letar/forms'
import { z } from 'zod/v4'

/**
 * Схема настроек отображения страницы.
 * Используется для controlled state без submit.
 */
const DisplaySettingsSchema = z.object({
  // Настройки текста
  fontSize: z
    .number()
    .min(12)
    .max(32)
    .meta({
      ui: { title: 'Размер шрифта', description: 'Размер текста в пикселях' },
    }),

  lineHeight: z
    .number()
    .min(1)
    .max(2.5)
    .meta({
      ui: { title: 'Межстрочный интервал' },
    }),

  // Настройки layout
  columns: z
    .number()
    .min(1)
    .max(4)
    .meta({
      ui: { title: 'Количество колонок' },
    }),

  gap: z
    .number()
    .min(0)
    .max(48)
    .meta({
      ui: { title: 'Отступ между карточками' },
    }),

  // Визуальные эффекты
  borderRadius: z
    .number()
    .min(0)
    .max(24)
    .meta({
      ui: { title: 'Скругление углов' },
    }),

  opacity: z
    .number()
    .min(0)
    .max(100)
    .meta({
      ui: { title: 'Прозрачность' },
    }),
})

type DisplaySettings = z.infer<typeof DisplaySettingsSchema>

const initialSettings: DisplaySettings = {
  fontSize: 16,
  lineHeight: 1.5,
  columns: 2,
  gap: 16,
  borderRadius: 8,
  opacity: 100,
}

/**
 * Демо-карточки для отображения с динамическими стилями
 */
const demoCards = [
  { id: 1, title: 'React', description: 'Библиотека для создания пользовательских интерфейсов' },
  { id: 2, title: 'TypeScript', description: 'Типизированный JavaScript для больших проектов' },
  { id: 3, title: 'Chakra UI', description: 'Компонентная библиотека для React приложений' },
  { id: 4, title: 'TanStack Form', description: 'Мощное управление формами с fine-grained reactivity' },
]

/**
 * Компонент превью, который реагирует на изменения настроек.
 * Использует useTypedFormSubscribe для типизированной подписки на значения формы.
 */
function LivePreview() {
  const { TypedSubscribe } = useTypedFormSubscribe<DisplaySettings>()

  return (
    <TypedSubscribe selector={(values) => values}>
      {(settings) => (
        <Box
          p={4}
          bg="gray.50"
          borderRadius="lg"
          _dark={{ bg: 'gray.800' }}
          style={{
            opacity: settings.opacity / 100,
          }}
        >
          <Heading size="md" mb={4}>
            Превью
          </Heading>

          <SimpleGrid
            columns={settings.columns}
            gap={`${settings.gap}px`}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
            }}
          >
            {demoCards.map((card) => (
              <Card.Root
                key={card.id}
                style={{
                  borderRadius: `${settings.borderRadius}px`,
                }}
              >
                <Card.Header>
                  <Card.Title>{card.title}</Card.Title>
                </Card.Header>
                <Card.Body>
                  <Text>{card.description}</Text>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </TypedSubscribe>
  )
}

/**
 * Компонент отображения текущих значений настроек.
 * Показывает, как читать state формы в реальном времени.
 */
function CurrentValues() {
  const { TypedSubscribe } = useTypedFormSubscribe<DisplaySettings>()

  return (
    <TypedSubscribe selector={(values) => values}>
      {(settings) => (
        <Box p={4} bg="blue.50" borderRadius="md" _dark={{ bg: 'blue.900' }} data-testid="current-values">
          <Text fontWeight="bold" mb={2}>
            Текущие значения:
          </Text>
          <HStack wrap="wrap" gap={2}>
            <Badge colorPalette="blue">fontSize: {settings.fontSize}px</Badge>
            <Badge colorPalette="green">lineHeight: {settings.lineHeight}</Badge>
            <Badge colorPalette="purple">columns: {settings.columns}</Badge>
            <Badge colorPalette="orange">gap: {settings.gap}px</Badge>
            <Badge colorPalette="pink">borderRadius: {settings.borderRadius}px</Badge>
            <Badge colorPalette="cyan">opacity: {settings.opacity}%</Badge>
          </HStack>
        </Box>
      )}
    </TypedSubscribe>
  )
}

/**
 * Демо-страница: Form как controlled state (без onSubmit).
 *
 * Показывает паттерн использования Form для управления UI-настройками
 * в реальном времени, без необходимости отправки данных на сервер.
 */
export default function ControlledStateDemoPage() {
  return (
    <Box p={8} maxW="1200px" mx="auto">
      <VStack gap={6} align="stretch">
        <Box>
          <Heading mb={2}>Controlled State Demo</Heading>
          <Text color="gray.600" _dark={{ color: 'gray.400' }}>
            Form без onSubmit — использование формы для управления UI в реальном времени.
            <br />
            Слайдеры влияют на отображение карточек мгновенно через form.Subscribe.
          </Text>
        </Box>

        {/*
          Form без onSubmit — просто controlled state.
          Все изменения полей доступны через form.Subscribe внутри формы.
        */}
        <Form initialValue={initialSettings} schema={DisplaySettingsSchema}>
          <Grid templateColumns={{ base: '1fr', lg: '350px 1fr' }} gap={6}>
            {/* Панель настроек */}
            <Box>
              <Card.Root>
                <Card.Header>
                  <Card.Title>Настройки отображения</Card.Title>
                </Card.Header>
                <Card.Body>
                  <VStack gap={6} align="stretch">
                    {/* Текстовые настройки */}
                    <Box>
                      <Text fontWeight="medium" fontSize="sm" color="gray.500" mb={3}>
                        Текст
                      </Text>
                      <VStack gap={4} align="stretch">
                        <Form.Field.Slider
                          name="fontSize"
                          min={12}
                          max={32}
                          step={1}
                          showValue
                          marks={[12, 16, 24, 32]}
                          colorPalette="blue"
                        />
                        <Form.Field.Slider
                          name="lineHeight"
                          min={1}
                          max={2.5}
                          step={0.1}
                          showValue
                          marks={[1, 1.5, 2, 2.5]}
                          colorPalette="green"
                        />
                      </VStack>
                    </Box>

                    {/* Layout настройки */}
                    <Box>
                      <Text fontWeight="medium" fontSize="sm" color="gray.500" mb={3}>
                        Layout
                      </Text>
                      <VStack gap={4} align="stretch">
                        <Form.Field.Slider
                          name="columns"
                          min={1}
                          max={4}
                          step={1}
                          showValue
                          marks={[1, 2, 3, 4]}
                          colorPalette="purple"
                        />
                        <Form.Field.Slider
                          name="gap"
                          min={0}
                          max={48}
                          step={4}
                          showValue
                          marks={[0, 16, 32, 48]}
                          colorPalette="orange"
                        />
                      </VStack>
                    </Box>

                    {/* Визуальные эффекты */}
                    <Box>
                      <Text fontWeight="medium" fontSize="sm" color="gray.500" mb={3}>
                        Визуальные эффекты
                      </Text>
                      <VStack gap={4} align="stretch">
                        <Form.Field.Slider
                          name="borderRadius"
                          min={0}
                          max={24}
                          step={2}
                          showValue
                          marks={[0, 8, 16, 24]}
                          colorPalette="pink"
                        />
                        <Form.Field.Slider
                          name="opacity"
                          min={0}
                          max={100}
                          step={5}
                          showValue
                          marks={[0, 50, 100]}
                          colorPalette="cyan"
                        />
                      </VStack>
                    </Box>

                    {/* Кнопка сброса — работает даже без onSubmit */}
                    <Form.Button.Reset colorPalette="gray" variant="outline">
                      Сбросить настройки
                    </Form.Button.Reset>
                  </VStack>
                </Card.Body>
              </Card.Root>
            </Box>

            {/* Область превью */}
            <VStack gap={4} align="stretch">
              <CurrentValues />
              <LivePreview />
            </VStack>
          </Grid>
        </Form>

        {/* Код примера */}
        <Box mt={8}>
          <Heading size="md" mb={4}>
            Как это работает
          </Heading>
          <Box
            as="pre"
            p={4}
            bg="gray.900"
            color="gray.100"
            borderRadius="md"
            fontSize="sm"
            overflow="auto"
            whiteSpace="pre-wrap"
          >
            {`// Form без onSubmit — просто controlled state
<Form initialValue={settings} schema={SettingsSchema}>
  {/* Панель настроек */}
  <Form.Field.Slider name="fontSize" min={12} max={32} showValue />
  <Form.Field.Slider name="columns" min={1} max={4} step={1} />

  {/* Контент, реагирующий на настройки */}
  <LivePreview />
</Form>

// Компонент с типизированной подпиской на значения
function LivePreview() {
  const { TypedSubscribe } = useTypedFormSubscribe<Settings>()

  return (
    <TypedSubscribe selector={(values) => values}>
      {(settings) => (
        // settings автоматически типизирован как Settings
        <div style={{ fontSize: settings.fontSize }}>
          {/* Контент с динамическими стилями */}
        </div>
      )}
    </TypedSubscribe>
  )
}`}
          </Box>
        </Box>
      </VStack>
    </Box>
  )
}
