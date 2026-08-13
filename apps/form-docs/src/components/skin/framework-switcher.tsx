'use client'

import { type Framework, FRAMEWORK_VALUES } from '@/lib/skin'
import type { MouseEvent } from 'react'
import { useSkin } from './skin-context'
import styles from './skin-switcher.module.css'

const FRAMEWORK_LABELS: Record<Framework, string> = {
  react: 'React',
  vue: 'Vue',
}

export interface FrameworkSwitcherProps {
  /** Варианты, для которых нет примера на этой странице — рисуются disabled (решение 5, P7 PLAN.md) */
  unavailable?: Framework[]
}

/**
 * Переключатель React ↔ Vue — тот же паттерн, что `SkinSwitcher` (ссылки, не dropdown, решение 8,
 * P7 PLAN.md). Отдельная нав-группа: Framework и Skin — независимые оси (Vue-пример не имеет
 * chakra/shadcn-варианта в этом пруфе, см. `libs/forms/PLAN.md` Фаза 10).
 */
export function FrameworkSwitcher({ unavailable = [] }: FrameworkSwitcherProps) {
  const { framework, setFramework } = useSkin()

  function handleClick(event: MouseEvent<HTMLAnchorElement>, next: Framework) {
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) {
      return
    }
    event.preventDefault()
    setFramework(next)
  }

  return (
    <nav aria-label="Фреймворк примеров кода" className={styles.switcher}>
      {FRAMEWORK_VALUES.map((value) => {
        const isUnavailable = unavailable.includes(value)
        const isActive = value === framework

        if (isUnavailable) {
          return (
            <span key={value} aria-disabled="true" className={styles.disabled}>
              {FRAMEWORK_LABELS[value]} <em>(скоро)</em>
            </span>
          )
        }

        return (
          <a
            key={value}
            href={`?fw=${value}`}
            aria-current={isActive ? 'true' : undefined}
            data-active={isActive ? '' : undefined}
            className={styles.link}
            onClick={(event) => handleClick(event, value)}
          >
            {FRAMEWORK_LABELS[value]}
          </a>
        )
      })}
    </nav>
  )
}
