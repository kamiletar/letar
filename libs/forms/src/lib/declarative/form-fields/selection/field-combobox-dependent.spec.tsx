import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import type { FieldDeps, LoadContext } from '@letar/forms-core/uikit'
import { FormI18nProvider } from '@letar/forms-react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ReactElement, type ReactNode, type RefObject } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { Form } from '../../'
import type { AppFormApi } from '../../types'
import type { AsyncQueryResult } from '../base'

// Зависимые поля Combobox (этап З, §18): DS3–DS7, DS12, DS13, DS15, DS17

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

interface Employee {
  id: string
  name: string
}

const companies = [
  { label: 'Альфа', value: 'A' },
  { label: 'Бета', value: 'B' },
  { label: 'Гамма', value: 'C' },
]

const employeesByCompany: Record<string, Employee[]> = {
  A: [{ id: 'a1', name: 'Анна' }, { id: 'a2', name: 'Антон' }],
  B: [{ id: 'b1', name: 'Борис' }],
  C: [{ id: 'c1', name: 'Виктор' }],
}

const schema = z.object({
  companyId: z.string().meta({ ui: { title: 'Компания' } }),
  employeeId: z.string().meta({ ui: { title: 'Сотрудник' } }),
})

const formRef: RefObject<AppFormApi | null> = createRef<AppFormApi | null>()
const values = () => formRef.current!.state.values as Record<string, unknown>

type EmployeeLoader = (search: string, ctx: LoadContext) => Promise<Employee[]>

const allEmployees = Object.values(employeesByCompany).flat()

const defaultSelected = async (value: string) => allEmployees.find((e) => e.id === value) ?? null

const defaultLoader: EmployeeLoader = async (_search, { deps }) => employeesByCompany[String(deps.companyId)] ?? []

function Harness({
  initial = { companyId: '', employeeId: '' },
  loadOptions = defaultLoader,
  employeeProps,
  children,
}: {
  initial?: Record<string, string>
  loadOptions?: EmployeeLoader
  employeeProps?: Record<string, unknown>
  children?: ReactNode
}): ReactElement {
  return (
    <TestWrapper>
      <Form initialValue={initial} schema={schema} onSubmit={vi.fn()} formRef={formRef}>
        <Form.Field.Select name="companyId" label="Компания" options={companies} />
        <Form.Field.Combobox<string, Employee>
          name="employeeId"
          label="Сотрудник"
          dependsOn="companyId"
          minChars={0}
          debounce={5}
          loadOptions={loadOptions}
          loadSelected={defaultSelected}
          getLabel={(e) => e.name}
          getValue={(e) => e.id}
          {...employeeProps}
        />
        {children}
      </Form>
    </TestWrapper>
  )
}

const company = () => screen.getByRole('combobox', { name: /Компания/ })
const employee = () => screen.getByRole('combobox', { name: /Сотрудник/ }) as HTMLInputElement
const announcement = () => document.querySelector('[data-dependent-cleared]') as HTMLElement

async function pickCompany(name: string) {
  await userEvent.click(company())
  await userEvent.click(await screen.findByRole('option', { name }))
}

