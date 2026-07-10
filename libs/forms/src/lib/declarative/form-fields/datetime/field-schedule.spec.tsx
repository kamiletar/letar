import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const defaultSchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: null,
  sunday: null,
}

describe('FieldSchedule', () => {
  describe('rendering', () => {
    it('рендерит расписание на 7 дней', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ schedule: defaultSchedule }} onSubmit={vi.fn()}>
            <Form.Field.Schedule name="schedule" />
          </Form>
        </TestWrapper>
      )

      // Каждый день недели должен быть виден — используем getAllByText т.к. день встречается в нескольких элементах
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      for (const day of days) {
        const matches = screen.getAllByText(new RegExp(day, 'i'))
        expect(matches.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ schedule: defaultSchedule }} onSubmit={vi.fn()}>
            <Form.Field.Schedule name="schedule" label="Расписание работы" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Расписание работы')).toBeInTheDocument()
    })
  })
})
