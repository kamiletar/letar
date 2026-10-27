'use client'

import { Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

type Labels = { desktop: string; desktopDone: string; touch: string }

const TOUCH = '(hover: none) and (pointer: coarse)'

/**
 * Строка подсказок внизу (KM-039) вместо кнопки «Пропустить вход». Пока идёт вход, на компьютере она
 * называет клавиши с Esc, на сенсорном экране — «нажмите, чтобы пропустить»; после входа остаются клавиши
 * меню, а на сенсорном нечего подсказывать. Строка не интерактивна: клик по ней — клик по пустому месту.
 * На сервере и до гидратации её нет, поэтому раскладку она не двигает.
 */
export function EntryHints({ labels }: { labels: Labels }) {
  const [state, setState] = useState<{ touch: boolean; running: boolean; language: boolean } | null>(null)

  useEffect(() => {
    const root = document.documentElement
    const query = matchMedia(TOUCH)
    const sync = () =>
      setState({
        touch: query.matches,
        running: root.hasAttribute('data-kami-entry'),
        language: root.hasAttribute('data-kami-entry-lang'),
      })
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['data-kami-entry', 'data-kami-entry-lang'] })
    query.addEventListener('change', sync)
    return () => {
      observer.disconnect()
      query.removeEventListener('change', sync)
    }
  }, [])

  // На экране языка своя подсказка.
  const text = !state || state.language
    ? ''
    : state.touch
    ? state.running ? labels.touch : ''
    : state.running
    ? labels.desktop
    : labels.desktopDone

  return (
    <Text
      data-entry-hints=""
      aria-hidden="true"
      minH="1.2em"
      textAlign="center"
      fontFamily="mono"
      fontSize="xs"
      color="fg.muted"
      pointerEvents="none"
    >
      {text}
    </Text>
  )
}
