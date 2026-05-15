import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createForm } from './create-form'
import { Form } from './index'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Мок-компонент для extraSelects
function MockSelectType(props: { name: string; label?: string }) {
  return <div data-testid={`select-${props.name}`}>MockSelect: {props.label}</div>
}

// Мок-компонент для extraComboboxes
function MockComboboxUser(props: { name: string; label?: string }) {
  return <div data-testid={`combobox-${props.name}`}>MockCombobox: {props.label}</div>
}

// Мок-компонент для extraFields
function MockCustomField(props: { name: string; label?: string }) {
  return <div data-testid={`custom-${props.name}`}>MockField: {props.label}</div>
}

// Мок-компонент для extraListboxes
function MockListboxTags(props: { name: string; label?: string }) {
  return <div data-testid={`listbox-${props.name}`}>MockListbox: {props.label}</div>
}

describe('createForm', () => {
  describe('базовая функциональность', () => {
    it('возвращает форму без опций', () => {
      const AppForm = createForm()

      expect(AppForm).toBeDefined()
      expect(typeof AppForm).toBe('function')
    })

    it('сохраняет стандартные Field компоненты', () => {
      const AppForm = createForm()

      expect(AppForm.Field.String).toBeDefined()
      expect(AppForm.Field.Number).toBeDefined()
      expect(AppForm.Field.Date).toBeDefined()
      expect(AppForm.Field.Select).toBeDefined()
      expect(AppForm.Field.Checkbox).toBeDefined()
    })

    it('сохраняет стандартные Button компоненты', () => {
      const AppForm = createForm()

      expect(AppForm.Button.Submit).toBeDefined()
      expect(AppForm.Button.Reset).toBeDefined()
    })

    it('сохраняет form-level компоненты', () => {
      const AppForm = createForm()

      expect(AppForm.Group).toBeDefined()
      expect(AppForm.Errors).toBeDefined()
      expect(AppForm.DirtyGuard).toBeDefined()
      expect(AppForm.When).toBeDefined()
      expect(AppForm.Steps).toBeDefined()
      expect(AppForm.AutoFields).toBeDefined()
      expect(AppForm.FromSchema).toBeDefined()
    })

    it('рендерит форму с базовыми полями', () => {
      const AppForm = createForm()

      render(
        <TestWrapper>
          <AppForm initialValue={{ title: 'test' }} onSubmit={vi.fn()}>
            <AppForm.Field.String name="title" label="Название" />
            <AppForm.Button.Submit>Сохранить</AppForm.Button.Submit>
          </AppForm>
        </TestWrapper>
      )

      expect(screen.getByText('Название')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument()
    })
  })

  describe('extraSelects', () => {
    it('добавляет кастомные Select компоненты', () => {
      const AppForm = createForm({
        extraSelects: { Type: MockSelectType },
      })

      expect(AppForm.Select.Type).toBe(MockSelectType)
    })

    it('рендерит кастомный Select', () => {
      const AppForm = createForm({
        extraSelects: { Type: MockSelectType },
      })

      render(
        <TestWrapper>
          <AppForm initialValue={{ type: '' }} onSubmit={vi.fn()}>
            <AppForm.Select.Type name="type" label="Тип" />
          </AppForm>
        </TestWrapper>
      )

      expect(screen.getByTestId('select-type')).toHaveTextContent('MockSelect: Тип')
    })
  })

  describe('extraComboboxes', () => {
    it('добавляет кастомные Combobox компоненты', () => {
      const AppForm = createForm({
        extraComboboxes: { User: MockComboboxUser },
      })

      expect(AppForm.Combobox.User).toBe(MockComboboxUser)
    })

    it('рендерит кастомный Combobox', () => {
      const AppForm = createForm({
        extraComboboxes: { User: MockComboboxUser },
      })

      render(
        <TestWrapper>
          <AppForm initialValue={{ userId: '' }} onSubmit={vi.fn()}>
            <AppForm.Combobox.User name="userId" label="Пользователь" />
          </AppForm>
        </TestWrapper>
      )

      expect(screen.getByTestId('combobox-userId')).toHaveTextContent('MockCombobox: Пользователь')
    })
  })

  describe('extraListboxes', () => {
    it('добавляет кастомные Listbox компоненты', () => {
      const AppForm = createForm({
        extraListboxes: { Tags: MockListboxTags },
      })

      expect(AppForm.Listbox.Tags).toBe(MockListboxTags)
    })
  })

  describe('extraFields', () => {
    it('добавляет кастомные Field компоненты', () => {
      const AppForm = createForm({
        extraFields: { PlateNumber: MockCustomField },
      })

      // extraFields добавляются в Field
      expect(AppForm.Field.PlateNumber).toBe(MockCustomField)
    })

    it('не перезатирает стандартные Field', () => {
      const AppForm = createForm({
        extraFields: { PlateNumber: MockCustomField },
      })

      // Стандартные компоненты на месте
      expect(AppForm.Field.String).toBe(Form.Field.String)
      expect(AppForm.Field.Number).toBe(Form.Field.Number)
    })
  })

  describe('комбинирование расширений', () => {
    it('поддерживает все типы расширений одновременно', () => {
      const AppForm = createForm({
        extraFields: { PlateNumber: MockCustomField },
        extraSelects: { Type: MockSelectType },
        extraComboboxes: { User: MockComboboxUser },
        extraListboxes: { Tags: MockListboxTags },
      })

      expect(AppForm.Field.PlateNumber).toBe(MockCustomField)
      expect(AppForm.Select.Type).toBe(MockSelectType)
      expect(AppForm.Combobox.User).toBe(MockComboboxUser)
      expect(AppForm.Listbox.Tags).toBe(MockListboxTags)
    })
  })
})
