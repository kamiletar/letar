import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldSelect } from './field-select'

describe('FieldSelect (shadcn)', () => {
  it('рендерит label и placeholder триггера', () => {
    render(
      <TestForm defaultValues={{ framework: '' }}>
        <FieldSelect
          name="framework"
          label="Фреймворк"
          placeholder="Выберите"
          options={[
            { label: 'React', value: 'react' },
            { label: 'Vue', value: 'vue' },
          ]}
        />
      </TestForm>,
    )

    expect(screen.getByText('Фреймворк')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('Выберите')
  })
})
