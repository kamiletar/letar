import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from './'
import { FormWhen } from './form-when'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FormWhen', () => {
  describe('is condition', () => {
    it('рендерит children когда значение совпадает', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ type: 'company' }} onSubmit={vi.fn()}>
            <FormWhen field="type" is="company">
              <span data-testid="company-fields">Company Fields</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('company-fields')).toBeInTheDocument()
      })
    })

    it('не рендерит children когда значение не совпадает', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ type: 'individual' }} onSubmit={vi.fn()}>
            <FormWhen field="type" is="company">
              <span data-testid="company-fields">Company Fields</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('company-fields')).not.toBeInTheDocument()
      })
    })

    it('работает с boolean значениями', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ agree: true }} onSubmit={vi.fn()}>
            <FormWhen field="agree" is={true}>
              <span data-testid="agreed">Agreed!</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('agreed')).toBeInTheDocument()
      })
    })
  })

  describe('isNot condition', () => {
    it('рендерит children когда значение НЕ совпадает', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ status: 'active' }} onSubmit={vi.fn()}>
            <FormWhen field="status" isNot="disabled">
              <span data-testid="active-content">Active Content</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('active-content')).toBeInTheDocument()
      })
    })

    it('не рендерит children когда значение совпадает', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ status: 'disabled' }} onSubmit={vi.fn()}>
            <FormWhen field="status" isNot="disabled">
              <span data-testid="active-content">Active Content</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('active-content')).not.toBeInTheDocument()
      })
    })
  })

  describe('in condition', () => {
    it('рендерит children когда значение в массиве', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ role: 'admin' }} onSubmit={vi.fn()}>
            <FormWhen field="role" in={['admin', 'moderator']}>
              <span data-testid="admin-panel">Admin Panel</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('admin-panel')).toBeInTheDocument()
      })
    })

    it('не рендерит children когда значение не в массиве', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ role: 'user' }} onSubmit={vi.fn()}>
            <FormWhen field="role" in={['admin', 'moderator']}>
              <span data-testid="admin-panel">Admin Panel</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument()
      })
    })
  })

  describe('notIn condition', () => {
    it('рендерит children когда значение НЕ в массиве', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ status: 'active' }} onSubmit={vi.fn()}>
            <FormWhen field="status" notIn={['banned', 'suspended']}>
              <span data-testid="user-content">User Content</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-content')).toBeInTheDocument()
      })
    })

    it('не рендерит children когда значение в массиве', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ status: 'banned' }} onSubmit={vi.fn()}>
            <FormWhen field="status" notIn={['banned', 'suspended']}>
              <span data-testid="user-content">User Content</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('user-content')).not.toBeInTheDocument()
      })
    })
  })

  describe('condition function', () => {
    it('рендерит children когда функция возвращает true', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ age: 25 }} onSubmit={vi.fn()}>
            <FormWhen field="age" condition={(age: number) => age >= 18}>
              <span data-testid="adult-content">Adult Content</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('adult-content')).toBeInTheDocument()
      })
    })

    it('не рендерит children когда функция возвращает false', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ age: 15 }} onSubmit={vi.fn()}>
            <FormWhen field="age" condition={(age: number) => age >= 18}>
              <span data-testid="adult-content">Adult Content</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('adult-content')).not.toBeInTheDocument()
      })
    })
  })

  describe('default truthy check', () => {
    it('рендерит children когда значение truthy', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: 'John' }} onSubmit={vi.fn()}>
            <FormWhen field="name">
              <span data-testid="has-name">Has Name</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('has-name')).toBeInTheDocument()
      })
    })

    it('не рендерит children когда значение falsy', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <FormWhen field="name">
              <span data-testid="has-name">Has Name</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('has-name')).not.toBeInTheDocument()
      })
    })
  })

  describe('fallback', () => {
    it('рендерит fallback когда условие false', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ isPremium: false }} onSubmit={vi.fn()}>
            <FormWhen field="isPremium" is={true} fallback={<span data-testid="upgrade">Upgrade to Premium</span>}>
              <span data-testid="premium">Premium Features</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('upgrade')).toBeInTheDocument()
        expect(screen.queryByTestId('premium')).not.toBeInTheDocument()
      })
    })

    it('не рендерит fallback когда условие true', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ isPremium: true }} onSubmit={vi.fn()}>
            <FormWhen field="isPremium" is={true} fallback={<span data-testid="upgrade">Upgrade to Premium</span>}>
              <span data-testid="premium">Premium Features</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('premium')).toBeInTheDocument()
        expect(screen.queryByTestId('upgrade')).not.toBeInTheDocument()
      })
    })
  })

  describe('reactivity', () => {
    it('обновляется при изменении значения поля', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ showDetails: false }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="showDetails" label="Show Details" />
            <FormWhen field="showDetails" is={true}>
              <span data-testid="details">Detailed Information</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      // Изначально скрыто
      await waitFor(() => {
        expect(screen.queryByTestId('details')).not.toBeInTheDocument()
      })

      // Кликаем checkbox
      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      // Теперь должно отображаться
      await waitFor(() => {
        expect(screen.getByTestId('details')).toBeInTheDocument()
      })
    })
  })

  describe('nested values', () => {
    it('работает с вложенными полями', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ settings: { notifications: true } }} onSubmit={vi.fn()}>
            <FormWhen field="settings.notifications" is={true}>
              <span data-testid="notification-settings">Notification Settings</span>
            </FormWhen>
          </Form>
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('notification-settings')).toBeInTheDocument()
      })
    })
  })
})
