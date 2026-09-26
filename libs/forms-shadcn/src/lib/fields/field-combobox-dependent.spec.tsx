import type { LoadContext } from '@letar/forms-core/uikit'
import { useDeclarativeForm } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FieldCombobox } from './field-combobox'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form не выводится из TData
type AnyForm = any

interface City {
  id: string
  name: string
}

/** Родитель — отрисованное поле: form-level листенер TanStack зовётся только у смонтированного `form.Field` */
function Mount({ names }: { names: string[] }) {
  const { form } = useDeclarativeForm()
  return <>{names.map((name) => <form.Field key={name} name={name}>{() => null}</form.Field>)}</>
}

function setup(defaults: Record<string, unknown>, ui: React.ReactElement) {
  let form!: AnyForm
  const utils = render(<TestForm defaultValues={defaults} onFormReady={(f) => (form = f)}>{ui}</TestForm>)
  return { form: () => form, ...utils }
}

const input = () => screen.getByRole('combobox') as HTMLInputElement
const hintNode = () => document.querySelector<HTMLElement>('[data-slot="dependent-hint"]')
const live = () => Array.from(document.querySelectorAll('[data-dependent-live]')).map((node) => node.textContent)

const CITY_PROPS = {
  debounce: 10,
  getLabel: (city: City) => city.name,
  getValue: (city: City) => city.id,
}

describe('FieldCombobox (shadcn) — зависимое поле (§18)', () => {
  it('DS5: родитель пуст — поле ввода заблокировано, подсказка видна и связана через aria-describedby', () => {
    const loadOptions = vi.fn(async () => [] as City[])
    setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldCombobox name="cityId" dependsOn="countryId" loadOptions={loadOptions} {...CITY_PROPS} />
      </>,
    )
    expect(input()).toBeDisabled()
    expect(input().placeholder).toBe('Сначала выберите «countryId»')
    const hint = hintNode()!
    expect(hint).toHaveTextContent('Сначала выберите «countryId»')
    expect(input().getAttribute('aria-describedby')).toBe(hint.id)
    expect(loadOptions).not.toHaveBeenCalled()
  })

  it('DS3: родитель выбран — разблокировано, loadOptions получает deps и signal', async () => {
    const loadOptions = vi.fn(async (_search: string, ctx: LoadContext) => [
      { id: 'c1', name: `Город ${String(ctx.deps.countryId)}` },
    ])
    const { form } = setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldCombobox name="cityId" dependsOn="countryId" loadOptions={loadOptions} minChars={0} {...CITY_PROPS} />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'RU'))
    expect(input()).not.toBeDisabled()
    expect(hintNode()).toBeNull()
    expect(input()).not.toHaveAttribute('aria-describedby')
    fireEvent.focus(input())
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1))
    expect(loadOptions).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ deps: { countryId: 'RU' }, signal: expect.any(AbortSignal) }),
    )
    fireEvent.click(await screen.findByRole('option', { name: 'Город RU' }))
    expect(form().state.values.cityId).toBe('c1')
    expect(input().value).toBe('Город RU')
  })

  it('DS4: смена родителя правкой очищает значение и подпись в поле ввода, объявляет очистку', async () => {
    const loadSelected = vi.fn(async () => ({ id: 'msk', name: 'Москва' }))
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId']} />
        <FieldCombobox
          name="cityId"
          label="Город"
          dependsOn="countryId"
          loadOptions={async () => []}
          loadSelected={loadSelected}
          {...CITY_PROPS}
        />
      </>,
    )
    await waitFor(() => expect(input().value).toBe('Москва'))
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(form().state.values.cityId).toBe('')
    await waitFor(() => expect(input().value).toBe(''))
    expect(live()).toEqual(['Поле «Город» очищено: изменилось поле «countryId»'])
    const meta = form().getFieldMeta('cityId')
    expect(meta?.isTouched ?? false).toBe(false)
  })

  it('DS7: initialValue с обоими — очистки нет, loadSelected получает deps', async () => {
    const loadSelected = vi.fn(async (_value: string, _ctx: LoadContext) => ({ id: 'msk', name: 'Москва' }))
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId']} />
        <FieldCombobox
          name="cityId"
          dependsOn="countryId"
          loadOptions={async () => []}
          loadSelected={loadSelected}
          {...CITY_PROPS}
        />
      </>,
    )
    await waitFor(() => expect(input().value).toBe('Москва'))
    expect(loadSelected).toHaveBeenCalledWith('msk', expect.objectContaining({ deps: { countryId: 'RU' } }))
    expect(form().state.values.cityId).toBe('msk')
    expect(live()).toEqual([''])
  })

  it('DS8: reset(values) не стирает ребёнка', () => {
    const { form } = setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldCombobox name="cityId" dependsOn="countryId" options={[{ label: 'Москва', value: 'msk' }]} />
      </>,
    )
    act(() => form().reset({ countryId: 'RU', cityId: 'msk' }))
    expect(form().state.values).toEqual({ countryId: 'RU', cityId: 'msk' })
    expect(live()).toEqual([''])
  })

  it('DS10: dependents.suppress — значение ребёнка не стирается', () => {
    let suppress!: <T>(fn: () => T) => T
    function Capture() {
      const { dependents } = useDeclarativeForm()
      useEffect(() => {
        suppress = dependents!.suppress
      }, [dependents])
      return null
    }
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Capture />
        <Mount names={['countryId']} />
        <FieldCombobox name="cityId" dependsOn="countryId" options={[{ label: 'Москва', value: 'msk' }]} />
      </>,
    )
    act(() => suppress(() => form().setFieldValue('countryId', 'DE')))
    expect(form().state.values.cityId).toBe('msk')
  })

  it('DS12: A → B → C — signal A и B отменены, на экране опции C; размонтирование отменяет запрос', async () => {
    const signals: AbortSignal[] = []
    const loadOptions = vi.fn((_search: string, ctx: LoadContext) => {
      signals.push(ctx.signal)
      return Promise.resolve([{ id: 'x', name: `Город ${String(ctx.deps.countryId)}` }])
    })
    const { form, unmount } = setup(
      { countryId: 'A', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldCombobox name="cityId" dependsOn="countryId" loadOptions={loadOptions} minChars={0} {...CITY_PROPS} />
      </>,
    )
    fireEvent.focus(input())
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1))
    act(() => form().setFieldValue('countryId', 'B'))
    act(() => form().setFieldValue('countryId', 'C'))
    await waitFor(() => expect(screen.getByRole('option', { name: 'Город C' })).toBeInTheDocument())
    expect(screen.queryByRole('option', { name: 'Город A' })).toBeNull()
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[signals.length - 1]!.aborted).toBe(false)
    unmount()
    expect(signals[signals.length - 1]!.aborted).toBe(true)
  })

  it('DS18: без dependsOn — ни live-области, ни подсказки, ни aria-describedby', () => {
    setup({ cityId: '' }, <FieldCombobox name="cityId" options={[{ label: 'Москва', value: 'msk' }]} />)
    expect(document.querySelector('[data-dependent-live]')).toBeNull()
    expect(hintNode()).toBeNull()
    expect(input()).not.toHaveAttribute('aria-describedby')
    expect(input()).not.toBeDisabled()
  })
})
