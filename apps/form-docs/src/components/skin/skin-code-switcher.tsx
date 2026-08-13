'use client'

import type { Framework } from '@/lib/skin'
import type { ReactNode } from 'react'
import { FrameworkSwitcher } from './framework-switcher'
import { useSkin } from './skin-context'
import { SkinSwitcher } from './skin-switcher'
import styles from './skin-switcher.module.css'

export interface SkinCodeSwitcherProps {
  chakra: ReactNode
  shadcn: ReactNode | null
  /** Vue-вариант (одна реализация, без деления на скины — см. Фаза 9/10, libs/forms/PLAN.md) */
  vue: ReactNode | null
  /** Angular-вариант (одна реализация, headless-пруф без скинов — см. Фаза 10, libs/forms/PLAN.md) */
  angular: ReactNode | null
}

/**
 * Показывает/прячет уже отрендеренные варианты кода через CSS (`hidden`), не через
 * условный рендер/lazy-подгрузку — все варианты присутствуют в HTML на этапе сборки
 * (решение 2, P7 PLAN.md). Клиентский компонент отвечает только за переключение видимости.
 *
 * Framework (React ↔ Vue ↔ Angular) — верхняя ось, Skin (Chakra ↔ shadcn) — только внутри React
 * (у Vue/Angular-пруфов нет скинов). Страница без `vue`/`angular`-примера рисует эту вкладку
 * disabled с честной пометкой (решение 5), не подставляет React-код молча (решение 4).
 */
export function SkinCodeSwitcher({ chakra, shadcn, vue, angular }: SkinCodeSwitcherProps) {
  const { skin, framework } = useSkin()

  const unavailable: Framework[] = []
  if (!vue) {
    unavailable.push('vue')
  }
  if (!angular) {
    unavailable.push('angular')
  }

  return (
    <div className={styles.codeGroup}>
      <FrameworkSwitcher unavailable={unavailable} />

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

      <div hidden={framework !== 'angular'}>
        {angular ?? <p className={styles.unavailableNote}>Angular-пример для этого поля появится позже.</p>}
      </div>
    </div>
  )
}
