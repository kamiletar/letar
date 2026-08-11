import { DeclarativeFormContext } from '@letar/forms-react'
import { useForm } from '@tanstack/react-form'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { FieldAuto } from './field-auto'

const schema = z.object({
  firstName: z.string(),
  bio: z.string().max(300),
  age: z.number(),
  isActive: z.boolean(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.date(),
})

function SchemaTestForm({ children }: { children: ReactNode }) {
  const form = useForm({
    defaultValues: { firstName: '', bio: '', age: 0, isActive: false, role: 'user', createdAt: '' },
  })
  return <DeclarativeFormContext.Provider value={{ form, schema }}>{children}</DeclarativeFormContext.Provider>
}

describe('FieldAuto (shadcn)', () => {
  it('string → FieldString с авто-меткой из camelCase', () => {
    render(
      <SchemaTestForm>
        <FieldAuto name="firstName" />
      </SchemaTestForm>,
    )

    expect(screen.getByText('First Name')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('string с большим maxLength → FieldTextarea', () => {
    render(
      <SchemaTestForm>
        <FieldAuto name="bio" />
      </SchemaTestForm>,
    )

    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })

  it('number → FieldNumber', () => {
    render(
      <SchemaTestForm>
        <FieldAuto name="age" />
      </SchemaTestForm>,
    )

    expect(screen.getByText('Age')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('boolean → FieldCheckbox по умолчанию', () => {
    render(
      <SchemaTestForm>
        <FieldAuto name="isActive" />
      </SchemaTestForm>,
    )

    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('boolean с booleanAsSwitch → FieldSwitch', () => {
    render(
      <SchemaTestForm>
        <FieldAuto name="isActive" config={{ booleanAsSwitch: true }} />
      </SchemaTestForm>,
    )

    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('enum → FieldNativeSelect с опциями', () => {
    render(
      <SchemaTestForm>
        <FieldAuto name="role" />
      </SchemaTestForm>,
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    const optionLabels = Array.from(select.options).map((o) => o.textContent)
    expect(optionLabels).toContain('Admin')
    expect(optionLabels).toContain('User')
    expect(optionLabels).toContain('Guest')
  })

  it('явный label в props имеет приоритет над авто-меткой', () => {
    render(
      <SchemaTestForm>
        <FieldAuto name="firstName" label="Имя клиента" />
      </SchemaTestForm>,
    )

    expect(screen.getByText('Имя клиента')).toBeInTheDocument()
    expect(screen.queryByText('First Name')).not.toBeInTheDocument()
  })

  it('бросает ошибку без name', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Broken = () => <FieldAuto {...({} as any)} />
    expect(() =>
      render(
        <SchemaTestForm>
          <Broken />
        </SchemaTestForm>,
      )
    ).toThrow('Form.Field.Auto requires a name prop')
  })
})
