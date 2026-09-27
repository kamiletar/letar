import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, type PropType } from 'vue'
import { z } from 'zod'
import { AppForm } from '../core/app-form'
import { useAppFormContext } from '../core/form-context'
import { FieldSelect, type FieldSelectOption } from './field-select'

const countryOptions: FieldSelectOption[] = [
  { value: 'ru', label: 'Россия' },
  { value: 'de', label: 'Германия' },
]
const cityOptions: FieldSelectOption[] = [
  { value: 'msk', label: 'Москва' },
  { value: 'spb', label: 'Санкт-Петербург' },
]

/**
 * Монтирует живое поле-«родитель» через `form.Field` (`@tanstack/vue-form`) без собственного
 * скина — headless-эквивалент `Mount` из `forms-vue-shadcn`
 * (`field-select-dependent.spec.ts`). Нужен, чтобы правка родителя шла через настоящий
 * `FieldApi.handleChange`, а не голый `form.setFieldValue()`: только тогда срабатывает
 * `listeners.onChange` формы (`app-form.ts`), а с ним и `dependents.handleFieldChange` — сам
 * механизм автоочистки живёт там, не в `useDependentField`.
 */
const Mount = defineComponent({
  name: 'MountParentFields',
  props: { names: { type: Array as PropType<string[]>, required: true } },
  setup(props) {
    const { form } = useAppFormContext()
    return () =>
      props.names.map((name) =>
        h(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `form.Field` — компонент TanStack Form, не в публичных типах
          (form as any).Field,
          { name },
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `field` — `FieldApi` TanStack Form
            default: ({ field }: any) =>
              h('input', {
                'data-testid': `mount-${name}`,
                value: field.state.value ?? '',
                onInput: (event: Event) => field.handleChange((event.target as HTMLInputElement).value),
              }),
          },
        )
      )
  },
})

function fireOn(el: Element, type: string): void {
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))
}

function editParent(name: string, value: string): void {
  const input = document.querySelector(`[data-testid="mount-${name}"]`) as HTMLInputElement
  input.value = value
  fireOn(input, 'input')
}

const schema = z.object({
  countryId: z.string().optional().meta({ ui: { title: 'Страна' } }),
  regionId: z.string().optional().meta({ ui: { title: 'Регион' } }),
  cityId: z.string().optional().meta({ ui: { title: 'Город' } }),
})

