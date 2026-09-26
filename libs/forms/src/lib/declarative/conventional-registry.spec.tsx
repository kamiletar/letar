import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { createForm, type FormRegistryUnregistered } from './create-form'
import { resetReportedRegistryKeys } from './registry-field'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
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
  resetReportedRegistryKeys()
})

/** Компонент справочника из реестра: показывает, какие пропсы до него дошли */
function WorkCategorySelect(props: Record<string, unknown>) {
  return <div data-testid="work-category" data-name={String(props.name)} data-label={String(props.label)} />
}

const withName = (ui: Record<string, unknown>) =>
  z.object({
    title: z.string().meta({ ui: { title: 'Название' } }),
    categoryId: z.string().meta({ ui: { title: 'Категория', ...ui } }),
  })

const initialValue = { title: '', categoryId: '' }

function renderAuto(AppForm: ReturnType<typeof createForm>, schema: z.ZodType<typeof initialValue>) {
  return render(
    <TestWrapper>
      <AppForm schema={schema} initialValue={initialValue} onSubmit={vi.fn()}>
        <AppForm.AutoFields />
      </AppForm>
    </TestWrapper>,
  )
}

describe('автоподбор компонента реестра по имени модели/enum (§17.9, этап Ж)', () => {
  it('EJ1: подсказка registryName и компонент Select.<Имя> в реестре — рисуется он, пропсы как у явного ключа', () => {
    const AppForm = createForm({ extraSelects: { WorkCategory: WorkCategorySelect } })
    renderAuto(AppForm, withName({ registryName: 'WorkCategory' }))
    const node = screen.getByTestId('work-category')
    expect(node).toHaveAttribute('data-name', 'categoryId')
    expect(node).toHaveAttribute('data-label', 'Категория')
  })

  it('EJ1b: компонент из lazySelects находится по имени так же', async () => {
    const AppForm = createForm({ lazySelects: { WorkCategory: async () => WorkCategorySelect } })
    renderAuto(AppForm, withName({ registryName: 'WorkCategory' }))
    expect(await screen.findByTestId('work-category')).toBeInTheDocument()
  })

  it('EJ2: компонента нет в реестре — обычное поле без ошибок и предупреждений', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const AppForm = createForm({ extraSelects: { Unit: WorkCategorySelect } })
    renderAuto(AppForm, withName({ registryName: 'WorkCategory' }))
    expect(screen.queryByTestId('work-category')).toBeNull()
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('EJ3: явный ключ побеждает подсказку', () => {
    function UnitSelect() {
      return <div data-testid="unit" />
    }
    const AppForm = createForm({ extraSelects: { WorkCategory: WorkCategorySelect, Unit: UnitSelect } })
    renderAuto(AppForm, withName({ registryName: 'WorkCategory', fieldType: 'Select.Unit' }))
    expect(screen.getByTestId('unit')).toBeInTheDocument()
    expect(screen.queryByTestId('work-category')).toBeNull()
  })

  it('EJ4: встроенный fieldType отключает автоподбор', () => {
    const AppForm = createForm({ extraSelects: { WorkCategory: WorkCategorySelect } })
    renderAuto(AppForm, withName({ registryName: 'WorkCategory', fieldType: 'string' }))
    expect(screen.queryByTestId('work-category')).toBeNull()
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
  })

  it('EJ5: набор полей формы не меняется — подсказка не втягивает и не убирает поля', () => {
    const AppForm = createForm({ extraSelects: { WorkCategory: WorkCategorySelect } })
    const { container } = renderAuto(AppForm, withName({ registryName: 'WorkCategory' }))
    // «Название» (обычное поле) + один компонент реестра вместо поля «Категория»
    expect(container.querySelectorAll('input')).toHaveLength(1)
    expect(screen.getAllByTestId('work-category')).toHaveLength(1)
  })

  it('EJ6: Combobox.<Имя> в реестре не подбирается — только Select', () => {
    const AppForm = createForm({ extraComboboxes: { WorkCategory: WorkCategorySelect } })
    renderAuto(AppForm, withName({ registryName: 'WorkCategory' }))
    expect(screen.queryByTestId('work-category')).toBeNull()
  })

  it('EJ7: Form.Field.Auto подбирает компонент так же, как Form.AutoFields', () => {
    const AppForm = createForm({ extraSelects: { WorkCategory: WorkCategorySelect } })
    render(
      <TestWrapper>
        <AppForm schema={withName({ registryName: 'WorkCategory' })} initialValue={initialValue} onSubmit={vi.fn()}>
          <AppForm.Field.Auto name="categoryId" />
        </AppForm>
      </TestWrapper>,
    )
    expect(screen.getByTestId('work-category')).toHaveAttribute('data-name', 'categoryId')
  })

  it('EJ8: подсказка в форме не из createForm (нет реестра) — обычное поле, без исключения', () => {
    // Форма без реестра не должна падать: подсказка — не явный ключ
    const AppForm = createForm({})
    renderAuto(AppForm, withName({ registryName: 'WorkCategory' }))
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
  })
})

describe('FormRegistryUnregistered — кандидаты без компонента (типы)', () => {
  it('never, когда все кандидаты зарегистрированы; иначе перечень недостающих', () => {
    const AppForm = createForm({ extraSelects: { WorkCategory: WorkCategorySelect } })
    const covered: FormRegistryUnregistered<typeof AppForm, 'WorkCategory'> = undefined as never
    const uncovered: FormRegistryUnregistered<typeof AppForm, 'WorkCategory' | 'Unit'> = 'Unit'
    // @ts-expect-error — WorkCategory зарегистрирован, среди недостающих его нет
    const wrong: FormRegistryUnregistered<typeof AppForm, 'WorkCategory' | 'Unit'> = 'WorkCategory'
    expect([covered, uncovered, wrong]).toHaveLength(3)
  })
})
