import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FileTrigger } from './file-trigger'

describe('FileTrigger', () => {
  it('рендерит children с htmlFor, связанным со скрытым input', () => {
    render(
      <FileTrigger onChange={vi.fn()}>
        {({ htmlFor }) => <label htmlFor={htmlFor}>Выбрать файл</label>}
      </FileTrigger>,
    )

    const label = screen.getByText('Выбрать файл')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(label).toHaveAttribute('for', input.id)
  })

  it('input скрыт (display: none)', () => {
    render(
      <FileTrigger onChange={vi.fn()}>{({ htmlFor }) => <label htmlFor={htmlFor}>Файл</label>}</FileTrigger>,
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toHaveStyle({ display: 'none' })
  })

  it('прокидывает accept, multiple, disabled на input', () => {
    render(
      <FileTrigger onChange={vi.fn()} accept=".csv,.txt" multiple disabled>
        {({ htmlFor }) => <label htmlFor={htmlFor}>Файл</label>}
      </FileTrigger>,
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toHaveAttribute('accept', '.csv,.txt')
    expect(input).toHaveAttribute('multiple')
    expect(input).toBeDisabled()
  })

  it('вызывает onChange с выбранным файлом', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(
      <FileTrigger onChange={handleChange}>
        {({ htmlFor }) => <label htmlFor={htmlFor}>Выбрать файл</label>}
      </FileTrigger>,
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

    await user.upload(input, file)

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(input.files?.[0]).toBe(file)
  })

  it('input и label не вложены друг в друга (соседи)', () => {
    render(
      <FileTrigger onChange={vi.fn()}>{({ htmlFor }) => <label htmlFor={htmlFor}>Файл</label>}</FileTrigger>,
    )

    const label = document.querySelector('label') as HTMLLabelElement
    expect(label.querySelector('input')).toBeNull()
  })
})
