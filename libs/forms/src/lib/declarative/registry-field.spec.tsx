import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { createForm } from './create-form'
import { renderFieldByType } from './field-type-mapper'
import { Form } from './index'
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
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  resetReportedRegistryKeys()
})

/** Компонент справочника из реестра: показывает, какие пропсы до него дошли */
function WorkCategorySelect(props: Record<string, unknown>) {
  const { name, label, required, placeholder, helperText, relation, ...rest } = props
  return (
    <div
      data-testid="work-category"
      data-name={String(name)}
      data-label={String(label)}
      data-required={String(required)}
      data-placeholder={String(placeholder)}
      data-helper={String(helperText)}
      data-has-relation={String(relation !== undefined)}
      data-rest={JSON.stringify(rest)}
    />
  )
}

const schema = z.object({
  categoryId: z.string().meta({
    ui: {
      title: 'Категория работ',
      placeholder: 'Выберите',
      description: 'Справочник',
      fieldType: 'Select.WorkCategory',
      fieldProps: { createItem: false, relation: { model: 'WorkCategory', labelField: 'name' } },
    },
  }),
})

const initialValue = { categoryId: '' }

describe('ключ реестра createForm в схеме (§17.3)', () => {
  it('E2: Form.Field.Auto рисует компонент реестра, relation не распыляется', () => {
    const AppForm = createForm({ extraSelects: { WorkCategory: WorkCategorySelect } })
    render(
      <TestWrapper>
        <AppForm schema={schema} initialValue={initialValue} onSubmit={vi.fn()}>
          <AppForm.Field.Auto name="categoryId" />
        </AppForm>
      </TestWrapper>,
    )
    const node = screen.getByTestId('work-category')
    expect(node).toHaveAttribute('data-name', 'categoryId')
    expect(node).toHaveAttribute('data-label', 'Категория работ')
    expect(node).toHaveAttribute('data-placeholder', 'Выберите')
    expect(node).toHaveAttribute('data-helper', 'Справочник')
    expect(node).toHaveAttribute('data-has-relation', 'false')
    expect(JSON.parse(node.getAttribute('data-rest') ?? '{}')).toMatchObject({ createItem: false })
  })

  it('E3: Form.AutoFields рисует компонент реестра', () => {
    const AppForm = createForm({ extraSelects: { WorkCategory: WorkCategorySelect } })
    render(
      <TestWrapper>
        <AppForm schema={schema} initialValue={initialValue} onSubmit={vi.fn()}>
          <AppForm.AutoFields />
        </AppForm>
      </TestWrapper>,
    )
    expect(screen.getByTestId('work-category')).toHaveAttribute('data-name', 'categoryId')
  })

  it('E4: ключ из lazySelects — после загрузки чанка виден компонент', async () => {
    const AppForm = createForm({ lazySelects: { WorkCategory: async () => WorkCategorySelect } })
    render(
      <TestWrapper>
        <AppForm schema={schema} initialValue={initialValue} onSubmit={vi.fn()}>
          <AppForm.AutoFields />
        </AppForm>
      </TestWrapper>,
    )
    expect(await screen.findByTestId('work-category')).toBeInTheDocument()
  })

  it('E5: ключа нет в реестре — в dev исключение с перечнем доступных ключей', () => {
    const AppForm = createForm({ extraSelects: { Unit: WorkCategorySelect, Status: WorkCategorySelect } })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      render(
        <TestWrapper>
          <AppForm schema={schema} initialValue={initialValue} onSubmit={vi.fn()}>
            <AppForm.AutoFields />
          </AppForm>
        </TestWrapper>,
      )
    ).toThrow(/categoryId.*Select\.WorkCategory.*Unit, Status.*extraSelects или lazySelects/s)
  })

  it('E6: форма не из createForm — исключение про createForm-инстанс', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      render(
        <TestWrapper>
          <Form schema={schema} initialValue={initialValue} onSubmit={vi.fn()}>
            <Form.AutoFields />
          </Form>
        </TestWrapper>,
      )
    ).toThrow(/только в форме createForm-инстанса/)
  })

  it('E7: production — console.error один раз на ключ, рисуется базовый Select', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const AppForm = createForm({})
    const ui = (
      <TestWrapper>
        <AppForm schema={schema} initialValue={initialValue} onSubmit={vi.fn()}>
          <AppForm.AutoFields />
        </AppForm>
      </TestWrapper>
    )
    const { rerender } = render(ui)
    rerender(ui)
    const calls = error.mock.calls.filter((call) => String(call[0]).includes('Select.WorkCategory'))
    expect(calls).toHaveLength(1)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('E9: ключ и form.relation.* на одном поле — dev-предупреждение, побеждает ключ', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const AppForm = createForm({ extraSelects: { WorkCategory: WorkCategorySelect } })
    render(
      <TestWrapper>
        <AppForm schema={schema} initialValue={initialValue} onSubmit={vi.fn()}>
          <AppForm.AutoFields />
        </AppForm>
      </TestWrapper>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Select.WorkCategory wins'))
  })

  it('неизвестный встроенный тип — dev-предупреждение, текстовое поле', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <TestWrapper>
        <Form schema={z.object({ a: z.string() })} initialValue={{ a: '' }} onSubmit={vi.fn()}>
          {renderFieldByType('selct' as never, { name: 'a' })}
        </Form>
      </TestWrapper>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"selct"'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
