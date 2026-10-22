import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { createForm } from './create-form'
import { Form } from './index'

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

/** Подключаемое поле: показывает, что до него дошли имя и подпись из схемы */
function RichTextStub(props: Record<string, unknown>) {
  return <div data-testid="rich-text-stub" data-name={String(props.name)} data-label={String(props.label)} />
}

const schema = z.object({
  body: z.string().meta({ ui: { title: 'Текст', fieldType: 'richText' } }),
})

describe('extraFields в реестре createForm', () => {
  it('fieldType: richText рисует поле из extraFields, а не встроенное', () => {
    const AppForm = createForm({ extraFields: { RichText: RichTextStub } })
    render(
      <TestWrapper>
        <AppForm schema={schema} initialValue={{ body: '' }} onSubmit={vi.fn()}>
          <AppForm.AutoFields />
        </AppForm>
      </TestWrapper>,
    )
    const node = screen.getByTestId('rich-text-stub')
    expect(node).toHaveAttribute('data-name', 'body')
    expect(node).toHaveAttribute('data-label', 'Текст')
  })

  it('Form.Field.Auto с тем же fieldType берёт поле из реестра', () => {
    const AppForm = createForm({ extraFields: { RichText: RichTextStub } })
    render(
      <TestWrapper>
        <AppForm schema={schema} initialValue={{ body: '' }} onSubmit={vi.fn()}>
          <AppForm.Field.Auto name="body" />
        </AppForm>
      </TestWrapper>,
    )
    expect(screen.getByTestId('rich-text-stub')).toBeInTheDocument()
  })

  it('прямой JSX: AppForm.Field.RichText — это компонент из extraFields', () => {
    const AppForm = createForm({ extraFields: { RichText: RichTextStub } })
    expect(AppForm.Field.RichText).toBe(RichTextStub)
  })

  it('без extraFields в Field нет ни RichText, ни DataGrid, ни TableEditor (3.0)', () => {
    const AppForm = createForm()
    expect(AppForm.Field).not.toHaveProperty('RichText')
    expect(AppForm.Field).not.toHaveProperty('DataGrid')
    expect(AppForm.Field).not.toHaveProperty('TableEditor')
    expect(Form.Field).not.toHaveProperty('RichText')
    expect(Form.Field).not.toHaveProperty('DataGrid')
    expect(Form.Field).not.toHaveProperty('TableEditor')
  })
})

describe('fieldType: richText без регистрации (3.0)', () => {
  const warnSchema = (name: string) =>
    z.object({
      [name]: z.string().meta({ ui: { title: 'Текст', fieldType: 'richText' } }),
    })

  it('рисует обычный Textarea вместо редактора', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const AppForm = createForm()
    render(
      <TestWrapper>
        <AppForm schema={warnSchema('fallbackBody')} initialValue={{ fallbackBody: '' }} onSubmit={vi.fn()}>
          <AppForm.AutoFields />
        </AppForm>
      </TestWrapper>,
    )
    expect(screen.getByRole('textbox')).toBeInstanceOf(HTMLTextAreaElement)
    vi.restoreAllMocks()
  })

  it('предупреждает в dev один раз на поле, с подсказкой про @letar/forms/rich-text', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const AppForm = createForm()
    const { rerender } = render(
      <TestWrapper>
        <AppForm schema={warnSchema('warnedBody')} initialValue={{ warnedBody: '' }} onSubmit={vi.fn()}>
          <AppForm.AutoFields />
        </AppForm>
      </TestWrapper>,
    )
    // Повторный рендер того же поля не добавляет предупреждений
    rerender(
      <TestWrapper>
        <AppForm schema={warnSchema('warnedBody')} initialValue={{ warnedBody: '' }} onSubmit={vi.fn()}>
          <AppForm.AutoFields />
        </AppForm>
      </TestWrapper>,
    )
    const richTextWarnings = warn.mock.calls.filter(([text]) => String(text).includes('warnedBody'))
    expect(richTextWarnings).toHaveLength(1)
    expect(String(richTextWarnings[0][0])).toContain("'@letar/forms/rich-text'")
    vi.restoreAllMocks()
  })

  it('с зарегистрированным RichText предупреждения нет', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const AppForm = createForm({ extraFields: { RichText: RichTextStub } })
    render(
      <TestWrapper>
        <AppForm schema={warnSchema('registeredBody')} initialValue={{ registeredBody: '' }} onSubmit={vi.fn()}>
          <AppForm.AutoFields />
        </AppForm>
      </TestWrapper>,
    )
    expect(warn.mock.calls.filter(([text]) => String(text).includes('registeredBody'))).toHaveLength(0)
    vi.restoreAllMocks()
  })
})
