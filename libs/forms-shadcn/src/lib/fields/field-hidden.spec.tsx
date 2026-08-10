import { TestForm } from '@letar/forms-react/testing'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldHidden } from './field-hidden'
import { FieldString } from './field-string'

describe('FieldHidden (shadcn)', () => {
  it('не рендерит DOM-элементов', () => {
    const { container } = render(
      <TestForm defaultValues={{ utm: '' }}>
        <FieldHidden name="utm" value="landing" />
      </TestForm>,
    )

    expect(container.querySelector('input')).not.toBeInTheDocument()
  })

  it('синхронизирует value с form state', () => {
    render(
      <TestForm defaultValues={{ utm: '' }}>
        <FieldHidden name="utm" value="landing" />
        <FieldString name="utm" label="UTM" />
      </TestForm>,
    )

    expect(document.querySelector('input[data-field-name="utm"]')).toHaveValue('landing')
  })
})
