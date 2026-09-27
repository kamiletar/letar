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
  type OnInit,
  runInInjectionContext,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'
import type { FormControl } from '@angular/forms'
import { interpolate } from '@letar/forms-core/i18n'
import { getFieldMeta } from '@letar/forms-core/schema'
import {
  applyOptionOverlay,
  CREATE_OPTION_VALUE,
  type CreatedOption,
  type FieldDeps,
  getOptionSearchText,
  getOptionText,
  isCreateOptionValue,
  isOptionEditable,
  mergeCreatedOptions,
  type SelectionActionContext,
  type SelectSearchable,
  type SettleErrorInfo,
  shouldOfferCreate,
  type UpdatedOption,
} from '@letar/forms-core/uikit'
import { createDependentField, type DependentFieldState } from '../core/dependent-field'
import { FieldBase } from '../core/field-base'
import { createListboxPopup, type ListboxPopup, type ListboxPopupOption } from '../core/listbox-popup'
import { createSelectionActionsState, type SelectionActionsState } from '../core/selection-actions-state'
import { createSelectionSearch, type SelectionSearchState } from '../core/selection-search'
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
 *
 * Этап 3i паритета (ПОСЛЕДНИЙ кусок Select) — `searchable`/`dependsOn`, тот же дизайн, что у
 * `forms-vue` (`field-select.ts`, Этап 3f) и её UI-хелпера `use-dependent-field-ui.ts`, но
 * Angular-идиоматично (шаблон компонента, не отдельный composable-модуль):
 * - **`searchable`.** Обвязка над `createSelectionSearch` (`../core/selection-search.ts`, Этап 2).
 *   Строка поиска (`role="searchbox"`) рисуется первым элементом внутри попапа, вместе со списком
 *   перенесена в CDK Overlay через тот же `attachFloating` — оба элемента теперь обёрнуты в общий
 *   `<div #popupPanel>`, а не голый `<ul>`, как в Этапах 3g-3h (иначе строка поиска не попала бы в
 *   overlay-контейнер вместе со списком). Автофокус при открытии — `@ViewChild('searchInput')`-
 *   сеттер (тот же приём, что `attachTrigger`/`attachFloating`): вызывается заново при каждом
 *   появлении инпута. Клавиатурная навигация внутри инпута — тот же `popup.onKeydown`, что и у
 *   триггера (стрелки/`Enter`/`Escape` долетают до списка, печатные символы — в инпут). Пункт
 *   создания предлагается по тексту поиска, когда ни одна опция не совпала (`shouldOfferCreate`) —
 *   когда запрос пуст, действует прежняя политика Этапа 3h (предлагается всегда).
 * - **`dependsOn`.** Обвязка над `createDependentField` (`../core/dependent-field.ts`, Этап 2).
 *   Реестр очистки (`FormRootService.dependents`) и карта видимых подписей полей
 *   (`FormRootService.labels`) заведены в Этапе 3i прямо в `FormRootService` — минимальный аналог
 *   `AppFormContext.dependents`/`.labels` (`forms-vue`), которого раньше в этом пакете не было
 *   (`FieldCascadingSelectComponent` — более ранняя, самодостаточная реализация того же паттерна
 *   без общего реестра). `values()` фабрики — не прямое чтение `formRoot.form.getRawValue()`
 *   (не сигнал, `computed()` не отследил бы правку), а мост через сигнал `formValues`,
 *   синхронизируемый подпиской на `formRoot.form.valueChanges` — тот же приём «моста», что описан
 *   в JSDoc `dependent-field.ts` и уже применён в `syncParentValue()`
 *   (`field-cascading-select.component.ts`). Заблокированное поле (`dependentField.blocked()`) —
 *   `disabled` на триггере, клик/клавиатура не открывают попап, `placeholder` подменяется
 *   подсказкой «Сначала выберите «…»» (`placeholderWhenDisabled` либо автоматический текст).
 *   Подпись родителя ищется сначала в `formRoot.labels` (видимая подпись, если родитель уже
 *   смонтирован), иначе — в `ui.title` его Zod-схемы.
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
            [attr.aria-describedby]="hintText() && !hasError() ? hintId : null"
            [attr.data-field-name]="name"
            [attr.data-placeholder]="selectedOption() ? null : ''"
            [disabled]="dependentField.blocked()"
            (click)="onTriggerClick()"
            (keydown)="onTriggerKeydown($event)"
            (blur)="onTriggerBlur(ctrl, $event)"
          >
            @if (selectedOption(); as selOpt) {
              <ng-container
                *ngTemplateOutlet="valueTemplate ?? defaultValueTemplate; context: { $implicit: selOpt }"
              ></ng-container>
            } @else {
              <span class="letar-field__select-placeholder">{{ effectivePlaceholder() }}</span>
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
            <div #popupPanel class="letar-field__select-popup">
              @if (searchState.search(); as search) {
                <input
                  #searchInput
                  type="text"
                  role="searchbox"
                  autocomplete="off"
                  class="letar-field__select-search"
                  [value]="search.query"
                  [attr.placeholder]="search.placeholder"
                  [attr.aria-label]="search.ariaLabel"
                  [attr.aria-controls]="listboxId"
                  [attr.aria-activedescendant]="popup.activeDescendantId()"
                  (input)="onSearchInput($event, search.onQueryChange)"
                  (keydown)="popup.onKeydown($event)"
                  (blur)="onTriggerBlur(ctrl, $event)"
                />
              }
              <ul #listbox [id]="listboxId" role="listbox" class="letar-field__select-listbox">
                @if (searchState.enabled() && realOptionCount() === 0) {
                  <li class="letar-field__select-empty" role="presentation">{{ emptyMessage() }}</li>
                }
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
            </div>
          }
        </div>
        @if (hintText(); as hint) {
          @if (!hasError()) {
            <span [id]="hintId" class="letar-field__select-depends-hint">{{ hint }}</span>
          }
        }
        @if (dependentField.active()) {
          <span
            class="letar-field__sr-only"
            aria-live="polite"
            aria-atomic="true"
            data-dependent-live
          >{{ liveMessage() }}</span>
        }
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
export class FieldSelectComponent extends FieldBase implements OnDestroy, OnInit {
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

