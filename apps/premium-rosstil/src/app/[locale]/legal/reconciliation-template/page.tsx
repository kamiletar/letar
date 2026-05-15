import { Box, Heading, Separator, Table, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Акт сверки взаиморасчётов (шаблон) — Премиум РосСтиль',
  description: 'Шаблон акта сверки взаиморасчётов между Оператором и Продавцом маркетплейса Премиум РосСтиль.',
}

export default function ReconciliationTemplatePage() {
  return (
    <>
      {/* Стили для печати */}
      <style>
        {`
        @media print {
          /* Скрываем навигацию, хедер, футер */
          header, footer, nav, [data-legal-nav] { display: none !important; }
          /* Убираем предупреждение "Проект документа" */
          [data-draft-warning] { display: none !important; }
          /* Оптимизация для печати */
          body { font-size: 12pt; color: #000; }
          @page { margin: 2cm; }
        }
      `}
      </style>

      <VStack gap={6} alignItems="stretch">
        <Heading size="2xl" textAlign="center" textTransform="none">
          Акт сверки взаиморасчётов
        </Heading>

        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Шаблон документа для ежемесячной сверки
        </Text>

        {/* Шапка акта */}
        <Box borderWidth={1} borderRadius="md" p={6}>
          <VStack gap={4} alignItems="stretch">
            <Text textAlign="center" fontWeight="bold">
              АКТ СВЕРКИ ВЗАИМОРАСЧЁТОВ
            </Text>
            <Text textAlign="center">за период с «____» ____________ 20__ г. по «____» ____________ 20__ г.</Text>
            <Text textAlign="center">
              между ИП Аксяновой Е.Ю. (Оператор) и ______________________________ (Продавец)
            </Text>

            <Separator my={2} />

            {/* Реквизиты сторон */}
            <Box>
              <Text fontWeight="bold" mb={2}>
                Оператор (Агент):
              </Text>
              <Text>ИП Аксянова Елена Юрьевна</Text>
              <Text>ИНН: 682701271521, ОГРНИП: 317774600434927</Text>
            </Box>

            <Box>
              <Text fontWeight="bold" mb={2}>
                Продавец (Принципал):
              </Text>
              <Text>Наименование: ______________________________</Text>
              <Text>ИНН: ____________________ ОГРН(ИП): ____________________</Text>
              <Text>Магазин на платформе: ______________________________</Text>
            </Box>
          </VStack>
        </Box>

        {/* Таблица операций */}
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>№</Table.ColumnHeader>
                <Table.ColumnHeader>Дата</Table.ColumnHeader>
                <Table.ColumnHeader>Подзаказ</Table.ColumnHeader>
                <Table.ColumnHeader>Описание</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Сумма продажи, ₽</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Комиссия, ₽</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">К выплате, ₽</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {/* Пример строк */}
              {[1, 2, 3, 4, 5].map((i) => (
                <Table.Row key={i}>
                  <Table.Cell>{i}</Table.Cell>
                  <Table.Cell>__.__.20__</Table.Cell>
                  <Table.Cell>#______</Table.Cell>
                  <Table.Cell>______________________________</Table.Cell>
                  <Table.Cell textAlign="right">________</Table.Cell>
                  <Table.Cell textAlign="right">________</Table.Cell>
                  <Table.Cell textAlign="right">________</Table.Cell>
                </Table.Row>
              ))}
              {/* Возвраты */}
              <Table.Row>
                <Table.Cell colSpan={7}>
                  <Text fontWeight="bold" fontSize="sm">
                    Возвраты:
                  </Text>
                </Table.Cell>
              </Table.Row>
              <Table.Row>
                <Table.Cell>—</Table.Cell>
                <Table.Cell>__.__.20__</Table.Cell>
                <Table.Cell>#______</Table.Cell>
                <Table.Cell>Возврат: ______________________</Table.Cell>
                <Table.Cell textAlign="right" color="red.500">
                  −________
                </Table.Cell>
                <Table.Cell textAlign="right" color="red.500">
                  −________
                </Table.Cell>
                <Table.Cell textAlign="right" color="red.500">
                  −________
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Box>

        {/* Итого */}
        <Box borderWidth={1} borderRadius="md" p={4}>
          <VStack gap={2} alignItems="stretch">
            <Text fontWeight="bold">Итого за период:</Text>
            <Table.Root size="sm" unstyled>
              <Table.Body>
                <Table.Row>
                  <Table.Cell>Сумма продаж:</Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="bold">
                    ________________ ₽
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Сумма возвратов:</Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="bold">
                    ________________ ₽
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Комиссия Оператора (____%):</Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="bold">
                    ________________ ₽
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Резерв на возвраты (____%):</Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="bold">
                    ________________ ₽
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>Выплачено за период:</Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="bold">
                    ________________ ₽
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell fontWeight="bold">Остаток на балансе:</Table.Cell>
                  <Table.Cell textAlign="right" fontWeight="bold">
                    ________________ ₽
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table.Root>
          </VStack>
        </Box>

        {/* Подписи */}
        <Box mt={4}>
          <Text fontSize="sm" mb={6}>
            Настоящий акт составлен в двух экземплярах, по одному для каждой стороны. Стороны претензий друг к другу не
            имеют / имеют (нужное подчеркнуть).
          </Text>

          <Box display="flex" justifyContent="space-between" gap={8}>
            <VStack gap={4} flex={1} alignItems="stretch">
              <Text fontWeight="bold">Оператор:</Text>
              <Separator />
              <Text fontSize="sm">ИП Аксянова Е.Ю.</Text>
              <Text fontSize="sm" mt={4}>
                Подпись: ___________________
              </Text>
              <Text fontSize="sm">Дата: «____» ____________ 20__ г.</Text>
              <Text fontSize="sm">М.П. (при наличии)</Text>
            </VStack>

            <VStack gap={4} flex={1} alignItems="stretch">
              <Text fontWeight="bold">Продавец:</Text>
              <Separator />
              <Text fontSize="sm">______________________________</Text>
              <Text fontSize="sm" mt={4}>
                Подпись: ___________________
              </Text>
              <Text fontSize="sm">Дата: «____» ____________ 20__ г.</Text>
              <Text fontSize="sm">М.П. (при наличии)</Text>
            </VStack>
          </Box>
        </Box>
      </VStack>
    </>
  )
}
