import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
  { value: 'other', label: 'Другой' },
]

describe('FieldRadioGroup', () => {
  describe('рендеринг', () => {
    it('рендерит группу радиокнопок', () => {
      render(
        <Form initialValue={{ gender: 'male' }} onSubmit={vi.fn()}>
          <Form.Field.RadioGroup name="gender" label="Пол" options={options} />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Пол')).toBeInTheDocument()
      expect(screen.getAllByRole('radio')).toHaveLength(3)
    })

    it('рендерит все опции с labels', () => {
      render(
        <Form initialValue={{ gender: 'male' }} onSubmit={vi.fn()}>
          <Form.Field.RadioGroup name="gender" options={options} />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Мужской')).toBeInTheDocument()
      expect(screen.getByText('Женский')).toBeInTheDocument()
      expect(screen.getByText('Другой')).toBeInTheDocument()
    })

    it('выбирает начальное значение', () => {
      render(
        <Form initialValue={{ gender: 'female' }} onSubmit={vi.fn()}>
          <Form.Field.RadioGroup name="gender" options={options} />
        </Form>,
        { wrapper: TestWrapper }
      )

      const radios = screen.getAllByRole('radio')
      const femaleRadio = radios.find((r) => r.getAttribute('value') === 'female')
      expect(femaleRadio).toBeChecked()
    })
  })

  describe('взаимодействие', () => {
    it('меняет значение при клике', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ gender: 'male' }} onSubmit={vi.fn()}>
          <Form.Field.RadioGroup name="gender" options={options} />
        </Form>,
        { wrapper: TestWrapper }
      )

      await user.click(screen.getByText('Женский'))
      const radios = screen.getAllByRole('radio')
      const femaleRadio = radios.find((r) => r.getAttribute('value') === 'female')
      expect(femaleRadio).toBeChecked()
    })
  })

  describe('состояния', () => {
    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ gender: 'male' }} onSubmit={vi.fn()}>
          <Form.Field.RadioGroup name="gender" options={options} helperText="Выберите пол" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Выберите пол')).toBeInTheDocument()
    })
  })
})
