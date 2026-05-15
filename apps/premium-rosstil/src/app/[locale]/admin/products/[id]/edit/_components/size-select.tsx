'use client'

import type { ProductSize } from '@/generated/prisma'
import { createListCollection, Select } from '@chakra-ui/react'
import { useTypedFormContext } from '@letar/forms'
import { useStore } from '@tanstack/react-form'
import type { ItemFormData } from '../_schemas/item-form.schema'

export type SizeSelectProps = {
  name: string
  sizes: ProductSize[]
  defaultValue?: string
}

/**
 * Компонент выбора размера с интеграцией TanStack Form.
 * Использует useTypedFormContext для синхронизации с формой.
 *
 * Note: Не использует Portal, так как обычно рендерится внутри Dialog.Portal.
 * Это позволяет dropdown отображаться поверх backdrop модального окна.
 */
export function SizeSelect({ name: _name, sizes }: SizeSelectProps) {
  const { form, setFieldValue } = useTypedFormContext<ItemFormData>()

  // Подписка на значение поля sizeId
  const value = useStore(form.store, (state) => (state as { values: ItemFormData }).values.sizeId)

  const sizeCollection = createListCollection({
    items: sizes.map((size) => ({
      value: size.id,
      label: `${size.international} (RU ${size.ru})`,
    })),
  })

  return (
    <Select.Root
      collection={sizeCollection}
      value={value ? [value] : []}
      onValueChange={({ value: newValue }) => setFieldValue('sizeId', newValue[0] || '')}
      positioning={{ sameWidth: true }}
    >
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Выберите размер" />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {sizeCollection.items.map((item) => (
            <Select.Item key={item.value} item={item}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
