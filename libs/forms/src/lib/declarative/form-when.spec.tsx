import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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
        </TestWrapper>,
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

  describe('a11y: перенос фокуса при скрытии условного блока', () => {
    it('переносит фокус на якорь, если скрываемое поле само себя прячет (было сфокусировано)', async () => {
      // Реалистичный сценарий бага: пользователь печатает в условном поле, ввод триггерит
      // Form.Watch, который скрывает блок вместе с самим полем — фокус ни на что не переводился
      // явным кликом, значит без фикса он упадёт на <body>.
      render(
        <TestWrapper>
          <Form initialValue={{ showDetails: true, note: '' }} onSubmit={vi.fn()}>
            <FormWhen field="showDetails" is={true}>
              <Form.Field.String name="note" label="Note" />
              <Form.Watch
                field="note"
                onChange={(value, { setFieldValue }) => {
                  if (value === 'hide') {
                    setFieldValue('showDetails', false)
                  }
                }}
              />
            </FormWhen>
          </Form>
        </TestWrapper>,
      )

      const noteInput = await screen.findByLabelText('Note')
      await userEvent.click(noteInput)
      await userEvent.type(noteInput, 'hide')

      await waitFor(() => {
        expect(screen.queryByLabelText('Note')).not.toBeInTheDocument()
      })

      expect(document.activeElement).not.toBe(document.body)
      expect(document.activeElement).toHaveAttribute('data-form-when-focus-anchor')
    })

    it('не трогает фокус, если он был вне скрываемого блока', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ showDetails: true, other: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="other" label="Other" />
            <Form.Field.Checkbox name="showDetails" label="Show Details" />
            <FormWhen field="showDetails" is={true}>
              <span data-testid="details">Detailed Information</span>
            </FormWhen>
          </Form>
        </TestWrapper>,
      )

      const otherInput = await screen.findByLabelText('Other')
      await userEvent.click(otherInput)
      expect(otherInput).toHaveFocus()

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      await waitFor(() => {
        expect(screen.queryByTestId('details')).not.toBeInTheDocument()
      })

      expect(document.activeElement).not.toHaveAttribute('data-form-when-focus-anchor')
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
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('notification-settings')).toBeInTheDocument()
      })
    })
  })

  describe('интеграция с Form.Steps: скрытое условием required-поле не блокирует «Далее»', () => {
    // Изначальная гипотеза (перед этим набором тестов): `Form.When` со единственным ребёнком —
    // кастомным nullary-компонентом (`function CompanyFields() { return <Form.Field.String ... />
    // }`, тот же паттерн, что в form-steps.spec.tsx) — ломается так же, как когда-то `Form.Steps.
    // Step` без FormStepsFieldRegistryContext: статический `extractFieldNames(children, parentPath)`
    // (form-when.tsx) не видит внутрь `<CompanyFields />`, fieldNames пустой,
    // `hideFieldsFromValidation([])` — no-op. Тест ниже это НЕ воспроизводит: пока поле скрыто, оно
    // просто не смонтировано — `useDeclarativeField` не регистрирует его в
    // `FormStepsFieldRegistryContext`, и `FormStepsStep` не включает его в `stepInfo.fieldNames`
    // вовсе, независимо от того, сработал ли `hideFieldsFromValidation`. Оставлен как регрессионный
    // тест на этот (рабочий) путь.
    //
    // Реальный баг обнаружился на СОСЕДНЕМ пути — прямое поле, БЕЗ helper-компонента. Там
    // `extractFieldNames` на уровне `Form.Steps.Step` статически видит `companyName` внутри
    // `Form.When` (обход не различает семантику `Form.When`, просто спускается в `props.children`)
    // — то есть `stepInfo.fieldNames` ВСЕГДА содержит `companyName`, скрыто оно или нет.
    // Единственное, что должно исключать его из валидации, — `hiddenFields` через
    // `hideFieldsFromValidation`/`showFieldsForValidation`. А это оказалось сломано: `fieldNames`
    // в `FormWhenContent` пересчитывался в новый МАССИВ на каждый посторонний ре-рендер (нестабильная
    // JSX-ссылка `children`), эффект видел "изменившуюся" зависимость, гонял cleanup (который при
    // `!shouldRender` спонтанно вызывал `showFieldsForValidation`, "рассекречивая" поле) — а
    // следующий проход эффекта не восстанавливал hidden-статус из-за асимметрии
    // `isFirstMount`/`prevShouldRender`. Итог — `hiddenFields` пустой, required-поле блокирует
    // «Далее», хотя пользователь его не видит. Фикс — content-based стабилизация `fieldNames`
    // (form-when.tsx), тот же приём, что уже применён к `fieldNamesRef` в `form-steps-step.tsx`.
    function CompanyFields() {
      return <Form.Field.String name="companyName" />
    }

    const schema = z.object({
      type: z.string(),
      companyName: z.string().min(2),
    }).strip()

    it('не блокирует «Далее», когда required-поле скрыто условием и обёрнуто в helper-компонент', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <Form schema={schema} initialValue={{ type: 'individual', companyName: '' }} onSubmit={onSubmit}>
            <Form.Steps>
              <Form.Steps.Step title="Основное">
                <Form.When field="type" is="company">
                  <CompanyFields />
                </Form.When>
              </Form.Steps.Step>
              <Form.Steps.Step title="Классификация">
                <div>Классификация — шаг 2</div>
              </Form.Steps.Step>
              <Form.Steps.Navigation nextLabel="Далее" />
            </Form.Steps>
          </Form>
        </TestWrapper>,
      )

      await user.click(screen.getByRole('button', { name: 'Далее' }))

      await waitFor(() => {
        expect(screen.getByText('Классификация — шаг 2')).toBeVisible()
      })
    })

    it('блокирует «Далее», когда то же required-поле видимо (условие true) и пусто', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <Form schema={schema} initialValue={{ type: 'company', companyName: '' }} onSubmit={onSubmit}>
            <Form.Steps>
              <Form.Steps.Step title="Основное">
                <Form.When field="type" is="company">
                  <CompanyFields />
                </Form.When>
              </Form.Steps.Step>
              <Form.Steps.Step title="Классификация">
                <div>Классификация — шаг 2</div>
              </Form.Steps.Step>
              <Form.Steps.Navigation nextLabel="Далее" />
            </Form.Steps>
          </Form>
        </TestWrapper>,
      )

      await user.click(screen.getByRole('button', { name: 'Далее' }))

      await waitFor(() => {
        expect(screen.getByText('Классификация — шаг 2')).not.toBeVisible()
      })
    })

    it('не блокирует «Далее» и без helper-компонента — прямое required-поле, скрытое условием (регресс: hiddenFields терялся из-за нестабильного fieldNames)', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <Form schema={schema} initialValue={{ type: 'individual', companyName: '' }} onSubmit={onSubmit}>
            <Form.Steps>
              <Form.Steps.Step title="Основное">
                <Form.When field="type" is="company">
                  <Form.Field.String name="companyName" />
                </Form.When>
              </Form.Steps.Step>
              <Form.Steps.Step title="Классификация">
                <div>Классификация — шаг 2</div>
              </Form.Steps.Step>
              <Form.Steps.Navigation nextLabel="Далее" />
            </Form.Steps>
          </Form>
        </TestWrapper>,
      )

      await user.click(screen.getByRole('button', { name: 'Далее' }))

      // Регресс без фикса: клик остаётся на шаге 1 — `stepInfo.fieldNames` статически содержит
      // `companyName` (Form.When не мешает extractFieldNames видеть прямого потомка), а
      // `hiddenFields` пуст из-за спонтанного show/hide-цикла — required-поле блокирует переход,
      // хотя пользователь его не видит и не может заполнить.
      await waitFor(() => {
        expect(screen.getByText('Классификация — шаг 2')).toBeVisible()
      })
    })

    it('блокирует «Далее» и без helper-компонента, когда то же прямое поле видимо и пусто', async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <Form schema={schema} initialValue={{ type: 'company', companyName: '' }} onSubmit={onSubmit}>
            <Form.Steps>
              <Form.Steps.Step title="Основное">
                <Form.When field="type" is="company">
                  <Form.Field.String name="companyName" />
                </Form.When>
              </Form.Steps.Step>
              <Form.Steps.Step title="Классификация">
                <div>Классификация — шаг 2</div>
              </Form.Steps.Step>
              <Form.Steps.Navigation nextLabel="Далее" />
            </Form.Steps>
          </Form>
        </TestWrapper>,
      )

      await user.click(screen.getByRole('button', { name: 'Далее' }))

      await waitFor(() => {
        expect(screen.getByText('Классификация — шаг 2')).not.toBeVisible()
      })
    })

    it('финальный сабмит по-прежнему валидируется по полной Zod-схеме — это контракт, не баг', async () => {
      // `hiddenFields`/`Form.When` влияют только на `validateCurrentStep` (навигацию «Далее» между
      // шагами Form.Steps) — form-level `onChange`/`onSubmit`-валидатор (form-validators.ts) гоняет
      // ВСЮ схему против `state.values` независимо от видимости полей. Если поле физически может
      // остаться скрытым (и невидимым) до конца визарда, но при этом обязательно по схеме
      // безусловно — это тупик без way out для пользователя. Правильный путь — делать схемное
      // поле опциональным/условно обязательным сами (`.optional()` + `.superRefine()` по
      // соседнему полю), а не полагаться на то, что `Form.When` тихо ослабит Zod-схему. Этот тест
      // фиксирует текущий контракт, чтобы будущий "фикс" не сломал его в обратную сторону —
      // молча выключив required для скрытых полей везде, включая случаи, когда поле правда нужно
      // на сабмите.
      const onSubmit = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <Form schema={schema} initialValue={{ type: 'individual', companyName: '' }} onSubmit={onSubmit}>
            <Form.Steps>
              <Form.Steps.Step title="Основное">
                <Form.When field="type" is="company">
                  <Form.Field.String name="companyName" />
                </Form.When>
              </Form.Steps.Step>
              <Form.Steps.Step title="Классификация">
                <div>Классификация — шаг 2</div>
              </Form.Steps.Step>
              <Form.Steps.Navigation nextLabel="Далее" />
            </Form.Steps>
          </Form>
        </TestWrapper>,
      )

      await user.click(screen.getByRole('button', { name: 'Далее' }))
      await waitFor(() => {
        expect(screen.getByText('Классификация — шаг 2')).toBeVisible()
      })

      await user.click(screen.getByRole('button', { name: 'Submit' }))

      // Форма не отправляется — companyName пуст, а схема требует его безусловно.
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })
})
