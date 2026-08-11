'use client'

import type { AddressProvider } from '@letar/forms-core/address'
import type { WeeklySchedule } from '@letar/forms-shadcn'
import {
  FieldAddress,
  FieldAutocomplete,
  FieldCascadingSelect,
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
  FieldImageChoice,
  FieldLikert,
  FieldListbox,
  FieldNativeSelect,
  FieldNumber,
  FieldNumberInput,
  FieldOTPInput,
  FieldPassword,
  FieldPasswordStrength,
  FieldPercentage,
  FieldPhone,
  FieldPinInput,
  FieldRadioCard,
  FieldRadioGroup,
  FieldRating,
  FieldRichText,
  FieldSchedule,
  FieldSegmentGroup,
  FieldSelect,
  FieldSignature,
  FieldSlider,
  FieldString,
  FieldSwitch,
  FieldTableEditor,
  FieldTags,
  FieldTextarea,
  FieldTime,
  FieldYesNo,
  FormSteps,
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
  newsletterConsent: boolean | undefined
  stock: number | undefined
  strongPassword: string
  openingTime: string
  shippingCountry: string
  shippingCity: string
  productStyle: string
  npsScore: number | undefined
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
  newsletterConsent: undefined,
  stock: 10,
  strongPassword: '',
  openingTime: '09:00',
  shippingCountry: '',
  shippingCity: '',
  productStyle: '',
  npsScore: undefined,
}

const imageChoiceOptions = [
  { value: 'modern', label: 'Современный', image: 'https://placehold.co/200x120?text=Modern' },
  {
    value: 'classic',
    label: 'Классический',
    image: 'https://placehold.co/200x120?text=Classic',
    description: 'Строгие линии',
  },
]

const shippingCountryOptions = [
  { label: 'Россия', value: 'ru' },
  { label: 'Казахстан', value: 'kz' },
]

const CITIES_BY_COUNTRY: Record<string, { label: string; value: string }[]> = {
  ru: [{ label: 'Москва', value: 'msk' }, { label: 'Казань', value: 'kzn' }],
  kz: [{ label: 'Алматы', value: 'alm' }, { label: 'Астана', value: 'ast' }],
}

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Form Develop App (shadcn)</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Песочница для разработки @letar/forms-shadcn — 44 поля, Фаза 7.3 Шаг 5+.
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
        <FieldYesNo name="newsletterConsent" label="Подписаться на рассылку?" variant="thumbs" />
        <FieldNumberInput name="stock" label="Остаток на складе" min={0} max={999} />
        <FieldPasswordStrength name="strongPassword" label="Новый пароль" />
        <FieldTime name="openingTime" label="Время открытия" min="06:00" max="23:00" />
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
        <FieldImageChoice name="productStyle" label="Стиль товара" options={imageChoiceOptions} columns={2} />
        <FieldLikert
          name="npsScore"
          label="Насколько вы довольны сервисом?"
          anchors={['Совсем не доволен', 'Не доволен', 'Нейтрально', 'Доволен', 'Полностью доволен']}
          showNumbers
        />

        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>

      <h2 className="mt-16 text-xl font-semibold">FormSteps (beta, отдельная форма)</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Compound-компонент форм-уровня, не Field — изолированная песочница, не завязана на поля выше.
      </p>
      <DemoForm<{ firstName: string; email: string }>
        defaultValues={{ firstName: '', email: '' }}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('steps submit', value)
        }}
      >
        <FormSteps>
          <FormSteps.Indicator showDescriptions />
          <FormSteps.Step title="Личное" description="Как к вам обращаться">
            <FieldString name="firstName" label="Имя" required />
          </FormSteps.Step>
          <FormSteps.Step title="Контакты" description="Как с вами связаться">
            <FieldString name="email" label="Email" type="email" />
          </FormSteps.Step>
          <FormSteps.CompletedContent>
            <p className="text-sm">Все шаги пройдены — можно отправлять.</p>
          </FormSteps.CompletedContent>
          <FormSteps.Navigation />
        </FormSteps>
      </DemoForm>

      <h2 className="mt-16 text-xl font-semibold">FieldTableEditor (beta, отдельная форма)</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Не `createField()`-поле, компонует `form.Field(mode=&quot;array&quot;)` напрямую — изолированная песочница со
        своим array-полем `items`. `sortable` — native HTML5 drag&amp;drop (без `@dnd-kit`, beta- упрощение).
      </p>
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

      <h2 className="mt-16 text-xl font-semibold">FieldRichText (beta, отдельная форма)</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Tiptap WYSIWYG-редактор — изолированная песочница, без интеграции с полями выше. Без вставки изображений (нужен
        upload endpoint) — кнопка «Ссылка» использует <code>window.prompt</code>.
      </p>
      <DemoForm<{ content: string }>
        defaultValues={{ content: '<p>Начальный <strong>текст</strong> с <em>форматированием</em>.</p>' }}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('richtext submit', value)
        }}
      >
        <FieldRichText name="content" label="Содержимое" minHeight="180px" />

        <button
          type="submit"
          className="bg-primary text-primary-foreground mt-4 rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>

      <h2 className="mt-16 text-xl font-semibold">FieldSchedule (beta, отдельная форма)</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Редактор недельного расписания — изолированная песочница, значение объектное (`WeeklySchedule`), не завязана на
        поля выше.
      </p>
      <DemoForm<{ hours: WeeklySchedule }>
        defaultValues={{
          hours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: null,
            sunday: null,
          },
        }}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('schedule submit', value)
        }}
      >
        <FieldSchedule name="hours" label="Часы работы" />

        <button
          type="submit"
          className="bg-primary text-primary-foreground mt-4 rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>
    </main>
  )
}
