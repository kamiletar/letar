'use client'

import type { ReactNode } from 'react'
import { FrameworkSwitcher } from './framework-switcher'
import { useSkin } from './skin-context'
import { SkinSwitcher } from './skin-switcher'
import styles from './skin-switcher.module.css'

export interface SkinCodeSwitcherProps {
  chakra: ReactNode
  shadcn: ReactNode | null
  /** Vue-вариант (одна реализация, без деления на скины — см. Фаза 10, libs/forms/PLAN.md) */
  vue: ReactNode | null
}

/**
 * Показывает/прячет уже отрендеренные варианты кода через CSS (`hidden`), не через
 * условный рендер/lazy-подгрузку — все варианты присутствуют в HTML на этапе сборки
 * (решение 2, P7 PLAN.md). Клиентский компонент отвечает только за переключение видимости.
 *
 * Framework (React ↔ Vue) — верхняя ось, Skin (Chakra ↔ shadcn) — только внутри React
 * (у Vue-пруфа нет скинов). Страница без `vue`-примера рисует Vue-вкладку disabled с честной
 * пометкой (решение 5), не подставляет React-код молча (решение 4).
 */
export function SkinCodeSwitcher({ chakra, shadcn, vue }: SkinCodeSwitcherProps) {
  const { skin, framework } = useSkin()

  return (
    <div className={styles.codeGroup}>
      <FrameworkSwitcher unavailable={vue ? [] : ['vue']} />

      <div hidden={framework !== 'react'}>
        <SkinSwitcher unavailable={shadcn ? [] : ['shadcn']} />
        <div hidden={skin !== 'chakra'}>{chakra}</div>
        <div hidden={skin !== 'shadcn'}>
          {shadcn ?? <p className={styles.unavailableNote}>shadcn-вариант этого примера ещё не готов.</p>}
        </div>
      </div>

      <div hidden={framework !== 'vue'}>
        {vue ?? <p className={styles.unavailableNote}>Vue-пример для этого поля появится позже.</p>}
      </div>
    </div>
  )
}
