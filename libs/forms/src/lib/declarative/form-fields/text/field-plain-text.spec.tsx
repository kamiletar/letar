import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createForm } from '../../create-form'
import { FieldPlainText, PlainTextEditor } from './field-plain-text'
import type { PlainTextEditorHandle } from './plain-text-controller'

afterEach(cleanup)
const TestForm = createForm({ extraFields: { PlainText: FieldPlainText } })

describe('FieldPlainText', () => {
  it('отдаёт plain text форме, сохраняет undo после rerender и передаёт blur', async () => {
    const ref = createRef<PlainTextEditorHandle>()
    const save = vi.fn()
    render(
      <ChakraProvider value={defaultSystem}>
        <TestForm initialValue={{ text: 'Луна' }} onSubmit={save}>
          <TestForm.Field.PlainText name="text" label="Текст" editorRef={ref} />
          <TestForm.Button.Submit>Сохранить</TestForm.Button.Submit>
        </TestForm>
      </ChakraProvider>,
    )
    await screen.findByRole('textbox', { name: 'Текст' })
    act(() => {
      ref.current!.setSelection(4)
      ref.current!.insertText('\n\n—')
    })
    await act(async () => {
      screen.getByRole('button', { name: 'Сохранить' }).click()
    })
    expect(save.mock.calls[0]?.[0]).toMatchObject({ text: 'Луна\n\n—' })
    expect(ref.current!.canUndo()).toBe(true)
    act(() => {
      ref.current!.undo()
    })
    expect(ref.current!.getText()).toBe('Луна')
  })
  it('baselineKey сбрасывает только историю, обычное равное value не сбрасывает', async () => {
    const ref = createRef<PlainTextEditorHandle>()
    const onChange = vi.fn()
    const view = render(
      <ChakraProvider value={defaultSystem}>
        <PlainTextEditor value="А" onChange={onChange} editorRef={ref} />
      </ChakraProvider>,
    )
    await waitFor(() => expect(ref.current).not.toBeNull())
    act(() => ref.current!.insertText('Б'))
    view.rerender(
      <ChakraProvider value={defaultSystem}>
        <PlainTextEditor value={ref.current!.getText()} onChange={onChange} editorRef={ref} />
      </ChakraProvider>,
    )
    expect(ref.current!.canUndo()).toBe(true)
    view.rerender(
      <ChakraProvider value={defaultSystem}>
        <PlainTextEditor value="Черновик" baselineKey="restored" onChange={onChange} editorRef={ref} />
      </ChakraProvider>,
    )
    expect(ref.current!.getText()).toBe('Черновик')
    expect(ref.current!.canUndo()).toBe(false)
  })
  it('обновление aria-атрибутов не удаляет обработчик безопасной вставки', async () => {
    const ref = createRef<PlainTextEditorHandle>()
    render(
      <ChakraProvider value={defaultSystem}>
        <PlainTextEditor value="" onChange={vi.fn()} editorRef={ref} label="Редактор" />
      </ChakraProvider>,
    )
    const target = await screen.findByRole('textbox', { name: 'Редактор' })
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (kind: string) => kind === 'text/plain' ? 'Строка\n\n<b>текст</b>' : '<img src=x>' },
    })
    act(() => {
      target.dispatchEvent(event)
    })
    expect(ref.current!.getText()).toBe('Строка\n\n<b>текст</b>')
    expect(target.querySelector('b')).toBeNull()
  })
})
