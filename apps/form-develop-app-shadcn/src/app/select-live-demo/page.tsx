'use client'

import { DeclarativeFormContext } from '@letar/forms-react'
import { FieldCombobox, FieldSelect } from '@letar/forms-shadcn'
import { useStore } from '@tanstack/react-form'
import { useContext, useState } from 'react'
import { z } from 'zod/v4'

import { DemoForm, DemoPageLayout } from '../_components'

/**
 * Живая проверка shadcn-скина Select/Combobox: вторая строка опции (`description`), правка записи (`onUpdate`),
 * оптимистичные `onCreate`/`onUpdate` (медленный ответ, отказ), зависимые поля (`dependsOn`), очистка nullable → `null`.
 * Образец — страницы Chakra-приложения `form-develop-app` (`create-option-demo`, `edit-option-demo`, `dependent-select-demo`).
 */

const LiveSchema = z
  .object({
    city: z.string().nullable(),
    cityCombo: z.string().nullable(),
    userLoaded: z.string().nullable(),
    edited: z.string(),
    editedCombo: z.string(),
    created: z.string(),
    country: z.string().nullable(),
    town: z.string().nullable(),
    townCombo: z.string().nullable(),
  })
  .strip()

type LiveValues = z.infer<typeof LiveSchema>

const defaultValues: LiveValues = {
  city: null,
  cityCombo: null,
  userLoaded: null,
  edited: 'w1',
  editedCombo: '',
  created: 'react',
  country: null,
  town: null,
  townCombo: null,
}

const cityOptions = [
  { value: 'msk', label: 'Москва', description: 'ул. Тверская, 1' },
  { value: 'kzn', label: 'Казань', description: 'ул. Баумана, 5' },
  { value: 'spb', label: 'Санкт-Петербург' },
]

interface User {
  id: string
  name: string
  email: string
}

const users: User[] = [
  { id: 'u1', name: 'Анна', email: 'anna@example.test' },
  { id: 'u2', name: 'Борис', email: 'boris@example.test' },
]

const records = [
  { value: 'w1', label: 'Кровля' },
  { value: 'w2', label: 'Фасад' },
  { value: 'w3', label: 'Системная запись', editable: false },
]

const frameworks = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
]

const townsByCountry: Record<string, { value: string; label: string }[]> = {
  ru: [{ value: 'msk', label: 'Москва' }, { value: 'kzn', label: 'Казань' }],
  kz: [{ value: 'alm', label: 'Алматы' }, { value: 'ast', label: 'Астана' }],
}

const countryOptions = [{ value: 'ru', label: 'Россия' }, { value: 'kz', label: 'Казахстан' }]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Mode = 'ok' | 'slow' | 'fail'

/** Значения формы вживую — для проверки `null` при очистке и очистки дочернего поля */
function LiveValuesView() {
  const ctx = useContext(DeclarativeFormContext)
  const values = useStore(ctx!.form.store, (state: { values: unknown }) => state.values)
  return (
    <pre data-testid="live-values" className="bg-muted rounded-md p-3 text-xs">
      {JSON.stringify(values, null, 2)}
    </pre>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-md border p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm">{hint}</p>
      {children}
    </section>
  )
}

