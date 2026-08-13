'use client'

import { FieldCascadingSelect, FieldCombobox, FieldNativeSelect, FieldSelect } from '@letar/forms-shadcn'
import { useState } from 'react'

import { DemoForm, DemoPageLayout, SubmittedDataPreview } from '../_components'

const frameworkOptions = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
]

const shippingCountryOptions = [
  { label: 'Россия', value: 'ru' },
  { label: 'Казахстан', value: 'kz' },
]

const CITIES_BY_COUNTRY: Record<string, { label: string; value: string }[]> = {
  ru: [{ label: 'Москва', value: 'msk' }, { label: 'Казань', value: 'kzn' }],
  kz: [{ label: 'Алматы', value: 'alm' }, { label: 'Астана', value: 'ast' }],
}

interface SelectValues {
  framework: string
  country: string
  frameworkSearch: string
  shippingCountry: string
  shippingCity: string
}

const defaultValues: SelectValues = {
  framework: '',
  country: '',
  frameworkSearch: '',
  shippingCountry: '',
  shippingCity: '',
}

export default function SelectDemoPage() {
  const [submitted, setSubmitted] = useState<SelectValues | null>(null)

  return (
    <DemoPageLayout
      title="Select-поля"
      description="Select, NativeSelect, Combobox, CascadingSelect (зависимый select)"
    >
      <DemoForm<SelectValues> defaultValues={defaultValues} onSubmit={setSubmitted}>
        <FieldSelect name="framework" label="Фреймворк" options={frameworkOptions} placeholder="Выберите" />
        <FieldNativeSelect
          name="country"
          label="Страна"
          options={[
            { label: 'Россия', value: 'ru' },
            { label: 'Казахстан', value: 'kz' },
          ]}
        />
        <FieldCombobox name="frameworkSearch" label="Поиск фреймворка" options={frameworkOptions} />
        <FieldSelect
          name="shippingCountry"
          label="Страна доставки"
          options={shippingCountryOptions}
          placeholder="Выберите"
        />
        <FieldCascadingSelect
          name="shippingCity"
          label="Город доставки"
          dependsOn="shippingCountry"
          loadOptions={async (country) => CITIES_BY_COUNTRY[country ?? ''] ?? []}
          placeholderWhenDisabled="Сначала выберите страну"
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
