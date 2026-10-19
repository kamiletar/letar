import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { createForm } from './create-form'

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

describe('extraFields в реестре createForm (forms 2.42)', () => {
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

  it('без extraFields RichText остаётся встроенным (совместимость 2.x)', () => {
    const AppForm = createForm()
    expect(AppForm.Field.RichText).not.toBe(RichTextStub)
    expect(AppForm.Field.RichText).toBeDefined()
  })
})
