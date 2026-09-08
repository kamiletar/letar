import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
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
