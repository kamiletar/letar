import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import type { FieldDeps, LoadContext } from '@letar/forms-core/uikit'
import { FormI18nProvider } from '@letar/forms-react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ReactElement, type ReactNode, type RefObject, useEffect } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { Form, useDeclarativeForm } from '../../'
import type { AppFormApi } from '../../types'

// Зависимые поля Select (этап З, §18): DS3–DS8, DS10–DS16

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

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

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

const schema = z.object({
  countryId: z.string().meta({ ui: { title: 'Страна' } }),
  regionId: z.string().meta({ ui: { title: 'Регион' } }).optional(),
  cityId: z.string().meta({ ui: { title: 'Город' } }),
})

const formRef: RefObject<AppFormApi | null> = createRef<AppFormApi | null>()
const values = () => formRef.current!.state.values as Record<string, unknown>

/** Достаёт реестр зависимых полей формы — то, что приложению отдаёт `useDeclarativeForm().dependents` */
let dependentsHandle: ReturnType<typeof useDeclarativeForm>['dependents']
function CaptureDependents(): null {
  const { dependents } = useDeclarativeForm()
  useEffect(() => {
    dependentsHandle = dependents
  }, [dependents])
  return null
}

type CityLoader = (search: string, ctx: LoadContext) => Promise<Option[]>

function Harness({
  initial = { countryId: '', cityId: '' },
  loadCities,
  cityProps,
  onSubmit = vi.fn(),
  children,
}: {
  initial?: Record<string, string>
  loadCities?: CityLoader
  cityProps?: Record<string, unknown>
  onSubmit?: (value: unknown) => void
  children?: ReactNode
}): ReactElement {
  return (
    <TestWrapper>
      <Form initialValue={initial} schema={schema} onSubmit={onSubmit} formRef={formRef}>
        <Form.Field.Select name="countryId" label="Страна" options={countries} />
        <Form.Field.Select
          name="cityId"
          label="Город"
          dependsOn="countryId"
          loadOptions={loadCities ?? (async (_s, { deps }) => citiesByCountry[String(deps.countryId)] ?? [])}
          {...cityProps}
        />
        <CaptureDependents />
        <Form.Button.Submit>Сохранить</Form.Button.Submit>
        {children}
      </Form>
    </TestWrapper>
  )
}

const country = () => screen.getByRole('combobox', { name: /Страна/ })
const city = () => screen.getByRole('combobox', { name: /Город/ })
const announcement = () => document.querySelector('[data-dependent-cleared]') as HTMLElement

async function pick(trigger: HTMLElement, name: string) {
  await userEvent.click(trigger)
  await userEvent.click(await screen.findByRole('option', { name }))
}

