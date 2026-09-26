'use client'

import { createContext, type ReactNode, useContext } from 'react'

/** Где стоит слот: в пункте, у значения (вне триггера) или внутри триггера (там слоты запрещены) */
export type SelectionSlotScope = 'option' | 'value' | 'value-text'

/** Локализованные строки слотов — собирает поле (у скина свои словари) */
export interface SelectionActionStrings {
  /** «Изменить» — `title` карандаша */
  edit: string
  /** «Изменить «<текст>»» — `aria-label` карандаша */
  editAria: (text: string) => string
  /** «+ Добавить…» — подпись `CreateButton` у Select */
  create: string
  /** «+ Добавить "<поиск>"» — подпись `CreateButton` у Combobox */
  createWithSearch: (search: string) => string
  /** «F2 — изменить пункт» */
  hotkeyHint: string
}

/** Контекст поля — ОДИН провайдер на поле, общий для всех слотов */
export interface SelectionActionsContextValue {
  /** Идёт действие (`onCreate`/`onUpdate`): повторные запуски игнорируются, кнопки `disabled` */
  pending: boolean
  canCreate: boolean
  hasOnUpdate: boolean
  /** `!disabled && !readOnly` */
  interactive: boolean
  /** Текст поиска Combobox; `''` у Select */
  search: string
  runCreate: () => void
  runEdit: (option: unknown, scope: 'option' | 'value') => void
  strings: SelectionActionStrings
}

/** Контекст опции — поле ставит его вокруг `renderOption`, кнопок пункта, `controlActions`, `renderValue` */
export interface SelectionOptionContextValue {
  /** Публичная опция приложения (после наложения правок) */
  option: unknown
  /** `getOptionText(option)` — для `aria-label` */
  text: string
  editable: boolean
  scope: SelectionSlotScope
}

const SelectionActionsContext = createContext<SelectionActionsContextValue | null>(null)
const SelectionOptionContext = createContext<SelectionOptionContextValue | null>(null)

export function SelectionActionsProvider(
  { value, children }: { value: SelectionActionsContextValue; children: ReactNode },
) {
  return <SelectionActionsContext.Provider value={value}>{children}</SelectionActionsContext.Provider>
}

export function SelectionOptionProvider(
  { value, children }: { value: SelectionOptionContextValue; children: ReactNode },
) {
  return <SelectionOptionContext.Provider value={value}>{children}</SelectionOptionContext.Provider>
}

export function useSelectionActions(): SelectionActionsContextValue | null {
  return useContext(SelectionActionsContext)
}

export function useSelectionOption(): SelectionOptionContextValue | null {
  return useContext(SelectionOptionContext)
}
