'use client'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { DemoPageLayout } from '../_components'

/** Генерация тестовых данных */
function generateEmployees(count: number) {
  const departments = ['Разработка', 'Дизайн', 'Маркетинг', 'Продажи', 'HR']
  return Array.from({ length: count }, (_, i) => ({
    name: `Сотрудник ${i + 1}`,
    email: `employee${i + 1}@company.com`,
    department: departments[i % departments.length],
    salary: 50000 + Math.floor(Math.random() * 100000),
  }))
}

export default function DataGridDemoPage() {
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null)

  return (
    <DemoPageLayout
      title="Form.Field.DataGrid"
      description="Редактируемая таблица данных на TanStack Table: сортировка, фильтры, пагинация, inline editing"
    >
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="md" mb={3}>
            100 сотрудников
          </Heading>
          <Text fontSize="sm" color="fg.muted" mb={4}>
            Клик по ячейке → редактирование. Заголовок → сортировка. Фильтры сверху. Пагинация по 10 записей.
          </Text>
          <Form
            debug
            initialValue={{ employees: generateEmployees(100) }}
            onSubmit={(data) => setSubmittedData(data as Record<string, unknown>)}
          >
            <Form.Field.DataGrid
              name="employees"
              label="Сотрудники"
              columns={[
                { name: 'name', label: 'Имя', editable: true, filter: 'text' },
                { name: 'email', label: 'Email', editable: true, filter: 'text' },
                { name: 'department', label: 'Отдел', editable: true, filter: 'text' },
                { name: 'salary', label: 'Зарплата', editable: true, align: 'right' },
              ]}
              pageSize={10}
              rowSelection
              helperText="Клик по ячейке для редактирования, Enter для сохранения"
            />
            <Form.Button.Submit>Сохранить все изменения</Form.Button.Submit>
          </Form>
        </Box>
      </VStack>
    </DemoPageLayout>
  )
}