describe('Field.Combobox — dependsOn (§18)', () => {
  it('DS3: родитель пуст — поле заблокировано, подсказка связана с полем ввода, загрузчик молчит; выбор родителя — deps в загрузчике', async () => {
    const loadOptions = vi.fn(defaultLoader)
    render(<Harness loadOptions={loadOptions} />)

    expect(employee()).toBeDisabled()
    const hint = document.querySelector('[data-dependent-hint]') as HTMLElement
    expect(hint).toHaveTextContent('Сначала выберите «Компания»')
    expect(employee().getAttribute('aria-describedby')).toContain(hint.id)
    expect(employee().placeholder).toBe('Сначала выберите «Компания»')

    await pickCompany('Альфа')
    await waitFor(() => expect(employee()).toBeEnabled())
    // Список открывали — запрос уходит с deps
    await userEvent.click(employee())
    await waitFor(() => expect(loadOptions).toHaveBeenCalled())
    expect(loadOptions.mock.calls[0]![1].deps).toEqual({ companyId: 'A' })
    expect(await screen.findByRole('option', { name: 'Анна' })).toBeInTheDocument()
    expect(values().employeeId).toBe('')
  })

  it('DS4: смена родителя очищает значение и текст в поле ввода, объявляет очистку', async () => {
    render(<Harness initial={{ companyId: 'A', employeeId: 'a1' }} />)
    await waitFor(() => expect(employee().value).toBe('Анна'))

    await pickCompany('Бета')

    await waitFor(() => expect(values().employeeId).toBe(''))
    await waitFor(() => expect(employee().value).toBe(''))
    expect(formRef.current!.getFieldMeta('employeeId')?.isTouched ?? false).toBe(false)
    await waitFor(() =>
      expect(announcement()).toHaveTextContent('Поле «Сотрудник» очищено: изменилось поле «Компания»')
    )
  })

  it('DS5: очистка родителя — ребёнок пуст и заблокирован', async () => {
    render(<Harness initial={{ companyId: 'A', employeeId: 'a1' }} />)
    await waitFor(() => expect(employee().value).toBe('Анна'))

    act(() => formRef.current!.setFieldValue('companyId', ''))

    await waitFor(() => expect(employee()).toBeDisabled())
    expect(values().employeeId).toBe('')
  })

  it('DS7: initialValue с обоими — очистки нет; подпись из loadSelected вызвана с deps', async () => {
    const loadSelected = vi.fn(async (value: string, _ctx: LoadContext) => ({ id: value, name: 'Анна' }))
    render(<Harness initial={{ companyId: 'A', employeeId: 'a1' }} employeeProps={{ loadSelected }} />)

    await waitFor(() => expect(employee().value).toBe('Анна'))
    expect(loadSelected).toHaveBeenCalledWith('a1', expect.objectContaining({ deps: { companyId: 'A' } }))
    expect(values().employeeId).toBe('a1')
  })

  it('DS7: подпись из useSelected(value, deps)', async () => {
    const seen: Array<[string, FieldDeps]> = []
    const useSelected = (value: string, deps: FieldDeps) => {
      seen.push([value, deps])
      return { data: value ? { id: value, name: 'Анна' } : undefined }
    }
    render(<Harness initial={{ companyId: 'A', employeeId: 'a1' }} employeeProps={{ useSelected }} />)
    await waitFor(() => expect(employee().value).toBe('Анна'))
    expect(seen.at(-1)).toEqual(['a1', { companyId: 'A' }])
  })

  it('DS7: значение при пустом родителе — подпись из loadSelected, поле заблокировано, значение не стёрто', async () => {
    const loadSelected = vi.fn(async (value: string) => ({ id: value, name: 'Анна' }))
    render(<Harness initial={{ companyId: '', employeeId: 'a1' }} employeeProps={{ loadSelected }} />)

    await waitFor(() => expect(employee().value).toBe('Анна'))
    expect(employee()).toBeDisabled()
    expect(values().employeeId).toBe('a1')
  })

  it('DS12: A → B → C быстро — сигналы A и B отменены, на экране сотрудники C', async () => {
    const calls: Array<{ company: string; signal: AbortSignal; server: ReturnType<typeof deferred<Employee[]>> }> = []
    const loadOptions: EmployeeLoader = (_s, { signal, deps }) => {
      const server = deferred<Employee[]>()
      calls.push({ company: String(deps.companyId), signal, server })
      return server.promise
    }
    render(<Harness initial={{ companyId: 'A', employeeId: '' }} loadOptions={loadOptions} />)
    await userEvent.click(employee())
    await waitFor(() => expect(calls).toHaveLength(1))

    act(() => formRef.current!.setFieldValue('companyId', 'B'))
    await waitFor(() => expect(calls).toHaveLength(2))
    act(() => formRef.current!.setFieldValue('companyId', 'C'))
    await waitFor(() => expect(calls).toHaveLength(3))

    expect(calls.map((call) => call.company)).toEqual(['A', 'B', 'C'])
    expect(calls[0]!.signal.aborted).toBe(true)
    expect(calls[1]!.signal.aborted).toBe(true)
    expect(calls[2]!.signal.aborted).toBe(false)

    await act(async () => calls[2]!.server.resolve(employeesByCompany.C!))
    await act(async () => calls[1]!.server.resolve(employeesByCompany.B!))
    await act(async () => calls[0]!.server.resolve(employeesByCompany.A!))

    expect(await screen.findByRole('option', { name: 'Виктор' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Борис' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Анна' })).toBeNull()
  })

  it('DS6: пока родитель пуст — запрос не уходит; после очистки родителя новых запросов нет', async () => {
    const loadOptions = vi.fn(defaultLoader)
    render(<Harness initial={{ companyId: 'A', employeeId: '' }} loadOptions={loadOptions} />)
    await userEvent.click(employee())
    await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1))

    act(() => formRef.current!.setFieldValue('companyId', ''))
    await waitFor(() => expect(employee()).toBeDisabled())
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(loadOptions).toHaveBeenCalledTimes(1)
  })

  it('DS13: onCreate получает search и deps; родитель сменился до подтверждения — созданное в поле не записывается', async () => {
    const server = deferred<{ label: string; value: string } | null>()
    const onCreate = vi.fn(
      async (_search: string, ctx: { optimistic: (p: { label: string }) => void; deps: FieldDeps }) => {
        ctx.optimistic({ label: 'Новый' })
        return server.promise
      },
    )
    render(<Harness initial={{ companyId: 'A', employeeId: '' }} employeeProps={{ onCreate }} />)
    await userEvent.click(employee())
    fireEvent.change(employee(), { target: { value: 'Нов' } })
    await userEvent.click(await screen.findByText(/Добавить "Нов"/))
    await waitFor(() => expect(onCreate).toHaveBeenCalled())
    expect(onCreate.mock.calls[0]![0]).toBe('Нов')
    expect(onCreate.mock.calls[0]![1].deps).toEqual({ companyId: 'A' })

    act(() => formRef.current!.setFieldValue('companyId', 'B'))
    await act(async () => server.resolve({ label: 'Новый', value: 'new' }))

    expect(values().employeeId).toBe('')
  })

  it('DS15: onUpdate получает deps на момент начала', async () => {
    const onUpdate = vi.fn(async (option: { value: string; label: string }, _ctx: { deps: FieldDeps }) => ({
      value: option.value,
      label: `${option.label}!`,
    }))
    render(
      <Harness
        initial={{ companyId: 'A', employeeId: 'a1' }}
        employeeProps={{ onUpdate }}
      />,
    )
    await waitFor(() => expect(employee().value).toBe('Анна'))
    employee().focus()
    fireEvent.keyDown(employee(), { key: 'F2' })
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(onUpdate.mock.calls[0]![1].deps).toEqual({ companyId: 'A' })
  })
})

