import { type ConnectedPosition, Overlay, type OverlayRef } from '@angular/cdk/overlay'
import { DomPortal } from '@angular/cdk/portal'
import { computed, inject, type Signal, signal } from '@angular/core'
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
  /** Регистрирует триггер (origin для CDK Overlay) — вызвать из шаблона (`#trigger`, `AfterViewInit`) */
  attachTrigger(element: HTMLElement | null): void
  /**
   * Регистрирует DOM-элемент попапа (обычно `<ul role="listbox">`, уже отрисованный полем через
   * `@if (popup.isOpen())`) — переносит его в CDK `OverlayRef` через `DomPortal`. Вызывать из
   * шаблона при каждом появлении/исчезновении элемента (`#listbox` + `effect`/`afterRenderEffect`
   * на `popup.isOpen()`), как и `attachTrigger`.
   */
  attachFloating(element: HTMLElement | null): void
  /** Снимает Overlay/обработчики — обязательно вызвать из `ngOnDestroy` компонента поля */
  destroy(): void
}

const DEFAULT_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
]

/**
 * Headless-примитив кастомного listbox-попапа — Angular-эквивалент `useListboxPopup`
 * (`@letar/forms-vue`). Не композабл/хук (Angular-компоненты не render-функции), а обычная
 * фабрика, возвращающая сигналы и методы: вызывается один раз в конструкторе/`ngOnInit`
 * компонента поля, как и `formRoot.registerField(...)` в `FieldBase` — то есть внутри injection
 * context, что и требуется `inject(Overlay)` ниже.
 *
 * Позиционирование — `@angular/cdk` Overlay (`FlexibleConnectedPositionStrategy` от триггера,
 * `withPush`/фолбэк-позиция вместо `flip`, `outsidePointerEvents()` вместо ручного
 * `document.addEventListener`). `Overlay` в этой версии CDK — `providedIn: 'root'`, отдельного
 * `OverlayModule`/`importProvidersFrom` в standalone-приложении заводить не пришлось (проверено
 * до реализации, см. агент-mail тред `forms-vue-angular-select-parity`, msg 2250).
 *
 * Чистая логика индекса и type-ahead — та же, что у Vue-версии, в `@letar/forms-core/uikit`
 * (`moveListboxActiveIndex`/`createListboxTypeAhead`); эта фабрика — Angular-сигналы + CDK Overlay
 * вокруг неё. Сам попап (`<ul role="listbox">`) рисует шаблон поля — фабрика только переносит
 * этот DOM-узел в overlay-контейнер через `DomPortal`, как Vue-версия — через `:ref` на попап.
 */
export function createListboxPopup<T extends ListboxPopupOption>(
  options: CreateListboxPopupOptions<T>,
): ListboxPopup<T> {
  const overlay = inject(Overlay)
  const isOpenSignal = signal(false)
  const activeIndexSignal = signal(-1)
  let triggerElement: HTMLElement | null = null
  let overlayRef: OverlayRef | undefined
  const getText = options.getText ?? ((opt: T) => opt.value)
  const typeAhead = createListboxTypeAhead(getText)
  const typeAheadEnabled = options.typeAhead ?? true

  function optionId(index: number): string {
    return `${options.idBase}-option-${index}`
  }

  const activeDescendantId = computed<string | undefined>(() =>
    isOpenSignal() && activeIndexSignal() >= 0 ? optionId(activeIndexSignal()) : undefined
  )

  function disposeOverlay(): void {
    overlayRef?.dispose()
    overlayRef = undefined
  }

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
    disposeOverlay()
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

  function attachTrigger(element: HTMLElement | null): void {
    triggerElement = element
  }

  function attachFloating(element: HTMLElement | null): void {
    if (!element || !isOpenSignal()) {
      disposeOverlay()
      return
    }
    if (!triggerElement || overlayRef) {
      return
    }
    const positionStrategy = overlay.position()
      .flexibleConnectedTo(triggerElement)
      .withPositions(DEFAULT_POSITIONS)
      .withPush(true)
    overlayRef = overlay.create({
      positionStrategy,
      scrollStrategy: overlay.scrollStrategies.reposition(),
      minWidth: triggerElement.getBoundingClientRect().width,
    })
    overlayRef.outsidePointerEvents().subscribe((event) => {
      // Диспетчер CDK не знает про триггер (origin) — исключает только клики внутри самого
      // overlay-панели. Клик по триггеру закрывающий toggle обрабатывает сам (`togglePopup`),
      // здесь его нужно явно отфильтровать, иначе поповер закроется и тут же откроется заново.
      const target = event.target as Node | null
      if (target && triggerElement?.contains(target)) {
        return
      }
      if (isOpenSignal()) {
        closePopup()
      }
    })
    overlayRef.attach(new DomPortal(element))
  }

  function destroy(): void {
    disposeOverlay()
  }

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
    attachTrigger,
    attachFloating,
    destroy,
  }
}
