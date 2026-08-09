import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldPhone', () => {
  describe('рендеринг', () => {
    it('рендерит input с type="tel"', () => {
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" label="Телефон" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'tel')
      expect(input).toHaveAttribute('inputmode', 'tel')
    })

    it('рендерит label', () => {
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" label="Номер телефона" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Номер телефона')).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" placeholder="+7 (___) ___-__-__" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByPlaceholderText('+7 (___) ___-__-__')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('data-field-name', 'phone')
    })
  })

  describe('страна', () => {
    it('рендерит с дефолтной страной RU', () => {
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" />
        </Form>,
        { wrapper: TestWrapper },
      )

      // По умолчанию RU — маска +7
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('рендерит флаг при showFlag=true', () => {
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" country="RU" showFlag />
        </Form>,
        { wrapper: TestWrapper },
      )

      // Флаг 🇷🇺 должен быть видимым
      expect(screen.getByText('🇷🇺')).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('рендерит с начальным значением', () => {
      render(
        <Form initialValue={{ phone: '+79001234567' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      // Маска форматирует номер автоматически
      expect(input).toHaveValue('+7 (900) 123-45-67')
    })

    it('форматирует номер при посимвольном вводе (регрессия WebKit-бага dsperevod-e2e)', async () => {
      // Раньше маска накладывалась через `use-mask-input` (imask), мутирующий DOM в обход
      // React — конфликтовало с controlled value именно при посимвольном вводе в WebKit,
      // Chromium/Firefox проходили. `userEvent.type` эмулирует тот же посимвольный ввод.
      const user = userEvent.setup()
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '9185568172')

      expect(input).toHaveValue('+7 (918) 556-81-72')
    })

    it('наследует disabled из формы', () => {
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()} disabled>
          <Form.Field.Phone name="phone" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })
  })

  describe('helperText и tooltip', () => {
    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ phone: '' }} onSubmit={vi.fn()}>
          <Form.Field.Phone name="phone" helperText="Формат: +7 (XXX) XXX-XX-XX" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Формат: +7 (XXX) XXX-XX-XX')).toBeInTheDocument()
    })
  })
})