  /** Поиск по списку (Этап 3i): `true`/`false`/`'auto'` (сам с 10-й опции) либо точная настройка */
  @Input()
  searchable?: SelectSearchable<FieldSelectOption>
  /** Искать и по `description`, не только по `label`; по умолчанию `true`, как у остальных скинов */
  @Input()
  searchInDescription?: boolean

  /** Путь(и) родительского поля(ей) — поле блокируется, пока родитель(и) не заполнены (§18) */
  @Input()
  dependsOn?: string | readonly string[]
  /** Родитель считается заполненным, если вернуть `false` — по умолчанию проверка на непустое значение */
  @Input()
  depsReady?: (deps: FieldDeps) => boolean
  /** Очищать своё значение при смене родителя; по умолчанию `true` при наличии `dependsOn` */
  @Input()
  clearOnParentChange?: boolean
  /** Блокировать управление, пока родитель(и) не готовы; по умолчанию `true` при наличии `dependsOn` */
  @Input()
  disableWhenParentEmpty?: boolean
  /** Свой текст в заблокированном поле вместо автоматической подсказки «Сначала выберите «…»» */
  @Input()
  placeholderWhenDisabled?: string

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
  /** Id подсказки заблокированного поля (Этап 3i `dependsOn`) — для `aria-describedby` триггера */
  readonly hintId = `${this.idBase}-depends-hint`

  readonly selectedValue = signal<string | undefined>(undefined)
  /** Мост «значения формы целиком» для `createDependentField` — обычное чтение `form.getRawValue()`
   * не сигнал, `computed()` фабрики не отследил бы правку без него (см. JSDoc `dependent-field.ts`
   * и `syncParentValue()` в `field-cascading-select.component.ts`) */
  private readonly formValues = signal<Record<string, unknown>>({})

