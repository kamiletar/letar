import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldImageChoice } from './field-image-choice'

const options = [
  { value: 'modern', label: 'Современный', image: '/styles/modern.jpg' },
  { value: 'classic', label: 'Классический', image: '/styles/classic.jpg', description: 'Классика' },
]

describe('FieldImageChoice (shadcn)', () => {
  it('рендерит все опции с изображениями', () => {
    render(
      <TestForm defaultValues={{ style: '' }}>
        <FieldImageChoice name="style" label="Стиль" options={options} />
      </TestForm>,
    )

    expect(screen.getByText('Стиль')).toBeInTheDocument()
    expect(screen.getByText('Современный')).toBeInTheDocument()
    expect(screen.getByText('Классический')).toBeInTheDocument()
    expect(screen.getByText('Классика')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(2)
  })

  it('single-режим: выбирает одну опцию', () => {
    render(
      <TestForm defaultValues={{ style: '' }}>
        <FieldImageChoice name="style" label="Стиль" options={options} />
      </TestForm>,
    )

    fireEvent.click(screen.getByText('Современный'))
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('multiple-режим: выбирает несколько опций', () => {
    render(
      <TestForm defaultValues={{ styles: [] }}>
        <FieldImageChoice name="styles" label="Стили" options={options} multiple />
      </TestForm>,
    )

    fireEvent.click(screen.getByText('Современный'))
    fireEvent.click(screen.getByText('Классический'))
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true')
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('multiple-режим: повторный клик снимает выбор', () => {
    render(
      <TestForm defaultValues={{ styles: ['modern'] }}>
        <FieldImageChoice name="styles" label="Стили" options={options} multiple />
      </TestForm>,
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByText('Современный'))
    expect(checkboxes[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('disabled блокирует выбор', () => {
    render(
      <TestForm defaultValues={{ style: '' }}>
        <FieldImageChoice name="style" label="Стиль" options={options} disabled />
      </TestForm>,
    )

    fireEvent.click(screen.getByText('Современный'))
    expect(screen.getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'false')
  })
})
