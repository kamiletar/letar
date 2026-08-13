'use client'

import { FieldCalculated, FieldCurrency, FieldNumberInput, FieldPercentage } from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

interface NumericValues {
  price: number
  discount: number
  stock: number | undefined
  finalPrice: number
}

const defaultValues: NumericValues = {
  price: 1500,
  discount: 15,
  stock: 10,
  finalPrice: 0,
}

export default function NumericDemoPage() {
  const [submitted, setSubmitted] = useState<NumericValues | null>(null)

  return (
    <DemoPageLayout
      title="Числовые поля"
      description="Currency, Percentage, NumberInput, Calculated (вычисляемая цена со скидкой)"
    >
      <DemoForm<NumericValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldCurrency name="price" label="Цена" />
        <FieldPercentage name="discount" label="Скидка" />
        <FieldNumberInput name="stock" label="Остаток на складе" min={0} max={999} />
        <FieldCalculated
          name="finalPrice"
          label="Цена со скидкой"
          compute={(v) => (v.price as number) * (1 - (v.discount as number) / 100)}
          format={(v) => `${Number(v).toLocaleString('ru-RU')} ₽`}
          deps={['price', 'discount']}
        />

        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>

      <SubmittedDataPreview data={submitted} />
    </DemoPageLayout>
  )
}
