import { AppForm, useAppFormContext } from '@letar/forms-vue/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { z } from 'zod'
import { setupRekaPolyfills } from '../app-form.test-utils'
import { FieldCombobox } from './field-combobox'
import type { FieldSelectOption } from './field-select'

beforeEach(() => {
  setupRekaPolyfills()
})

// Тест, упавший до своего `wrapper.unmount()`, иначе оставляет DOM смонтированным на
// `document.body` — следующий тест находит его карандаши/пункты через глобальные
// `document.querySelectorAll` в хелперах ниже (тот же приём, что `field-select-actions.spec.ts`)
afterEach(() => {
  document.body.replaceChildren()
})

/** Промис с отдельно доступным `resolve` — для проверки состояния `pending` между вызовом и ответом сервера */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** Диспатчит указанный тип события (bubbles: true) — тот же приём, что `fireEvent` в RTL */
function fireOn(el: Element, type: string): void {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
}

/**
 * Выбор пункта Combobox — простой `click`. В отличие от `Field.Select` (`SelectItem`, у которого
 * есть баг-по-конструкции с `pointerdown`/`pointerup`, см. `field-select-actions.spec.ts`),
 * `ComboboxItem` реагирует на обычный `onClick` (`ListboxItem.js`: `onClick: handleSelectCustomEvent`)
 */
function selectItem(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

function findItemByText(text: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]')).find((el) =>
    el.textContent?.includes(text)
  )
}

function pencils(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-part="edit-button"]'))
}

/** Карандаш пункта списка (внутри `[data-slot="combobox-item"]`) */
function itemPencils(): HTMLElement[] {
  return pencils().filter((el) => el.closest('[data-slot="combobox-item"]'))
}

/** Карандаш выбранного значения — сосед поля ввода, не внутри пункта списка */
function valuePencil(): HTMLElement | undefined {
  return pencils().find((el) => !el.closest('[data-slot="combobox-item"]'))
}

/** Открывает список стрелкой вниз — тот же приём, что `field-combobox-render.spec.ts`/`field-combobox-load.spec.ts` */
async function openList(wrapper: ReturnType<typeof mount>, fieldName: string): Promise<void> {
  await wrapper.find(`[data-field-name="${fieldName}"]`).trigger('keydown', { key: 'ArrowDown' })
  await flushPromises()
}

const createSchema = z.object({ city: z.string().optional() })
const createOptions: FieldSelectOption[] = [
  { value: 'msk', label: 'Москва' },
  { value: 'spb', label: 'Санкт-Петербург' },
]

/** Монтирует `FieldCombobox` внутри `AppForm`, отдавая наружу инстанс `@tanstack/vue-form` через зонд-компонент рядом в слоте */
function mountCreateCombobox(extraProps: Record<string, unknown>, initial = '') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form, тот же приём, что в `field-select-actions.spec.ts`
  let form: any
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema: createSchema, initialValue: { city: initial }, onSubmit: () => undefined },
            {
              default: () => [
                h(FieldCombobox, { name: 'city', options: createOptions, placeholder: 'Поиск...', ...extraProps }),
                h(defineComponent({
                  setup() {
                    form = useAppFormContext().form
                    return () => null
                  },
                })),
              ],
            },
          )
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, values: () => form.state.values as { city: string } }
}

const editOptions: FieldSelectOption[] = [
  { value: 'a', label: 'Кровля' },
  { value: 'b', label: 'Фасад' },
  { value: 's', label: 'Системная', editable: false },
]
const editSchema = z.object({ cat: z.string().optional() })

function mountEditCombobox(extraProps: Record<string, unknown>, initial = 'a') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            { schema: editSchema, initialValue: { cat: initial }, onSubmit: () => undefined },
            {
              default: () => [
                h(FieldCombobox, { name: 'cat', options: editOptions, ...extraProps }),
                h(defineComponent({
                  setup() {
                    form = useAppFormContext().form
                    return () => null
                  },
                })),
              ],
            },
          )
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, values: () => form.state.values as { cat: string } }
}

