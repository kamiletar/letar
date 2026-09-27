import { Component } from '@angular/core'
import type {
  CreatedOption,
  FieldDeps,
  SelectionActionContext,
  SelectSearchable,
  SettleErrorInfo,
  UpdatedOption,
} from '@letar/forms-core/uikit'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldSelectComponent, type FieldSelectOption } from '../fields/field-select.component'

/**
 * Хосты для точечных тестов `FieldSelectComponent` (Этап 3g, `field-select.spec.ts`; Этап 3h
 * `onCreate`/`onUpdate`/`pending`, `field-select-actions.spec.ts`) — тот же приём выноса
 * `@Component` в обычный `.ts` (не `.spec.ts`), что и `stage-e-host.component.ts`: JIT-декоратор
 * внутри `.spec.ts` не парсится текущей связкой esbuild/vitest этого пакета.
 */
export const fieldSelectHostSchema = z.object({ country: z.string().meta({ ui: { title: 'Страна' } }) })

export const fieldSelectHostOptions: FieldSelectOption[] = [
  { value: '', label: 'Все категории' },
  { value: 'ru', label: 'Россия', description: 'Российская Федерация' },
  { value: 'de', label: 'Германия' },
]

/** Без опции с пустым значением — для теста реального placeholder (текущее значение '' ни с чем не совпадает) */
export const fieldSelectHostOptionsNoEmpty: FieldSelectOption[] = [
  { value: 'ru', label: 'Россия' },
  { value: 'de', label: 'Германия' },
]

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldSelectComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="{ country: '' }" (formSubmit)="lastSubmit = $event">
      <letar-field-select name="country" [options]="options" placeholder="Выберите страну" />
    </letar-app-form>
  `,
})
export class FieldSelectBasicHostComponent {
  schema = fieldSelectHostSchema
  options = fieldSelectHostOptions
  lastSubmit: Record<string, unknown> | undefined
}

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldSelectComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="{ country: '' }" (formSubmit)="lastSubmit = $event">
      <letar-field-select name="country" [options]="options" placeholder="Выберите страну">
        <ng-template #optionTemplate let-option let-state="state">
          <b class="custom-option" [class.is-active]="state.active">{{ option.label }} #{{ option.value }}</b>
        </ng-template>
        <ng-template #valueTemplate let-option>
          <i class="custom-value">Выбрано: {{ option.label }}</i>
        </ng-template>
      </letar-field-select>
    </letar-app-form>
  `,
})
export class FieldSelectCustomRenderHostComponent {
  schema = fieldSelectHostSchema
  options = fieldSelectHostOptions
  lastSubmit: Record<string, unknown> | undefined
}

