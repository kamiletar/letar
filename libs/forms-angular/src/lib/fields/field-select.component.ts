import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  ContentChild,
  effect,
  type ElementRef,
  inject,
  Injector,
  Input,
  type OnDestroy,
  runInInjectionContext,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'
import type { FormControl } from '@angular/forms'
import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type CreatedOption,
  isCreateOptionValue,
  isOptionEditable,
  mergeCreatedOptions,
  type SelectionActionContext,
  type SettleErrorInfo,
  type UpdatedOption,
} from '@letar/forms-core/uikit'
import { FieldBase } from '../core/field-base'
import { createListboxPopup, type ListboxPopup, type ListboxPopupOption } from '../core/listbox-popup'
import { createSelectionActionsState, type SelectionActionsState } from '../core/selection-actions-state'
import { selectionStrings } from './selection-strings'

export interface FieldSelectOption {
  value: string
  label: string
  /** Вторая строка в пункте списка (под `label`) — виден только в кастомном рендере, нативный `<select>` её не показывал */
  description?: string
  disabled?: boolean
  /** Вычисляется полем (`isOptionEditable`) — приложение может явно запретить карандаш и своей опции (`editable: false`) */
  editable?: boolean
  /** Запись ещё не подтверждена сервером (Этап 3h, оптимистичный `onCreate`/`onUpdate`) — показана приглушённой, не выбирается */
  pending?: boolean
  /** Данные приложения — поле их не читает, только хранит и отдаёт обратно в `onUpdate`/`renderOption` */
  data?: unknown
}

/** Состояние опции, которое получает `optionTemplate` — вместе с самой опцией (`$implicit`) */
export interface SelectOptionRenderState {
  /** Опция совпадает с текущим значением поля */
  selected: boolean
  /** Опция подсвечена клавиатурной навигацией (аналог `aria-activedescendant`) */
  active: boolean
}

/**
 * Слот карандаша «Изменить» для конкретной опции — Angular-идиома вместо React/Vue
 * компонента-слота с `provide`/`inject`-контекстом (`SelectEditButton` в `forms-vue`): та же
 * механика, что уже выбрана для `renderOption`/`renderValue` в Этапе 3g — именованный шаблонный
 * контекст, а не отдельный внедряемый компонент. `null` в контексте `optionTemplate` — карандаш
 * этой опции не нужен (нет `onUpdate`, опция не редактируема, это служебный пункт создания).
 */
export interface SelectEditSlot {
  /** Запускает `onUpdate` для этой опции — то же, что клик по встроенному карандашу */
  run: () => void
  /** Подпись карандаша («Изменить») */
  label: string
  /** `aria-label` карандаша («Изменить: <текст опции>») */
  ariaLabel: string
  /** Правка уже идёт (`onCreate`/`onUpdate` в полёте) — кнопка должна быть `disabled` */
  disabled: boolean
}

