'use client'

import { type ReactElement, useCallback, useMemo } from 'react'
import type { CityFieldProps } from '../../../types'
import { useFieldDefaultString } from '../../base'
import { type ComboboxFieldProps, FieldCombobox } from '../../selection/field-combobox'
import { type CityEntry, loadCities, searchCities } from './city-search'

/** Сколько городов показывать в выдаче, если `limit` не задан */
const DEFAULT_LIMIT = 20

/**
 * Режим словаря `Form.Field.City`: выбор города из встроенного справочника России.
 *
 * Тонкая надстройка над `Form.Field.Combobox` (`loadOptions`): разметка, клавиатура, мобильные цели касания
 * и `Portal` — те же, что у остальных списков. Справочник грузится при первом открытии списка и в бандл формы
 * не входит. Значение поля — строка: название города, а для повторяющихся названий («Советск») — с регионом.
 */
export function FieldCityDictionary(props: CityFieldProps): ReactElement {
  const {
    // Пропсы режима провайдера и самого переключателя в Combobox не нужны
    provider: _provider,
    token: _token,
    minChars: _minChars,
    debounceMs: _debounceMs,
    source: _source,
    countries: _countries,
    allowOther = true,
    otherLabel,
    limit = DEFAULT_LIMIT,
    ...base
  } = props
  const defaultOtherLabel = useFieldDefaultString('formField.city.other')

  const loadOptions = useCallback(
    async (search: string) => searchCities(await loadCities(), search, limit),
    [limit],
  )

  // Значение вне справочника (введено вручную или осталось от свободного поля) показываем как есть
  const loadSelected = useCallback(async (value: string): Promise<CityEntry | null> => {
    if (!value) {
      return null
    }
    const found = (await loadCities()).find((city) => city.value === value)
    return found ?? { name: value, region: '', value }
  }, [])

  const onCreate = useMemo(
    () =>
      allowOther
        ? async (text: string) => {
          const name = text.trim()
          return name ? { label: name, value: name, data: { name, region: '', value: name } } : null
        }
        : undefined,
    [allowOther],
  )

  const comboboxProps = {
    ...base,
    loadOptions,
    loadSelected,
    getLabel: (city: CityEntry) => city.name,
    getValue: (city: CityEntry) => city.value,
    getTextValue: (city: CityEntry) => city.name,
    // Регион под названием; у Москвы и Санкт-Петербурга он совпадает с названием
    getDescription: (city: CityEntry) => (city.region && city.region !== city.name ? city.region : undefined),
    // Справочник локальный: пустой запрос показывает самые крупные города, ждать ввода и debounce незачем
    minChars: 0,
    debounce: 0,
    ...(onCreate && { onCreate, createLabel: otherLabel ?? defaultOtherLabel }),
  } as unknown as ComboboxFieldProps

  return <FieldCombobox {...comboboxProps} />
}
