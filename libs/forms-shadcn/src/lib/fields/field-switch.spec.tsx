import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldSwitch } from './field-switch'

describe('FieldSwitch (shadcn)', () => {
  it('рендерит с меткой и начальным значением', () => {
    render(
      <TestForm defaultValues={{ notify: false }}>
        <FieldSwitch name="notify" label="Уведомления" />
      </TestForm>,
    )

    expect(screen.getByText('Уведомления')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked')
  })

  it('переключается по клику', () => {
    render(
      <TestForm defaultValues={{ notify: false }}>
        <FieldSwitch name="notify" label="Уведомления" />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked')
  })
})
