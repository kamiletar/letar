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

/** Имитация окна создания записи в приложении: задержка вместо диалога и серверного действия */
function fakeCreateDialog(name: string): Promise<{ label: string; value: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ label: name.trim() || 'Новая запись', value: `new-${Math.random().toString(36).slice(2, 8)}` })
    }, 400)
  })
}

interface SelectValues {
  framework: string
  country: string
  frameworkSearch: string
  shippingCountry: string
  shippingCity: string
  createSelect: string
  createCombobox: string
}

const defaultValues: SelectValues = {
  framework: '',
  country: '',
  frameworkSearch: '',
  shippingCountry: '',
  shippingCity: '',
  createSelect: '',
  createCombobox: '',
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
        {/* onCreate: создание записи справочника из поля (только статические опции) */}
        <FieldSelect
          name="createSelect"
          label="Фреймворк (с пунктом «Добавить…»)"
          options={frameworkOptions}
          placeholder="Выберите"
          createLabel="Добавить фреймворк…"
          onCreate={async () => fakeCreateDialog('Новый фреймворк')}
        />
        <FieldCombobox
          name="createCombobox"
          label="Поиск фреймворка (с созданием)"
          options={frameworkOptions}
          onCreate={async (text) => {
            // Путь «пользователь закрыл окно»: null — ничего не меняется
            if (text.trim().toLowerCase().startsWith('отмена')) {
              return null
            }
            return fakeCreateDialog(text)
          }}
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
