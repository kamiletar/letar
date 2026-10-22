'use client'

import { Box, Heading } from '@chakra-ui/react'
import { redactAtPaths } from '@letar/forms-core/security'
import { useSensitiveFieldPaths } from '@letar/forms-react'
import JsonView from '@uiw/react-json-view'
import { githubDarkTheme } from '@uiw/react-json-view/githubDark'
import { githubLightTheme } from '@uiw/react-json-view/githubLight'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { useDeclarativeForm } from './form-context'

export interface FormDebugJsonViewProps {
  /** Block title */
  title?: string
  /** Tree expansion depth (by default 2) */
  collapsed?: number
  /** Show in production (by default false) */
  showInProduction?: boolean
}

/** Detect dark theme via data-attribute (next-themes) or media query */
function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // next-themes sets class or data-theme on <html>
    const check = () => {
      const html = document.documentElement
      const isDarkNow = html.classList.contains('dark')
        || html.getAttribute('data-theme') === 'dark'
        || html.style.colorScheme === 'dark'
      setIsDark(isDarkNow)
    }

    check()

    // Observe changes on <html>
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style'],
    })

    return () => observer.disconnect()
  }, [])

  return isDark
}

/**
 * FormDebugJsonView — интерактивный инспектор значений формы (дерево JSON, `@uiw/react-json-view`).
 *
 * В ядро `@letar/forms` не входит: `Form.DebugValues` и проп `debug` рисуют простой `<pre>`. Просмотрщик подключается
 * отдельным импортом, и `@uiw/react-json-view` нужен только тем, кто его использует.
 *
 * Сам переключается между тёмной и светлой темой. В production скрыт; `showInProduction` показывает и там.
 *
 * @example
 * ```tsx
 * import { FormDebugJsonView } from '@letar/forms/debug'
 *
 * <AppForm initialValue={data} onSubmit={handleSubmit}>
 *   <AppForm.Field.String name="title" />
 *   <FormDebugJsonView />
 * </AppForm>
 * ```
 */
export function FormDebugJsonView({
  title = 'Form Values',
  collapsed = 2,
  showInProduction = false,
}: FormDebugJsonViewProps): ReactElement | null {
  const { form } = useDeclarativeForm()
  const isDark = useIsDarkMode()
  const sensitivePaths = useSensitiveFieldPaths()

  // Hide in production unless specified otherwise
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null
  }

  const jsonTheme = isDark ? githubDarkTheme : githubLightTheme

  return (
    <form.Subscribe selector={(state: { values: unknown }) => state.values}>
      {(values: unknown) => (
        <Box
          borderWidth="1px"
          borderColor="border.muted"
          borderRadius="md"
          p={3}
          mt={4}
          fontSize="sm"
          fontFamily="mono"
          bg="bg.subtle"
        >
          {title && (
            <Heading size="xs" mb={2} color="fg.muted">
              {title}
            </Heading>
          )}
          <JsonView
            value={redactAtPaths(values, sensitivePaths) as object}
            collapsed={collapsed}
            displayDataTypes={false}
            style={{ ...jsonTheme, backgroundColor: 'transparent' }}
          />
        </Box>
      )}
    </form.Subscribe>
  )
}