  readonly searchState: SelectionSearchState<FieldSelectOption>

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
  /**
   * В отличие от `actions` — создаётся НЕ в `effect()` конструктора, а в `ngOnInit()` (Этап 3i,
   * фикс NG0602). `createDependentField` сама вызывает `effect()` внутри себя (учёт правки
   * родителя без пересоздания фабрики на каждый рендер) — Angular запрещает создавать `effect()`
   * изнутри уже выполняющегося `effect()` («cannot be called from within a reactive context»),
   * даже через `runInInjectionContext`: он даёт только инжектор, не снимает сам запрет. `ngOnInit`
   * выполняется вне реактивного контекста и гарантированно ПОСЛЕ того, как Angular проставит все
   * `@Input()`-биндинги (тот же порядок, на который уже опирается `control`-эффект `FieldBase`),
   * поэтому подходит взамен. Читается напрямую из шаблона (`dependentField.blocked()`/`.active()`),
   * поэтому не `private`.
   */
  dependentField!: DependentFieldState<FieldDeps>

  /** Инжектор, захваченный в конструкторе — нужен и `actions`-эффекту, и `ngOnInit()` (оба зовут
   * фабрики с `inject(...)` внутри вне синхронной фазы построения компонента) */
  private readonly injector = inject(Injector)

  private triggerElement: HTMLButtonElement | null = null
  private popupPanelElement: HTMLElement | null = null

  // Не `private`: сеттер, вызываемый только Angular через метаданные `@ViewChild` (рефлексия,
  // не статическое обращение) — `noUnusedLocals` считает такой write-only `private`-сеттер
  // неиспользуемым (TS6133), т.к. проверка «приватный член нигде не читается» не видит вызовы
  // из рантайма фреймворка.
  @ViewChild('trigger')
  set triggerElRef(ref: ElementRef<HTMLButtonElement> | undefined) {
    this.triggerElement = ref?.nativeElement ?? null
    this.popup.attachTrigger(this.triggerElement)
  }

  /**
   * Этап 3i: было `#listbox` (голый `<ul>`) — теперь общий контейнер `<div #popupPanel>`, в
   * котором рядом со списком лежит строка поиска (`searchable`). Перенос в overlay через
   * `attachFloating` должен забирать оба элемента разом, иначе поле поиска осталось бы вне
   * позиционируемого CDK-контейнера.
   */
  @ViewChild('popupPanel')
  set popupPanelElRef(ref: ElementRef<HTMLElement> | undefined) {
    this.popupPanelElement = ref?.nativeElement ?? null
    this.popup.attachFloating(this.popupPanelElement)
  }