function mountDependent(
  cityProps: Record<string, unknown>,
  initialValue: Record<string, string> = {},
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `DependentsRegistry`, тип из `@letar/forms-core/uikit`
  let dependents: any
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            AppForm,
            {
              schema,
              initialValue: { countryId: '', regionId: '', cityId: '', ...initialValue },
              onSubmit: () => undefined,
            },
            {
              default: () => [
                h(Mount, { names: ['countryId', 'regionId'] }),
                h(FieldSelect, { name: 'cityId', options: cityOptions, placeholder: 'Выберите город', ...cityProps }),
                h(FieldSelect, { name: 'countryId', options: countryOptions, placeholder: 'Выберите страну' }),
                h(defineComponent({
                  setup() {
                    const ctx = useAppFormContext()
                    form = ctx.form
                    dependents = ctx.dependents
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
  return { wrapper, values: () => form.state.values as Record<string, string>, dependents: () => dependents }
}

function hint(): HTMLElement | null {
  return document.querySelector('.letar-field__select-depends-hint')
}

function liveRegion(): HTMLElement | null {
  return document.querySelector('[data-dependent-live]')
}

function cityTrigger() {
  return document.querySelector('[data-field-name="cityId"] [role="combobox"]') as HTMLElement
}

/**
 * Этап 3f паритета Select: `dependsOn` (§18) — headless-эквивалент
 * `libs/forms-vue-shadcn/src/lib/fields/field-select-dependent.spec.ts`, разметка своя
 * (`[data-field-name]`/`[role="combobox"]`, не Reka `disabled`-атрибут кнопки Reka `Select`), сама
 * бизнес-логика (`useDependentField`, Этап 2) общая с остальными скинами.
 */
describe('FieldSelect (forms-vue, headless) — dependsOn', () => {
  it('без dependsOn — не заблокировано, подсказки и live-области нет', async () => {
    const { wrapper } = mountDependent({})
    await nextTick()
    expect(cityTrigger().hasAttribute('disabled')).toBe(false)
    expect(hint()).toBeNull()
    expect(liveRegion()).toBeNull()
    wrapper.unmount()
  })

  it('родитель пуст — поле заблокировано, подсказка «Сначала выберите «Страна»», aria-describedby на неё', async () => {
    const { wrapper } = mountDependent({ dependsOn: 'countryId' })
    await nextTick()
    const trigger = cityTrigger()
    expect(trigger.hasAttribute('disabled')).toBe(true)
    const hintEl = hint()
    expect(hintEl?.textContent).toContain('Сначала выберите «Страна»')
    expect(trigger.getAttribute('aria-describedby')).toBe(hintEl?.id)
    wrapper.unmount()
  })

  it('placeholderWhenDisabled переопределяет подсказку в самом поле', async () => {
    const { wrapper } = mountDependent({ dependsOn: 'countryId', placeholderWhenDisabled: 'Недоступно' })
    await nextTick()
    expect(cityTrigger().textContent).toContain('Недоступно')
    wrapper.unmount()
  })

  it('родитель уже заполнен (initialValue) — поле доступно, подсказки нет, значение не тронуто', async () => {
    const { wrapper, values } = mountDependent(
      { dependsOn: 'countryId' },
      { countryId: 'ru', cityId: 'msk' },
    )
    await nextTick()
    expect(cityTrigger().hasAttribute('disabled')).toBe(false)
    expect(hint()).toBeNull()
    expect(values().cityId).toBe('msk')
    wrapper.unmount()
  })

  it('реальная правка родителя очищает значение и объявляет об этом в live-области', async () => {
    const { wrapper, values } = mountDependent(
      { dependsOn: 'countryId' },
      { countryId: 'ru', cityId: 'msk' },
    )
    await nextTick()
    editParent('countryId', 'de')
    await nextTick()

    expect(values().cityId).toBe('')
    expect(liveRegion()?.textContent).toContain('Поле «Город» очищено: изменилось поле «Страна»')
    wrapper.unmount()
  })

  it('поле и так было пустым — правка родителя ничего не объявляет', async () => {
    const { wrapper } = mountDependent({ dependsOn: 'countryId' }, { countryId: 'ru' })
    await nextTick()
    editParent('countryId', 'de')
    await nextTick()
    expect(liveRegion()?.textContent).toBe('')
    wrapper.unmount()
  })

  it('родителя очистили — поле очищается и снова блокируется', async () => {
    const { wrapper, values } = mountDependent(
      { dependsOn: 'countryId' },
      { countryId: 'ru', cityId: 'msk' },
    )
    await nextTick()
    editParent('countryId', '')
    await nextTick()

    expect(values().cityId).toBe('')
    expect(cityTrigger().hasAttribute('disabled')).toBe(true)
    wrapper.unmount()
  })

  it('clearOnParentChange: false — значение остаётся при смене родителя', async () => {
    const { wrapper, values } = mountDependent(
      { dependsOn: 'countryId', clearOnParentChange: false },
      { countryId: 'ru', cityId: 'msk' },
    )
    await nextTick()
    editParent('countryId', 'de')
    await nextTick()
    expect(values().cityId).toBe('msk')
    wrapper.unmount()
  })

  it('disableWhenParentEmpty: false — поле доступно даже при пустом родителе', async () => {
    const { wrapper } = mountDependent({ dependsOn: 'countryId', disableWhenParentEmpty: false })
    await nextTick()
    expect(cityTrigger().hasAttribute('disabled')).toBe(false)
    expect(hint()).toBeNull()
    wrapper.unmount()
  })

  it('несколько родителей: depsReady требует оба, подсказка перечисляет недостающих', async () => {
    const { wrapper } = mountDependent({
      dependsOn: ['countryId', 'regionId'],
      depsReady: (deps: Record<string, unknown>) => !!deps.countryId && !!deps.regionId,
    })
    await nextTick()
    expect(hint()?.textContent).toContain('Страна')
    expect(hint()?.textContent).toContain('Регион')

    editParent('countryId', 'ru')
    await nextTick()
    // Один родитель заполнен, второй ещё нет — поле остаётся заблокированным
    expect(cityTrigger().hasAttribute('disabled')).toBe(true)

    editParent('regionId', 'central')
    await nextTick()
    expect(cityTrigger().hasAttribute('disabled')).toBe(false)
    wrapper.unmount()
  })

  it('dependents.suppress() — правка родителя внутри suppress не чистит зависимое поле', async () => {
    const { wrapper, values, dependents } = mountDependent(
      { dependsOn: 'countryId' },
      { countryId: 'ru', cityId: 'msk' },
    )
    await nextTick()

    dependents().suppress(() => {
      editParent('countryId', 'de')
    })
    await nextTick()

    expect(values().cityId).toBe('msk')
    wrapper.unmount()
  })

  it('поле остаётся закрытым: клик по заблокированному триггеру не открывает попап', async () => {
    const { wrapper } = mountDependent({ dependsOn: 'countryId' })
    await nextTick()
    await cityTrigger().click()
    await nextTick()
    expect(document.querySelector('[data-field-name="cityId"] [role="listbox"]')).toBeNull()
    wrapper.unmount()
  })
})