/**
 * Этап 4c паритета Combobox: `onCreate`/`onUpdate` через `useSelectionActionsState` (тот же
 * конвейер, что `Field.Select`, Stage 3b), `pending`, карандаш «Изменить», встроенное сообщение
 * отказа (§16.7). Зеркалит `field-select-actions.spec.ts` — без `dependsOn` (4d), без опций
 * `loadOptions` (те покрыты `field-combobox-load.spec.ts`, Stage 4b).
 */
describe('forms-vue-shadcn FieldCombobox — onCreate', () => {
  it('без onCreate служебного пункта «+ Добавить» нет', async () => {
    const { wrapper } = mountCreateCombobox({})
    await openList(wrapper, 'city')
    await wrapper.find('[data-field-name="city"]').setValue('Казань')
    await flushPromises()
    expect(findItemByText('Добавить')).toBeUndefined()
    wrapper.unmount()
  })

  it('с onCreate и непустым текстом ввода — служебный пункт «+ Добавить "текст"»', async () => {
    const { wrapper } = mountCreateCombobox({ onCreate: vi.fn() })
    await openList(wrapper, 'city')
    await wrapper.find('[data-field-name="city"]').setValue('Казань')
    await flushPromises()
    expect(findItemByText('+ Добавить "Казань"')).toBeDefined()
    wrapper.unmount()
  })

  it('текст совпадает с существующей опцией — служебного пункта нет (shouldOfferCreate)', async () => {
    const { wrapper } = mountCreateCombobox({ onCreate: vi.fn() })
    await openList(wrapper, 'city')
    await wrapper.find('[data-field-name="city"]').setValue('Москва')
    await flushPromises()
    expect(findItemByText('+ Добавить')).toBeUndefined()
    wrapper.unmount()
  })

  it('клик по служебному пункту вызывает onCreate с текущим текстом ввода; созданная запись выбирается', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Казань', value: 'kzn' })
    const { wrapper, values } = mountCreateCombobox({ onCreate })
    await openList(wrapper, 'city')
    await wrapper.find('[data-field-name="city"]').setValue('Казань')
    await flushPromises()
    selectItem(findItemByText('+ Добавить "Казань"')!)
    await flushPromises()
    await flushPromises()

    expect(onCreate).toHaveBeenCalledWith('Казань', expect.anything())
    expect(values().city).toBe('kzn')
    const input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Казань')
    wrapper.unmount()
  })

  it('onCreate вернул null — значение и текст поля не меняются', async () => {
    const onCreate = vi.fn().mockResolvedValue(null)
    const { wrapper, values } = mountCreateCombobox({ onCreate }, 'msk')
    await openList(wrapper, 'city')
    await wrapper.find('[data-field-name="city"]').setValue('Казань')
    await flushPromises()
    selectItem(findItemByText('+ Добавить "Казань"')!)
    await flushPromises()
    await flushPromises()

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(values().city).toBe('msk')
    wrapper.unmount()
  })
})

