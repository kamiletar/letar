import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../'

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FormSteps — синхронный count на первом рендере', () => {
  it('Steps.Root получает верный count сразу, без ожидания эффектов регистрации', () => {
    const { container } = render(
      <Form initialValue={{ a: '', b: '', c: '' }} onSubmit={vi.fn()}>
        <Form.Steps>
          <Form.Steps.Indicator />
          <Form.Steps.Step title="One">
            <Form.Field.String name="a" />
          </Form.Steps.Step>
          <Form.Steps.Step title="Two">
            <Form.Field.String name="b" />
          </Form.Steps.Step>
          <Form.Steps.Step title="Three">
            <Form.Field.String name="c" />
          </Form.Steps.Step>
        </Form.Steps>
      </Form>,
      { wrapper: TestWrapper },
    )

    // Синхронно, БЕЗ waitFor/act flush — именно тот момент, когда `stepCount` из
    // useStepState() ещё 0 (эффекты регистрации не отработали), а `Steps.Root` уже должен
    // получить верный count через countDeclaredSteps(children). Регресс воспроизводится как
    // `--percent: NaN%` (count=0 на первом коммите) — zag-js-машина Steps не всегда
    // пересчитывает прогресс/видимость при позднем изменении count.
    const root = container.querySelector('[data-scope="steps"][data-part="root"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('style')).not.toContain('NaN')

    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
    expect(screen.getByText('Three')).toBeInTheDocument()
  })

  it('скрытый через `when` шаг не ломает индикатор (учитывается в верхнем пределе, но не в steps)', () => {
    render(
      <Form initialValue={{ a: '', b: '' }} onSubmit={vi.fn()}>
        <Form.Steps>
          <Form.Steps.Indicator />
          <Form.Steps.Step title="Visible">
            <Form.Field.String name="a" />
          </Form.Steps.Step>
          <Form.Steps.Step title="Hidden" when={{ field: 'a', is: '__never__' }}>
            <Form.Field.String name="b" />
          </Form.Steps.Step>
        </Form.Steps>
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Visible')).toBeInTheDocument()
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })
})

describe('FormSteps — CompletedContent достижим обычной навигацией (#1922)', () => {
  it('клик Continue на последнем шаге показывает CompletedContent, а не сразу отправляет форму', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <Form initialValue={{ a: '', b: '' }} onSubmit={onSubmit}>
        <Form.Steps>
          <Form.Steps.Indicator />
          <Form.Steps.Step title="One">
            <Form.Field.String name="a" />
          </Form.Steps.Step>
          <Form.Steps.Step title="Two">
            <Form.Field.String name="b" />
          </Form.Steps.Step>
          <Form.Steps.CompletedContent>
            <div>Всё готово!</div>
          </Form.Steps.CompletedContent>
          <Form.Steps.Navigation />
        </Form.Steps>
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.queryByText('Two')).toBeInTheDocument())

    // Последний реальный шаг — кнопка ещё "Next" (не "Submit"), CompletedContent ещё не показан.
    // Chakra `Steps.Content`/`Steps.CompletedContent` держат панели смонтированными постоянно и
    // скрывают неактивные через `hidden` — поэтому проверяем видимость, не присутствие в DOM.
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    expect(screen.getByText('Всё готово!')).not.toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(screen.getByText('Всё готово!')).toBeVisible())
    expect(onSubmit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })

  it('без CompletedContent последний шаг сразу отправляет форму (старое поведение)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <Form initialValue={{ a: '' }} onSubmit={onSubmit}>
        <Form.Steps>
          <Form.Steps.Step title="One">
            <Form.Field.String name="a" />
          </Form.Steps.Step>
          <Form.Steps.Navigation />
        </Form.Steps>
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  })
})
