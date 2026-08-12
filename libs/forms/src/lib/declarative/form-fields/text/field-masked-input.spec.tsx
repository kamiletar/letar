import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldMaskedInput', () => {
  describe('рендеринг', () => {
    it('рендерит input с маской', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" formatDescription="3 цифры - 3 цифры" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Код')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" formatDescription="Формат: XXX-XXX" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('data-field-name', 'code')
    })

    it('рендерит placeholder', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput
            name="code"
            mask="999-999"
            placeholder="___-___"
            formatDescription="Формат: XXX-XXX"
          />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByPlaceholderText('___-___')).toBeInTheDocument()
    })

    it('рендерит formatDescription и связывает его через aria-describedby (WCAG 3.3.2)', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" formatDescription="Формат: 3 цифры, дефис, 3 цифры" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const description = screen.getByText('Формат: 3 цифры, дефис, 3 цифры')
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', description.id)
    })
  })

  describe('маскирование ввода', () => {
    it('форматирует значение по маске при посимвольном вводе', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" formatDescription="Формат: XXX-XXX" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '123456')

      expect(input).toHaveValue('123-456')
    })

    it('поддерживает буквенную маску (a)', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="aa-999" formatDescription="Формат: буквы-цифры" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'AB123')

      expect(input).toHaveValue('AB-123')
    })

    it('пропускает символы не по маске, не дописывая незаполненный хвост', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" formatDescription="Формат: XXX-XXX" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      // "a"/"b" — не цифры, движок их отбрасывает; незаполненный хвост маски не дорисовывается
      await user.type(input, 'a12b34')

      expect(input).toHaveValue('123-4')
    })

    it('объявляет отвергнутый символ через aria-live="polite"', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" formatDescription="Формат: XXX-XXX" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'a')

      const liveRegion = document.querySelector('[aria-live="polite"]')
      expect(liveRegion).not.toBeNull()
      expect(liveRegion?.textContent).not.toBe('')
    })

    it('форматирует начальное значение по маске при монтировании', () => {
      render(
        <Form initialValue={{ code: '123456' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" formatDescription="Формат: XXX-XXX" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('textbox')).toHaveValue('123-456')
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" disabled formatDescription="Формат: XXX-XXX" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput
            name="code"
            mask="999-999"
            helperText="Формат: XXX-XXX"
            formatDescription="Формат: XXX-XXX"
          />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getAllByText('Формат: XXX-XXX').length).toBeGreaterThan(0)
    })
  })

  describe('a11y-контракт (MASK_ENGINE.md §6.6)', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('без formatDescription — ошибка в dev-консоли (WCAG 3.3.2)', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('formatDescription'))
    })
  })
})
