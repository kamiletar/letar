import { autoUpdate, computePosition, flip, offset, type Placement, shift, size } from '@floating-ui/dom'
import { createListboxTypeAhead, moveListboxActiveIndex } from '@letar/forms-core/uikit'
import { computed, onBeforeUnmount, onMounted, reactive, type Ref, ref } from 'vue'

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
  /** Сторона размещения попапа относительно триггера. По умолчанию `'bottom-start'` */
  placement?: Placement
}

export interface FloatingStyles {
  position: 'absolute'
  top: string
  left: string
  minWidth: string
}

/**
 * Headless-примитив кастомного listbox-попапа: открытие/закрытие, активная (подсвеченная)
 * опция, клавиатурная навигация (стрелки/Home/End/Enter/Escape/type-ahead), закрытие по клику
 * снаружи, позиционирование через `@floating-ui/dom` (viewport-флип/shift, синхронизация ширины
 * с триггером, пересчёт при скролле/ресайзе через `autoUpdate`). Владелец решил не откладывать
 * позиционирующую библиотеку до полноценного Select/Combobox (Этап 3) — паритет качества с
 * продакшен-скином `forms-vue-shadcn` (Reka UI, там та же `@floating-ui/vue` под капотом) важнее
 * лишней зависимости.
 *
 * Чистая логика индекса и type-ahead — в `@letar/forms-core/uikit`
 * (`moveListboxActiveIndex`/`createListboxTypeAhead`), этот композабл — Vue-реактивность (`ref`),
 * DOM-обвязка (click-outside, floating-ui) вокруг неё. Angular-версия (`@letar/forms-angular`)
 * оборачивает ту же чистую логику `@angular/cdk` Overlay.
 */
export function useListboxPopup<T extends ListboxPopupOption>(options: UseListboxPopupOptions<T>) {
  const isOpen = ref(false)
  const activeIndex = ref(-1)
  const triggerRef: Ref<HTMLElement | null> = ref(null)
  const floatingRef: Ref<HTMLElement | null> = ref(null)
  const floatingStyles = reactive<FloatingStyles>({ position: 'absolute', top: '0px', left: '0px', minWidth: '0px' })
  const getText = options.getText ?? ((opt: T) => opt.value)
  const typeAhead = createListboxTypeAhead(getText)
  const typeAheadEnabled = options.typeAhead ?? true
  const placement = options.placement ?? 'bottom-start'
  let stopAutoUpdate: (() => void) | undefined

  function optionId(index: number): string {
    return `${options.idBase}-option-${index}`
  }

  const activeDescendantId = computed<string | undefined>(() =>
    isOpen.value && activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined
  )

  function updatePosition(): void {
    const trigger = triggerRef.value
    const floating = floatingRef.value
    if (!trigger || !floating) {
      return
    }
    void computePosition(trigger, floating, {
      placement,
      middleware: [
        offset(4),
        flip(),
        shift({ padding: 8 }),
        size({
          apply({ rects, elements }) {
            elements.floating.style.minWidth = `${rects.reference.width}px`
          },
        }),
      ],
    }).then(({ x, y }) => {
      floatingStyles.top = `${y}px`
      floatingStyles.left = `${x}px`
    })
  }

  function startAutoUpdate(): void {
    const trigger = triggerRef.value
    const floating = floatingRef.value
    if (!trigger || !floating || stopAutoUpdate) {
      return
    }
    stopAutoUpdate = autoUpdate(trigger, floating, updatePosition)
  }

  function stopPositioning(): void {
    stopAutoUpdate?.()
    stopAutoUpdate = undefined
  }

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
    // `floatingRef` попадает в DOM только после этого рендера (v-if на isOpen) — запускаем
    // позиционирование в следующем тике через тот же приём, что и в форме без явного nextTick:
    // startAutoUpdate сам не делает ничего, пока оба рефа не заполнены, поэтому вызов из
    // watcher/onMounted вложенного попапа безопасен; здесь достаточно немедленной попытки —
    // `attachFloating` (вызывается из шаблона через `:ref` на попап-элемент) досчитает остальное.
    startAutoUpdate()
    updatePosition()
  }

  function closePopup(): void {
    isOpen.value = false
    activeIndex.value = -1
    typeAhead.reset()
    stopPositioning()
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

  function isInside(node: Node): boolean {
    return Boolean(triggerRef.value?.contains(node) || floatingRef.value?.contains(node))
  }

  function handleDocumentMousedown(event: MouseEvent): void {
    if (isOpen.value && !isInside(event.target as Node)) {
      closePopup()
    }
  }

  /**
   * Вызывается из шаблона поля через `:ref` на сам попап-элемент (обычно `<ul role="listbox">`).
   * Отдельная функция, а не голый `floatingRef`, — чтобы сразу пересчитать позицию и запустить
   * `autoUpdate`, как только элемент реально попал в DOM (при `v-if="isOpen"` это происходит уже
   * после `openPopup()`, `floatingRef.value` в её теле ещё `null`).
   */
  function attachFloating(element: HTMLElement | null): void {
    floatingRef.value = element
    if (element && isOpen.value) {
      startAutoUpdate()
      updatePosition()
    } else if (!element) {
      stopPositioning()
    }
  }

  onMounted(() => document.addEventListener('mousedown', handleDocumentMousedown))
  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', handleDocumentMousedown)
    stopPositioning()
  })

  return {
    isOpen,
    activeIndex,
    triggerRef,
    floatingRef: attachFloating,
    floatingStyles,
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
