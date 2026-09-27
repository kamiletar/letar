import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldEditable } from './field-editable'

/**
 * Placeholder-фолбэк превью `Form.Field.Editable` (shadcn-скин, показывается при пустом значении
 * и без явного пропа `placeholder`) идёт через словарь `formFieldPlaceholder.*`
 * (`@letar/forms-react`): без провайдера — русский (прежний хардкод скина), `locale="en"` —
 * английский, как у Chakra-версии поля.
 */

function renderField(i18n?: { locale: string; t?: (key: string) => string }) {
  const form = (
    <TestForm defaultValues={{ title: '' }}>
      <FieldEditable name="title" label="Название" />
    </TestForm>
  )
  render(i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form)
}

describe('FieldEditable (shadcn) — placeholder-фолбэк через i18n', () => {
  it('без провайдера: русский (прежний хардкод)', () => {
    renderField()
    expect(screen.getByText('Нажмите для редактирования')).toBeInTheDocument()
  })

  it('locale="en": английский, как у Chakra', () => {
    renderField({ locale: 'en' })
    expect(screen.getByText('Click to edit')).toBeInTheDocument()
  })

  it('t приложения переопределяет словарь по ключу', () => {
    const t = (key: string) => key === 'formFieldPlaceholder.editable' ? 'Кликните сюда' : key
    renderField({ locale: 'en', t })
    expect(screen.getByText('Кликните сюда')).toBeInTheDocument()
  })

  it('явный проп placeholder сильнее встроенного словаря', () => {
    render(
      <TestForm defaultValues={{ title: '' }}>
        <FieldEditable name="title" placeholder="Нажмите, чтобы добавить" />
      </TestForm>,
    )
    expect(screen.getByText('Нажмите, чтобы добавить')).toBeInTheDocument()
  })
})
