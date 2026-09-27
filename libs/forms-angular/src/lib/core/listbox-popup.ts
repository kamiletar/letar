import { computed, type Signal, signal } from '@angular/core'
import { createListboxTypeAhead, moveListboxActiveIndex } from '@letar/forms-core/uikit'

export interface ListboxPopupOption {
  value: string
  disabled?: boolean
}

export interface CreateListboxPopupOptions<T extends ListboxPopupOption> {
  /** Текущий видимый список опций (после фильтрации поиском, если есть) */
  options: () => readonly T[]
  /** Вызывается при выборе опции (Enter на активной, клик по опции) */
  onSelect: (option: T) => void
  /** Текст опции для type-ahead поиска по первой букве (по умолчанию — `value`) */
  getText?: (option: T) => string
  /** Текущее значение поля — при открытии активной становится уже выбранная опция, если она есть в списке */
  selectedValue?: () => string | undefined
  /** Префикс для id опций/списка (обычно `name` поля) — должен быть уникален на странице */
  idBase: string
  /**
   * `false` — печатные символы на закрытом/сфокусированном контроле не двигают активную опцию.
   * Нужно отключать у `Combobox`/`Autocomplete`, где символы уже идут в текстовый инпут и сами
   * фильтруют список. По умолчанию `true` (нативное поведение `<select>`), подходит для `Field.Select`.
   */
  typeAhead?: boolean
}

export interface ListboxPopup<T extends ListboxPopupOption> {
  readonly isOpen: Signal<boolean>
  readonly activeIndex: Signal<number>
  readonly activeDescendantId: Signal<string | undefined>
  optionId(index: number): string
  openPopup(): void
  closePopup(): void
  togglePopup(): void
  onKeydown(event: KeyboardEvent): void
  selectIndex(index: number): void
  selectActive(): void
  /** Регистрирует корневой DOM-элемент для click-outside — вызвать из шаблона (`#root`, `AfterViewInit`) */
  attachRoot(element: HTMLElement | null): void
  /** Снимает обработчик `document` — обязательно вызвать из `ngOnDestroy` компонента поля */
  destroy(): void
}

/**
 * Headless-примитив кастомного listbox-попапа — Angular-эквивалент `useListboxPopup`
 * (`@letar/forms-vue`). Не композабл/хук (Angular-компоненты не render-функции), а обычная
 * фабрика, возвращающая сигналы и методы: вызывается один раз в конструкторе/`ngOnInit`
 * компонента поля, как и `formRoot.registerField(...)` в `FieldBase`.
 *
 * Специально НЕ использует `effect()`/DI — фабрику не обязательно вызывать в injection context,
 * она подписывается на `document` напрямую и снимается через явный `destroy()` (компонент поля
 * вызывает его из `ngOnDestroy`, как и `subscription.unsubscribe()` в `FieldBase`).
 *
 * Чистая логика индекса и type-ahead — та же, что у Vue-версии, в `@letar/forms-core/uikit`
 * (`moveListboxActiveIndex`/`createListboxTypeAhead`); эта фабрика — только Angular-сигналы и
 * DOM-обвязка (click-outside) вокруг неё. Позиционирование попапа (обычно `position: absolute`
 * под триггером) — вёрстка поля, как и у headless `forms-vue`.
 */
export function createListboxPopup<T extends ListboxPopupOption>(
  options: CreateListboxPopupOptions<T>,
): ListboxPopup<T> {
  const isOpenSignal = signal(false)
  const activeIndexSignal = signal(-1)
  let rootElement: HTMLElement | null = null
  const getText = options.getText ?? ((opt: T) => opt.value)
  const typeAhead = createListboxTypeAhead(getText)
  const typeAheadEnabled = options.typeAhead ?? true

  function optionId(index: number): string {
    return `${options.idBase}-option-${index}`
  }

  const activeDescendantId = computed<string | undefined>(() =>
    isOpenSignal() && activeIndexSignal() >= 0 ? optionId(activeIndexSignal()) : undefined
  )

  function openPopup(): void {
    if (isOpenSignal()) {
      return
    }
    isOpenSignal.set(true)
    const visible = options.options()
    const selected = options.selectedValue?.()
    const selectedIndex = selected === undefined ? -1 : visible.findIndex((opt) => opt.value === selected)
    activeIndexSignal.set(selectedIndex >= 0 ? selectedIndex : moveListboxActiveIndex(visible, -1, 'first'))
  }

  function closePopup(): void {
    isOpenSignal.set(false)
    activeIndexSignal.set(-1)
    typeAhead.reset()
  }

  function togglePopup(): void {
    if (isOpenSignal()) {
      closePopup()
    } else {
      openPopup()
    }
  }

  function move(direction: 'next' | 'prev' | 'first' | 'last'): void {
    activeIndexSignal.set(moveListboxActiveIndex(options.options(), activeIndexSignal(), direction))
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
    if (activeIndexSignal() >= 0) {
      selectIndex(activeIndexSignal())
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpenSignal()) {
          openPopup()
        } else {
          move('next')
        }
        return
      case 'ArrowUp':
        event.preventDefault()
        if (!isOpenSignal()) {
          openPopup()
        } else {
          move('prev')
        }
        return
      case 'Home':
        if (isOpenSignal()) {
          event.preventDefault()
          move('first')
        }
        return
      case 'End':
        if (isOpenSignal()) {
          event.preventDefault()
          move('last')
        }
        return
      case 'Enter':
        if (isOpenSignal()) {
          event.preventDefault()
          selectActive()
        }
        return
      case 'Escape':
        if (isOpenSignal()) {
          event.preventDefault()
          closePopup()
        }
        return
      default:
        if (typeAheadEnabled && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          if (!isOpenSignal()) {
            openPopup()
          }
          const matched = typeAhead.match(options.options(), activeIndexSignal(), event.key)
          if (matched >= 0) {
            activeIndexSignal.set(matched)
          }
        }
    }
  }

  function handleDocumentMousedown(event: MouseEvent): void {
    if (isOpenSignal() && rootElement && !rootElement.contains(event.target as Node)) {
      closePopup()
    }
  }
  document.addEventListener('mousedown', handleDocumentMousedown)

  return {
    isOpen: isOpenSignal.asReadonly(),
    activeIndex: activeIndexSignal.asReadonly(),
    activeDescendantId,
    optionId,
    openPopup,
    closePopup,
    togglePopup,
    onKeydown,
    selectIndex,
    selectActive,
    attachRoot(element) {
      rootElement = element
    },
    destroy() {
      document.removeEventListener('mousedown', handleDocumentMousedown)
    },
  }
}