  /** Автофокус поля поиска при открытии попапа (Этап 3i) — сеттер вызывается заново при каждом
   * появлении `<input>` (тот же приём, что `attachTrigger`/`attachFloating`) */
  @ViewChild('searchInput')
  set searchInputElRef(ref: ElementRef<HTMLInputElement> | undefined) {
    ref?.nativeElement.focus()
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

    // `createSelectionSearch` — обычная фабрика сигналов без `inject()` внутри (Этап 2), можно
    // создавать синхронно здесь: все её входы — геттеры, вызываются позже, из `computed()`,
    // читаемых только во время рендера (к тому моменту `@Input()`-биндинги уже проставлены).
    this.searchState = createSelectionSearch<FieldSelectOption>({
      searchable: () => this.searchable,
      options: () => this.mergedOptions(),
      getText: (opt) => (this.searchInDescription === false ? getOptionText(opt) : getOptionSearchText(opt)),
      placeholder: selectionStrings.searchPlaceholder,
      ariaLabel: selectionStrings.searchAria,
    })

    // Ноль читаемых сигналов внутри — выполнится один раз, сразу после того как Angular
    // проставит `@Input()`-биндинги (та же механика, что у `control`-эффекта `FieldBase`), и
    // больше не перезапустится. `onSettleError` передаётся фабрике `undefined`, если приложение
    // не задало обработчик — так фабрика (`fail()`) уходит во встроенное сообщение
    // (`settleFailureSignal`), а не молча проглатывает отказ через always-truthy обёртку.
    // `runInInjectionContext` обязателен: колбэк `effect()` сам по себе выполняется ВНЕ контекста
    // внедрения (NG0203 на `inject(DestroyRef)` внутри фабрики без него) — инжектор захватывается
    // заранее через `inject(Injector)` в конструкторе (`this.injector`).
    effect(() => {
      runInInjectionContext(this.injector, () => {
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

    // Мост «значения формы целиком» → сигнал `formValues`, читаемый `dependentField` (см. её
    // комментарий выше) — тот же приём, что `syncParentValue()` в `field-cascading-select`
    effect((onCleanup) => {
      const sync = () => this.formValues.set(this.formRoot.form.getRawValue())
      sync()
      const subscription = this.formRoot.form.valueChanges.subscribe(sync)
      onCleanup(() => subscription.unsubscribe())
    })

    // Регистрирует видимую подпись этого поля в общем реестре формы (`FormRootService.labels`) —
    // чтобы дети, зависящие от него (`dependsOn`), могли показать «Сначала выберите «<эта подпись>»».
    // Угловой эквивалент `useRegisterFieldLabel` (`forms-vue`): каждый прогон эффекта сначала
    // снимает подпись предыдущего прогона (если она всё ещё в реестре), затем при необходимости
    // ставит новую — порядок держится на `onCleanup`, выполняемом ПЕРЕД следующим прогоном
    effect((onCleanup) => {
      const label = this.resolvedLabel()
      if (label && label.trim() !== '') {
        this.formRoot.labels.set(this.name, label)
      }
      onCleanup(() => {
        if (label !== undefined && this.formRoot.labels.get(this.name) === label) {
          this.formRoot.labels.delete(this.name)
        }
      })
    })
  }

  /**
   * `createDependentField` создаётся здесь, не в `effect()` конструктора — см. JSDoc поля
   * `dependentField` выше (NG0602: `effect()` внутри фабрики нельзя создавать изнутри уже
   * выполняющегося `effect()`). К моменту вызова `ngOnInit()` Angular уже проставил все
   * `@Input()`-биндинги (`dependsOn`/`depsReady`/`clearOnParentChange`/`disableWhenParentEmpty`).
   */
  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      this.dependentField = createDependentField<FieldDeps>({
        fullPath: this.name,
        dependsOn: () => this.dependsOn,
        groupPath: () => null,
        values: () => this.formValues(),
        depsReady: this.depsReady,
        getParentLabel: (path) => this.getParentLabel(path),
        dependents: this.formRoot.dependents,
        setValue: (value) => this.control()?.setValue(value),
        clearOnParentChange: this.clearOnParentChange,
        disableWhenParentEmpty: this.disableWhenParentEmpty,
        emptyValue: '',
      })
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

  /** Запрос поиска (пусто — если поиск не показан) — участвует в подписи пункта создания и в
   * решении, предлагать ли его вообще (Этап 3i) */
  private searchQuery(): string {
    return this.searchState.enabled() ? this.searchState.query().trim() : ''
  }

  /** Без поиска — прежняя политика Этапа 3h (предлагается всегда, пока `onCreate` задан). С
   * поиском — только если ни одна опция не совпала с запросом (`shouldOfferCreate`) */
  private offerCreate(merged: FieldSelectOption[]): boolean {
    if (!this.showCreateItem()) {
      return false
    }
    const query = this.searchQuery()
    return query === '' || shouldOfferCreate(query, merged.map(getOptionText))
  }

  private createItemLabel(): string {
    const query = this.searchQuery()
    return query !== ''
      ? `+ ${selectionStrings.createVerb} "${query}"`
      : `+ ${this.createLabel ?? `${selectionStrings.createVerb}…`}`
  }

  /** Видимый список — после фильтра поиска (Этап 3i, если включён), с пунктом создания в конце,
   * когда он актуален */
  protected visibleOptions(): FieldSelectOption[] {
    const merged = this.mergedOptions()
    const searched = this.searchState.enabled() ? this.searchState.filtered() : merged
    return this.offerCreate(merged)
      ? [...searched, { value: CREATE_OPTION_VALUE, label: this.createItemLabel() }]
      : searched
  }

  /** Число настоящих опций в видимом списке (без служебного пункта создания) — пусто ⇒ показать `emptyMessage` */
  protected realOptionCount(): number {
    return this.visibleOptions().filter((opt) => !this.isCreateOption(opt)).length
  }

  protected emptyMessage(): string {
    const settings = this.searchable
    return (typeof settings === 'object' ? settings.emptyMessage : undefined) ?? selectionStrings.empty
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

  /**
   * Общий обработчик `blur` для триггера и поля поиска (Этап 3i): фокус, переходящий МЕЖДУ ними
   * (открытие попапа с `searchable` переносит фокус с триггера в инпут — `#searchInput`-сеттер
   * зовёт `.focus()` при каждом появлении инпута — закрытие переносит обратно), не должен считаться
   * уходом с поля. Без этой проверки первый же клик по триггеру с `searchable` закрывал бы попап
   * немедленно. CDK `outsidePointerEvents` уже закрывает попап по клику вне (см. `listbox-popup.ts`) —
   * здесь нужен случай ухода фокуса клавишей Tab, который CDK не ловит.
   */
  protected onTriggerBlur(ctrl: FormControl, event: FocusEvent): void {
    if (this.isWithinPopup(event.relatedTarget as Node | null)) {
      return
    }
    this.popup.closePopup()
    ctrl.markAsTouched()
  }

  private isWithinPopup(node: Node | null): boolean {
    return !!node && !!(this.triggerElement?.contains(node) || this.popupPanelElement?.contains(node))
  }

  /** Клик по триггеру: игнорируется, пока поле заблокировано `dependsOn` (Этап 3i) */
  protected onTriggerClick(): void {
    if (this.dependentField.blocked()) {
      return
    }
    this.popup.togglePopup()
  }

  /** Клавиатура на триггере — та же блокировка, что у клика */
  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.dependentField.blocked()) {
      return
    }
    this.popup.onKeydown(event)
  }

  /** `(input)` поля поиска — извлекает значение и передаёт в `UIKitSelectSearch.onQueryChange` */
  protected onSearchInput(event: Event, onQueryChange: (query: string) => void): void {
    onQueryChange((event.target as HTMLInputElement).value)
  }

  /** Подпись родителя: видимая подпись поля из реестра формы (`FormRootService.labels`), иначе `ui.title` схемы */
  private getParentLabel(path: string): string | undefined {
    const registered = this.formRoot.labels.get(path)
    if (registered) {
      return registered
    }
    const schema = this.formRoot.schema()
    if (!schema) {
      return undefined
    }
    const title = getFieldMeta(schema, path).ui?.title
    return typeof title === 'string' && title !== '' ? title : undefined
  }

  /** Подсказка под заблокированным полем («Сначала выберите «Страна»»); `null` — поле не заблокировано */
  protected hintText(): string | null {
    if (!this.dependentField.blocked()) {
      return null
    }
    return interpolate(selectionStrings.dependsOnHint, {
      parent: this.dependentField.missingParentLabels().join('», «'),
    })
  }

  /** Placeholder триггера: подсказка про родителя, пока поле заблокировано, иначе обычный `placeholder` */
  protected effectivePlaceholder(): string {
    if (this.dependentField.blocked()) {
      return this.placeholderWhenDisabled ?? this.hintText() ?? this.resolvedPlaceholder() ?? ''
    }
    return this.resolvedPlaceholder() ?? ''
  }

  /** Текст live-области: «Поле «Город» очищено: изменилось поле «Страна»» (пусто — очистки не было) */
  protected liveMessage(): string {
    const cleared = this.dependentField.cleared()
    if (!cleared) {
      return ''
    }
    const fieldLabel = this.resolvedLabel() ?? this.name
    return interpolate(selectionStrings.dependentCleared, { field: fieldLabel, parent: cleared.parentLabel })
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
