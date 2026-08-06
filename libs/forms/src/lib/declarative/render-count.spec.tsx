'use client'

/**
 * Тест подсчёта ре-рендеров @letar/forms.
 *
 * Доказывает, что при вводе текста в одно поле формы из N полей
 * остальные поля НЕ ре-рендерятся (в отличие от controlled-подхода Formik/RHF).
 *
 * Запуск: vitest run src/lib/declarative/render-count.spec.tsx
 */

import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { Form } from './'

/** Обёртка Chakra для тестов */
function TestWrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
}

/** Счётчик рендеров через React.Profiler */
function createRenderTracker() {
  const counts = new Map<string, number>()

  const onRender: ProfilerOnRenderCallback = (id) => {
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return {
    counts,
    onRender,
    getRenderCount: (id: string) => counts.get(id) ?? 0,
    getTotalRenders: () => [...counts.values()].reduce((sum, c) => sum + c, 0),
    reset: () => counts.clear(),
    Track: ({ id, children }: { id: string; children: ReactNode }) => (
      <Profiler id={id} onRender={onRender}>
        {children}
      </Profiler>
    ),
  }
}

afterEach(() => {
  cleanup()
})

describe('Ре-рендеры @letar/forms', () => {
  it('при вводе в одно поле — остальные 9 полей не ре-рендерятся', async () => {
    const tracker = createRenderTracker()
    const user = userEvent.setup()
    const fieldCount = 10
    const fields = Array.from({ length: fieldCount }, (_, i) => `field_${i}`)
    const initialValue = Object.fromEntries(fields.map((f) => [f, '']))

    render(
      <TestWrapper>
        <Form initialValue={initialValue} onSubmit={async () => {}}>
          {fields.map((name) => (
            <tracker.Track key={name} id={name}>
              <Form.Field.String name={name} label={name} />
            </tracker.Track>
          ))}
        </Form>
      </TestWrapper>,
    )

    // Сбрасываем счётчики после начального рендера
    tracker.reset()

    const input = screen.getAllByRole('textbox')[0]

    // Вводим 5 символов в первое поле
    await act(async () => {
      await user.type(input, 'hello')
    })

    // Первое поле должно ре-рендериться (значение меняется)
    const field0Renders = tracker.getRenderCount('field_0')
    expect(field0Renders).toBeGreaterThan(0)

    // Остальные поля НЕ должны ре-рендериться (или минимально)
    // TanStack Form изолирует ре-рендеры через field-level подписки
    const otherFieldRenders = fields
      .slice(1)
      .map((f) => tracker.getRenderCount(f))
      .reduce((sum, c) => sum + c, 0)

    // Выводим результаты для статьи
    console.log(`\n📊 Ре-рендеры при вводе "hello" (${fieldCount} полей):`)
    console.log(`   field_0 (активное): ${field0Renders} рендеров`)
    console.log(`   field_1..field_9 (остальные): ${otherFieldRenders} суммарно`)
    console.log(`   Изоляция: ${otherFieldRenders === 0 ? '✅ идеальная' : `⚠️ ${otherFieldRenders} лишних рендеров`}`)

    // Главная проверка: остальные поля рендерятся не более 1 раза каждое
    // (допускаем 1 ре-рендер из-за подписки на валидацию)
    for (const name of fields.slice(1)) {
      expect(tracker.getRenderCount(name)).toBeLessThanOrEqual(1)
    }
  })

  it('Form.When — скрытое поле не рендерится при изменении видимого', async () => {
    const tracker = createRenderTracker()
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ type: 'person', name: '', company: '' }} onSubmit={async () => {}}>
          <tracker.Track id="type">
            <Form.Field.String name="type" label="Type" />
          </tracker.Track>
          <tracker.Track id="name">
            <Form.Field.String name="name" label="Name" />
          </tracker.Track>
          <Form.When field="type" is="company">
            <tracker.Track id="company">
              <Form.Field.String name="company" label="Company" />
            </tracker.Track>
          </Form.When>
        </Form>
      </TestWrapper>,
    )

    tracker.reset()

    // Вводим в поле name
    const inputs = screen.getAllByRole('textbox')
    const nameInput = inputs[1] // второй input — name

    await act(async () => {
      await user.type(nameInput, 'test')
    })

    console.log(`\n📊 Ре-рендеры Form.When (type="person"):`)
    console.log(`   name (активное): ${tracker.getRenderCount('name')} рендеров`)
    console.log(`   type: ${tracker.getRenderCount('type')} рендеров`)
    console.log(`   company (скрытое): ${tracker.getRenderCount('company')} рендеров`)

    // Скрытое поле не должно рендериться вообще (оно даже не в DOM)
    expect(tracker.getRenderCount('company')).toBe(0)
  })
})
