'use client'

import type { AddressProvider } from '@letar/forms-core/address'
import {
  FieldAddress,
  FieldAutocomplete,
  FieldCheckbox,
  FieldCheckboxCard,
  FieldCity,
  FieldColorPicker,
  FieldCombobox,
  FieldCurrency,
  FieldDate,
  FieldDateRange,
  FieldDateTimePicker,
  FieldDuration,
  FieldEditable,
  FieldFileUpload,
  FieldHidden,
  FieldListbox,
  FieldNativeSelect,
  FieldNumber,
  FieldOTPInput,
  FieldPassword,
  FieldPercentage,
  FieldPhone,
  FieldPinInput,
  FieldRadioCard,
  FieldRadioGroup,
  FieldRating,
  FieldSegmentGroup,
  FieldSelect,
  FieldSignature,
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
  duration: number
  appointmentAt: string
  phone: string
  price: number
  discount: number
  city: string
  features: string[]
  plan: string
  addons: string[]
  cityDadata: string
  bio2: string
  brandColor: string
  smsCode: string
  signature: string
  attachments: File[]
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
  address: 'г Москва, ул Тверская, д 1',
  period: { start: '', end: '' },
  duration: 90,
  appointmentAt: '',
  phone: '',
  price: 1500,
  discount: 15,
  city: '',
  features: [],
  plan: '',
  addons: [],
  cityDadata: 'Казань',
  bio2: 'Кликните для редактирования',
  brandColor: '#4299E1',
  smsCode: '',
  signature: '',
  attachments: [],
}

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Form Develop App (shadcn)</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Песочница для разработки @letar/forms-shadcn — 34 поля, Фаза 7.3 Шаг 5+.
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
        <FieldDuration name="duration" label="Длительность" />
        <FieldDateTimePicker name="appointmentAt" label="Встреча" />
        <FieldPhone name="phone" label="Телефон" showFlag />
        <FieldCurrency name="price" label="Цена" />
        <FieldPercentage name="discount" label="Скидка" />
        <FieldAutocomplete
          name="city"
          label="Город"
          suggestions={['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск']}
        />
        <FieldListbox
          name="features"
          label="Особенности"
          selectionMode="multiple"
          options={[
            { label: 'TypeScript', value: 'ts', group: 'Frontend' },
            { label: 'React', value: 'react', group: 'Frontend' },
            { label: 'Python', value: 'py', group: 'Backend' },
          ]}
        />
        <FieldRadioCard
          name="plan"
          label="Тариф"
          options={[
            { label: 'Free', value: 'free', description: 'Базовые функции' },
            { label: 'Pro', value: 'pro', description: 'Все функции' },
          ]}
        />
        <FieldCheckboxCard
          name="addons"
          label="Дополнения"
          options={[
            { label: 'SSL', value: 'ssl', description: 'HTTPS-сертификат' },
            { label: 'Backup', value: 'backup', description: 'Автобэкапы' },
          ]}
        />
        <FieldCity name="cityDadata" label="Город (DaData)" provider={mockAddressProvider} minChars={1} />
        <FieldEditable name="bio2" label="Кликабельный текст" />
        <FieldColorPicker name="brandColor" label="Цвет бренда" />
        <FieldSignature name="signature" label="Подпись" width={320} height={120} />
        <FieldFileUpload
          name="attachments"
          label="Вложения"
          variant="dropzone"
          maxFiles={3}
          showSize
          dropzoneDescription="До 3 файлов"
        />
        <FieldOTPInput
          name="smsCode"
          label="SMS-код"
          onResend={async () => {
            // eslint-disable-next-line no-console
            console.log('resend otp')
          }}
        />

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
