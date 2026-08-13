'use client'

import { type Framework, FRAMEWORK_VALUES } from '@/lib/skin'
import { useI18n } from 'fumadocs-ui/contexts/i18n'
import type { MouseEvent } from 'react'
import { useSkin } from './skin-context'
import styles from './skin-switcher.module.css'

const FRAMEWORK_LABELS: Record<Framework, string> = {
  react: 'React',
  vue: 'Vue',
  angular: 'Angular',
}

const NAV_LABEL: Record<string, string> = {
  en: 'Code example framework',
  ru: 'Фреймворк примеров кода',
}

const SOON_LABEL: Record<string, string> = {
  en: 'soon',
  ru: 'скоро',
}

export interface FrameworkSwitcherProps {
  /** Варианты, для которых нет примера на этой странице — рисуются disabled (решение 5, P7 PLAN.md) */
  unavailable?: Framework[]
}

/**
 * Переключатель React ↔ Vue ↔ Angular — тот же паттерн, что `SkinSwitcher` (ссылки, не dropdown,
 * решение 8, P7 PLAN.md). Отдельная нав-группа: Framework и Skin — независимые оси (Vue/Angular
 * не имеют chakra/shadcn-варианта — headless-пруфы, см. `libs/forms/PLAN.md` Фазы 9/10).
 */
export function FrameworkSwitcher({ unavailable = [] }: FrameworkSwitcherProps) {
  const { framework, setFramework } = useSkin()
  const { locale } = useI18n()
  const navLabel = NAV_LABEL[locale ?? 'en'] ?? NAV_LABEL.en
  const soonLabel = SOON_LABEL[locale ?? 'en'] ?? SOON_LABEL.en

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
    <nav aria-label={navLabel} className={styles.switcher}>
      {FRAMEWORK_VALUES.map((value) => {
        const isUnavailable = unavailable.includes(value)
        const isActive = value === framework

        if (isUnavailable) {
          return (
            <span key={value} aria-disabled="true" className={styles.disabled}>
              {FRAMEWORK_LABELS[value]} <em>({soonLabel})</em>
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
