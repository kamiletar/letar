'use client'

import type { ReactNode } from 'react'
import { useSkin } from './skin-context'
import { SkinSwitcher } from './skin-switcher'
import styles from './skin-switcher.module.css'

export interface SkinCodeSwitcherProps {
  chakra: ReactNode
  shadcn: ReactNode | null
}

/**
 * Показывает/прячет уже отрендеренные варианты кода через CSS (`hidden`), не через
 * условный рендер/lazy-подгрузку — оба варианта присутствуют в HTML на этапе сборки
 * (решение 2, P7 PLAN.md). Клиентский компонент отвечает только за переключение видимости.
 */
export function SkinCodeSwitcher({ chakra, shadcn }: SkinCodeSwitcherProps) {
  const { skin } = useSkin()

  return (
    <div className={styles.codeGroup}>
      <SkinSwitcher unavailable={shadcn ? [] : ['shadcn']} />
      <div hidden={skin !== 'chakra'}>{chakra}</div>
      <div hidden={skin !== 'shadcn'}>
        {shadcn ?? <p className={styles.unavailableNote}>shadcn-вариант этого примера ещё не готов.</p>}
      </div>
    </div>
  )
}
