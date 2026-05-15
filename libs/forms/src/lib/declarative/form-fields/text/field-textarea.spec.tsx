import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldTextarea', () => {
  describe('рендеринг', () => {
    it('рендерит textarea', () => {
      render(
        <Form initialValue={{ bio: '' }} onSubmit={vi.fn()}>
          <Form.Field.Textarea name="bio" label="Биография" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Биография')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <Form initialValue={{ bio: '' }} onSubmit={vi.fn()}>
          <Form.Field.Textarea name="bio" placeholder="Расскажите о себе..." />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByPlaceholderText('Расскажите о себе...')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      render(
        <Form initialValue={{ bio: '' }} onSubmit={vi.fn()}>
          <Form.Field.Textarea name="bio" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('data-field-name', 'bio')
    })

    it('рендерит с начальным значением', () => {
      render(
        <Form initialValue={{ bio: 'Привет мир' }} onSubmit={vi.fn()}>
          <Form.Field.Textarea name="bio" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('textbox')).toHaveValue('Привет мир')
    })
  })

  describe('взаимодействие', () => {
    it('принимает ввод текста', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ bio: '' }} onSubmit={vi.fn()}>
          <Form.Field.Textarea name="bio" />
        </Form>,
        { wrapper: TestWrapper },
      )

      await user.type(screen.getByRole('textbox'), 'Новый текст')
      expect(screen.getByRole('textbox')).toHaveValue('Новый текст')
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ bio: '' }} onSubmit={vi.fn()}>
          <Form.Field.Textarea name="bio" disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ bio: '' }} onSubmit={vi.fn()}>
          <Form.Field.Textarea name="bio" helperText="Максимум 500 символов" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Максимум 500 символов')).toBeInTheDocument()
    })
  })
})
