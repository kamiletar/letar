'use client'

import { useCallback, useId, useState } from 'react'

/**
 * Компонент-ловушка для ботов.
 * Рендерит скрытое поле, невидимое для людей.
 * Боты заполняют все поля — если это поле заполнено, submit блокируется.
 */
export function HoneypotField(): React.ReactElement {
  const id = useId()
  // Рандомный суффикс для затруднения обхода. Значение нужно стабильным между рендерами
  // и используется прямо в JSX (id/name/htmlFor) — поэтому не ref (чтение ref.current в
  // рендере запрещено react-compiler), а useState с ленивым инициализатором: вызов
  // Math.random() происходит один раз при монтировании внутри init-функции, а не в теле
  // рендера при каждом вызове компонента.
  const [name] = useState(() => `hp_${id.replace(/:/g, '')}_${Math.random().toString(36).slice(2, 6)}`)

  return (
    <div
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: 'absolute',
        left: '-9999px',
        width: 0,
        height: 0,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
      }}
    >
      <label htmlFor={name}>
        {/* Лейбл для SEO/доступности — скрыт от пользователя */}
        Leave this field empty
      </label>
      <input type="text" id={name} name={name} autoComplete="off" tabIndex={-1} />
    </div>
  )
}

/**
 * Хук для проверки honeypot поля.
 * Возвращает функцию isBot() — true если поле заполнено (бот).
 */
export function useHoneypotCheck(enabled: boolean | undefined): {
  /** Проверить, заполнено ли honeypot поле (= бот) */
  isBot: () => boolean
} {
  const checkBot = useCallback((): boolean => {
    if (!enabled) {
      return false
    }

    // Ищем все скрытые honeypot-поля формы
    const honeypotInputs = document.querySelectorAll<HTMLInputElement>('input[name^="hp_"][tabindex="-1"]')

    for (const input of honeypotInputs) {
      if (input.value.trim() !== '') {
        return true // Бот заполнил поле
      }
    }

    return false
  }, [enabled])

  return { isBot: checkBot }
}