describe('Field.Combobox — хук-путь useQuery(search, deps) и isPlaceholderData (DS17)', () => {
  it('useQuery получает deps вторым аргументом', () => {
    const seen: Array<[string, FieldDeps]> = []
    const useQuery = (search: string, deps: FieldDeps): AsyncQueryResult<Employee> => {
      seen.push([search, deps])
      return { data: [] }
    }
    render(
      <Harness initial={{ companyId: 'B', employeeId: '' }} employeeProps={{ loadOptions: undefined, useQuery }} />,
    )
    expect(seen.at(-1)).toEqual(['', { companyId: 'B' }])
  })

  it('старые опции прежнего родителя скрыты (placeholderData), внутри того же родителя при поиске — видны', async () => {
    let current: AsyncQueryResult<Employee> = { data: employeesByCompany.A, isPlaceholderData: false }
    const useQuery = (): AsyncQueryResult<Employee> => current
    render(
      <Harness
        initial={{ companyId: 'A', employeeId: '' }}
        employeeProps={{ loadOptions: undefined, useQuery, minChars: 1 }}
      />,
    )
    await userEvent.click(employee())
    expect(await screen.findByRole('option', { name: 'Анна' })).toBeInTheDocument()

    // Родитель сменился, настоящего ответа для B ещё нет: keepPreviousData отдаёт данные A как placeholder
    current = { data: employeesByCompany.A, isPlaceholderData: true, isLoading: true }
    act(() => formRef.current!.setFieldValue('companyId', 'B'))
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Анна' })).toBeNull())
    expect(document.querySelector('.chakra-spinner')).not.toBeNull()

    // Настоящий ответ B
    current = { data: employeesByCompany.B, isPlaceholderData: false }
    fireEvent.change(employee(), { target: { value: 'Б' } })
    expect(await screen.findByRole('option', { name: 'Борис' })).toBeInTheDocument()

    // Печать внутри того же родителя: прежняя выдача (placeholder) остаётся видимой
    current = { data: employeesByCompany.B, isPlaceholderData: true, isLoading: true }
    fireEvent.change(employee(), { target: { value: 'Бо' } })
    await waitFor(() => expect(employee().value).toBe('Бо'))
    expect(screen.getByRole('option', { name: 'Борис' })).toBeInTheDocument()
  })
})

describe('Field.Combobox — внешняя смена значения меняет подпись (восстановление черновика, setFieldValue)', () => {
  it('значение записано извне (родитель тот же) — подпись в поле ввода новая', async () => {
    render(<Harness initial={{ companyId: 'A', employeeId: 'a1' }} />)
    await waitFor(() => expect(employee().value).toBe('Анна'))

    act(() => formRef.current!.setFieldValue('employeeId', 'a2'))

    await waitFor(() => expect(employee().value).toBe('Антон'))
    expect(values().employeeId).toBe('a2')
  })

  it('выбор пользователем подпись не перебивает', async () => {
    render(<Harness initial={{ companyId: 'A', employeeId: 'a1' }} />)
    await waitFor(() => expect(employee().value).toBe('Анна'))

    await userEvent.click(employee())
    await userEvent.click(await screen.findByRole('option', { name: 'Антон' }))

    await waitFor(() => expect(values().employeeId).toBe('a2'))
    await waitFor(() => expect(employee().value).toBe('Антон'))
  })
})

describe('Field.Combobox — без dependsOn всё как раньше (DS18)', () => {
  it('поле без dependsOn: не заблокировано, подсказок нет, useQuery получает пустые deps', () => {
    const seen: FieldDeps[] = []
    const useQuery = (_search: string, deps: FieldDeps): AsyncQueryResult<Employee> => {
      seen.push(deps)
      return { data: [] }
    }
    render(
      <TestWrapper>
        <Form initialValue={{ a: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox<string, Employee>
            name="a"
            useQuery={useQuery}
            getLabel={(e) => e.name}
            getValue={(e) => e.id}
          />
        </Form>
      </TestWrapper>,
    )
    expect(screen.getByRole('combobox')).toBeEnabled()
    expect(document.querySelector('[data-dependent-hint]')).toBeNull()
    expect(seen.at(-1)).toEqual({})
  })
})
