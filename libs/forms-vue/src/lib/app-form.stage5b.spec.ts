import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { z } from 'zod'
import { AppForm } from './core/app-form'
import { FieldRichText } from './fields/field-rich-text'

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

describe('Этап 5 (продолжение) — FieldRichText', () => {
  it('загружается лениво и рендерит тулбар с редактором', async () => {
    const wrapper = mount(Stage5bTestForm())
    await waitForLazyField()

    expect(wrapper.find('.letar-field__richtext').exists()).toBe(true)
    expect(wrapper.find('.letar-field__richtext-toolbar').exists()).toBe(true)
    expect(wrapper.find('[contenteditable="true"]').exists()).toBe(true)
  })

  it('клик по кнопке "B" переключает полужирный и подсвечивает кнопку', async () => {
    const wrapper = mount(Stage5bTestForm())
    await waitForLazyField()

    const boldButton = wrapper.findAll('.letar-field__richtext-btn').find((btn) => btn.text() === 'B')
    expect(boldButton).toBeTruthy()
    expect(boldButton!.attributes('aria-pressed')).toBe('false')

    await boldButton!.trigger('click')
    await waitForEditorUpdate()

    expect(boldButton!.attributes('aria-pressed')).toBe('true')
  })

  it('toolbarButtons сужает набор отрисованных кнопок', async () => {
    const wrapper = mount(Stage5bTestForm(['bold', 'italic']))
    await waitForLazyField()

    const buttons = wrapper.findAll('.letar-field__richtext-btn')
    expect(buttons).toHaveLength(2)
    expect(buttons.map((btn) => btn.text())).toEqual(['B', 'I'])
  })
})
