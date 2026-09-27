import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  ContentChild,
  effect,
  type ElementRef,
  Input,
  type OnDestroy,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'
import type { FormControl } from '@angular/forms'
import { FieldBase } from '../core/field-base'
import { createListboxPopup, type ListboxPopup } from '../core/listbox-popup'

export interface FieldSelectOption {
  value: string
  label: string
  /** Вторая строка в пункте списка (под `label`) — виден только в кастомном рендере, нативный `<select>` её не показывал */
  description?: string
}

/** Состояние опции, которое получает `optionTemplate` — вместе с самой опцией (`$implicit`) */
export interface SelectOptionRenderState {
  /** Опция совпадает с текущим значением поля */
  selected: boolean
  /** Опция подсвечена клавиатурной навигацией (аналог `aria-activedescendant`) */
  active: boolean
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
 */
@Component({
  selector: 'letar-field-select',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #defaultOptionTemplate let-option let-state="state">
      <span class="letar-field__select-option-label">{{ option.label }}</span>
      @if (option.description) {
        <span class="letar-field__select-option-description">{{ option.description }}</span>
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
          @if (popup.isOpen()) {
            <ul #listbox [id]="listboxId" role="listbox" class="letar-field__select-listbox">
              @for (option of options; track option.value; let i = $index) {
                <li
                  [id]="popup.optionId(i)"
                  role="option"
                  class="letar-field__select-option"
                  [attr.aria-selected]="option.value === selectedValue()"
                  [attr.data-active]="i === popup.activeIndex() || null"
                  (mousedown)="$event.preventDefault()"
                  (click)="popup.selectIndex(i)"
                >
                  <ng-container
                    *ngTemplateOutlet="
                      optionTemplate ?? defaultOptionTemplate;
                      context: {
                        $implicit: option,
                        state: { selected: option.value === selectedValue(), active: i === popup.activeIndex() },
                      }
                    "
                  ></ng-container>
                </li>
              }
            </ul>
          }
        </div>
        @if (hasError()) {
          <span class="letar-field__error" role="alert">{{ errorMessage() }}</span>
        }
      </div>
    }
  `,
})
export class FieldSelectComponent extends FieldBase implements OnDestroy {
  @Input({ required: true })
  options: FieldSelectOption[] = []

  /** Своя разметка пункта списка; контекст — `$implicit` (опция) + `state` (`SelectOptionRenderState`) */
  @ContentChild('optionTemplate')
  optionTemplate?: TemplateRef<{ $implicit: FieldSelectOption; state: SelectOptionRenderState }>

  /** Своя разметка подписи выбранного значения в триггере; контекст — `$implicit` (опция) */
  @ContentChild('valueTemplate')
  valueTemplate?: TemplateRef<{ $implicit: FieldSelectOption }>

  private readonly idBase = `letar-field-select-${crypto.randomUUID()}`
  readonly listboxId = `${this.idBase}-listbox`

  readonly selectedValue = signal<string | undefined>(undefined)

  readonly popup: ListboxPopup<FieldSelectOption>

  // Не `private`: сеттер, вызываемый только Angular через метаданные `@ViewChild` (рефлексия,
  // не статическое обращение) — `noUnusedLocals` считает такой write-only `private`-сеттер
  // неиспользуемым (TS6133), т.к. проверка «приватный член нигде не читается» не видит вызовы
  // из рантайма фреймворка.
  @ViewChild('trigger')
  set triggerElRef(ref: ElementRef<HTMLButtonElement> | undefined) {
    this.popup.attachTrigger(ref?.nativeElement ?? null)
  }

  @ViewChild('listbox')
  set listboxElRef(ref: ElementRef<HTMLUListElement> | undefined) {
    this.popup.attachFloating(ref?.nativeElement ?? null)
  }

  constructor() {
    super()
    // `createListboxPopup` вызывается в конструкторе (injection context, требуется `inject(Overlay)`
    // внутри) — тот же приём, что и `formRoot.registerField(...)` в базовом `effect()` `FieldBase`.
    this.popup = createListboxPopup<FieldSelectOption>({
      options: () => this.options,
      onSelect: (option) => this.selectOption(option),
      selectedValue: () => this.selectedValue(),
      idBase: this.idBase,
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

  /** Опция, соответствующая текущему значению — обычный метод (не `computed()`), т.к. `options`
   * приходит через `@Input()`, не сигнал; шаблон вызывает его на каждом цикле проверки. */
  selectedOption(): FieldSelectOption | undefined {
    return this.options.find((option) => option.value === this.selectedValue())
  }

  protected onTriggerBlur(ctrl: FormControl): void {
    // CDK `outsidePointerEvents` уже закрывает попап по клику вне (см. `listbox-popup.ts`) —
    // здесь нужен случай ухода фокуса клавишей Tab, который CDK не ловит
    this.popup.closePopup()
    ctrl.markAsTouched()
  }

  private selectOption(option: FieldSelectOption): void {
    const ctrl = this.control()
    if (!ctrl) {
      return
    }
    ctrl.setValue(option.value)
    ctrl.markAsTouched()
  }
}
