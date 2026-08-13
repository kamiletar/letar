import Link from 'next/link'

const demoLinks: { href: string; label: string; description: string }[] = [
  {
    href: '/basic-fields-demo',
    label: 'Базовые поля',
    description: 'String, Textarea, Number, Password, Checkbox, Switch',
  },
  { href: '/select-demo', label: 'Select-поля', description: 'Select, NativeSelect, Combobox, CascadingSelect' },
  {
    href: '/choice-demo',
    label: 'Поля выбора',
    description: 'RadioGroup, SegmentGroup, RadioCard, CheckboxCard, Listbox',
  },
  { href: '/date-time-demo', label: 'Дата и время', description: 'Date, DateRange, Duration, DateTimePicker, Time' },
  { href: '/numeric-demo', label: 'Числовые поля', description: 'Currency, Percentage, NumberInput, Calculated' },
  { href: '/interactive-demo', label: 'Интерактивные поля', description: 'Slider, Rating, Tags, PinInput' },
  { href: '/contact-demo', label: 'Контактные поля', description: 'Phone, Address, Autocomplete, City' },
  {
    href: '/specialized-demo',
    label: 'Специализированные поля',
    description: 'Editable, ColorPicker, FileUpload, Signature',
  },
  { href: '/auth-fields-demo', label: 'Аутентификация', description: 'OTPInput, YesNo, PasswordStrength' },
  { href: '/survey-demo', label: 'Поля опросов', description: 'ImageChoice, Likert, MatrixChoice' },
  { href: '/steps-demo', label: 'FormSteps (beta)', description: 'Многошаговая форма' },
  { href: '/table-editor-demo', label: 'FieldTableEditor (beta)', description: 'Инлайн-таблица для массивов' },
  { href: '/rich-text-demo', label: 'FieldRichText (beta)', description: 'Tiptap WYSIWYG-редактор' },
  { href: '/schedule-demo', label: 'FieldSchedule (beta)', description: 'Недельное расписание' },
  {
    href: '/data-grid-demo',
    label: 'FieldDataGrid (beta)',
    description: '@tanstack/react-table, сортировка/фильтр/CSV',
  },
  { href: '/auto-fields-demo', label: 'FieldAuto (beta)', description: 'Автоопределение типа поля из Zod-схемы' },
]

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Form Develop App (shadcn)</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Песочница для разработки @letar/forms-shadcn — 47 из 56 полей портировано (9 в backlog: MaskedInput, CreditCard,
        7 document-полей — ждут исследовательскую сессию по замене use-mask-input). Одна страница = один пример,
        сгруппированные по смыслу поля — для чтения-с-диска документацией form-docs (Этап 0, Фаза 9 P7).
      </p>

      <ul className="mt-8 space-y-3">
        {demoLinks.map(({ href, label, description }) => (
          <li key={href}>
            <Link href={href} className="block rounded-md border p-4 hover:bg-accent">
              <span className="font-medium">{label}</span>
              <span className="text-muted-foreground mt-1 block text-sm">{description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
