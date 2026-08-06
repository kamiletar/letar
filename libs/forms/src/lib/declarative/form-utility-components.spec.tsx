import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from './'
import { FormDivider } from './form-divider'
import { FormInfoBlock } from './form-info-block'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('Form.InfoBlock', () => {
  it('рендерит текстовое содержимое', () => {
    render(
      <TestWrapper>
        <FormInfoBlock>Заполните все поля</FormInfoBlock>
      </TestWrapper>,
    )

    expect(screen.getByText('Заполните все поля')).toBeInTheDocument()
  })

  it('рендерит заголовок и описание', () => {
    render(
      <TestWrapper>
        <FormInfoBlock title="Важно">Описание блока</FormInfoBlock>
      </TestWrapper>,
    )

    expect(screen.getByText('Важно')).toBeInTheDocument()
    expect(screen.getByText('Описание блока')).toBeInTheDocument()
  })

  it('поддерживает все варианты (info, warning, error, success, tip)', () => {
    const variants = ['info', 'warning', 'error', 'success', 'tip'] as const

    for (const variant of variants) {
      const { unmount } = render(
        <TestWrapper>
          <FormInfoBlock variant={variant}>Текст {variant}</FormInfoBlock>
        </TestWrapper>,
      )

      expect(screen.getByText(`Текст ${variant}`)).toBeInTheDocument()
      unmount()
    }
  })

  it('работает внутри Form', () => {
    render(
      <TestWrapper>
        <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
          <Form.InfoBlock variant="warning" title="Внимание">
            Поля обязательны к заполнению
          </Form.InfoBlock>
          <Form.Field.String name="name" label="Имя" />
        </Form>
      </TestWrapper>,
    )

    expect(screen.getByText('Внимание')).toBeInTheDocument()
    expect(screen.getByText('Поля обязательны к заполнению')).toBeInTheDocument()
    expect(screen.getByLabelText('Имя')).toBeInTheDocument()
  })
})

describe('Form.Divider', () => {
  it('рендерит простой разделитель без метки', () => {
    const { container } = render(
      <TestWrapper>
        <FormDivider />
      </TestWrapper>,
    )

    // Separator рендерит hr элемент
    expect(container.querySelector('[role="separator"]')).toBeInTheDocument()
  })

  it('рендерит разделитель с текстовой меткой', () => {
    render(
      <TestWrapper>
        <FormDivider label="Контактные данные" />
      </TestWrapper>,
    )

    expect(screen.getByText('Контактные данные')).toBeInTheDocument()
  })

  it('работает внутри Form', () => {
    render(
      <TestWrapper>
        <Form initialValue={{ name: '', email: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Имя" />
          <Form.Divider label="Контакты" />
          <Form.Field.String name="email" label="Email" />
        </Form>
      </TestWrapper>,
    )

    expect(screen.getByText('Контакты')).toBeInTheDocument()
    expect(screen.getByLabelText('Имя')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })
})

describe('Form.Field.Hidden', () => {
  it('не рендерит видимый элемент', () => {
    const { container } = render(
      <TestWrapper>
        <Form initialValue={{ name: '', secret: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Имя" />
          <Form.Field.Hidden name="secret" value="hidden-value" />
        </Form>
      </TestWrapper>,
    )

    // Поле не должно быть видимым
    expect(screen.queryByText('hidden-value')).not.toBeInTheDocument()
    // Но String поле должно быть
    expect(screen.getByLabelText('Имя')).toBeInTheDocument()
  })

  it('устанавливает значение в form state', async () => {
    const onSubmit = vi.fn()

    render(
      <TestWrapper>
        <Form initialValue={{ name: '', utm: '' }} onSubmit={onSubmit}>
          <Form.Field.String name="name" label="Имя" />
          <Form.Field.Hidden name="utm" value="google" />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )

    // Подождём синхронизацию value через useEffect
    await waitFor(() => {
      // Hidden field должен был установить значение
    })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Имя'), 'Тест')
    await user.click(screen.getByText('Отправить'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
      const submittedData = onSubmit.mock.calls[0][0]
      expect(submittedData.utm).toBe('google')
      expect(submittedData.name).toBe('Тест')
    })
  })

  it('обновляется при изменении value prop', async () => {
    const onSubmit = vi.fn()

    const { rerender } = render(
      <TestWrapper>
        <Form initialValue={{ code: '' }} onSubmit={onSubmit}>
          <Form.Field.Hidden name="code" value="v1" />
          <Form.Button.Submit>OK</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )

    // Ждём установки начального значения
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    rerender(
      <TestWrapper>
        <Form initialValue={{ code: '' }} onSubmit={onSubmit}>
          <Form.Field.Hidden name="code" value="v2" />
          <Form.Button.Submit>OK</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const user = userEvent.setup()
    await user.click(screen.getByText('OK'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
      expect(onSubmit.mock.calls[0][0].code).toBe('v2')
    })
  })
})
