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
  { value: 'cat', label: 'Кот', image: '/cat.jpg' },
  { value: 'dog', label: 'Собака', image: '/dog.jpg' },
  { value: 'bird', label: 'Птица', image: '/bird.jpg' },
]

describe('FieldImageChoice', () => {
  describe('рендеринг', () => {
    it('рендерит карточки с изображениями', () => {
      render(
        <Form initialValue={{ pet: '' }} onSubmit={vi.fn()}>
          <Form.Field.ImageChoice name="pet" label="Питомец" options={options} />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Питомец')).toBeInTheDocument()
      expect(screen.getByText('Кот')).toBeInTheDocument()
      expect(screen.getByText('Собака')).toBeInTheDocument()
      expect(screen.getByText('Птица')).toBeInTheDocument()
    })

    it('рендерит изображения', () => {
      render(
        <Form initialValue={{ pet: '' }} onSubmit={vi.fn()}>
          <Form.Field.ImageChoice name="pet" options={options} />
        </Form>,
        { wrapper: TestWrapper }
      )

      const images = screen.getAllByRole('img')
      expect(images.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('взаимодействие', () => {
    it('реагирует на клик без ошибок', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ pet: '' }} onSubmit={vi.fn()}>
          <Form.Field.ImageChoice name="pet" options={options} />
        </Form>,
        { wrapper: TestWrapper }
      )

      // Кликаем на карточку — не должно быть ошибок
      await user.click(screen.getByText('Кот'))
    })
  })

  describe('состояния', () => {
    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ pet: '' }} onSubmit={vi.fn()}>
          <Form.Field.ImageChoice name="pet" options={options} helperText="Выберите питомца" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Выберите питомца')).toBeInTheDocument()
    })
  })
})
