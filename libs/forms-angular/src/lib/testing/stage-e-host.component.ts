import { Component } from '@angular/core'
import { z } from 'zod'
import { AppFormComponent } from '../core/app-form.component'
import { FieldAutocompleteComponent } from '../fields/field-autocomplete.component'
import { type CascadingSelectOption, FieldCascadingSelectComponent } from '../fields/field-cascading-select.component'
import { FieldComboboxComponent, type FieldComboboxOption } from '../fields/field-combobox.component'
import { FieldImageChoiceComponent, type ImageChoiceOption } from '../fields/field-image-choice.component'
import { FieldListboxComponent, type ListboxOption } from '../fields/field-listbox.component'
import { FieldRadioCardComponent, type RadioCardOption } from '../fields/field-radio-card.component'
import { FieldSegmentedGroupComponent, type SegmentedGroupOption } from '../fields/field-segmented-group.component'
import { FieldSelectComponent, type FieldSelectOption } from '../fields/field-select.component'

/**
 * Host для Stage E — 8 полей семейства «выбор». `country`/`city` — пара Select+CascadingSelect
 * (страна → город), остальные 6 полей независимы. Тот же приём выноса Angular-декоратора в
 * обычный `.ts` (не `.spec.ts`), что и `stage-d-host.component.ts`.
 */
export const stageESchema = z.object({
  country: z.string().meta({ ui: { title: 'Страна' } }),
  city: z.string().meta({ ui: { title: 'Город' } }),
  team: z.string().meta({ ui: { title: 'Команда' } }),
  supportContact: z.string().meta({ ui: { title: 'Контакт поддержки' } }),
  favoriteColors: z.any().meta({ ui: { title: 'Любимые цвета' } }),
  plan: z.string().meta({ ui: { title: 'Тариф' } }),
  layout: z.string().meta({ ui: { title: 'Раскладка' } }),
  avatar: z.string().meta({ ui: { title: 'Аватар' } }),
})

const countryOptions: FieldSelectOption[] = [
  { value: 'ru', label: 'Россия' },
  { value: 'de', label: 'Германия' },
]

const cityByCountry: Record<string, CascadingSelectOption[]> = {
  ru: [{ value: 'msk', label: 'Москва' }, { value: 'spb', label: 'Санкт-Петербург' }],
  de: [{ value: 'ber', label: 'Берлин' }, { value: 'mun', label: 'Мюнхен' }],
}

const teamOptions: FieldComboboxOption[] = [
  { value: 'eng', label: 'Инженерия' },
  { value: 'design', label: 'Дизайн' },
  { value: 'sales', label: 'Продажи' },
]

const colorOptions: ListboxOption[] = [
  { value: 'red', label: 'Красный' },
  { value: 'green', label: 'Зелёный' },
  { value: 'blue', label: 'Синий' },
]

const planOptions: RadioCardOption[] = [
  { value: 'free', label: 'Бесплатный', description: 'Базовые функции' },
  { value: 'pro', label: 'Про', description: 'Всё включено' },
]

const layoutOptions: SegmentedGroupOption[] = [
  { value: 'grid', label: 'Сетка' },
  { value: 'list', label: 'Список' },
]

const avatarOptions: ImageChoiceOption[] = [
  { value: 'cat', label: 'Кот', image: '/cat.png' },
  { value: 'dog', label: 'Пёс', image: '/dog.png' },
]

@Component({
  standalone: true,
  imports: [
    AppFormComponent,
    FieldSelectComponent,
    FieldCascadingSelectComponent,
    FieldComboboxComponent,
    FieldAutocompleteComponent,
    FieldListboxComponent,
    FieldRadioCardComponent,
    FieldSegmentedGroupComponent,
    FieldImageChoiceComponent,
  ],
  template: `
    <letar-app-form [schema]="schema" [initialValue]="initialValue" (formSubmit)="lastSubmit = $event">
      <letar-field-select name="country" [options]="countryOptions" placeholder="Выберите страну" />
      <letar-field-cascading-select
        name="city"
        dependsOn="country"
        [loadOptions]="loadCities"
        placeholderWhenDisabled="Сначала выберите страну"
      />
      <letar-field-combobox name="team" [options]="teamOptions" />
      <letar-field-autocomplete name="supportContact" [suggestions]="['Иван Петров', 'Мария Иванова']" />
      <letar-field-listbox name="favoriteColors" [options]="colorOptions" selectionMode="multiple" />
      <letar-field-radio-card name="plan" [options]="planOptions" />
      <letar-field-segmented-group name="layout" [options]="layoutOptions" />
      <letar-field-image-choice name="avatar" [options]="avatarOptions" />
    </letar-app-form>
  `,
})
export class StageEHostComponent {
  schema = stageESchema
  initialValue = {
    country: '',
    city: '',
    team: '',
    supportContact: '',
    favoriteColors: [],
    plan: '',
    layout: '',
    avatar: '',
  }
  lastSubmit: Record<string, unknown> | undefined

  countryOptions = countryOptions
  teamOptions = teamOptions
  colorOptions = colorOptions
  planOptions = planOptions
  layoutOptions = layoutOptions
  avatarOptions = avatarOptions

  loadCities = (parentValue: string | undefined): Promise<CascadingSelectOption[]> =>
    Promise.resolve(parentValue ? cityByCountry[parentValue] ?? [] : [])
}