/**
 * Кастомный listbox-попап вместо нативного `<select>` — Angular-эквивалент `FieldSelect`
 * (`@letar/forms-vue`/`@letar/forms-vue-shadcn`). Этап 3g паритета Select/Combobox
 * (`forms-vue-angular-select-parity`, msg 2242/2246): нативный элемент физически не может
 * показать кастомный рендер опции, вторую строку описания или кастомное значение — заменён на
 * `<button role="combobox">` + `<ul role="listbox">` поверх headless-примитива
 * `createListboxPopup` (`../core/listbox-popup.ts`, Этап 1) с позиционированием через
 * `@angular/cdk` Overlay. `FieldNativeSelectComponent` (нативный `<select>`) остаётся отдельным
 * полем без изменений — сознательный выбор для форм, которым не нужен кастомный рендер.
 *
 * `renderOption`/`renderValue` — не колбэк, возвращающий VNode/JSX (Angular не рендерит функции
 * из шаблона так, как React/Vue), а идиоматичный для Angular способ кастомизации: именованные
 * `<ng-template>` через `@ContentChild(TemplateRef)`, вставляемые `*ngTemplateOutlet` с контекстом
 * (`$implicit` — опция, у `optionTemplate` дополнительно `state` — `{ selected, active }`). Это
 * тот же паттерн, которым `mat-select`/`ng-select`/`ag-grid` решают кастомный рендер ячейки —
 * шаблон, а не функция-рендерер:
 *
 * ```html
 * <letar-field-select name="country" [options]="countryOptions">
 *   <ng-template #optionTemplate let-option let-state="state">
 *     <b [class.active]="state.active">{{ option.label }}</b>
 *   </ng-template>
 *   <ng-template #valueTemplate let-option>{{ option.label }}</ng-template>
 * </letar-field-select>
 * ```
 *
 * Без пользовательских шаблонов используются встроенные `defaultOptionTemplate`/
 * `defaultValueTemplate` (`label` + `description`, та же семантика fallback-на-`label`, что и в
 * `forms-vue`/`forms-vue-shadcn`: пустой кастомный рендер выбранного значения не предусмотрен —
 * `valueTemplate` либо задан целиком, либо не задан вовсе, откат на `defaultValueTemplate`).
 *
 * `[formControl]` не используется (в отличие от `FieldNativeSelectComponent`) — своя кнопка без
 * нативного value-accessor, тот же приём, что `FieldListboxComponent`/`FieldRadioCardComponent`:
 * локальный сигнал `selectedValue`, синхронизируемый через `effect()` + `ctrl.events.subscribe()`,
 * выбор — ручной `ctrl.setValue()`.
 *
 * `attachTrigger`/`attachFloating` (Этап 1, `listbox-popup.ts`) регистрируются через
 * `@ViewChild`-**сеттеры**, не через `ngAfterViewInit`/`effect()` на `popup.isOpen()`, как
 * предполагал JSDoc примитива буквально — эквивалентный, но более прямой Angular-идиоматичный
 * способ: сеттер вызывается автоматически на каждое появление/исчезновение `#listbox`
 * (`@if (popup.isOpen())` монтирует/демонтирует `<ul>`), без ручной подписки на сигнал.
 *
 * ⚠️ Известное ограничение: `ListboxPopup.activeIndex` — `readonly Signal<number>` (не мутируемый
 * `ref`, как в Vue-версии), поэтому наведение мышью не двигает клавиатурный активный индекс —
 * визуальный hover даёт только CSS (`:hover` в стилях приложения), `aria-activedescendant`
 * обновляется исключительно клавиатурой. Примитив не даёт публичного сеттера намеренно
 * (инкапсуляция состояния) — расширять его ради этого не входит в объём Этапа 3g.
 *
 * Этап 3h паритета: `onCreate`/`onUpdate`/`pending` через готовый `createSelectionActionsState`
 * (`../core/selection-actions-state.ts`, Этап 2 — бизнес-логика не меняется, только её UI-
 * подключение, тот же приём, что и в `forms-vue`/`forms-vue-shadcn`). Устройство:
 * - **Список.** `mergedOptions()`/`visibleOptions()` — опции приложения (с уже наложенными
 *   правками `actions.overlay()`) + оптимистично созданные (`actions.createdOptions()`) +
 *   служебный пункт «+ Добавить…» в конце, когда `onCreate` задан и `createItem !== false`.
 *   Без поиска (Этап 3i) создание предлагается всегда, не по совпадению текста — то же решение,
 *   что у `forms-vue` (Этап 3e, до появления `searchable` в 3f).
 * - **Карандаш пункта.** Слот `SelectEditSlot` в контексте `optionTemplate` (см. выше) —
 *   `null`, если `onUpdate` не задан, опция не редактируема (`isOptionEditable`) или это
 *   служебный пункт создания. Встроенный `defaultOptionTemplate` рисует кнопку сам, когда слот
 *   не `null`; свой `optionTemplate` должен вставить кнопку сам, если она нужна.
 * - **Карандаш значения.** Не через шаблонный контекст (`valueTemplate` рендерится ВНУТРИ
 *   `<button>`-триггера — вложенная кнопка невалидна) — отдельная кнопка-сосед триггера внутри
 *   `.letar-field__select`, тот же приём, что и в `forms-vue`/`forms-vue-shadcn`.
 * - **`pending`.** У самой фабрики (`actions.pending()`) — идёт интерактивная фаза (окно
 *   приложения открыто), карандаши/кнопка создания получают `disabled`. У опции (`option.pending`,
 *   приложения или оптимистично созданной этим полем) — `aria-busy`/`data-pending` на `<li>`,
 *   опция исключена из выбора (клавиатурой и мышью) через `disabled` в `popupOptions()`, но
 *   ARIA-атрибут другой (`aria-busy`, не `aria-disabled` — опция не «выключена», она «занята»).
 * - **Откат при ошибке.** Встроенное сообщение `actions.settleFailure()` под полем, если
 *   `onSettleError` не задан приложением (контракт фабрики, без изменений).
 */
