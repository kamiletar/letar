import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldTags } from './field-tags'

describe('FieldTags (shadcn)', () => {
  it('добавляет тег по Enter', () => {
    render(
      <TestForm defaultValues={{ tags: [] }}>
        <FieldTags name="tags" label="Теги" />
      </TestForm>,
    )

    const textbox = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement
    fireEvent.change(textbox, { target: { value: 'react' } })
    fireEvent.keyDown(textbox, { key: 'Enter' })

    expect(screen.getByText('react')).toBeInTheDocument()
  })

  it('удаляет тег по клику на крестик', () => {
    render(
      <TestForm defaultValues={{ tags: ['react', 'vue'] }}>
        <FieldTags name="tags" label="Теги" />
      </TestForm>,
    )

    expect(screen.getByText('react')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Удалить react' }))
    expect(screen.queryByText('react')).not.toBeInTheDocument()
    expect(screen.getByText('vue')).toBeInTheDocument()
  })

  it('не добавляет дубликат тега', () => {
    render(
      <TestForm defaultValues={{ tags: ['react'] }}>
        <FieldTags name="tags" label="Теги" />
      </TestForm>,
    )

    const textbox = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement
    fireEvent.change(textbox, { target: { value: 'react' } })
    fireEvent.keyDown(textbox, { key: 'Enter' })

    expect(screen.getAllByText('react')).toHaveLength(1)
  })
})
