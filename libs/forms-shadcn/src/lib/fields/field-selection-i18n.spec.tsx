import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { FieldAutocomplete } from './field-autocomplete'
import { FieldCombobox } from './field-combobox'
import { FieldSelect } from './field-select'

/**
 * Встроенные строки Select/Combobox shadcn-скина идут через общий словарь `formSelection.*` (`@letar/forms-react`):
 * без провайдера — русский (прежнее поведение скина), `locale="en"` — английский, `t` приложения сильнее словаря.
 */

const options = Array.from({ length: 12 }, (_, i) => ({ label: `Город ${i}`, value: `v${i}` }))
const schema = z.object({ cat: z.string().nullable() })

beforeAll(() => {
  // Radix опирается на API указателя и прокрутки, которых нет в jsdom
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

function renderField(field: ReactNode, i18n?: { locale: string; t?: (key: string) => string }, initial = 'v3') {
  const form = (
    <TestForm defaultValues={{ cat: initial as string | null }} schema={schema}>
      {field}
    </TestForm>
  )
  render(i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form)
}

const select = (props: Record<string, unknown> = {}) => (
  <FieldSelect name="cat" options={options} placeholder="Категория" {...props} />
)
const combobox = (props: Record<string, unknown> = {}) => <FieldCombobox name="cat" options={options} {...props} />

describe('Select (shadcn) — строки через i18n', () => {
  it('без провайдера: русский — поиск, очистка, пустой результат', async () => {
    renderField(select())
    expect(screen.getByRole('button', { name: 'Очистить' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox'))
    const search = await screen.findByRole('searchbox')
    expect(search).toHaveAttribute('placeholder', 'Поиск...')
    expect(search).toHaveAccessibleName('Поиск по списку')
    await userEvent.type(search, 'яяя')
    expect(await screen.findByText('Ничего не найдено')).toBeInTheDocument()
  })

  it('locale="en": английские строки, как у Chakra', async () => {
    renderField(select(), { locale: 'en' })
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox'))
    const search = await screen.findByRole('searchbox')
    expect(search).toHaveAttribute('placeholder', 'Search...')
    expect(search).toHaveAccessibleName('Search options')
    await userEvent.type(search, 'яяя')
    expect(await screen.findByText('Nothing found')).toBeInTheDocument()
  })

  it('locale="ru" с провайдером: словарь по-русски', async () => {
    renderField(select(), { locale: 'ru' })
    expect(screen.getByRole('button', { name: 'Очистить' })).toBeInTheDocument()
  })

  it('t приложения переопределяет словарь по ключу', async () => {
    const t = (key: string) => key === 'formSelection.search.placeholder' ? 'Найти город' : key
    renderField(select(), { locale: 'en', t })
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByRole('searchbox')).toHaveAttribute('placeholder', 'Найти город')
  })

  it('пункт создания: глагол по локали («+ Add "Тула"» / «+ Добавить "Тула"»)', async () => {
    const onCreate = vi.fn()
    renderField(select({ onCreate }), { locale: 'en' })
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.type(await screen.findByRole('searchbox'), 'Тула')
    expect(await screen.findByRole('option', { name: '+ Add "Тула"' })).toBeInTheDocument()
  })

  it('пункт создания без запроса: «+ Добавить…» без провайдера', async () => {
    renderField(select({ onCreate: vi.fn() }))
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByRole('option', { name: '+ Добавить…' })).toBeInTheDocument()
  })

  it('свой createLabel сильнее словаря', async () => {
    renderField(select({ onCreate: vi.fn(), createLabel: 'Завести' }), { locale: 'en' })
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByRole('option', { name: '+ Завести' })).toBeInTheDocument()
  })

  it('«Загрузка...» / «Loading...» в списке при loading', async () => {
    const loadOptions = () => new Promise<{ id: string; name: string }[]>(() => {})
    renderField(
      select({
        options: undefined,
        loadOptions,
        getValue: (o: { id: string }) => o.id,
        getLabel: (o: { name: string }) => o.name,
      }),
      { locale: 'en' },
      '',
    )
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByText('Loading...')).toBeInTheDocument()
  })
})

describe('Combobox (shadcn) — строки через i18n', () => {
  it('без провайдера: русский — placeholder, очистка, пустой результат, загрузка', async () => {
    renderField(combobox())
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Поиск...')
    expect(screen.getByRole('button', { name: 'Очистить' })).toBeInTheDocument()
  })

  it('locale="en": английские строки', async () => {
    renderField(combobox(), { locale: 'en' }, '')
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Search...')
    await userEvent.type(screen.getByRole('combobox'), 'яяя')
    expect(await screen.findByText('Nothing found')).toBeInTheDocument()
  })

  it('clear и loading по локали', async () => {
    renderField(combobox({ options: [], loading: true }), { locale: 'en' })
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox'))
    expect(await screen.findByText('Loading...')).toBeInTheDocument()
  })

  it('пункт создания: «+ Add "Тула"» по локали', async () => {
    renderField(combobox({ onCreate: vi.fn() }), { locale: 'en' }, '')
    await userEvent.type(screen.getByRole('combobox'), 'Тула')
    expect(await screen.findByRole('option', { name: '+ Add "Тула"' })).toBeInTheDocument()
  })

  it('без провайдера пункт создания русский', async () => {
    renderField(combobox({ onCreate: vi.fn() }), undefined, '')
    await userEvent.type(screen.getByRole('combobox'), 'Тула')
    expect(await screen.findByRole('option', { name: '+ Добавить "Тула"' })).toBeInTheDocument()
  })
})

describe('Autocomplete (shadcn) — placeholder через i18n', () => {
  function renderAutocomplete(i18n?: { locale: string; t?: (key: string) => string }) {
    const form = (
      <TestForm defaultValues={{ city: '' }}>
        <FieldAutocomplete name="city" suggestions={['Moscow', 'Kazan']} />
      </TestForm>
    )
    render(i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form)
  }

  it('без провайдера: русский', () => {
    renderAutocomplete()
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Начните вводить...')
  })

  it('locale="en": английский, как у Chakra', () => {
    renderAutocomplete({ locale: 'en' })
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Start typing...')
  })

  it('t приложения переопределяет словарь по ключу', () => {
    const t = (key: string) => key === 'formSelection.autocomplete.placeholder' ? 'Введите город' : key
    renderAutocomplete({ locale: 'en', t })
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Введите город')
  })
})
