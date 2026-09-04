'use client'

import type { CreateToasterProps, CreateToasterReturn } from '@chakra-ui/react'
import { createToaster, Portal, Spinner, Stack, Toast, Toaster as ChakraToaster } from '@chakra-ui/react'
import { useIsHydrated } from '@letar/hooks'
import type { ReactNode } from 'react'

/** Минимальная форма тоста, нужная рендер-функции ниже — совпадает с тем, что отдаёт Chakra */
interface AppToast {
  type?: string
  title?: ReactNode
  description?: ReactNode
  action?: { label: ReactNode }
  closable?: boolean
  meta?: { closable?: boolean }
}

export interface CreateAppToasterOptions {
  /** Параметры создания toaster-инстанса Chakra (placement, max, pauseOnPageIdle и т.п.) */
  toasterOptions?: CreateToasterProps
  /** Оборачивать рендер в `Portal` (по умолчанию — да) */
  withPortal?: boolean
  /** `insetInline` для `ChakraToaster`; `undefined` — проп не передаётся вовсе */
  insetInline?: Record<string, string> | string
  /** Проп-размеры для `Toast.Root` (`width`, `minW`, `maxW` и т.п.) */
  rootProps?: Record<string, unknown>
  /** Показывать `Spinner` вместо стандартного индикатора для тоста типа `loading` */
  showLoadingSpinner?: boolean
  /** Показывать кнопку действия (`toast.action`), если она задана */
  showActionButton?: boolean
  /** Определяет, показывать ли кнопку закрытия — приложения расходятся в источнике этого флага */
  isClosable?: (toast: AppToast) => boolean
  /**
   * Ждать гидратации перед рендером `Portal` (для Next.js SSR-приложений — без этого
   * возможен hydration mismatch). Electron-рендереры и приложения без SSR могут не ждать.
   */
  waitForHydration?: boolean
}

const DEFAULT_TOASTER_OPTIONS: CreateToasterProps = { placement: 'bottom-end', pauseOnPageIdle: true }
const DEFAULT_ROOT_PROPS = { width: { md: 'sm' } }

/**
 * Фабрика toaster-инстанса + компонента для рендера в layout.
 * Заменяет копию стандартного сниппета Chakra CLI (`npx @chakra-ui/cli snippet add toaster`),
 * продублированную по приложениям монорепо с расхождениями в placement/max/спиннере/closable.
 */
export function createAppToaster(options: CreateAppToasterOptions = {}) {
  const {
    toasterOptions = DEFAULT_TOASTER_OPTIONS,
    withPortal = true,
    insetInline = { mdDown: '4' },
    rootProps = DEFAULT_ROOT_PROPS,
    showLoadingSpinner = false,
    showActionButton = false,
    isClosable = () => true,
    waitForHydration = false,
  } = options

  const toaster: CreateToasterReturn = createToaster(toasterOptions)

  function ToasterBody() {
    return (
      <ChakraToaster toaster={toaster} insetInline={insetInline}>
        {(toast: AppToast) => (
          <Toast.Root {...rootProps}>
            {showLoadingSpinner && toast.type === 'loading'
              ? <Spinner size="sm" color="blue.solid" />
              : <Toast.Indicator />}
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Stack>
            {showActionButton && toast.action && <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>}
            {isClosable(toast) && <Toast.CloseTrigger />}
          </Toast.Root>
        )}
      </ChakraToaster>
    )
  }

  function Toaster() {
    const isHydrated = useIsHydrated()

    if (waitForHydration && !isHydrated) {
      return null
    }

    return withPortal
      ? (
        <Portal>
          <ToasterBody />
        </Portal>
      )
      : <ToasterBody />
  }

  return { toaster, Toaster }
}