describe('Field.Select — dependsOn (§18)', () => {
  it('DS3: родитель пуст — поле заблокировано, подсказка связана с триггером, загрузчик молчит; выбор родителя разблокирует', async () => {
    const loadCities = vi.fn<CityLoader>(async (_s, { deps }) => citiesByCountry[String(deps.countryId)] ?? [])
    render(<Harness loadCities={loadCities} />)

    expect(city()).toBeDisabled()
    const hint = document.querySelector('[data-dependent-hint]') as HTMLElement
    expect(hint).toHaveTextContent('Сначала выберите «Страна»')
    expect(city().getAttribute('aria-describedby')).toContain(hint.id)
    expect(city()).toHaveTextContent('Сначала выберите «Страна»')
    expect(loadCities).not.toHaveBeenCalled()

    await pick(country(), 'Россия')
    await waitFor(() => expect(city()).toBeEnabled())
    await waitFor(() => expect(loadCities).toHaveBeenCalledTimes(1))
    expect(loadCities.mock.calls[0]![1].deps).toEqual({ countryId: 'RU' })
    expect(document.querySelector('[data-dependent-hint]')).toBeNull()
    // Значение ребёнка не тронуто
    expect(values().cityId).toBe('')

    await userEvent.click(city())
    expect(await screen.findByRole('option', { name: 'Москва' })).toBeInTheDocument()
  })

  it('DS3: placeholderWhenDisabled заменяет текст в заблокированном поле', () => {
    render(<Harness cityProps={{ placeholderWhenDisabled: 'Выберите страну' }} />)
    expect(city()).toHaveTextContent('Выберите страну')
  })

  it('DS4: смена родителя пользователем очищает ребёнка без isTouched и ошибок, объявляет очистку', async () => {
    render(<Harness initial={{ countryId: 'RU', cityId: 'msk' }} />)
    await waitFor(() => expect(city()).toHaveTextContent('Москва'))

    await pick(country(), 'Германия')

    await waitFor(() => expect(values().cityId).toBe(''))
    const meta = formRef.current!.getFieldMeta('cityId')
    expect(meta?.isTouched ?? false).toBe(false)
    expect(meta?.errors ?? []).toHaveLength(0)
    await waitFor(() => expect(announcement()).toHaveTextContent('Поле «Город» очищено: изменилось поле «Страна»'))
    expect(announcement()).toHaveAttribute('aria-live', 'polite')
    // Города прежней страны на экране не остаются; открытый список — города Германии
    await userEvent.click(city())
    expect(await screen.findByRole('option', { name: 'Берлин' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Москва' })).toBeNull()
  })

  it('DS4: ребёнок пуст — очистка ничего не пишет и не объявляет', async () => {
    render(<Harness initial={{ countryId: 'RU', cityId: '' }} />)
    const spy = vi.spyOn(formRef.current!, 'setFieldValue')

    await pick(country(), 'Германия')
    await waitFor(() => expect(values().countryId).toBe('DE'))

    expect(spy.mock.calls.filter(([name]) => name === 'cityId')).toHaveLength(0)
    expect(announcement()).toHaveTextContent('')
  })

  it('DS5: очистка родителя очищает ребёнка и блокирует его, подсказка и aria-describedby', async () => {
    render(<Harness initial={{ countryId: 'RU', cityId: 'msk' }} />)
    await waitFor(() => expect(city()).toHaveTextContent('Москва'))

    act(() => formRef.current!.setFieldValue('countryId', ''))

    await waitFor(() => expect(city()).toBeDisabled())
    expect(values().cityId).toBe('')
    const hint = document.querySelector('[data-dependent-hint]') as HTMLElement
    expect(hint).toHaveTextContent('Сначала выберите «Страна»')
    expect(city().getAttribute('aria-describedby')).toContain(hint.id)
  })

  it('DS6: цепочка страна → регион → город: смена страны очищает оба, запрос городов не уходит при пустом регионе', async () => {
    const loadCities = vi.fn<CityLoader>(async (_s, { deps }) => [{ label: `Город ${deps.regionId}`, value: 'c1' }])
    render(
      <TestWrapper>
        <Form
          initialValue={{ countryId: 'RU', regionId: 'r1', cityId: 'c1' }}
          schema={schema}
          onSubmit={vi.fn()}
          formRef={formRef}
        >
          <Form.Field.Select name="countryId" label="Страна" options={countries} />
          <Form.Field.Select
            name="regionId"
            label="Регион"
            dependsOn="countryId"
            options={(deps) => [{ label: `Регион ${String(deps.countryId)}`, value: 'r1' }]}
          />
          <Form.Field.Select name="cityId" label="Город" dependsOn="regionId" loadOptions={loadCities} />
        </Form>
      </TestWrapper>,
    )
    await waitFor(() => expect(loadCities).toHaveBeenCalledTimes(1))

    await pick(country(), 'Германия')

    await waitFor(() => {
      expect(values().regionId).toBe('')
      expect(values().cityId).toBe('')
    })
    // Регион пуст — городов не просим (единственный вызов был на монтировании)
    expect(loadCities).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('combobox', { name: /Город/ })).toBeDisabled()
  })

  it('DS7: initialValue с обоими — очистки нет, «Loading...» в триггере, затем подпись', async () => {
    const server = deferred<Option[]>()
    render(<Harness initial={{ countryId: 'RU', cityId: 'msk' }} loadCities={() => server.promise} />)

    await waitFor(() => expect(city()).toHaveTextContent('Загрузка...'))
    expect(values().cityId).toBe('msk')

    await act(async () => server.resolve(citiesByCountry.RU!))
    await waitFor(() => expect(city()).toHaveTextContent('Москва'))
    expect(values().cityId).toBe('msk')
  })

  it('DS7: значение при пустом родителе (несогласованные данные) показано и не стёрто', async () => {
    render(<Harness initial={{ countryId: '', cityId: 'msk' }} />)

    expect(city()).toBeDisabled()
    expect(city()).toHaveTextContent('msk')
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(values().cityId).toBe('msk')
  })

  it('DS7: значения нет среди загруженных опций — сырое значение и dev-предупреждение, не стирается', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(<Harness initial={{ countryId: 'DE', cityId: 'msk' }} />)

    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining('данные несогласованы')))
    expect(city()).toHaveTextContent('msk')
    expect(values().cityId).toBe('msk')
  })

  it('DS8: initialValue пришёл позже (перерисовка корня) и reset(values) — очистки нет', async () => {
    const { rerender } = render(<Harness initial={{ countryId: '', cityId: '' }} />)
    rerender(<Harness initial={{ countryId: 'RU', cityId: 'msk' }} />)
    await waitFor(() => expect(values().countryId).toBe('RU'))
    expect(values().cityId).toBe('msk')

    act(() => formRef.current!.reset({ countryId: 'DE', cityId: 'ber' }))
    await waitFor(() => expect(values().countryId).toBe('DE'))
    expect(values().cityId).toBe('ber')
  })

  it('DS10: setFieldValue(родитель) очищает; внутри dependents.suppress — нет', async () => {
    render(<Harness initial={{ countryId: 'RU', cityId: 'msk' }} />)
    await waitFor(() => expect(city()).toHaveTextContent('Москва'))

    act(() => dependentsHandle!.suppress(() => formRef.current!.setFieldValue('countryId', 'DE')))
    expect(values().cityId).toBe('msk')

    act(() => formRef.current!.setFieldValue('countryId', 'FR'))
    await waitFor(() => expect(values().cityId).toBe(''))
  })

  it('clearOnParentChange={false} — значение остаётся', async () => {
    render(<Harness initial={{ countryId: 'RU', cityId: 'msk' }} cityProps={{ clearOnParentChange: false }} />)
    act(() => formRef.current!.setFieldValue('countryId', 'DE'))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(values().cityId).toBe('msk')
  })

  it('DS12: A → B → C быстро — сигналы A и B отменены, на экране города C; ответ B/A после C не применяется', async () => {
    const calls: Array<{ country: string; signal: AbortSignal; server: ReturnType<typeof deferred<Option[]>> }> = []
    const loadCities: CityLoader = (_s, { signal, deps }) => {
      const server = deferred<Option[]>()
      calls.push({ country: String(deps.countryId), signal, server })
      return server.promise
    }
    render(<Harness initial={{ countryId: 'RU', cityId: '' }} loadCities={loadCities} />)
    await waitFor(() => expect(calls).toHaveLength(1))

    act(() => formRef.current!.setFieldValue('countryId', 'DE'))
    act(() => formRef.current!.setFieldValue('countryId', 'FR'))
    await waitFor(() => expect(calls).toHaveLength(3))

    expect(calls[0]!.signal.aborted).toBe(true)
    expect(calls[1]!.signal.aborted).toBe(true)
    expect(calls[2]!.signal.aborted).toBe(false)

    // Загрузчик, игнорирующий signal: старые ответы приходят позже нового и не применяются
    await act(async () => calls[2]!.server.resolve(citiesByCountry.FR!))
    await act(async () => calls[1]!.server.resolve(citiesByCountry.DE!))
    await act(async () => calls[0]!.server.resolve(citiesByCountry.RU!))

    await userEvent.click(city())
    expect(await screen.findByRole('option', { name: 'Париж' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Берлин' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Москва' })).toBeNull()
  })

  it('DS12: размонтирование отменяет запрос и снимает регистрацию — правка родителя после этого без ошибок', async () => {
    const signals: AbortSignal[] = []
    const loadCities: CityLoader = (_s, { signal }) => {
      signals.push(signal)
      return new Promise(() => undefined)
    }
    function Toggle({ show }: { show: boolean }) {
      return (
        <TestWrapper>
          <Form initialValue={{ countryId: 'RU', cityId: 'msk' }} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
            <Form.Field.Select name="countryId" label="Страна" options={countries} />
            {show && <Form.Field.Select name="cityId" dependsOn="countryId" loadOptions={loadCities} />}
          </Form>
        </TestWrapper>
      )
    }
    const { rerender } = render(<Toggle show />)
    await waitFor(() => expect(signals).toHaveLength(1))

    rerender(<Toggle show={false} />)
    expect(signals[0]!.aborted).toBe(true)
    act(() => formRef.current!.setFieldValue('countryId', 'DE'))
    expect(values().cityId).toBe('msk')
  })

  it('DS13: onCreate получает deps родителя A; родитель сменился до подтверждения — созданное в поле не записывается', async () => {
    const server = deferred<Option | null>()
    const seen: FieldDeps[] = []
    const onCreate = vi.fn(async (_s: string, ctx: { optimistic: (p: { label: string }) => void; deps: FieldDeps }) => {
      seen.push(ctx.deps)
      ctx.optimistic({ label: 'Новый город' })
      return server.promise
    })
    const onSettleError = vi.fn()
    render(<Harness initial={{ countryId: 'RU', cityId: '' }} cityProps={{ onCreate, onSettleError }} />)
    await waitFor(() => expect(city()).toBeEnabled())

    await userEvent.click(city())
    await userEvent.click(await screen.findByRole('option', { name: /Добавить/ }))
    await waitFor(() => expect(onCreate).toHaveBeenCalled())
    expect(seen[0]).toEqual({ countryId: 'RU' })

    // Родитель сменился, пока сервер думает
    act(() => formRef.current!.setFieldValue('countryId', 'DE'))
    await act(async () => server.resolve({ label: 'Новый город', value: 'new' }))

    expect(values().cityId).toBe('')
    expect(onSettleError).not.toHaveBeenCalled()
  })

  it('DS13: отказ подтверждения после смены родителя — onSettleError получает deps прежнего родителя', async () => {
    const server = deferred<Option | null>()
    const onCreate = vi.fn(async (_s: string, ctx: { optimistic: (p: { label: string }) => void }) => {
      ctx.optimistic({ label: 'Новый город' })
      return server.promise
    })
    const onSettleError = vi.fn()
    render(<Harness initial={{ countryId: 'RU', cityId: '' }} cityProps={{ onCreate, onSettleError }} />)
    await waitFor(() => expect(city()).toBeEnabled())
    await userEvent.click(city())
    await userEvent.click(await screen.findByRole('option', { name: /Добавить/ }))
    await waitFor(() => expect(onCreate).toHaveBeenCalled())

    act(() => formRef.current!.setFieldValue('countryId', 'DE'))
    await act(async () => server.resolve(null))

    await waitFor(() => expect(onSettleError).toHaveBeenCalled())
    expect(onSettleError.mock.calls[0]![0].deps).toEqual({ countryId: 'RU' })
  })

  it('DS14: отправка, пока опции ребёнка грузятся — обязательное поле пусто, onSubmit не вызван', async () => {
    const server = deferred<Option[]>()
    const onSubmit = vi.fn()
    const requiredSchema = z.object({ countryId: z.string(), cityId: z.string().min(1, 'Выберите город') })
    render(
      <TestWrapper>
        <Form initialValue={{ countryId: 'RU', cityId: '' }} schema={requiredSchema} onSubmit={onSubmit}>
          <Form.Field.Select name="countryId" label="Страна" options={countries} />
          <Form.Field.Select name="cityId" label="Город" dependsOn="countryId" loadOptions={() => server.promise} />
          <Form.Button.Submit>Сохранить</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )

    await userEvent.click(screen.getByRole('button', { name: /Сохранить/ }))

    expect(await screen.findByText('Выберите город')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('DS15: onUpdate получает deps на момент начала', async () => {
    const seen: FieldDeps[] = []
    const onUpdate = vi.fn(async (option: Option, ctx: { deps: FieldDeps }) => {
      seen.push(ctx.deps)
      return { ...option, label: `${option.label}!` }
    })
    render(<Harness initial={{ countryId: 'RU', cityId: '' }} cityProps={{ onUpdate }} />)
    await waitFor(() => expect(city()).toBeEnabled())
    await userEvent.click(city())
    const item = await screen.findByRole('option', { name: /Москва/ })
    await userEvent.click(item.querySelector('[data-part="edit-button"]')!)
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(seen[0]).toEqual({ countryId: 'RU' })
  })
})

describe('Field.Select — источники опций с deps (DS16)', () => {
  it('options функцией от deps: список родителя; родитель пуст — функция не вызывается', async () => {
    const options = vi.fn((deps: FieldDeps) => citiesByCountry[String(deps.countryId)] ?? [])
    render(
      <TestWrapper>
        <Form initialValue={{ countryId: '', cityId: '' }} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
          <Form.Field.Select name="countryId" label="Страна" options={countries} />
          <Form.Field.Select name="cityId" label="Город" dependsOn="countryId" options={options} />
        </Form>
      </TestWrapper>,
    )
    expect(options).not.toHaveBeenCalled()

    act(() => formRef.current!.setFieldValue('countryId', 'DE'))
    await userEvent.click(city())
    expect(await screen.findByRole('option', { name: 'Берлин' })).toBeInTheDocument()
    expect(options).toHaveBeenCalledWith({ countryId: 'DE' })
  })

  it('loadOptions: search всегда пустой, один запрос на deps, при смене родителя прежние опции скрыты', async () => {
    const servers: Array<ReturnType<typeof deferred<Option[]>>> = []
    const searches: string[] = []
    const loadCities: CityLoader = (search) => {
      searches.push(search)
      const server = deferred<Option[]>()
      servers.push(server)
      return server.promise
    }
    render(<Harness initial={{ countryId: 'RU', cityId: '' }} loadCities={loadCities} />)
    await waitFor(() => expect(servers).toHaveLength(1))
    await act(async () => servers[0]!.resolve(citiesByCountry.RU!))

    act(() => formRef.current!.setFieldValue('countryId', 'DE'))
    await waitFor(() => expect(servers).toHaveLength(2))
    // Пока идёт запрос нового родителя, города России не видны
    await userEvent.click(city())
    expect(screen.queryByRole('option', { name: 'Москва' })).toBeNull()
    await act(async () => servers[1]!.resolve(citiesByCountry.DE!))
    expect(await screen.findByRole('option', { name: 'Берлин' })).toBeInTheDocument()
    expect(searches).toEqual(['', ''])
  })

  it('loadOptions: ошибка уходит в onLoadError', async () => {
    const onLoadError = vi.fn()
    const boom = new Error('boom')
    render(
      <Harness
        initial={{ countryId: 'RU', cityId: '' }}
        loadCities={() => Promise.reject(boom)}
        cityProps={{ onLoadError }}
      />,
    )
    await waitFor(() => expect(onLoadError).toHaveBeenCalledWith(boom))
  })

  it('useOptions(deps): хук получает deps родителей', async () => {
    const seen: FieldDeps[] = []
    const useOptions = (deps: FieldDeps) => {
      seen.push(deps)
      return { options: citiesByCountry[String(deps.countryId)] ?? [], loading: false }
    }
    render(
      <TestWrapper>
        <Form initialValue={{ countryId: 'RU', cityId: '' }} schema={schema} onSubmit={vi.fn()}>
          <Form.Field.Select name="countryId" label="Страна" options={countries} />
          <Form.Field.Select name="cityId" label="Город" dependsOn="countryId" useOptions={useOptions} />
        </Form>
      </TestWrapper>,
    )
    await userEvent.click(city())
    expect(await screen.findByRole('option', { name: 'Казань' })).toBeInTheDocument()
    expect(seen.at(-1)).toEqual({ countryId: 'RU' })
  })

  it('«ровно один источник» — типы не пускают два (compile-only)', () => {
    // Никогда не вызывается: проверяется только typecheck
    const never = () => (
      <>
        {/* @ts-expect-error — `options` и `loadOptions` вместе */}
        <Form.Field.Select name="a" options={[]} loadOptions={async () => []} />
        {/* @ts-expect-error — `loadOptions` и `useOptions` вместе */}
        <Form.Field.Select name="a" loadOptions={async () => []} useOptions={() => ({ options: [], loading: false })} />
        {/* @ts-expect-error — `options` и `useOptions` вместе */}
        <Form.Field.Select name="a" options={[]} useOptions={() => ({ options: [], loading: false })} />
      </>
    )
    expect(typeof never).toBe('function')
  })
})

describe('Field.Select — без dependsOn всё как раньше (DS18)', () => {
  it('поле без dependsOn: не заблокировано, подсказок и live-области нет', () => {
    render(
      <TestWrapper>
        <Form initialValue={{ a: '' }} onSubmit={vi.fn()}>
          <Form.Field.Select name="a" options={countries} placeholder="Выберите" />
        </Form>
      </TestWrapper>,
    )
    expect(screen.getByRole('combobox')).toBeEnabled()
    expect(document.querySelector('[data-dependent-hint]')).toBeNull()
    expect(document.querySelector('[data-dependent-cleared]')).toBeNull()
  })
})
