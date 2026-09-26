import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import type { FieldDeps } from '@letar/forms-core/uikit'
import { FormI18nProvider } from '@letar/forms-react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ReactNode, type RefObject } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { Form } from '../'
import type { AppFormApi } from '../types'

// Корень формы и зависимые поля (этап З, §18): DS8, DS9, DS11

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>
    <FormI18nProvider locale="ru">{children}</FormI18nProvider>
  </ChakraProvider>
)

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

interface Option {
  label: string
  value: string
}

const countries: Option[] = [
  { label: 'Россия', value: 'RU' },
  { label: 'Германия', value: 'DE' },
  { label: 'Франция', value: 'FR' },
]

const citiesByCountry: Record<string, Option[]> = {
  RU: [{ label: 'Москва', value: 'msk' }, { label: 'Казань', value: 'kzn' }],
  DE: [{ label: 'Берлин', value: 'ber' }],
  FR: [{ label: 'Париж', value: 'par' }],
}

const cityOptions = (deps: FieldDeps): Option[] => citiesByCountry[String(deps.countryId)] ?? []

const formRef: RefObject<AppFormApi | null> = createRef<AppFormApi | null>()
const values = () => formRef.current!.state.values as Record<string, unknown>

const DRAFT_KEY = 'dependent-fields-root-draft'
const STORAGE_KEY = `form-persistence:${DRAFT_KEY}`

describe('корень формы: зависимые поля и черновик (DS9)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('восстановление черновика записывает родителя и ребёнка целиком — ребёнок не стирается, даже если стоит раньше родителя в данных', async () => {
    // Ребёнок раньше родителя в порядке ключей: setFieldValue(cityId), затем setFieldValue(countryId)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ data: { cityId: 'msk', countryId: 'RU' }, savedAt: Date.now(), version: 1 }),
    )
    render(
      <TestWrapper>
        <Form
          initialValue={{ countryId: '', cityId: '' }}
          persistence={{ key: DRAFT_KEY, debounceMs: 0 }}
          onSubmit={vi.fn()}
          formRef={formRef}
        >
          <Form.Field.Select name="countryId" label="Страна" options={countries} />
          <Form.Field.Select name="cityId" label="Город" dependsOn="countryId" options={cityOptions} />
        </Form>
      </TestWrapper>,
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Восстановить' }))

    await waitFor(() => expect(values().countryId).toBe('RU'))
    expect(values().cityId).toBe('msk')
    // Дождёмся тика markRestoreComplete и повторных рендеров: значение остаётся
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(values().cityId).toBe('msk')

    // После восстановления зависимость работает как обычно: правка родителя очищает ребёнка
    act(() => formRef.current!.setFieldValue('countryId', 'DE'))
    await waitFor(() => expect(values().cityId).toBe(''))
  })
})

describe('корень формы: перерисовка и reset (DS8)', () => {
  it('reset(values) и новый initialValue с обоими полями не очищают ребёнка', async () => {
    const tree = (initial: Record<string, string>) => (
      <TestWrapper>
        <Form initialValue={initial} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Select name="countryId" label="Страна" options={countries} />
          <Form.Field.Select name="cityId" label="Город" dependsOn="countryId" options={cityOptions} />
        </Form>
      </TestWrapper>
    )
    const { rerender } = render(tree({ countryId: 'RU', cityId: 'msk' }))

    rerender(tree({ countryId: 'DE', cityId: 'ber' }))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(values()).toMatchObject({ countryId: 'DE', cityId: 'ber' })

    act(() => formRef.current!.reset({ countryId: 'FR', cityId: 'par' }))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(values()).toMatchObject({ countryId: 'FR', cityId: 'par' })
  })
})

describe('Form.Group.List: dependsOn внутри строк (DS11)', () => {
  const schema = z.object({
    countryId: z.string().meta({ ui: { title: 'Страна' } }),
    items: z.array(z.object({ regionId: z.string(), cityId: z.string(), districtId: z.string() })),
  })

  const row = (regionId: string, cityId: string, districtId = '') => ({ regionId, cityId, districtId })

  const renderList = (initial: Record<string, unknown>) =>
    render(
      <TestWrapper>
        <Form initialValue={initial} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Select name="countryId" label="Страна" options={countries} />
          <Form.Group.List name="items">
            <Form.Field.Select name="regionId" label="Регион" options={countries} />
            <Form.Field.Select
              name="cityId"
              label="Город"
              dependsOn="regionId"
              options={(deps) => citiesByCountry[String(deps.regionId)] ?? []}
            />
            <Form.Field.Select name="districtId" label="Район" dependsOn="/countryId" options={cityOptions} />
          </Form.Group.List>
        </Form>
      </TestWrapper>,
    )

  const items = () => values().items as Array<Record<string, string>>

  it('правка родителя в строке очищает город только этой строки', async () => {
    renderList({ countryId: 'RU', items: [row('RU', 'msk'), row('DE', 'ber')] })
    await waitFor(() => expect(screen.getAllByText('Город')).toHaveLength(2))

    act(() => formRef.current!.setFieldValue('items.1.regionId', 'FR'))

    await waitFor(() => expect(items()[1]!.cityId).toBe(''))
    expect(items()[0]!.cityId).toBe('msk')
  })

  it('«/countryId» из строки: правка корневого поля очищает зависимое поле каждой строки', async () => {
    renderList({ countryId: 'RU', items: [row('RU', 'msk', 'kzn'), row('DE', 'ber', 'msk')] })
    await waitFor(() => expect(screen.getAllByText('Район')).toHaveLength(2))

    act(() => formRef.current!.setFieldValue('countryId', 'FR'))

    await waitFor(() => {
      expect(items()[0]!.districtId).toBe('')
      expect(items()[1]!.districtId).toBe('')
    })
    // города зависят от региона строки, а не от страны — не тронуты
    expect(items()[0]!.cityId).toBe('msk')
    expect(items()[1]!.cityId).toBe('ber')
  })

  it('перестановка и удаление строк не стирают значения городов', async () => {
    renderList({ countryId: 'RU', items: [row('RU', 'msk'), row('DE', 'ber'), row('FR', 'par')] })
    await waitFor(() => expect(screen.getAllByText('Город')).toHaveLength(3))

    act(() => formRef.current!.moveFieldValues('items', 0, 2))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(items().map((item) => [item.regionId, item.cityId])).toEqual([['DE', 'ber'], ['FR', 'par'], ['RU', 'msk']])

    act(() => formRef.current!.removeFieldValue('items', 0))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(items().map((item) => [item.regionId, item.cityId])).toEqual([['FR', 'par'], ['RU', 'msk']])
  })
})