@Component({
  standalone: true,
  imports: [AppFormComponent, FieldSelectComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="{ country: '' }" (formSubmit)="lastSubmit = $event">
      <letar-field-select name="country" [options]="options" placeholder="Выберите страну" />
    </letar-app-form>
  `,
})
export class FieldSelectNoEmptyOptionHostComponent {
  schema = fieldSelectHostSchema
  options = fieldSelectHostOptionsNoEmpty
  lastSubmit: Record<string, unknown> | undefined
}

export const fieldSelectActionsSchema = z.object({ value: z.string().meta({ ui: { title: 'Значение' } }) })

/** Опции для `onCreate` (Этап 3h) — те же, что у зеркального `forms-vue` `field-select-actions.spec.ts` */
export const fieldSelectCreateOptions: FieldSelectOption[] = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
]

/** Опции для `onUpdate` — `s` (`editable: false`) проверяет, что приложение может само запретить карандаш */
export const fieldSelectEditOptions: FieldSelectOption[] = [
  { value: 'a', label: 'Кровля' },
  { value: 'b', label: 'Фасад' },
  { value: 's', label: 'Системная', editable: false },
]

/**
 * Единый хост для `field-select-actions.spec.ts` — все Input'ы Этапа 3h забиндены на поля
 * компонента; тест выставляет нужные (`onCreate`/`onUpdate`/`options`/`initial`) ДО первого
 * `fixture.detectChanges()`, остальные остаются `undefined` (Angular пробрасывает их как есть).
 */
@Component({
  standalone: true,
  imports: [AppFormComponent, FieldSelectComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="{ value: initial }" (formSubmit)="lastSubmit = $event">
      <letar-field-select
        name="value"
        [options]="options"
        placeholder="Выберите"
        [onCreate]="onCreate"
        [onUpdate]="onUpdate"
        [onSettleError]="onSettleError"
        [createItem]="createItem"
      />
    </letar-app-form>
  `,
})
export class FieldSelectActionsHostComponent {
  schema = fieldSelectActionsSchema
  options: FieldSelectOption[] = fieldSelectCreateOptions
  initial = ''
  onCreate?: (search: string, ctx: SelectionActionContext) => Promise<CreatedOption | null>
  onUpdate?: (option: FieldSelectOption, ctx: SelectionActionContext) => Promise<UpdatedOption | null>
  onSettleError?: (info: SettleErrorInfo) => void
  createItem?: boolean
  lastSubmit: Record<string, unknown> | undefined
}

/** Опции для `searchable` (Этап 3i) — 12 штук, больше порога `'auto'` (>9) */
export const fieldSelectManyOptions: FieldSelectOption[] = Array.from(
  { length: 12 },
  (_, i): FieldSelectOption => ({ value: `v${i}`, label: `Опция ${i}` }),
)

/**
 * Единый хост для `field-select-search.spec.ts` (Этап 3i `searchable`) — все Input'ы забиндены,
 * тест меняет нужные (`options`/`searchable`/`searchInDescription`/`onCreate`) ДО первого
 * `fixture.detectChanges()`, тот же приём, что у `FieldSelectActionsHostComponent`.
 */
@Component({
  standalone: true,
  imports: [AppFormComponent, FieldSelectComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="{ value: initial }" (formSubmit)="lastSubmit = $event">
      <letar-field-select
        name="value"
        [options]="options"
        placeholder="Выберите"
        [searchable]="searchable"
        [searchInDescription]="searchInDescription"
        [onCreate]="onCreate"
      />
    </letar-app-form>
  `,
})
export class FieldSelectSearchHostComponent {
  schema = fieldSelectActionsSchema
  options: FieldSelectOption[] = fieldSelectManyOptions
  initial = ''
  searchable?: SelectSearchable<FieldSelectOption>
  searchInDescription?: boolean
  onCreate?: (search: string, ctx: SelectionActionContext) => Promise<CreatedOption | null>
  lastSubmit: Record<string, unknown> | undefined
}

/** Опции с пустым значением («Не указано») — единственный способ вернуть родителя в пустое
 * состояние через реальный клик по UI (Angular-версии, в отличие от `forms-vue`, не из чего
 * собрать «сырой» инпут поверх того же `FormControl` без гонки регистрации, см. `field-select-dependent.spec.ts`) */
export const dependentCountryOptions: FieldSelectOption[] = [
  { value: '', label: 'Не указано' },
  { value: 'ru', label: 'Россия' },
  { value: 'de', label: 'Германия' },
]
export const dependentRegionOptions: FieldSelectOption[] = [
  { value: '', label: 'Не указано' },
  { value: 'central', label: 'Центральный' },
]
export const dependentCityOptions: FieldSelectOption[] = [
  { value: 'msk', label: 'Москва' },
  { value: 'spb', label: 'Санкт-Петербург' },
]

export const fieldSelectDependentSchema = z.object({
  countryId: z.string().meta({ ui: { title: 'Страна' } }),
  regionId: z.string().meta({ ui: { title: 'Регион' } }),
  cityId: z.string().meta({ ui: { title: 'Город' } }),
})

/**
 * Единый хост для `field-select-dependent.spec.ts` (Этап 3i `dependsOn`, §18) — headless-эквивалент
 * `libs/forms-vue/src/lib/fields/field-select-dependent.spec.ts`, но без отдельного «сырого» `Mount`
 * поля: правка родителя идёт через реальный клик по его собственному `letar-field-select`
 * (`countryId`/`regionId`) — `FormRootService.registerField` подписывается на `valueChanges`
 * КАЖДОГО контрола при регистрации, поэтому и клик через UI, и прямой `ctrl.setValue()` одинаково
 * долетают до `dependents.handleFieldChange` (в отличие от `forms-vue`, где это делает только
 * form-level `listeners.onChange`, и голый `form.setFieldValue()` в обход `FieldApi.handleChange`
 * его не будит — оговорка в JSDoc того теста не переносится на Angular-версию).
 */
@Component({
  standalone: true,
  imports: [AppFormComponent, FieldSelectComponent],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-select name="countryId" [options]="countryOptions" placeholder="Выберите страну" />
      <letar-field-select name="regionId" [options]="regionOptions" placeholder="Выберите регион" />
      <letar-field-select
        name="cityId"
        [options]="cityOptions"
        placeholder="Выберите город"
        [dependsOn]="dependsOn"
        [depsReady]="depsReady"
        [clearOnParentChange]="clearOnParentChange"
        [disableWhenParentEmpty]="disableWhenParentEmpty"
        [placeholderWhenDisabled]="placeholderWhenDisabled"
      />
    </letar-app-form>
  `,
})
export class FieldSelectDependentHostComponent {
  schema = fieldSelectDependentSchema
  countryOptions = dependentCountryOptions
  regionOptions = dependentRegionOptions
  cityOptions = dependentCityOptions
  initialValue: Record<string, string> = { countryId: '', regionId: '', cityId: '' }
  dependsOn?: string | readonly string[]
  depsReady?: (deps: FieldDeps) => boolean
  clearOnParentChange?: boolean
  disableWhenParentEmpty?: boolean
  placeholderWhenDisabled?: string
  lastSubmit: Record<string, unknown> | undefined
}
