import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Form } from '../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const KEY = 'post-submit-reset-persistence-stable-initialvalue-test'
const STORAGE_KEY = `form-persistence:${KEY}`

/**
 * Баг (найден 2026-09-23, найден при написании интеграционного теста к forms 2.16.8, задокументирован в
 * .claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md § «Известный пробел фикса»):
 * корректирующий `useEffect` в `usePostSubmitResetGuard` зависит от СМЕНЫ ССЫЛКИ `initialValue`
 * (`watchedDefaultValues` в deps). Ре-рендер, который `clearSavedData()` вызывает внутри
 * `useFormPersistence` (`setHasSavedData`/`setSavedAt`), происходит со СТАБИЛЬНОЙ ссылкой
 * `initialValue` — guard не перепроверяет состояние формы на этом рендере, а
 * `FormApi.update()` (`@tanstack/form-core`) уже успел откатить `state.values` к `initialValue`,
 * т.к. он сравнивает по значению с собственным `options.defaultValues`, а не с прошлым рендером
 * React.
 */
describe('post-submit reset() + persistence не откатывает поле при стабильном initialValue', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('сохраняет отправленное значение, даже когда re-render вызван clearSavedData(), а не сменой initialValue', async () => {
    const user = userEvent.setup()
    const submitted: string[] = []

    render(
      <TestWrapper>
        <Form
          initialValue={{ name: 'Исходное' }}
          persistence={{ key: KEY, debounceMs: 0 }}
          onSubmit={(data: { name: string }) => {
            submitted.push(data.name)
          }}
        >
          <Form.Field.String name="name" label="Имя" />
          <Form.Button.Submit>Сохранить</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )

    const input = screen.getByLabelText('Имя')
    expect(input).toHaveValue('Исходное')

    await user.clear(input)
    await user.type(input, 'Изменено')
    expect(input).toHaveValue('Изменено')

    // Ждём, пока черновик реально запишется в localStorage — иначе clearSavedData() после
    // сабмита не изменит state (hasSavedData уже false) и не вызовет тот re-render, который
    // ловит этот тест.
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toContain('Изменено')
    })

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(submitted).toEqual(['Изменено'])
    })

    // Регресс: clearSavedData() после сабмита перерендеривает форму со стабильной ссылкой
    // initialValue — usePostSubmitResetGuard обязан поймать откат и на этом рендере тоже.
    await waitFor(() => {
      expect(input).toHaveValue('Изменено')
    })
    // Устойчивость, не гонка: значение не должно откатиться и на следующем тике.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(input).toHaveValue('Изменено')
  })
})
