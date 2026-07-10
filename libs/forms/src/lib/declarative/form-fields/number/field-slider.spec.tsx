import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldSlider', () => {
  describe('рендеринг', () => {
    it('рендерит слайдер', () => {
      render(
        <Form initialValue={{ rating: 5 }} onSubmit={vi.fn()}>
          <Form.Field.Slider name="rating" label="Рейтинг" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Рейтинг')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    it('рендерит с начальным значением', () => {
      render(
        <Form initialValue={{ rating: 7 }} onSubmit={vi.fn()}>
          <Form.Field.Slider name="rating" min={0} max={10} />
        </Form>,
        { wrapper: TestWrapper }
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-valuenow', '7')
    })

    it('устанавливает min и max', () => {
      render(
        <Form initialValue={{ rating: 5 }} onSubmit={vi.fn()}>
          <Form.Field.Slider name="rating" min={1} max={10} />
        </Form>,
        { wrapper: TestWrapper }
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-valuemin', '1')
      expect(slider).toHaveAttribute('aria-valuemax', '10')
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ rating: 5 }} onSubmit={vi.fn()}>
          <Form.Field.Slider name="rating" disabled />
        </Form>,
        { wrapper: TestWrapper }
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-disabled', 'true')
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ rating: 5 }} onSubmit={vi.fn()}>
          <Form.Field.Slider name="rating" helperText="Перетащите ползунок" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Перетащите ползунок')).toBeInTheDocument()
    })
  })
})
