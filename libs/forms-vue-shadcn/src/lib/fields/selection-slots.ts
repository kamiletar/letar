import { cn } from '@letar/tailwind-utils'
import { Pencil } from 'lucide-vue-next'
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
  console.warn(`[@letar/forms-vue-shadcn] ${message}`)
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
 * Select с `onUpdate`; логика (гашение событий, `disabled`, `aria-*`) зеркалит `useSelectionEditButton`
 * из `@letar/forms-react` (`use-selection-buttons.ts`), только на `inject()` вместо `useContext()`.
 * Без `asChild` (React-версия его умеет) — вне объёма Stage 3b, см. отчёт.
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
      if (item.scope === 'value-text') {
        warnOnce(
          'edit-in-trigger',
          'Select.EditButton внутри `renderValue` недопустим (триггер — <button>) — ничего не отрисовано',
        )
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
        onPointerdown: inList ? stop : undefined,
        onPointerup: inList ? stop : undefined,
        onKeydown: stopActivationKeys,
        onClick: (event: MouseEvent) => {
          event.stopPropagation()
          event.preventDefault()
          actions.runEdit(item.option, scope)
        },
        class: cn(
          'text-muted-foreground hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-sm outline-none',
          'focus-visible:ring-ring/50 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
          // В списке карандаш виден на подсвеченном пункте (и всегда на устройствах без hover)
          inList
            && 'ml-auto opacity-0 group-hover/item:opacity-100 group-data-[highlighted]/item:opacity-100 [@media(hover:none)]:opacity-100',
        ),
      }, slots.default?.() ?? [h(Pencil, { class: 'size-3.5' })])
    }
  },
})

/** Кнопка «+ Добавить…» — в `listFooter` или в своём `renderOption` */
export const SelectCreateButton = defineComponent({
  name: 'SelectCreateButton',
  setup(_props, { slots }) {
    const actionsSource = useSelectionActions()
    const optionSource = useSelectionOption()

    return (): VNode | null => {
      const actions = actionsSource?.value ?? null
      const item = optionSource?.value ?? null

      if (!actions) {
        warnOnce('create-outside', 'Select.CreateButton использован вне поля Select — ничего не отрисовано')
        return null
      }
      if (item?.scope === 'value-text' || !actions.canCreate || !actions.interactive) {
        return null
      }

      const label = actions.search ? actions.strings.createWithSearch(actions.search) : actions.strings.create

      return h('button', {
        type: 'button',
        disabled: actions.pending,
        onPointerdown: stop,
        onKeydown: stopActivationKeys,
        onClick: (event: MouseEvent) => {
          event.stopPropagation()
          event.preventDefault()
          actions.runCreate()
        },
        class: cn(
          'hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-1.5 text-start text-sm outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
        ),
      }, slots.default?.() ?? label)
    }
  },
})
