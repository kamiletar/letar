'use client'

import {
  DEFAULT_FRAMEWORK,
  DEFAULT_SKIN,
  type Framework,
  FRAMEWORK_QUERY_PARAM,
  FRAMEWORK_STORAGE_KEY,
  isFramework,
  isSkin,
  readStorage,
  type Skin,
  SKIN_QUERY_PARAM,
  SKIN_STORAGE_KEY,
  writeStorage,
} from '@/lib/skin'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'

interface SkinContextValue {
  skin: Skin
  framework: Framework
  setSkin: (skin: Skin) => void
  setFramework: (framework: Framework) => void
}

const SkinContext = createContext<SkinContextValue | null>(null)

/**
 * Провайдер общего состояния переключателей Framework × Skin (P7, PLAN.md, решение 3).
 *
 * ⚠️ Дефолт вычисляется БЕЗ обращения к storage/URL — SSR и первый клиентский рендер обязаны
 * совпадать (иначе клик по видимой вкладке не работает, docusaurus#5653). Реальный выбор
 * читается только в useEffect, после гидратации.
 */
export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<Skin>(DEFAULT_SKIN)
  const [framework, setFrameworkState] = useState<Framework>(DEFAULT_FRAMEWORK)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const urlSkin = params.get(SKIN_QUERY_PARAM)
    const storedSkin = readStorage(SKIN_STORAGE_KEY)
    const resolvedSkin = isSkin(urlSkin) ? urlSkin : isSkin(storedSkin) ? storedSkin : DEFAULT_SKIN
    if (resolvedSkin !== DEFAULT_SKIN) {
      setSkinState(resolvedSkin)
    }

    const urlFramework = params.get(FRAMEWORK_QUERY_PARAM)
    const storedFramework = readStorage(FRAMEWORK_STORAGE_KEY)
    const resolvedFramework = isFramework(urlFramework)
      ? urlFramework
      : isFramework(storedFramework)
      ? storedFramework
      : DEFAULT_FRAMEWORK
    if (resolvedFramework !== DEFAULT_FRAMEWORK) {
      setFrameworkState(resolvedFramework)
    }
  }, [])

  const applyToUrl = useCallback((param: string, value: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set(param, value)
    // Решение 9 (P7 PLAN.md): косметическое изменение выбора — не запись в историю переходов
    window.history.replaceState(window.history.state, '', url)
  }, [])

  const setSkin = useCallback(
    (next: Skin) => {
      setSkinState(next)
      writeStorage(SKIN_STORAGE_KEY, next)
      applyToUrl(SKIN_QUERY_PARAM, next)
    },
    [applyToUrl],
  )

  const setFramework = useCallback(
    (next: Framework) => {
      setFrameworkState(next)
      writeStorage(FRAMEWORK_STORAGE_KEY, next)
      applyToUrl(FRAMEWORK_QUERY_PARAM, next)
    },
    [applyToUrl],
  )

  return <SkinContext value={{ skin, framework, setSkin, setFramework }}>{children}</SkinContext>
}

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext)
  if (!ctx) {
    throw new Error('useSkin() должен вызываться внутри <SkinProvider>')
  }
  return ctx
}