export default function SelectLiveDemoPage() {
  const [mode, setMode] = useState<Mode>('ok')
  const [townLoads, setTownLoads] = useState(0)

  return (
    <DemoPageLayout
      title="Select/Combobox — живая проверка"
      description="description, onUpdate, оптимистичные onCreate/onUpdate, dependsOn, null при очистке (shadcn-скин)"
    >
      <DemoForm<LiveValues> defaultValues={defaultValues} schema={LiveSchema}>
        <Section
          title="1. description — вторая строка опции"
          hint="Только в списке: не в кнопке и не в поле после выбора. Combobox ищет и по описанию («тверск»)."
        >
          <FieldSelect name="city" label="Select" options={cityOptions} placeholder="Выберите город" clearable />
          <FieldCombobox name="cityCombo" label="Combobox (статичные)" options={cityOptions} />
          <FieldCombobox
            name="userLoaded"
            label="Combobox (loadOptions + getDescription)"
            loadOptions={async (search) => {
              await sleep(200)
              return users.filter((u) => u.name.toLowerCase().includes(search.trim().toLowerCase()))
            }}
            getLabel={(u: User) => u.name}
            getValue={(u: User) => u.id}
            getDescription={(u: User) => u.email}
            minChars={0}
          />
        </Section>

        <Section
          title="2. onUpdate — карандаш и F2"
          hint="Карандаш у пункта и у значения; F2 на открытом списке и на закрытом поле. «Системная запись» — editable: false."
        >
          <FieldSelect
            name="edited"
            label="Select"
            options={records}
            onUpdate={async (option) => {
              await sleep(300)
              return { label: `${String(option.label)} ✎`, value: option.value }
            }}
          />
          <FieldCombobox
            name="editedCombo"
            label="Combobox"
            options={records}
            onUpdate={async (option) => {
              await sleep(300)
              return { label: `${String(option.label)} ✎`, value: option.value }
            }}
          />
        </Section>

        <Section
          title="3. Оптимистичные onCreate/onUpdate"
          hint="Режим ответа сервера: ok — сразу, slow — 3 с, fail — отказ через 1,5 с (откат и сообщение)."
        >
          <div role="group" aria-label="Режим сервера" className="flex gap-2">
            {(['ok', 'slow', 'fail'] as const).map((item) => (
              <button
                key={item}
                type="button"
                data-testid={`mode-${item}`}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
                className={`rounded-md border px-3 py-1 text-sm ${mode === item ? 'bg-accent font-medium' : ''}`}
              >
                {item}
              </button>
            ))}
          </div>
          <FieldSelect
            name="created"
            label="Select: «+ Добавить…» и правка"
            options={frameworks}
            createLabel="Добавить фреймворк…"
            onCreate={async (_search, ctx) => {
              ctx.optimistic({ label: 'Solid' })
              await sleep(mode === 'slow' ? 3000 : mode === 'fail' ? 1500 : 100)
              return mode === 'fail' ? null : { label: 'Solid', value: 'solid' }
            }}
            onUpdate={async (option, ctx) => {
              ctx.optimistic({ label: `${String(option.label)} (правка)` })
              await sleep(mode === 'slow' ? 3000 : mode === 'fail' ? 1500 : 100)
              return mode === 'fail' ? null : { label: `${String(option.label)} (правка)`, value: option.value }
            }}
          />
        </Section>

        <Section
          title="4. dependsOn"
          hint="Пока страна пуста — город заблокирован с подсказкой. Дочернее поле очищается только по правке родителя."
        >
          <FieldSelect name="country" label="Страна" options={countryOptions} placeholder="Страна" clearable />
          <FieldSelect
            name="town"
            label="Город (Select, options(deps))"
            dependsOn="country"
            options={(deps) => townsByCountry[String(deps.country)] ?? []}
            clearable
          />
          <FieldCombobox
            name="townCombo"
            label="Город (Combobox, loadOptions(deps))"
            dependsOn="country"
            minChars={0}
            loadOptions={async (search, { deps }) => {
              setTownLoads((count) => count + 1)
              await sleep(150)
              const list = townsByCountry[String(deps.country)] ?? []
              return list.filter((t) => t.label.toLowerCase().includes(search.trim().toLowerCase()))
            }}
            getLabel={(t: { value: string; label: string }) => t.label}
            getValue={(t: { value: string; label: string }) => t.value}
          />
          <p data-testid="town-loads" className="text-muted-foreground text-xs">Загрузок городов: {townLoads}</p>
        </Section>

        <Section title="5. Значения формы вживую" hint="Очистка nullable-поля пишет null, а не пустую строку.">
          <LiveValuesView />
        </Section>
      </DemoForm>
    </DemoPageLayout>
  )
}
