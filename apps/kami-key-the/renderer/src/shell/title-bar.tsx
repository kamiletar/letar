/**
 * Шапка окна — логотип, навигация Редактор/Настройки, переключатель перехвата AltGr.
 *
 * Сама шапка — зона перетаскивания окна (WebkitAppRegion: 'drag'), интерактивные элементы внутри
 * помечены `no-drag`. Системные кнопки (свернуть/развернуть/закрыть) рисует сам Windows поверх
 * titleBarOverlay (main/window-chrome.ts) — правый отступ через env(titlebar-area-*) освобождает
 * им место. При потере фокуса окна содержимое чуть гаснет — так же ведут себя системные шапки.
 */

import { chakra, Flex, Switch, Text } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { useEffect, useState } from 'react'
import { LuKeyboard, LuSettings } from 'react-icons/lu'
import type { Page } from '../app-page'

interface TitleBarProps {
  page: Page
  onNavigate: (page: Page) => void
}

const NAV_ITEMS: Array<{ page: Page; label: string; icon: React.ReactNode }> = [
  { page: 'editor', label: 'Редактор', icon: <LuKeyboard size={16} /> },
  { page: 'settings', label: 'Настройки', icon: <LuSettings size={16} /> },
]

/** WebkitAppRegion — нестандартное CSS-свойство Electron/WebKit, не входит в типы React.CSSProperties */
const DRAG_REGION = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG_REGION = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export function TitleBar({ page, onNavigate }: TitleBarProps) {
  const [focused, setFocused] = useState(true)
  const [hotkeyEnabled, setHotkeyEnabledState] = useState(true)

  useEffect(() => {
    const onFocus = () => setFocused(true)
    const onBlur = () => setFocused(false)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    window.electronAPI.system.isHotkeyEnabled().then(setHotkeyEnabledState)
    return window.electronAPI.on.hotkeyEnabledChanged(setHotkeyEnabledState)
  }, [])

  const handleHotkeyChange = (on: boolean) => {
    setHotkeyEnabledState(on)
    void window.electronAPI.system.setHotkeyEnabled(on)
  }

  return (
    <Flex
      align="center"
      gap="3"
      h="full"
      bg="bg.subtle"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      pl="3"
      opacity={focused ? 1 : 0.6}
      transition="opacity 0.15s"
      style={{
        ...DRAG_REGION,
        paddingInlineEnd: 'calc(100vw - env(titlebar-area-x, 100vw) - env(titlebar-area-width, 0px) + 12px)',
      }}
    >
      <Flex align="center" gap="2" flexShrink={0}>
        <chakra.svg width="20px" height="20px" viewBox="0 0 24 24" flexShrink={0}>
          <rect width="24" height="24" rx="6" fill="var(--chakra-colors-brand-solid)" />
          <path
            d="M7 5v14M7 12l6-7M7 12l7 7"
            stroke="var(--chakra-colors-brand-contrast)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </chakra.svg>
        <Text fontFamily="mono" fontSize="sm" fontWeight="600" color="fg" userSelect="none">
          KamiKeyThe
        </Text>
      </Flex>

      <Flex align="center" gap="1" style={NO_DRAG_REGION}>
        {NAV_ITEMS.map((item) => (
          <chakra.button
            key={item.page}
            type="button"
            display="flex"
            alignItems="center"
            gap="1.5"
            px="3"
            h="8"
            rounded="l2"
            fontSize="sm"
            fontWeight="500"
            color={page === item.page ? 'fg' : 'fg.muted'}
            bg={page === item.page ? 'bg.muted' : 'transparent'}
            aria-current={page === item.page ? 'page' : undefined}
            _hover={{ bg: 'bg.muted' }}
            _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '-2px' }}
            onClick={() => onNavigate(item.page)}
          >
            {item.icon}
            {item.label}
          </chakra.button>
        ))}
      </Flex>

      <Flex flex="1" />

      <Flex align="center" gap="2" style={NO_DRAG_REGION}>
        <Tooltip content="Выключите, чтобы AltGr работал как обычно">
          <Flex align="center" gap="2" asChild>
            <label>
              <Text fontSize="xs" color="fg.muted" userSelect="none">
                Перехват AltGr
              </Text>
              <Switch.Root
                size="sm"
                checked={hotkeyEnabled}
                onCheckedChange={(e) => handleHotkeyChange(e.checked)}
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </label>
          </Flex>
        </Tooltip>
      </Flex>
    </Flex>
  )
}
