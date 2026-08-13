'use client'

import { FieldDataGrid } from '@letar/forms-shadcn'

import { DemoForm, DemoPageLayout } from '../_components'

export default function DataGridDemoPage() {
  return (
    <DemoPageLayout
      title="FieldDataGrid (beta)"
      description={'Большая таблица на @tanstack/react-table — изолированная песочница со своим array-полем employees. '
        + 'Сортировка (клик по заголовку), текстовый фильтр по имени, инлайн-редактирование (клик по ячейке), '
        + 'выбор строк + bulk-удаление, CSV-экспорт.'}
    >
      <DemoForm<{ employees: { name: string; department: string; salary: number }[] }>
        defaultValues={{
          employees: [
            { name: 'Иван Петров', department: 'Разработка', salary: 150000 },
            { name: 'Мария Сидорова', department: 'Дизайн', salary: 120000 },
            { name: 'Пётр Иванов', department: 'Продажи', salary: 90000 },
          ],
        }}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('data-grid submit', value)
        }}
      >
        <FieldDataGrid
          name="employees"
          label="Сотрудники"
          rowSelection
          columns={[
            { name: 'name', label: 'Имя', filter: true },
            { name: 'department', label: 'Отдел', filter: true },
            { name: 'salary', label: 'Зарплата', align: 'right' },
          ]}
        />
      </DemoForm>
    </DemoPageLayout>
  )
}
