import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldRichText } from './field-rich-text'

describe('FieldRichText (shadcn)', () => {
  it('рендерит contenteditable-редактор Tiptap', async () => {
    render(
      <TestForm defaultValues={{ content: '' }}>
        <FieldRichText name="content" label="Содержимое" />
      </TestForm>,
    )

    // Первый рендер в файле оплачивает холодный dynamic import() implementation-чанка
    // (парсинг @tiptap/*) — дефолтного таймаута waitFor (1000ms) на это не хватает.
    await waitFor(() => {
      expect(document.querySelector('[contenteditable]')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('рендерит label', async () => {
    render(
      <TestForm defaultValues={{ content: '' }}>
        <FieldRichText name="content" label="Описание" />
      </TestForm>,
    )

    expect(await screen.findByText('Описание')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.querySelector('[contenteditable]')).toBeInTheDocument()
    })
  })

  it('тулбар по умолчанию показывает кнопки форматирования', async () => {
    render(
      <TestForm defaultValues={{ content: '' }}>
        <FieldRichText name="content" label="Содержимое" />
      </TestForm>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Полужирный' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Курсив' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ссылка' })).toBeInTheDocument()
  })

  it('showToolbar={false} скрывает тулбар', async () => {
    render(
      <TestForm defaultValues={{ content: '' }}>
        <FieldRichText name="content" label="Содержимое" showToolbar={false} />
      </TestForm>,
    )

    await waitFor(() => {
      expect(document.querySelector('[contenteditable]')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Полужирный' })).not.toBeInTheDocument()
  })

  it('toolbarButtons ограничивает набор кнопок', async () => {
    render(
      <TestForm defaultValues={{ content: '' }}>
        <FieldRichText name="content" label="Содержимое" toolbarButtons={['bold', 'italic']} />
      </TestForm>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Полужирный' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Курсив' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ссылка' })).not.toBeInTheDocument()
  })

  it('клик по кнопке Полужирный не роняет редактор (без селекшена в jsdom команда — no-op)', async () => {
    render(
      <TestForm defaultValues={{ content: '' }}>
        <FieldRichText name="content" label="Содержимое" />
      </TestForm>,
    )

    const boldButton = await screen.findByRole('button', { name: 'Полужирный' })
    expect(boldButton).toHaveAttribute('aria-pressed', 'false')

    // jsdom не реализует DOM Selection API до состояния, нужного ProseMirror, чтобы
    // toggleBold() реально применился к выделению — здесь проверяется только отсутствие краша
    // (аналог находки про blur-события в FieldTableEditor, см. libs/forms/PLAN.md §7.3).
    fireEvent.click(boldButton)
    expect(boldButton).toBeInTheDocument()
  })

  it('readOnly скрывает тулбар', async () => {
    render(
      <TestForm defaultValues={{ content: '' }}>
        <FieldRichText name="content" label="Содержимое" readOnly />
      </TestForm>,
    )

    await waitFor(() => {
      expect(document.querySelector('[contenteditable="false"]')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Полужирный' })).not.toBeInTheDocument()
  })

  it('disabled делает кнопки тулбара неактивными', async () => {
    render(
      <TestForm defaultValues={{ content: '' }}>
        <FieldRichText name="content" label="Содержимое" disabled />
      </TestForm>,
    )

    const boldButton = await screen.findByRole('button', { name: 'Полужирный' })
    expect(boldButton).toBeDisabled()
  })

  // @ts-expect-error — toolbarButtons принимает только известные ToolbarButton-значения, negative control проверяет реальную типизацию пропов
  const _typeCheck = <FieldRichText name="content" toolbarButtons={['bogus']} />
})
