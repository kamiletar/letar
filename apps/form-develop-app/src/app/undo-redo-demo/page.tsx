'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { DemoPageLayout } from '../_components'

export default function UndoRedoDemoPage() {
  return (
    <DemoPageLayout title="useFormHistory — Undo/Redo" description="Ctrl+Z/Ctrl+Y для форм с историей изменений">
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="md" mb={3}>
            Использование
          </Heading>
          <Code display="block" whiteSpace="pre" fontSize="xs" p={4} borderRadius="md">
            {`import { useFormHistory, HistoryControls } from '@letar/forms'

function ProductForm() {
  const form = useDeclarativeForm()
  const history = useFormHistory(form, {
    maxHistory: 50,      // Макс. снапшотов в стеке
    debounceMs: 500,     // Пауза перед записью (мс)
    keyboard: true,      // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
    persist: false,      // Сохранять в sessionStorage
  })

  return (
    <Form schema={ProductSchema} onSubmit={save}>
      {/* Визуальные кнопки Undo/Redo */}
      <HistoryControls history={history} showCounter />

      <Form.Field.String name="title" />
      <Form.Field.RichText name="description" />
      <Form.Field.Currency name="price" />
      <Form.Button.Submit>Сохранить</Form.Button.Submit>
    </Form>
  )
}`}
          </Code>
        </Box>

        <Box>
          <Heading size="md" mb={3}>
            API
          </Heading>
          <Code display="block" whiteSpace="pre" fontSize="xs" p={4} borderRadius="md">
            {`const {
  undo,           // () => void — отменить
  redo,           // () => void — повторить
  canUndo,        // boolean
  canRedo,        // boolean
  currentIndex,   // number — текущая позиция
  historyLength,  // number — всего снапшотов
  clear,          // () => void — очистить историю
  history,        // HistoryEntry[] — для отладки
} = useFormHistory(form, config?)`}
          </Code>
        </Box>

        <Box>
          <Heading size="md" mb={3}>
            Как работает
          </Heading>
          <VStack align="start" gap={2} fontSize="sm">
            <Text>
              1. Хук подписывается на <strong>form.store</strong> (TanStack Form reactive store)
            </Text>
            <Text>
              2. При каждом изменении — debounce 500ms, затем <strong>structuredClone</strong> снапшот
            </Text>
            <Text>
              3. Undo/Redo применяет снапшот через <strong>form.setFieldValue</strong> для каждого поля
            </Text>
            <Text>
              4. Изменения от undo/redo <strong>не записываются</strong> в историю (isUndoRedoRef)
            </Text>
            <Text>5. При ветвлении (undo → изменение) — будущие записи обрезаются</Text>
          </VStack>
        </Box>

        <Box>
          <Heading size="md" mb={3}>
            Keyboard Shortcuts
          </Heading>
          <VStack align="start" gap={2} fontSize="sm">
            <Text>
              <strong>Ctrl+Z</strong> (Cmd+Z на Mac) — Undo
            </Text>
            <Text>
              <strong>Ctrl+Shift+Z</strong> или <strong>Ctrl+Y</strong> — Redo
            </Text>
            <Text>
              Шорткаты включены по умолчанию (<Code>keyboard: true</Code>)
            </Text>
          </VStack>
        </Box>

        <Box>
          <Heading size="md" mb={3}>
            Когда использовать
          </Heading>
          <VStack align="start" gap={2} fontSize="sm">
            <Text>- CMS / редакторы контента (много полей, частые правки)</Text>
            <Text>- Конфигураторы товаров (изменение параметров)</Text>
            <Text>- Формы с RichText (пользователь привык к Ctrl+Z)</Text>
            <Text>- Длинные формы (&gt;10 полей) где легко ошибиться</Text>
          </VStack>
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
