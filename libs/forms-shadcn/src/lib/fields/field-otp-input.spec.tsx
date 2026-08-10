import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldOTPInput } from './field-otp-input'

describe('FieldOTPInput (shadcn)', () => {
  it('рендерит length ячеек ввода (по умолчанию 6)', () => {
    render(
      <TestForm defaultValues={{ code: '' }}>
        <FieldOTPInput name="code" label="Код подтверждения" />
      </TestForm>,
    )

    expect(screen.getByText('Код подтверждения')).toBeInTheDocument()
    expect(document.querySelectorAll('input')).toHaveLength(6)
  })

  it('custom length рендерит нужное число ячеек', () => {
    render(
      <TestForm defaultValues={{ code: '' }}>
        <FieldOTPInput name="code" length={4} />
      </TestForm>,
    )

    expect(document.querySelectorAll('input')).toHaveLength(4)
  })

  it('без onResend кнопка/таймер не рендерятся', () => {
    render(
      <TestForm defaultValues={{ code: '' }}>
        <FieldOTPInput name="code" />
      </TestForm>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('с onResend рендерится кнопка повторной отправки', () => {
    render(
      <TestForm defaultValues={{ code: '' }}>
        <FieldOTPInput name="code" onResend={vi.fn()} />
      </TestForm>,
    )

    expect(screen.getByRole('button', { name: 'Отправить код повторно' })).toBeInTheDocument()
  })

  it('клик по кнопке повторной отправки вызывает onResend', async () => {
    const onResend = vi.fn().mockResolvedValue(undefined)
    render(
      <TestForm defaultValues={{ code: '' }}>
        <FieldOTPInput name="code" onResend={onResend} />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Отправить код повторно' }))
    expect(onResend).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getByText(/Повторно через/)).toBeInTheDocument()
    })
  })

  // @ts-expect-error — length обязан быть number, негативный контроль типов
  const _typeCheck = <FieldOTPInput name="code" length="6" />
})
