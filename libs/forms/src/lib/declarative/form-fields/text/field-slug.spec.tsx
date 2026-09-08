import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldSlug', () => {
  describe('рендеринг', () => {
    it('рендерит поле слага', () => {
      render(
        <Form initialValue={{ name: '', slug: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Название" />
          <Form.Field.Slug name="slug" source="name" label="URL" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('URL')).toBeInTheDocument()
    })

    it('не показывает кнопку «подставить из названия», пока синхронизация активна', () => {
      render(
        <Form initialValue={{ name: '', slug: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Название" />
          <Form.Field.Slug name="slug" source="name" label="URL" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.queryByLabelText('Подставить из названия')).not.toBeInTheDocument()
    })
  })

  describe('создание — синхронизация включена по умолчанию', () => {
    it('зеркалит slugify(source) на каждый ввод в поле-источнике', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ name: '', slug: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Название" />
          <Form.Field.Slug name="slug" source="name" label="URL" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const nameInput = container.querySelector('input[data-field-name="name"]') as HTMLInputElement
      const slugInput = container.querySelector('input[data-field-name="slug"]') as HTMLInputElement

      await user.type(nameInput, 'Мандала любви')

      expect(slugInput.value).toBe('mandala-lyubvi')
    })

    it('ручная правка слага выключает синхронизацию навсегда', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ name: '', slug: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Название" />
          <Form.Field.Slug name="slug" source="name" label="URL" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const nameInput = container.querySelector('input[data-field-name="name"]') as HTMLInputElement
      const slugInput = container.querySelector('input[data-field-name="slug"]') as HTMLInputElement

      await user.type(nameInput, 'Мандала')
      await user.type(slugInput, '-custom')
      await user.type(nameInput, ' любви')

      expect(slugInput.value).toBe('mandala-custom')
    })

    it('кнопка «подставить из названия» появляется после ручной правки и восстанавливает синхронизацию', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ name: '', slug: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Название" />
          <Form.Field.Slug name="slug" source="name" label="URL" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const nameInput = container.querySelector('input[data-field-name="name"]') as HTMLInputElement
      const slugInput = container.querySelector('input[data-field-name="slug"]') as HTMLInputElement

      await user.type(nameInput, 'Мандала')
      await user.type(slugInput, '-x')

      const resyncBtn = await screen.findByLabelText('Подставить из названия')
      await user.click(resyncBtn)

      expect(slugInput.value).toBe('mandala')

      await user.type(nameInput, ' любви')
      expect(slugInput.value).toBe('mandala-lyubvi')
    })
  })

  describe('редактирование — синхронизация выключена по умолчанию', () => {
    it('слаг с непустым значением на монтировании не меняется при правке названия', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ name: 'Мандала', slug: 'mandala' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Название" />
          <Form.Field.Slug name="slug" source="name" label="URL" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const nameInput = container.querySelector('input[data-field-name="name"]') as HTMLInputElement
      const slugInput = container.querySelector('input[data-field-name="slug"]') as HTMLInputElement

      await user.type(nameInput, ' любви')

      expect(slugInput.value).toBe('mandala')
    })

    it('syncOnEdit включает синхронизацию даже при непустом значении на монтировании', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ name: 'Мандала', slug: 'mandala' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Название" />
          <Form.Field.Slug name="slug" source="name" label="URL" syncOnEdit />
        </Form>,
        { wrapper: TestWrapper },
      )

      const nameInput = container.querySelector('input[data-field-name="name"]') as HTMLInputElement
      const slugInput = container.querySelector('input[data-field-name="slug"]') as HTMLInputElement

      await user.type(nameInput, ' любви')

      expect(slugInput.value).toBe('mandala-lyubvi')
    })
  })
})
