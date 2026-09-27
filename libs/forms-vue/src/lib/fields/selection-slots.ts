import { defineComponent, h, type VNode } from 'vue'
import { useSelectionActions, useSelectionOption } from './selection-context'

const warned = new Set<string>()

/** Dev-предупреждение: один раз на причину. Решение «прод или нет» здесь не принимается — только диагностика */
function warnOnce(key: string, message: string): void {
  const env = process.env.NODE_ENV
  if ((env !== 'development' && env !== 'test') || warned.has(key)) {
    return
  }
  warned.add(key)
  console.warn(`[@letar/forms-vue] ${message}`)
}

/** Только для тестов: сбросить «уже предупреждали» */
export function resetSelectionButtonWarnings(): void {
  warned.clear()
}

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

/** Enter/Space на кнопке в списке не должны превращаться в выбор подсвеченного пункта */
const stopActivationKeys = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation()
  }
}

/**
 * Карандаш «Изменить» у пункта списка или у выбранного значения. Рисуется только внутри поля
 * Select с `onUpdate` — по умолчанию поле само вставляет его туда, где `renderOption` не задан
 * (см. `field-select.ts`); слот экспортируется отдельно для случая, когда приложение задаёт свой
 * `renderOption` и хочет карандаш внутри него. Headless-версия того же паттерна, что
 * `forms-vue-shadcn` (`selection-slots.ts`) — без Tailwind/`cn()` и без иконки из сторонней
 * библиотеки (headless-скин не тянет `lucide-vue-next`), содержимое по умолчанию — символ «✎».
 */
export const SelectEditButton = defineComponent({
  name: 'SelectEditButton',
  props: {
    'aria-label': { type: String, required: false, default: undefined },
    title: { type: String, required: false, default: undefined },
  },
  setup(props, { slots }) {
    const actionsSource = useSelectionActions()
    const optionSource = useSelectionOption()

    return (): VNode | null => {
      const actions = actionsSource?.value ?? null
      const item = optionSource?.value ?? null

      if (!actions || !item) {
        warnOnce('edit-outside', 'Select.EditButton использован вне поля Select или пункта — ничего не отрисовано')
        return null
      }
      if (!actions.hasOnUpdate) {
        warnOnce('edit-no-onupdate', 'Select.EditButton требует `onUpdate` на поле — ничего не отрисовано')
        return null
      }
      if (!item.editable || !actions.interactive) {
        return null
      }

      const scope = item.scope
      const inList = scope === 'option'

      return h('button', {
        type: 'button',
        'data-part': 'edit-button',
        // В пункте карандаш вне Tab-порядка и скрыт от AT: иначе фокус при открытии прыгнет на него, а Enter выберет пункт
        tabindex: inList ? -1 : undefined,
        'aria-hidden': inList ? true : undefined,
        'aria-label': props['aria-label'] ?? actions.strings.editAria(item.text),
        title: props.title ?? actions.strings.edit,
        disabled: actions.pending,
        class: 'letar-field__select-edit-button',
        onPointerdown: inList ? stop : undefined,
        onPointerup: inList ? stop : undefined,
        onKeydown: stopActivationKeys,
        onClick: (event: MouseEvent) => {
          event.stopPropagation()
          event.preventDefault()
          actions.runEdit(item.option, scope)
        },
      }, slots.default?.() ?? ['✎'])
    }
  },
})

/** Кнопка «+ Добавить…» — для собственного `renderOption` поля, вне встроенного пункта создания */
export const SelectCreateButton = defineComponent({
  name: 'SelectCreateButton',
  setup(_props, { slots }) {
    const actionsSource = useSelectionActions()

    return (): VNode | null => {
      const actions = actionsSource?.value ?? null

      if (!actions) {
        warnOnce('create-outside', 'Select.CreateButton использован вне поля Select — ничего не отрисовано')
        return null
      }
      if (!actions.canCreate || !actions.interactive) {
        return null
      }

      const label = actions.search ? actions.strings.createWithSearch(actions.search) : actions.strings.create

      return h('button', {
        type: 'button',
        disabled: actions.pending,
        class: 'letar-field__select-create-button',
        onPointerdown: stop,
        onKeydown: stopActivationKeys,
        onClick: (event: MouseEvent) => {
          event.stopPropagation()
          event.preventDefault()
          actions.runCreate()
        },
      }, slots.default?.() ?? label)
    }
  },
})
