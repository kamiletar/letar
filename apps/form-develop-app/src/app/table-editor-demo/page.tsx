'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { formatRubles } from '@letar/format-utils'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

export default function TableEditorDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout
      title="Form.Field.TableEditor"
      description="Инлайн-редактируемая таблица для array-полей — замена карточного FormGroupList"
    >
      <VStack gap={8} align="stretch">
        {/* Пример 1: Заказ с товарами */}
        <Box>
          <Heading size="md" mb={3}>
            Заказ с товарами
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Кастомные колонки, computed &quot;Итого&quot; и footer с суммой. Кликните по ячейке для редактирования. Tab
            — следующая ячейка, Enter — следующая строка.
          </Text>
          <Form
            debug
            initialValue={{
              customer: '',
              items: [
                { product: 'Молоко', qty: 2, price: 89 },
                { product: 'Хлеб', qty: 1, price: 45 },
                { product: 'Сыр', qty: 1, price: 320 },
              ],
            }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.String name="customer" label="Покупатель" />
            <Form.Field.TableEditor
              name="items"
              label="Товары"
              columns={[
                { name: 'product', label: 'Товар', width: '40%' },
                { name: 'qty', label: 'Кол-во', width: '15%', align: 'right' },
                { name: 'price', label: 'Цена', width: '15%', align: 'right' },
                {
                  name: 'total',
                  label: 'Итого',
                  width: '15%',
                  align: 'right',
                  computed: (row) => (Number(row.qty) || 0) * (Number(row.price) || 0),
                  format: (v) => formatRubles(Number(v)),
                },
              ]}
              addLabel="Добавить товар"
              footer={[
                { column: 'total', aggregate: 'sum', label: 'Итого:', format: (v) => formatRubles(v) },
              ]}
              selectable
              helperText="Можно вставлять данные из Excel (Ctrl+V)"
            />
            <Form.Button.Submit>Оформить заказ</Form.Button.Submit>
          </Form>
        </Box>

        {/* Пример 2: Простая таблица */}
        <Box>
          <Heading size="md" mb={3}>
            Простая таблица контактов
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Минимальный пример — колонки определяются вручную.
          </Text>
          <Form
            debug
            initialValue={{
              contacts: [{ name: 'Иван Петров', email: 'ivan@example.com', phone: '+7 900 123-45-67' }],
            }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.TableEditor
              name="contacts"
              label="Контакты"
              columns={[
                { name: 'name', label: 'Имя' },
                { name: 'email', label: 'Email' },
                { name: 'phone', label: 'Телефон' },
              ]}
              addLabel="Добавить контакт"
              size="md"
            />
            <Form.Button.Submit>Сохранить</Form.Button.Submit>
          </Form>
        </Box>

        {/* Результат */}
        {submittedData && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Отправленные данные:
            </Heading>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>{JSON.stringify(submittedData, null, 2)}</pre>
          </Box>
        )}
      </VStack>
    </DemoPageLayout>
  )
}
