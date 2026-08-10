'use client'

import type { AddressProvider } from '@letar/forms-core/address'
import {
  FieldAddress,
  FieldCheckbox,
  FieldCombobox,
  FieldDate,
  FieldDateRange,
  FieldHidden,
  FieldNativeSelect,
  FieldNumber,
  FieldPassword,
  FieldPinInput,
  FieldRadioGroup,
  FieldRating,
  FieldSegmentGroup,
  FieldSelect,
  FieldSlider,
  FieldString,
  FieldSwitch,
  FieldTags,
  FieldTextarea,
} from '@letar/forms-shadcn'

import { DemoForm } from './_components/demo-form'

// Мок-провайдер вместо DaData — в песочнице нет токена, демонстрирует только сам UI/интеграцию.
const mockAddressProvider: AddressProvider = {
  async getSuggestions(query) {
    const streets = ['ул Тверская', 'ул Арбат', 'пр-кт Ленина', 'ул Мира']
    return streets
      .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
      .map((s) => ({ label: `г Москва, ${s}`, value: `г Москва, ${s}`, data: { street: s } }))
  },
}

const frameworkOptions = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
]

const sizeOptions = [
  { label: 'Малый', value: 'sm' },
  { label: 'Средний', value: 'md' },
  { label: 'Большой', value: 'lg' },
]

const billingOptions = [
  { label: 'Месяц', value: 'monthly' },
  { label: 'Год', value: 'yearly' },
]

interface DemoFormValues {
  name: string
  bio: string
  portions: number
  agree: boolean
  framework: string
  size: string
  billing: string
  birthday: string
  country: string
  notifications: boolean
  volume: number
  password: string
  frameworkSearch: string
  pin: string
  utm: string
  rating: number
  tags: string[]
  address: string
  period: { start: string; end: string }
}

const defaultValues: DemoFormValues = {
  name: '',
  bio: '',
  portions: 1,
  agree: false,
  framework: '',
  size: 'md',
  billing: 'monthly',
  birthday: '',
  country: '',
  notifications: true,
  volume: 50,
  password: '',
  frameworkSearch: '',
  pin: '',
  utm: '',
  rating: 0,
  tags: [],
  address: '',
  period: { start: '', end: '' },
}

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Form Develop App (shadcn)</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Песочница для разработки @letar/forms-shadcn — 19 полей, Фаза 7.3 Шаг 5+.
      </p>

      <DemoForm<DemoFormValues>
        defaultValues={defaultValues}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('submit', value)
        }}
      >
        <FieldHidden name="utm" value="form-develop-app-shadcn" />

        <FieldString name="name" label="Имя" placeholder="Введите имя" required />
        <FieldTextarea name="bio" label="О себе" rows={3} />
        <FieldNumber name="portions" label="Порции" min={1} max={10} step={1} />
        <FieldPassword name="password" label="Пароль" />
        <FieldCheckbox name="agree" label="Согласен с условиями" />
        <FieldSwitch name="notifications" label="Уведомления" />
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
        <FieldRadioGroup name="size" label="Размер" options={sizeOptions} />
        <FieldSegmentGroup name="billing" label="Тариф" options={billingOptions} />
        <FieldDate name="birthday" label="Дата рождения" />
        <FieldSlider name="volume" label="Громкость" showValue min={0} max={100} />
        <FieldRating name="rating" label="Оценка" count={5} />
        <FieldTags name="tags" label="Теги" placeholder="Enter — добавить" />
        <FieldPinInput name="pin" label="PIN-код" length={4} />
        <FieldAddress name="address" label="Адрес" provider={mockAddressProvider} minChars={1} />
        <FieldDateRange name="period" label="Период" presets={['today', 'thisWeek', 'thisMonth']} />

        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>
    </main>
  )
}
