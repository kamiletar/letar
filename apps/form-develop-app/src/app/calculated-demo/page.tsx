'use client'

import { Box, Code, Heading, Text, VStack } from '@chakra-ui/react'
import { formatRubles } from '@letar/format-utils'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

export default function CalculatedDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout
      title="Form.Field.Calculated"
      description="Вычисляемые поля — автоматический пересчёт при изменении зависимых полей"
    >
      <VStack gap={8} align="stretch">
        {/* Пример 1: Калькулятор заказа */}
        <Box>
          <Heading size="md" mb={3}>
            Калькулятор заказа
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Итого = Цена × Количество. С format для валюты.
          </Text>
          <Form
            debug
            initialValue={{ price: 1500, qty: 3, total: 0 }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.Number name="price" label="Цена" />
            <Form.Field.Number name="qty" label="Количество" />
            <Form.Field.Calculated
              name="total"
              label="Итого"
              compute={(v) => (Number(v.price) || 0) * (Number(v.qty) || 0)}
              format={(v) => formatRubles(Number(v))}
              deps={['price', 'qty']}
            />
            <Form.Button.Submit>Отправить</Form.Button.Submit>
          </Form>
        </Box>

        {/* Пример 2: Скидка + Финальная цена */}
        <Box>
          <Heading size="md" mb={3}>
            Каскадные вычисления
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Скидка применяется к итого. Два Calculated поля зависят друг от друга через цепочку.
          </Text>
          <Form
            debug
            initialValue={{ price: 2000, qty: 2, discount: 10, subtotal: 0, finalPrice: 0 }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.Number name="price" label="Цена за единицу" />
            <Form.Field.Number name="qty" label="Количество" />
            <Form.Field.Calculated
              name="subtotal"
              label="Подытого"
              compute={(v) => (Number(v.price) || 0) * (Number(v.qty) || 0)}
              format={(v) => formatRubles(Number(v))}
              deps={['price', 'qty']}
            />
            <Form.Field.Number name="discount" label="Скидка (%)" />
            <Form.Field.Calculated
              name="finalPrice"
              label="Итого со скидкой"
              compute={(v) => {
                const sub = (Number(v.price) || 0) * (Number(v.qty) || 0)
                const disc = Number(v.discount) || 0
                return sub * (1 - disc / 100)
              }}
              format={(v) => formatRubles(Number(v))}
              deps={['price', 'qty', 'discount']}
            />
            <Form.Button.Submit>Оформить</Form.Button.Submit>
          </Form>
        </Box>

        {/* Пример 3: Hidden mode */}
        <Box>
          <Heading size="md" mb={3}>
            Скрытое вычисление (hidden)
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Поле total вычисляется, но не отображается. Посмотрите DebugValues.
          </Text>
          <Form
            debug
            initialValue={{ a: 10, b: 20, total: 0 }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.Number name="a" label="A" />
            <Form.Field.Number name="b" label="B" />
            <Form.Field.Calculated name="total" compute={(v) => (Number(v.a) || 0) + (Number(v.b) || 0)} hidden />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Form>
        </Box>

        {/* Пример 4: Вложенная группа */}
        <Box>
          <Heading size="md" mb={3}>
            Внутри Form.Group
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Calculated поле внутри группы — compute получает все values формы.
          </Text>
          <Form
            debug
            initialValue={{ order: { price: 500, qty: 4, total: 0 } }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Group name="order">
              <Form.Field.Number name="price" label="Цена" />
              <Form.Field.Number name="qty" label="Количество" />
              <Form.Field.Calculated
                name="total"
                label="Итого (в группе)"
                compute={(v) => {
                  const order = v.order as Record<string, unknown>
                  return (Number(order?.price) || 0) * (Number(order?.qty) || 0)
                }}
                format={(v) => formatRubles(Number(v))}
              />
            </Form.Group>
            <Form.Button.Submit>Сохранить</Form.Button.Submit>
          </Form>
        </Box>

        {/* Результат submit */}
        {submittedData && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Heading size="sm" mb={2}>
              Отправленные данные:
            </Heading>
            <Code whiteSpace="pre-wrap">{JSON.stringify(submittedData, null, 2)}</Code>
          </Box>
        )}
      </VStack>
    </DemoPageLayout>
  )
}
