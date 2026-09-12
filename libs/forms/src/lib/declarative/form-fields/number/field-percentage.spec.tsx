import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldPercentage', () => {
  describe('рендеринг', () => {
    it('рендерит числовое поле', () => {
      render(
        <Form initialValue={{ discount: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" label="Скидка" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Скидка')).toBeInTheDocument()
      // NumberInput рендерит spinbutton
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      const { container } = render(
        <Form initialValue={{ discount: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = container.querySelector('[data-field-name="discount"]')
      expect(input).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ discount: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('spinbutton')
      expect(input).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ discount: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" helperText="От 0 до 100" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('От 0 до 100')).toBeInTheDocument()
    })
  })

  describe('minorUnitScale (базисные пункты↔%)', () => {
    it('без minorUnitScale ведёт себя как раньше (scale=1)', () => {
      render(
        <Form initialValue={{ discount: 13 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('13%')
    })

    it('отображает значение в major units (%), храня minor units (б.п.)', () => {
      render(
        <Form initialValue={{ annualRateBps: 1350 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="annualRateBps" minorUnitScale={100} decimalScale={1} />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('13.5%')
    })

    it('при вводе процентов сохраняет в форме целое число базисных пунктов', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(
        <Form initialValue={{ annualRateBps: undefined }} onSubmit={onSubmit}>
          <Form.Field.Percentage name="annualRateBps" minorUnitScale={100} decimalScale={1} />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('spinbutton')
      await user.click(input)
      await user.paste('13.5')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ annualRateBps: 1350 }))
    })

    it('пустое значение остаётся пустым независимо от scale', () => {
      render(
        <Form initialValue={{ annualRateBps: undefined }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="annualRateBps" minorUnitScale={100} />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('')
    })
  })

  describe('редактирование отформатированного значения (тот же класс, что msg 1523/1525, Field.Currency)', () => {
    it('удаление цифры из целой части не корёжит соседние разряды и не сбрасывает значение', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(
        <Form initialValue={{ discount: 5000000 }} onSubmit={onSubmit}>
          <Form.Field.Percentage name="discount" min={0} max={99999999} />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('spinbutton') as HTMLInputElement
      await user.click(input)
      input.setSelectionRange(5, 5)
      await user.keyboard('{Backspace}')
      await user.keyboard('{Backspace}')

      await user.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ discount: 50000 }))
    })

    it('Form.Button.Reset (внешний сброс, не набор пользователем) возвращает исходное отформатированное значение', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ discount: 5000000 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" min={0} max={99999999} />
          <Form.Button.Reset>Reset</Form.Button.Reset>
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('spinbutton') as HTMLInputElement
      const initial = input.value

      await user.click(input)
      input.setSelectionRange(1, 1)
      await user.keyboard('{Backspace}')

      await user.click(screen.getByRole('button', { name: 'Reset' }))
      // NumberInput.Root неконтролируем (defaultValue) — внешний form.reset() ремаунтит поле по
      // `key`, заменяя DOM-узел `<input>` целиком, поэтому запрашиваем элемент заново.
      expect(screen.getByRole('spinbutton')).toHaveValue(initial)
    })
  })
})
