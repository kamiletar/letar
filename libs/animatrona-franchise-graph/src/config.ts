/**
 * Конфигурация для параметризации отличий между приложениями
 */

import { createContext, useContext } from 'react'

/** Конфигурация компонентов графа франшизы */
export interface FranchiseGraphConfig {
  /** Лейбл "В трекере" / "В библиотеке" */
  libraryLabel: string
  /** Лейбл "Не в трекере" / "Не в библиотеке" */
  notInLibraryLabel: string
  /** Подпись под графом для внутренних ссылок ("из трекера" / "из библиотеки") */
  libraryNavLabel: string
}

/** Конфигурация по умолчанию (tracker) */
export const DEFAULT_CONFIG: FranchiseGraphConfig = {
  libraryLabel: 'В трекере',
  notInLibraryLabel: 'Не в трекере',
  libraryNavLabel: 'из трекера',
}

export const FranchiseGraphConfigContext = createContext<FranchiseGraphConfig>(DEFAULT_CONFIG)

/** Хук для получения конфигурации */
export function useFranchiseGraphConfig(): FranchiseGraphConfig {
  return useContext(FranchiseGraphConfigContext)
}
