'use client'

import { FieldTableEditor } from '@letar/forms-shadcn'

import { DemoForm, DemoPageLayout } from '../_components'

export default function TableEditorDemoPage() {
  return (
    <DemoPageLayout
      title="FieldTableEditor (beta)"
      description={'Не `createField()`-поле, компонует `form.Field(mode="array")` напрямую — изолированная песочница со '
        + 'своим array-полем `items`. `sortable` — native HTML5 drag&drop (без @dnd-kit, beta-упрощение).'}
    >
      <DemoForm<{ items: { product: string; qty: number; price: number }[] }>
        defaultValues={{
          items: [
            { product: 'Клавиатура', qty: 1, price: 5990 },
            { product: 'Мышь', qty: 2, price: 1490 },
          ],
        }}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('table submit', value)
        }}
      >
        <FieldTableEditor
          name="items"
          label="Позиции заказа"
          sortable
          selectable
          columns={[
            { name: 'product', label: 'Товар', width: '50%' },
            { name: 'qty', label: 'Кол-во', width: '15%', align: 'right' },
            { name: 'price', label: 'Цена', width: '15%', align: 'right' },
            {
              name: 'total',
              label: 'Итого',
              width: '20%',
              align: 'right',
              computed: (row) => (Number(row.qty) || 0) * (Number(row.price) || 0),
              format: (v) => `${Number(v).toLocaleString('ru-RU')} ₽`,
            },
          ]}
          addLabel="Добавить позицию"
          footer={[{
            column: 'total',
            aggregate: 'sum',
            label: 'Итого:',
            format: (v) => `${v.toLocaleString('ru-RU')} ₽`,
          }]}
        />

        <button
          type="submit"
          className="bg-primary text-primary-foreground mt-4 rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>
    </DemoPageLayout>
  )
}
