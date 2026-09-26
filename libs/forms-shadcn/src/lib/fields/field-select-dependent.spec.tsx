import type { FieldDeps, LoadContext } from '@letar/forms-core/uikit'
import { useDeclarativeForm } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { act, render, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { FieldSelect } from './field-select'

beforeAll(() => {
  // Radix Select опирается на API указателя и прокрутки, которых нет в jsdom
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form не выводится из TData
type AnyForm = any

interface City {
  id: string
  name: string
}

/**
 * Живое поле формы: TanStack зовёт form-level листенер только у смонтированного `form.Field` — как в настоящей
 * форме, где родитель это отрисованное поле.
 */
function Mount({ names }: { names: string[] }) {
  const { form } = useDeclarativeForm()
  return <>{names.map((name) => <form.Field key={name} name={name}>{() => null}</form.Field>)}</>
}

function setup(defaults: Record<string, unknown>, ui: React.ReactElement) {
  let form!: AnyForm
  const utils = render(<TestForm defaultValues={defaults} onFormReady={(f) => (form = f)}>{ui}</TestForm>)
  return { form: () => form, ...utils }
}

const trigger = (name: string) => document.querySelector<HTMLButtonElement>(`[data-field-name="${name}"]`)!
const hintNode = () => document.querySelector<HTMLElement>('[data-slot="dependent-hint"]')
const live = () => Array.from(document.querySelectorAll('[data-dependent-live]')).map((node) => node.textContent)

const CITY_PROPS = {
  getLabel: (city: City) => city.name,
  getValue: (city: City) => city.id,
}

describe('FieldSelect (shadcn) — зависимое поле (§18)', () => {
  it('DS3: родитель пуст — поле заблокировано, видна подсказка и она связана с триггером через aria-describedby', () => {
    setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" options={() => []} />
      </>,
    )
    expect(trigger('cityId')).toBeDisabled()
    const hint = hintNode()!
    expect(hint).toHaveTextContent('Сначала выберите «countryId»')
    expect(hint).toBeVisible()
    expect(trigger('cityId').getAttribute('aria-describedby')).toBe(hint.id)
    // В заблокированном триггере — тот же текст вместо placeholder
    expect(trigger('cityId')).toHaveTextContent('Сначала выберите «countryId»')
  })

  it('placeholderWhenDisabled заменяет текст в триггере, подсказка под полем остаётся', () => {
    setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" options={[]} placeholderWhenDisabled="Страна не выбрана" />
      </>,
    )
    expect(trigger('cityId')).toHaveTextContent('Страна не выбрана')
    expect(hintNode()).toHaveTextContent('Сначала выберите «countryId»')
  })

  it('DS3: родитель выбран — поле разблокировано, подсказки нет, значение ребёнка не тронуто', () => {
    const { form } = setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" options={[{ label: 'Москва', value: 'msk' }]} />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'RU'))
    expect(trigger('cityId')).not.toBeDisabled()
    expect(hintNode()).toBeNull()
    expect(trigger('cityId')).not.toHaveAttribute('aria-describedby')
    expect(form().state.values.cityId).toBe('')
  })

  it('DS16: options функцией от deps: не вызывается, пока родитель пуст; отдаёт отфильтрованный список', () => {
    const byCountry = vi.fn((deps: FieldDeps) => deps.countryId === 'RU' ? [{ label: 'Москва', value: 'msk' }] : [])
    const { form } = setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" options={byCountry} />
      </>,
    )
    expect(byCountry).not.toHaveBeenCalled()
    act(() => form().setFieldValue('countryId', 'RU'))
    expect(byCountry).toHaveBeenCalledWith({ countryId: 'RU' })
    act(() => form().setFieldValue('cityId', 'msk'))
    expect(trigger('cityId')).toHaveTextContent('Москва')
  })

  it('DS16: loadOptions — разово на depsKey, search пустой, deps и signal в контексте; без родителя запроса нет', async () => {
    const loadOptions = vi.fn(async (_search: string, ctx: LoadContext) => [
      { id: `${String(ctx.deps.countryId)}-1`, name: `Город ${String(ctx.deps.countryId)}` },
    ])
    const { form } = setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" loadOptions={loadOptions} {...CITY_PROPS} />
      </>,
    )
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(loadOptions).not.toHaveBeenCalled()
    act(() => form().setFieldValue('countryId', 'RU'))
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1))
    expect(loadOptions).toHaveBeenCalledWith(
      '',
      expect.objectContaining({ deps: { countryId: 'RU' }, signal: expect.any(AbortSignal) }),
    )
    // Значение есть, опция загрузилась — в триггере подпись
    act(() => form().setFieldValue('cityId', 'RU-1'))
    await waitFor(() => expect(trigger('cityId')).toHaveTextContent('Город RU'))
  })

  it('DS16: useOptions(deps) — хук-источник получает deps, его loading попадает в поле', () => {
    const useCities = vi.fn((deps: FieldDeps) => ({
      options: deps.countryId === 'RU' ? [{ label: 'Москва', value: 'msk' }] : [],
      loading: deps.countryId === 'LOADING',
    }))
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" useOptions={useCities} />
      </>,
    )
    expect(useCities).toHaveBeenCalledWith({ countryId: 'RU' })
    expect(trigger('cityId')).toHaveTextContent('Москва')
    act(() => form().setFieldValue('countryId', 'LOADING'))
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })

  it('DS4: смена родителя правкой очищает ребёнка без isTouched, объявление в live-области', () => {
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect
          name="cityId"
          label="Город"
          dependsOn="countryId"
          options={[{ label: 'Москва', value: 'msk' }]}
        />
      </>,
    )
    expect(live()).toEqual([''])
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(form().state.values.cityId).toBe('')
    expect(live()).toEqual(['Поле «Город» очищено: изменилось поле «countryId»'])
    const meta = form().getFieldMeta('cityId')
    expect(meta?.isTouched ?? false).toBe(false)
    expect(meta?.errors ?? []).toHaveLength(0)
  })

  it('DS4: ребёнок пуст — очистки и объявления нет', () => {
    const { form } = setup(
      { countryId: 'RU', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" options={[]} />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(live()).toEqual([''])
  })

  it('DS5: очистка родителя очищает ребёнка и блокирует его с подсказкой', () => {
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" options={[{ label: 'Москва', value: 'msk' }]} />
      </>,
    )
    act(() => form().setFieldValue('countryId', ''))
    expect(form().state.values.cityId).toBe('')
    expect(trigger('cityId')).toBeDisabled()
    expect(hintNode()).toHaveTextContent('Сначала выберите «countryId»')
  })

  it('числовой Select очищается в 0 — тем же значением, что пишет собственная очистка поля', () => {
    const { form } = setup(
      { countryId: 'RU', cityId: 5 },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" valueType="number" options={[{ label: 'Пять', value: 5 }]} />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(form().state.values.cityId).toBe(0)
  })

  it('DS6: цепочка страна → регион → город: обе очистки за одну правку, запрос городов не уходит', async () => {
    const loadCities = vi.fn(async (_search: string, ctx: LoadContext) => [
      { id: 'c1', name: `Город ${String(ctx.deps.regionId)}` },
    ])
    const { form } = setup(
      { countryId: 'RU', regionId: 'r1', cityId: 'c1' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect
          name="regionId"
          label="Регион"
          dependsOn="countryId"
          options={(deps) => [{ label: `Регион ${String(deps.countryId)}`, value: 'r1' }]}
        />
        <FieldSelect name="cityId" label="Город" dependsOn="regionId" loadOptions={loadCities} {...CITY_PROPS} />
      </>,
    )
    await waitFor(() => expect(loadCities).toHaveBeenCalledTimes(1))
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(form().state.values.regionId).toBe('')
    expect(form().state.values.cityId).toBe('')
    expect(trigger('cityId')).toBeDisabled()
    expect(live()).toEqual([
      'Поле «Регион» очищено: изменилось поле «countryId»',
      'Поле «Город» очищено: изменилось поле «regionId»',
    ])
    await new Promise((resolve) => setTimeout(resolve, 30))
    // Регион пуст — новых запросов городов нет
    expect(loadCities).toHaveBeenCalledTimes(1)
  })

  it('DS7: initialValue с обоими — очистки нет; значение при пустом родителе показано и не стёрто', () => {
    const { form } = setup(
      { countryId: '', cityId: 'msk' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" options={[{ label: 'Москва', value: 'msk' }]} />
      </>,
    )
    expect(form().state.values.cityId).toBe('msk')
    // Поле заблокировано, но значение на экране (запись есть в статичном списке — подпись)
    expect(trigger('cityId')).toBeDisabled()
    expect(trigger('cityId')).toHaveTextContent('Москва')
    expect(live()).toEqual([''])
  })

  it('DS7: значение вне загруженных опций показывается как есть и не стирается', async () => {
    const loadOptions = vi.fn(async () => [{ id: 'spb', name: 'Санкт-Петербург' }])
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" loadOptions={loadOptions} {...CITY_PROPS} />
      </>,
    )
    await waitFor(() => expect(loadOptions).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(trigger('cityId')).toHaveTextContent('msk')
    expect(form().state.values.cityId).toBe('msk')
  })

  it('DS8: reset(values) и update() ребёнка не стирают', () => {
    const { form } = setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" options={[{ label: 'Москва', value: 'msk' }]} />
      </>,
    )
    act(() => form().reset({ countryId: 'RU', cityId: 'msk' }))
    expect(form().state.values).toEqual({ countryId: 'RU', cityId: 'msk' })
    act(() => form().reset({ countryId: 'DE', cityId: 'msk' }))
    expect(form().state.values.cityId).toBe('msk')
    expect(live()).toEqual([''])
  })

  it('DS10: setFieldValue(parent) очищает ребёнка, внутри dependents.suppress — нет', () => {
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
        <FieldSelect name="cityId" dependsOn="countryId" options={[{ label: 'Москва', value: 'msk' }]} />
      </>,
    )
    act(() => suppress(() => form().setFieldValue('countryId', 'DE')))
    expect(form().state.values.cityId).toBe('msk')
    act(() => form().setFieldValue('countryId', 'FR'))
    expect(form().state.values.cityId).toBe('')
  })

  it('clearOnParentChange={false}: значение остаётся при смене родителя', () => {
    const { form } = setup(
      { countryId: 'RU', cityId: 'msk' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect
          name="cityId"
          dependsOn="countryId"
          clearOnParentChange={false}
          options={[{ label: 'Москва', value: 'msk' }]}
        />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'DE'))
    expect(form().state.values.cityId).toBe('msk')
  })

  it('disableWhenParentEmpty={false}: поле не блокируется, подсказки нет, но список не грузится', async () => {
    const loadOptions = vi.fn(async () => [] as City[])
    setup(
      { countryId: '', cityId: '' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect
          name="cityId"
          dependsOn="countryId"
          disableWhenParentEmpty={false}
          loadOptions={loadOptions}
          {...CITY_PROPS}
        />
      </>,
    )
    expect(trigger('cityId')).not.toBeDisabled()
    expect(hintNode()).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(loadOptions).not.toHaveBeenCalled()
  })

  it('depsReady: своя готовность (несколько родителей)', () => {
    const { form } = setup(
      { a: '', b: '', cityId: '' },
      <>
        <Mount names={['a', 'b']} />
        <FieldSelect
          name="cityId"
          dependsOn={['a', 'b']}
          depsReady={(deps) => deps.a === 'x'}
          options={[]}
        />
      </>,
    )
    expect(trigger('cityId')).toBeDisabled()
    act(() => form().setFieldValue('a', 'x'))
    expect(trigger('cityId')).not.toBeDisabled()
  })

  it('DS12: A → B → C — signal A и B отменены, применяется только C; размонтирование отменяет запрос', async () => {
    const signals: AbortSignal[] = []
    const loadOptions = vi.fn((_search: string, ctx: LoadContext) => {
      signals.push(ctx.signal)
      return Promise.resolve([{ id: 'x', name: `Город ${String(ctx.deps.countryId)}` }])
    })
    const { form, unmount } = setup(
      { countryId: 'A', cityId: 'x' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" loadOptions={loadOptions} {...CITY_PROPS} />
      </>,
    )
    act(() => form().setFieldValue('countryId', 'B'))
    act(() => form().setFieldValue('countryId', 'C'))
    // Ребёнок очищен сменой родителя; выбор после загрузки C показывает подпись из опций именно C
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(3))
    act(() => form().setFieldValue('cityId', 'x'))
    await waitFor(() => expect(trigger('cityId')).toHaveTextContent('Город C'))
    expect(signals.map((signal) => signal.aborted)).toEqual([true, true, false])
    unmount()
    expect(signals[2]!.aborted).toBe(true)
  })

  it('DS12: опции прежнего родителя скрыты, пока идёт запрос нового', async () => {
    let release!: (value: City[]) => void
    const loadOptions = vi.fn((_search: string, ctx: LoadContext) =>
      ctx.deps.countryId === 'A'
        ? Promise.resolve([{ id: 'a1', name: 'Город A' }])
        : new Promise<City[]>((resolve) => {
          release = resolve
        })
    )
    const { form } = setup(
      { countryId: 'A', cityId: 'a1' },
      <>
        <Mount names={['countryId']} />
        <FieldSelect name="cityId" dependsOn="countryId" loadOptions={loadOptions} {...CITY_PROPS} />
      </>,
    )
    await waitFor(() => expect(trigger('cityId')).toHaveTextContent('Город A'))
    act(() => form().setFieldValue('countryId', 'B'))
    // Ребёнок очищен, прежних опций нет, идёт загрузка
    expect(trigger('cityId')).not.toHaveTextContent('Город A')
    expect(document.querySelector('.animate-spin')).not.toBeNull()
    await act(async () => {
      release([{ id: 'b1', name: 'Город B' }])
    })
    expect(document.querySelector('.animate-spin')).toBeNull()
  })

  it('DS18: без dependsOn — ни live-области, ни подсказки, ни aria-describedby', () => {
    setup(
      { cityId: '' },
      <FieldSelect name="cityId" options={[{ label: 'Москва', value: 'msk' }]} />,
    )
    expect(document.querySelector('[data-dependent-live]')).toBeNull()
    expect(trigger('cityId')).not.toHaveAttribute('aria-describedby')
    expect(trigger('cityId')).not.toBeDisabled()
  })
})

// ---- DS16: «ровно один источник» — compile-only, проверяется `nx typecheck:tsgo` (в рантайме не вызывается) ----
function compileOnlySelectSources(): void {
  const load = (): Promise<City[]> => Promise.resolve([])
  const useOptions = () => ({ options: [], loading: false })
  void [
    <FieldSelect key="static" name="a" options={[]} />,
    <FieldSelect key="fn" name="a" options={() => []} />,
    <FieldSelect key="load" name="a" loadOptions={load} {...CITY_PROPS} />,
    <FieldSelect key="hook" name="a" useOptions={useOptions} />,
    // @ts-expect-error — `options` и `loadOptions` вместе не проходят
    <FieldSelect key="both" name="a" options={[]} loadOptions={load} {...CITY_PROPS} />,
    // @ts-expect-error — `options` и `useOptions` вместе не проходят
    <FieldSelect key="both2" name="a" options={[]} useOptions={useOptions} />,
    // @ts-expect-error — `loadOptions` и `useOptions` вместе не проходят
    <FieldSelect key="both3" name="a" loadOptions={load} {...CITY_PROPS} useOptions={useOptions} />,
    // @ts-expect-error — у `loadOptions` обязательны `getLabel`/`getValue`
    <FieldSelect key="nolabel" name="a" loadOptions={load} />,
  ]
}

it('DS16: «ровно один источник» — проверка на компиляции (typecheck)', () => {
  expect(typeof compileOnlySelectSources).toBe('function')
})
