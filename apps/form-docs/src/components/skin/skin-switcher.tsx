'use client'

import { type Skin, SKIN_VALUES } from '@/lib/skin'
import type { MouseEvent } from 'react'
import { useSkin } from './skin-context'
import styles from './skin-switcher.module.css'

const SKIN_LABELS: Record<Skin, string> = {
  chakra: 'Chakra UI',
  shadcn: 'shadcn/ui',
}

export interface SkinSwitcherProps {
  /** Варианты, для которых нет примера на этой странице — рисуются disabled (решение 5, P7 PLAN.md) */
  unavailable?: Skin[]
}

/**
 * Переключатель Chakra ↔ shadcn — ссылки, не dropdown (решение 8, P7 PLAN.md).
 * Даёт бесплатно доступное имя, средний клик, «открыть в новой вкладке», индексируемость.
 * Перехватывает только обычный левый клик без модификаторов — остальное отдаётся браузеру.
 */
export function SkinSwitcher({ unavailable = [] }: SkinSwitcherProps) {
  const { skin, setSkin } = useSkin()

  function handleClick(event: MouseEvent<HTMLAnchorElement>, next: Skin) {
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    ) {
      return
    }
    event.preventDefault()
    setSkin(next)
  }

  return (
    <nav aria-label="Оформление примеров кода" className={styles.switcher}>
      {SKIN_VALUES.map((value) => {
        const isUnavailable = unavailable.includes(value)
        const isActive = value === skin

        if (isUnavailable) {
          return (
            <span key={value} aria-disabled="true" className={styles.disabled}>
              {SKIN_LABELS[value]} <em>(скоро)</em>
            </span>
          )
        }

        return (
          <a
            key={value}
            href={`?skin=${value}`}
            aria-current={isActive ? 'true' : undefined}
            data-active={isActive ? '' : undefined}
            className={styles.link}
            onClick={(event) => handleClick(event, value)}
          >
            {SKIN_LABELS[value]}
          </a>
        )
      })}
    </nav>
  )
}
