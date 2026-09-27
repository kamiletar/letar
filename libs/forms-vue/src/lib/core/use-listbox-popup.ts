import { createListboxTypeAhead, moveListboxActiveIndex } from '@letar/forms-core/uikit'
import { computed, onBeforeUnmount, onMounted, type Ref, ref } from 'vue'

export interface ListboxPopupOption {
  value: string
  disabled?: boolean
}

export interface UseListboxPopupOptions<T extends ListboxPopupOption> {
  /** Текущий видимый список опций (после фильтрации поиском, если есть) */
  options: () => readonly T[]
  /** Вызывается при выборе опции (Enter на активной, клик по опции) */
  onSelect: (option: T) => void
  /** Текст опции для type-ahead поиска по первой букве (по умолчанию — `value`) */
  getText?: (option: T) => string
  /** Текущее значение поля — при открытии активной становится уже выбранная опция, если она есть в списке */
  selectedValue?: () => string | undefined
  /** Префикс для id опций/списка (обычно `fullPath` поля) — должен быть уникален на странице */
  idBase: string
  /**
   * `false` — печатные символы на закрытом/сфокусированном контроле не двигают активную опцию.
   * Нужно отключать у `Combobox`/`Autocomplete`, где символы уже идут в текстовый инпут и сами
   * фильтруют список — двойная реакция на одну и ту же клавишу была бы лишней. По умолчанию `true`
   * (нативное поведение `<select>`), подходит для `Field.Select`.
   */
  typeAhead?: boolean
}

/**
 * Headless-примитив кастомного listbox-попапа: открытие/закрытие, активная (подсвеченная)
 * опция, клавиатурная навигация (стрелки/Home/End/Enter/Escape/type-ahead), закрытие по клику
 * снаружи. Ни один из headless-скинов (`forms-vue`, `forms-angular`) не имел раньше вообще
 * никакого поп-ап движка — Select/Combobox/Autocomplete рисовали инлайн-`<ul>` без позиционирования
 * и без ARIA `listbox`-паттерна. Этот композабл не позиционирует сам попап (просто говорит,
 * открыт он или нет) — позиционирование (обычно `position: absolute` под триггером) остаётся
 * вёрстке поля, как и у остальных headless-компонентов пакета (см. `@letar/forms-vue-shadcn` для
 * примера с настоящим floating-слоем через Reka).
 *
 * Чистая логика индекса и type-ahead — в `@letar/forms-core/uikit`
 * (`moveListboxActiveIndex`/`createListboxTypeAhead`), этот композабл — только Vue-реактивность
 * (`ref`) и DOM-обвязка (click-outside) вокруг неё. Angular-версия (`@letar/forms-angular`) оборачивает
 * ту же чистую логику своими `signal`.
 */
export function useListboxPopup<T extends ListboxPopupOption>(options: UseListboxPopupOptions<T>) {
  const isOpen = ref(false)
  const activeIndex = ref(-1)
  const rootRef: Ref<HTMLElement | null> = ref(null)
  const getText = options.getText ?? ((opt: T) => opt.value)
  const typeAhead = createListboxTypeAhead(getText)
  const typeAheadEnabled = options.typeAhead ?? true

  function optionId(index: number): string {
    return `${options.idBase}-option-${index}`
  }

  const activeDescendantId = computed<string | undefined>(() =>
    isOpen.value && activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined
  )

  function openPopup(): void {
    if (isOpen.value) {
      return
    }
    isOpen.value = true
    const visible = options.options()
    const selected = options.selectedValue?.()
    const selectedIndex = selected === undefined ? -1 : visible.findIndex((opt) => opt.value === selected)
    activeIndex.value = selectedIndex >= 0
      ? selectedIndex
      : moveListboxActiveIndex(visible, -1, 'first')
  }

  function closePopup(): void {
    isOpen.value = false
    activeIndex.value = -1
    typeAhead.reset()
  }

  function togglePopup(): void {
    if (isOpen.value) {
      closePopup()
    } else {
      openPopup()
    }
  }

  function move(direction: 'next' | 'prev' | 'first' | 'last'): void {
    activeIndex.value = moveListboxActiveIndex(options.options(), activeIndex.value, direction)
  }

  function selectIndex(index: number): void {
    const option = options.options()[index]
    if (!option || option.disabled) {
      return
    }
    options.onSelect(option)
    closePopup()
  }

  function selectActive(): void {
    if (activeIndex.value >= 0) {
      selectIndex(activeIndex.value)
    }
  }

  /**
   * Единый обработчик `keydown` — вешается и на триггер (`Select`), и на сам список
   * (когда фокус переходит внутрь, например по клику). Печатные символы — только когда
   * `typeAhead` включён; `Combobox`/`Autocomplete` передают `typeAhead: false` и обрабатывают
   * ввод сами через свой текстовый инпут.
   */
  function onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen.value) {
          openPopup()
        } else {
          move('next')
        }
        return
      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen.value) {
          openPopup()
        } else {
          move('prev')
        }
        return
      case 'Home':
        if (isOpen.value) {
          event.preventDefault()
          move('first')
        }
        return
      case 'End':
        if (isOpen.value) {
          event.preventDefault()
          move('last')
        }
        return
      case 'Enter':
        if (isOpen.value) {
          event.preventDefault()
          selectActive()
        }
        return
      case 'Escape':
        if (isOpen.value) {
          event.preventDefault()
          closePopup()
        }
        return
      default:
        if (typeAheadEnabled && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          if (!isOpen.value) {
            openPopup()
          }
          const matched = typeAhead.match(options.options(), activeIndex.value, event.key)
          if (matched >= 0) {
            activeIndex.value = matched
          }
        }
    }
  }

  function handleDocumentMousedown(event: MouseEvent): void {
    if (isOpen.value && rootRef.value && !rootRef.value.contains(event.target as Node)) {
      closePopup()
    }
  }

  onMounted(() => document.addEventListener('mousedown', handleDocumentMousedown))
  onBeforeUnmount(() => document.removeEventListener('mousedown', handleDocumentMousedown))

  return {
    isOpen,
    activeIndex,
    rootRef,
    activeDescendantId,
    optionId,
    openPopup,
    closePopup,
    togglePopup,
    onKeydown,
    selectIndex,
    selectActive,
  }
}