@Component({
  selector: 'letar-field-select',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #defaultOptionTemplate let-option let-state="state" let-edit="edit">
      <span class="letar-field__select-option-label">{{ option.label }}</span>
      @if (option.description) {
        <span class="letar-field__select-option-description">{{ option.description }}</span>
      }
      @if (edit) {
        <button
          type="button"
          tabindex="-1"
          aria-hidden="true"
          class="letar-field__select-edit-button"
          data-part="edit-button"
          [title]="edit.label"
          [disabled]="edit.disabled"
          (click)="$event.stopPropagation(); $event.preventDefault(); edit.run()"
        >✎</button>
      }
    </ng-template>
    <ng-template #defaultValueTemplate let-option>{{ option.label }}</ng-template>
    @if (control(); as ctrl) {
      <div class="letar-field" [attr.data-field-name]="name">
        <label [for]="name">{{ resolvedLabel() }}{{ isRequired() ? ' *' : '' }}</label>
        <div class="letar-field__select">
          <button
            #trigger
            type="button"
            [id]="name"
            class="letar-field__control letar-field__select-trigger"
            role="combobox"
            aria-haspopup="listbox"
            [attr.aria-expanded]="popup.isOpen()"
            [attr.aria-controls]="listboxId"
            [attr.aria-activedescendant]="popup.activeDescendantId()"
            [attr.data-field-name]="name"
            [attr.data-placeholder]="selectedOption() ? null : ''"
            (click)="popup.togglePopup()"
            (keydown)="popup.onKeydown($event)"
            (blur)="onTriggerBlur(ctrl)"
          >
            @if (selectedOption(); as selOpt) {
              <ng-container
                *ngTemplateOutlet="valueTemplate ?? defaultValueTemplate; context: { $implicit: selOpt }"
              ></ng-container>
            } @else {
              <span class="letar-field__select-placeholder">{{ resolvedPlaceholder() }}</span>
            }
          </button>
          @if (valueEditVisible()) {
            <button
              type="button"
              class="letar-field__select-edit-button letar-field__select-edit-button--value"
              data-part="edit-button"
              [title]="selectionStrings.edit"
              [attr.aria-label]="valueEditAriaLabel()"
              [disabled]="actions.pending()"
              (click)="runEdit(selectedOption()!, 'value')"
            >✎</button>
          }
          @if (popup.isOpen()) {
            <ul #listbox [id]="listboxId" role="listbox" class="letar-field__select-listbox">
              @for (option of visibleOptions(); track option.value; let i = $index) {
                @if (isCreateOption(option)) {
                  <li
                    [id]="popup.optionId(i)"
                    role="option"
                    class="letar-field__select-option letar-field__select-create-item"
                    aria-selected="false"
                    [attr.data-active]="i === popup.activeIndex() || null"
                    (mousedown)="$event.preventDefault()"
                    (click)="popup.selectIndex(i)"
                  >{{ option.label }}</li>
                } @else {
                  <li
                    [id]="popup.optionId(i)"
                    role="option"
                    class="letar-field__select-option"
                    [attr.aria-selected]="option.value === currentDisplayValue()"
                    [attr.aria-busy]="option.pending || null"
                    [attr.data-active]="i === popup.activeIndex() || null"
                    [attr.data-pending]="option.pending || null"
                    (mousedown)="$event.preventDefault()"
                    (click)="popup.selectIndex(i)"
                  >
                    <ng-container
                      *ngTemplateOutlet="
                        optionTemplate ?? defaultOptionTemplate;
                        context: {
                          $implicit: option,
                          state: { selected: option.value === currentDisplayValue(), active: i === popup.activeIndex() },
                          edit: optionEditContext(option),
                        }
                      "
                    ></ng-container>
                  </li>
                }
              }
            </ul>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
        @if (actions.settleFailure(); as failure) {
          <p role="status" class="letar-field__select-settle-error" data-settle-error>
            {{ selectionStrings.settleError }} «{{ failure.label }}»
          </p>
        }
      </div>
    }
  `,
})
export class FieldSelectComponent extends FieldBase implements OnDestroy {
  @Input({ required: true })
  options: FieldSelectOption[] = []

  /** Создание новой записи справочника, не уходя из формы (§16, конвейер `createSelectionActionsState`) */
  @Input()
  onCreate?: (search: string, ctx: SelectionActionContext) => Promise<CreatedOption | null>
  /** Правка опции на месте (карандаш) — тот же конвейер, что `onCreate` */
  @Input()
  onUpdate?: (option: FieldSelectOption, ctx: SelectionActionContext) => Promise<UpdatedOption | null>
  /** Отказ подтверждения оптимистичного действия; без обработчика — встроенное сообщение под полем */
  @Input()
  onSettleError?: (info: SettleErrorInfo) => void
  /**
   * Мс до признания оптимистичного действия неподтверждённым (по умолчанию 30 000).
   * ⚠️ Читается один раз при создании поля (конструктор выполняется ДО того, как Angular
   * проставляет `@Input()`-биндинги — тот же порядок, что уже описан в `FieldBase`), поэтому
   * значение нужно передавать литералом в шаблоне (`[settleTimeout]="30000"`), не выражением,
   * которое меняется после первого рендера — поздняя смена не подхватится.
   */
  @Input()
  settleTimeout?: number
  /** Подпись служебного пункта «+ Добавить…»; по умолчанию `«+ <createVerb>…»` */
  @Input()
  createLabel?: string
  /** `false` прячет служебный пункт создания, оставляя саму возможность вызвать `onCreate` из своего `optionTemplate` через `edit`-подобный слот */
  @Input()
  createItem?: boolean

  /** Своя разметка пункта списка; контекст — `$implicit` (опция) + `state` (`SelectOptionRenderState`) + `edit` (`SelectEditSlot | null`) */
  @ContentChild('optionTemplate')
  optionTemplate?: TemplateRef<
    { $implicit: FieldSelectOption; state: SelectOptionRenderState; edit: SelectEditSlot | null }
  >

  /** Своя разметка подписи выбранного значения в триггере; контекст — `$implicit` (опция) */
  @ContentChild('valueTemplate')
  valueTemplate?: TemplateRef<{ $implicit: FieldSelectOption }>

  protected readonly selectionStrings = selectionStrings

  private readonly idBase = `letar-field-select-${crypto.randomUUID()}`
  readonly listboxId = `${this.idBase}-listbox`

  readonly selectedValue = signal<string | undefined>(undefined)

  readonly popup: ListboxPopup<ListboxPopupOption>
  /**
   * Не `readonly` и не создаётся синхронно в конструкторе (в отличие от `popup`) — фабрике нужно
   * знать в момент создания, задан ли `onSettleError` приложением, чтобы решить между вызовом
   * обработчика и встроенным сообщением (`settleFailureSignal`, см. `selection-actions-state.ts`
   * `fail()`). `@Input()`-биндинги ещё не проставлены в конструкторе (тот же порядок, что и у
   * `control` в `FieldBase`) — обёртка-пересыльщик здесь не спасает: она ВСЕГДА truthy для
   * фабрики, даже когда `this.onSettleError` не задан, и встроенное сообщение никогда не
   * показывается. Фабрика создаётся отложенно в `effect()` без читаемых сигналов внутри — тот же
   * приём, что и у `control`-эффекта `FieldBase`: выполнится ровно один раз, после того как
   * Angular проставит биндинги, и не будет перезапускаться.
   */
  actions!: SelectionActionsState

  private triggerElement: HTMLButtonElement | null = null

  // Не `private`: сеттер, вызываемый только Angular через метаданные `@ViewChild` (рефлексия,
  // не статическое обращение) — `noUnusedLocals` считает такой write-only `private`-сеттер
  // неиспользуемым (TS6133), т.к. проверка «приватный член нигде не читается» не видит вызовы
  // из рантайма фреймворка.
  @ViewChild('trigger')
  set triggerElRef(ref: ElementRef<HTMLButtonElement> | undefined) {
    this.triggerElement = ref?.nativeElement ?? null
    this.popup.attachTrigger(this.triggerElement)
  }

  @ViewChild('listbox')
  set listboxElRef(ref: ElementRef<HTMLUListElement> | undefined) {
    this.popup.attachFloating(ref?.nativeElement ?? null)
  }

  constructor() {
    super()
    // `createListboxPopup`/`createSelectionActionsState` вызываются в конструкторе (injection
    // context, требуется `inject(...)` внутри) — тот же приём, что и `formRoot.registerField(...)`
    // в базовом `effect()` `FieldBase`. Опции читаются через геттеры (`() => this.options`) —
    // они вызываются на каждом взаимодействии, к тому моменту `@Input()`-биндинги уже проставлены.
    this.popup = createListboxPopup<ListboxPopupOption>({
      options: () => this.popupOptions(),
      onSelect: (option) => this.handlePopupSelect(option),
      selectedValue: () => this.currentDisplayValue(),
      idBase: this.idBase,
    })

    // Ноль читаемых сигналов внутри — выполнится один раз, сразу после того как Angular
    // проставит `@Input()`-биндинги (та же механика, что у `control`-эффекта `FieldBase`), и
    // больше не перезапустится. `onSettleError` передаётся фабрике `undefined`, если приложение
    // не задало обработчик — так фабрика (`fail()`) уходит во встроенное сообщение
    // (`settleFailureSignal`), а не молча проглатывает отказ через always-truthy обёртку.
    // `runInInjectionContext` обязателен: колбэк `effect()` сам по себе выполняется ВНЕ контекста
    // внедрения (NG0203 на `inject(DestroyRef)` внутри фабрики без него) — инжектор захватывается
    // заранее через `inject(Injector)` в конструкторе.
    const injector = inject(Injector)
    effect(() => {
      runInInjectionContext(injector, () => {
        this.actions = createSelectionActionsState({
          appOptions: () => this.options,
          value: () => this.selectedValue(),
          onSettleError: this.onSettleError ? (info) => this.onSettleError?.(info) : undefined,
          settleTimeout: this.settleTimeout,
        })
      })
      this.actions.setControl({
        close: () => this.popup.closePopup(),
        focusTrigger: () => this.triggerElement?.focus(),
      })
    })

    effect((onCleanup) => {
      const ctrl = this.control()
      if (!ctrl) {
        return
      }
      const sync = () => this.selectedValue.set((ctrl.value as string | undefined) ?? undefined)
      sync()
      const subscription = ctrl.events.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })
  }

  ngOnDestroy(): void {
    this.popup.destroy()
  }

  /** Значение формы, «сдвинутое» ожидающим выбором оптимистичного create (см. `createSelectionActionsState`) */
  protected currentDisplayValue(): string | undefined {
    return this.actions.pendingSelection() ?? this.selectedValue()
  }

  /** Список приложения (с наложенными правками) + оптимистично созданные + служебный пункт создания */
  protected mergedOptions(): FieldSelectOption[] {
    // Пока свой create в полёте, `pending`-опции приложения скрыты: почти всегда это та же запись,
    // иначе в списке была бы запись дважды
    const shownApp = this.actions.hasOwnCreatePending() ? this.options.filter((opt) => !opt.pending) : this.options
    const edited = applyOptionOverlay(shownApp, this.actions.overlay())
    const created: FieldSelectOption[] = this.actions.createdOptions().map((opt) => ({
      ...opt,
      value: String(opt.value),
    }))
    // Опция приложения сильнее созданной с тем же значением — дубля после перезагрузки нет
    return mergeCreatedOptions<FieldSelectOption>(edited, created)
  }

  private showCreateItem(): boolean {
    return !!this.onCreate && this.createItem !== false
  }

  private createItemLabel(): string {
    return `+ ${this.createLabel ?? `${selectionStrings.createVerb}…`}`
  }

  /** Видимый список — с пунктом создания в конце, когда он актуален */
  protected visibleOptions(): FieldSelectOption[] {
    const merged = this.mergedOptions()
    return this.showCreateItem() ? [...merged, { value: CREATE_OPTION_VALUE, label: this.createItemLabel() }] : merged
  }

  protected isCreateOption(option: FieldSelectOption): boolean {
    return isCreateOptionValue(option.value)
  }

  /** Контракт `createListboxPopup` — только `value`/`disabled`; `pending`-опция ведёт себя как
   * `disabled` для навигации и выбора (клавиатурой и мышью), хотя ARIA-атрибут ей рендер ставит
   * другой (`aria-busy`, не `aria-disabled`) — см. шаблон */
  private popupOptions(): ListboxPopupOption[] {
    return this.visibleOptions().map((opt) => ({ value: opt.value, disabled: !!opt.disabled || !!opt.pending }))
  }

  private handlePopupSelect(option: ListboxPopupOption): void {
    if (isCreateOptionValue(option.value)) {
      this.runCreate()
      return
    }
    this.selectValue(option.value)
  }

  /** Опция, соответствующая текущему (в т.ч. оптимистично) значению */
  selectedOption(): FieldSelectOption | undefined {
    const current = this.currentDisplayValue()
    return current === undefined ? undefined : this.visibleOptions().find((option) => option.value === current)
  }

  /** Слот карандаша конкретной опции для `optionTemplate`; `null` — карандаш этой опции не нужен */
  protected optionEditContext(option: FieldSelectOption): SelectEditSlot | null {
    if (!this.onUpdate || this.isCreateOption(option) || !isOptionEditable(option, true)) {
      return null
    }
    return {
      run: () => this.runEdit(option, 'option'),
      label: selectionStrings.edit,
      ariaLabel: `${selectionStrings.edit}: ${option.label}`,
      disabled: this.actions.pending(),
    }
  }

  protected valueEditVisible(): boolean {
    const option = this.selectedOption()
    return !!this.onUpdate && !!option && isOptionEditable(option, true)
  }

  protected valueEditAriaLabel(): string {
    return `${selectionStrings.edit}: ${this.selectedOption()?.label ?? ''}`
  }

  protected onTriggerBlur(ctrl: FormControl): void {
    // CDK `outsidePointerEvents` уже закрывает попап по клику вне (см. `listbox-popup.ts`) —
    // здесь нужен случай ухода фокуса клавишей Tab, который CDK не ловит
    this.popup.closePopup()
    ctrl.markAsTouched()
  }

  private selectValue(value: string): void {
    const ctrl = this.control()
    if (!ctrl) {
      return
    }
    ctrl.setValue(value)
    ctrl.markAsTouched()
  }

  protected runCreate(): void {
    const onCreate = this.onCreate
    if (!onCreate) {
      return
    }
    this.actions.run({
      scope: 'option',
      kind: 'create',
      call: (ctx) => onCreate('', ctx),
      apply: (created, info) => {
        this.actions.addCreatedOption(created)
        // Выбор пользователя, сделанный за время оптимистичного ожидания, подтверждение не перебивает
        if (!info.optimistic || info.selectionHeld) {
          this.selectValue(String(created.value))
        }
      },
    })
  }

  protected runEdit(option: FieldSelectOption, scope: 'option' | 'value'): void {
    const onUpdate = this.onUpdate
    if (!onUpdate) {
      return
    }
    const fromValue = String(option.value)
    this.actions.run({
      scope,
      kind: 'edit',
      fromValue,
      call: (ctx) => onUpdate(option, ctx),
      apply: (result) => {
        this.actions.recordEdit(fromValue, result)
        // Замена записи (другой value): выбранное переезжает на новую. Тот же value — форма не dirty.
        // Значение читаем живым: при оптимистичной правке за время ожидания оно могло измениться
        const liveValue = this.control()?.value as string | undefined
        if (String(result.value) !== fromValue && liveValue !== undefined && String(liveValue) === fromValue) {
          this.selectValue(String(result.value))
        }
      },
    })
  }
}
