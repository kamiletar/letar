import { AppForm } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from './app-form.test-utils'
import { FieldRichText } from './fields/field-rich-text'

beforeEach(() => {
  setupRekaPolyfills()
})

const stage5bSchema = z.object({
  content: z.string().optional().meta({ ui: { title: 'Содержимое' } }),
})

function Stage5bTestForm(toolbarButtons?: string[]) {
  return defineComponent({
    setup() {
      return () =>
        h(
          AppForm,
          { schema: stage5bSchema, initialValue: {}, onSubmit: () => {} },
          {
            default: () => [h(FieldRichText, { name: 'content', toolbarButtons })],
          },
        )
    },
  })
}

/**
 * `defineAsyncComponent`'s реальный `import()` под Vite/Vitest резолвится через несколько
 * макротасков (не микрозадач) — `flushPromises()`/`nextTick()` в одиночку недостаточны.
 */
async function waitForLazyField() {
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 25))
    await flushPromises()
    await nextTick()
  }
}

/**
 * `@tiptap/vue-3`'s `editor.state`/`isActive()` живут за `customRef`, обновляемым через
 * двойной `requestAnimationFrame` (см. `Editor.ts` пакета) — обычного `nextTick()` недостаточно,
 * чтобы тулбар увидел новое состояние после команды типа `toggleBold()`.
 */
async function waitForEditorUpdate() {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await nextTick()
}

describe('Этап 5 (продолжение) — FieldRichText (Reka-скин)', () => {
  it('загружается лениво и рендерит тулбар с редактором', async () => {
    const wrapper = mount(Stage5bTestForm())
    await waitForLazyField()

    expect(wrapper.find('[data-field-name="content"]').exists()).toBe(true)
    expect(wrapper.find('[contenteditable="true"]').exists()).toBe(true)
    expect(wrapper.findAll('button').length).toBeGreaterThan(0)
  })

  it('клик по кнопке "Полужирный" переключает состояние и подсвечивает кнопку', async () => {
    const wrapper = mount(Stage5bTestForm())
    await waitForLazyField()

    const boldButton = wrapper.find('button[aria-label="Полужирный"]')
    expect(boldButton.exists()).toBe(true)
    expect(boldButton.attributes('aria-pressed')).toBe('false')

    await boldButton.trigger('click')
    await waitForEditorUpdate()

    expect(boldButton.attributes('aria-pressed')).toBe('true')
  })

  it('toolbarButtons сужает набор отрисованных кнопок', async () => {
    const wrapper = mount(Stage5bTestForm(['bold', 'italic']))
    await waitForLazyField()

    const toolbarButtons = wrapper.findAll('button[aria-label]')
    expect(toolbarButtons).toHaveLength(2)
    expect(toolbarButtons.map((btn) => btn.attributes('aria-label'))).toEqual(['Полужирный', 'Курсив'])
  })
})