describe('forms-vue-shadcn FieldCombobox — onUpdate', () => {
  it('без onUpdate карандашей нет', async () => {
    const { wrapper } = mountEditCombobox({})
    await openList(wrapper, 'cat')
    expect(pencils()).toHaveLength(0)
    wrapper.unmount()
  })

  it('карандаш у каждой редактируемой опции; editable:false скрывает', async () => {
    const { wrapper } = mountEditCombobox({ onUpdate: vi.fn() })
    await openList(wrapper, 'cat')
    // Кровля, Фасад — редактируемы; Системная — editable:false, карандаша нет
    expect(itemPencils()).toHaveLength(2)
    wrapper.unmount()
  })

  it('в пункте карандаш вне Tab-порядка и скрыт от AT', async () => {
    const { wrapper } = mountEditCombobox({ onUpdate: vi.fn() })
    await openList(wrapper, 'cat')
    expect(itemPencils()[0]?.getAttribute('tabindex')).toBe('-1')
    expect(itemPencils()[0]?.getAttribute('aria-hidden')).toBe('true')
    wrapper.unmount()
  })

  it('карандаш у значения — сосед поля ввода, не внутри пункта списка', async () => {
    const { wrapper } = mountEditCombobox({ onUpdate: vi.fn() })
    await flushPromises()
    const pencil = valuePencil()
    expect(pencil).toBeDefined()
    expect(pencil!.closest('[data-slot="combobox-input"]')).toBeNull()
    wrapper.unmount()
  })

  it('у системной опции (editable:false) карандаша у значения нет', async () => {
    const { wrapper } = mountEditCombobox({ onUpdate: vi.fn() }, 's')
    await flushPromises()
    expect(valuePencil()).toBeUndefined()
    wrapper.unmount()
  })

  it('клик по карандашу пункта вызывает onUpdate с опцией и не выбирает пункт', async () => {
    const onUpdate = vi.fn().mockResolvedValue(null)
    const { wrapper, values } = mountEditCombobox({ onUpdate })
    await openList(wrapper, 'cat')
    // Порядок карандашей — порядок опций (Кровля уже выбрана, Фасад — вторая; Системная скрыта):
    // берём индекс 1 (Фасад), чтобы клик по чужому пункту доказательно не выбрал его
    const pencil = itemPencils()[1]!
    fireOn(pencil, 'pointerdown')
    fireOn(pencil, 'pointerup')
    fireOn(pencil, 'click')
    await flushPromises()

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ label: 'Фасад', value: 'b' }), expect.anything())
    // Клик по карандашу не выбрал пункт — значение формы не изменилось
    expect(values().cat).toBe('a')
    wrapper.unmount()
  })

  it('тот же value: текст поля обновляется, форма не dirty (значение поля не меняется)', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля (новая)', value: 'a' })
    const { wrapper, values } = mountEditCombobox({ onUpdate })
    await flushPromises()
    fireOn(valuePencil()!, 'click')
    await flushPromises()
    await flushPromises()

    const input = wrapper.find('[data-field-name="cat"]').element as HTMLInputElement
    expect(input.value).toBe('Кровля (новая)')
    expect(values().cat).toBe('a')
    wrapper.unmount()
  })

  it('другой value: выбранное значение заменяется на новое', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Кровля v2', value: 'a2' })
    const { wrapper, values } = mountEditCombobox({ onUpdate })
    await flushPromises()
    fireOn(valuePencil()!, 'click')
    await flushPromises()
    await flushPromises()

    expect(values().cat).toBe('a2')
    const input = wrapper.find('[data-field-name="cat"]').element as HTMLInputElement
    expect(input.value).toBe('Кровля v2')
    wrapper.unmount()
  })

  it('карандаш выключен, пока onUpdate ждёт ответа; повторный клик игнорируется; после ответа снова активен', async () => {
    const pending = deferred<null>()
    const onUpdate = vi.fn().mockReturnValue(pending.promise)
    const { wrapper } = mountEditCombobox({ onUpdate })
    await flushPromises()

    fireOn(valuePencil()!, 'click')
    await flushPromises()
    expect((valuePencil() as HTMLButtonElement).disabled).toBe(true)

    // Повторный клик при pending — второго вызова onUpdate не будет (composable сам игнорирует)
    fireOn(valuePencil()!, 'click')
    await flushPromises()
    expect(onUpdate).toHaveBeenCalledTimes(1)

    pending.resolve(null)
    await flushPromises()
    await flushPromises()
    expect((valuePencil() as HTMLButtonElement).disabled).toBe(false)
    wrapper.unmount()
  })

  it('свой renderOption без EditButton — карандаша в пункте нет; Combobox.CreateButton в listFooter зовёт onCreate', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Новая', value: 'n' })
    const { wrapper } = mountEditCombobox({
      onUpdate: vi.fn(),
      onCreate,
      createItem: false,
      renderOption: (o: FieldSelectOption) => h('span', o.label),
      listFooter: h(FieldCombobox.CreateButton),
    })
    await openList(wrapper, 'cat')
    expect(itemPencils()).toHaveLength(0)
    const btn = Array.from(document.querySelectorAll('button')).find((el) => el.textContent?.includes('Добавить'))
    expect(btn).toBeTruthy()
    fireOn(btn!, 'click')
    // В отличие от Select (там отдельное поле поиска, изначально пустое), у Combobox текст
    // поля ввода И ЕСТЬ значение — сейчас там подпись уже выбранной записи ("Кровля"), поиск
    // не запускали. Кнопка в подвале зовёт onCreate с этим текстом, а не с пустой строкой
    expect(onCreate).toHaveBeenCalledWith('Кровля', expect.anything())
    wrapper.unmount()
  })
})

