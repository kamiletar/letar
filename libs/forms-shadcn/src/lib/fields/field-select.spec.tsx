import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { FieldSelect } from './field-select'

describe('FieldSelect (shadcn)', () => {
  it('рендерит label и placeholder триггера', () => {
    render(
      <TestForm defaultValues={{ framework: '' }}>
        <FieldSelect
          name="framework"
          label="Фреймворк"
          placeholder="Выберите"
          options={[
            { label: 'React', value: 'react' },
            { label: 'Vue', value: 'vue' },
          ]}
        />
      </TestForm>,
    )

    expect(screen.getByText('Фреймворк')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('Выберите')
  })

  describe('опция с пустым значением («Все категории»)', () => {
    const optionsWithEmpty = [
      { label: 'Все категории', value: '' },
      { label: 'React', value: 'react' },
    ]

    beforeAll(() => {
      // Radix Select опирается на API указателя и прокрутки, которых нет в jsdom
      Element.prototype.hasPointerCapture = vi.fn(() => false)
      Element.prototype.setPointerCapture = vi.fn()
      Element.prototype.releasePointerCapture = vi.fn()
      Element.prototype.scrollIntoView = vi.fn()
    })

    it('показывает подпись опции с пустым значением, когда значение поля пустое', () => {
      render(
        <TestForm defaultValues={{ framework: '' }}>
          <FieldSelect name="framework" placeholder="Выберите" options={optionsWithEmpty} />
        </TestForm>,
      )

      expect(screen.getByRole('combobox')).toHaveTextContent('Все категории')
    })

    it('без такой опции пустое значение по-прежнему показывает placeholder', () => {
      render(
        <TestForm defaultValues={{ framework: '' }}>
          <FieldSelect name="framework" placeholder="Выберите" options={[{ label: 'React', value: 'react' }]} />
        </TestForm>,
      )

      expect(screen.getByRole('combobox')).toHaveTextContent('Выберите')
    })

    it('выбор опции с пустым значением пишет в форму пустую строку', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
      let form: any
      render(
        <TestForm defaultValues={{ framework: 'react' }} onFormReady={(f) => (form = f)}>
          <FieldSelect name="framework" options={optionsWithEmpty} />
        </TestForm>,
      )

      fireEvent.pointerDown(screen.getByRole('combobox'), { button: 0, ctrlKey: false, pointerType: 'mouse' })
      fireEvent.click(await screen.findByRole('option', { name: 'Все категории' }))

      await waitFor(() => expect(form.state.values.framework).toBe(''))
    })
  })
})