describe('forms-vue-shadcn FieldCombobox — оптимистичный режим и отказ (§16.7)', () => {
  type Ctx = { optimistic: (p: { label: string }) => void }
  type Created = { label: string; value: string } | null

  const optimisticCreate = (server: ReturnType<typeof deferred<Created>>) =>
    vi.fn(async (_search: string, ctx: Ctx) => {
      ctx.optimistic({ label: 'Казань (черновик)' })
      return server.promise
    })

  it('текст поля ввода — превью сразу, значение формы прежнее; после ответа — настоящее', async () => {
    const server = deferred<Created>()
    const { wrapper, values } = mountCreateCombobox({ onCreate: optimisticCreate(server) })
    await openList(wrapper, 'city')
    await wrapper.find('[data-field-name="city"]').setValue('Казань')
    await flushPromises()
    selectItem(findItemByText('+ Добавить "Казань"')!)
    await flushPromises()

    let input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Казань (черновик)')
    expect(values().city).toBe('')

    server.resolve({ label: 'Казань', value: 'kzn' })
    await flushPromises()
    await flushPromises()

    expect(values().city).toBe('kzn')
    input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Казань')
    wrapper.unmount()
  })

  it('отказ — откат текста поля к прежнему значению и встроенное сообщение', async () => {
    const server = deferred<Created>()
    const { wrapper, values } = mountCreateCombobox({ onCreate: optimisticCreate(server) }, 'msk')
    await flushPromises()
    await openList(wrapper, 'city')
    await wrapper.find('[data-field-name="city"]').setValue('Казань')
    await flushPromises()
    selectItem(findItemByText('+ Добавить "Казань"')!)
    await flushPromises()

    let input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Казань (черновик)')

    server.resolve(null)
    await flushPromises()
    await flushPromises()

    const message = document.querySelector('[data-settle-error]')
    expect(message?.textContent).toContain('Не удалось сохранить «Казань (черновик)»')
    input = wrapper.find('[data-field-name="city"]').element as HTMLInputElement
    expect(input.value).toBe('Москва')
    expect(values().city).toBe('msk')
    wrapper.unmount()
  })

  it('с onSettleError встроенного сообщения нет, причина передана приложению', async () => {
    const server = deferred<Created>()
    const onSettleError = vi.fn()
    const { wrapper } = mountCreateCombobox({ onCreate: optimisticCreate(server), onSettleError })
    await openList(wrapper, 'city')
    await wrapper.find('[data-field-name="city"]').setValue('Казань')
    await flushPromises()
    selectItem(findItemByText('+ Добавить "Казань"')!)
    await flushPromises()

    server.resolve(null)
    await flushPromises()
    await flushPromises()

    expect(onSettleError).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'create',
        reason: 'declined',
        preview: expect.objectContaining({ label: 'Казань (черновик)' }),
      }),
    )
    expect(document.querySelector('[data-settle-error]')).toBeNull()
    wrapper.unmount()
  })

  it('pending-опция приложения приглушена, не выбирается', async () => {
    const { wrapper, values } = mountCreateCombobox(
      { options: [{ value: 'msk', label: 'Москва' }, { value: 'tmp', label: 'Новая', pending: true }] },
      'msk',
    )
    await openList(wrapper, 'city')
    const pendingItem = findItemByText('Новая')!
    expect(pendingItem.hasAttribute('data-pending')).toBe(true)
    selectItem(pendingItem)
    await flushPromises()
    expect(values().city).toBe('msk')
    wrapper.unmount()
  })
})
