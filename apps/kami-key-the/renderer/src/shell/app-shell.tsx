/**
 * Каркас окна: шапка фиксированной высоты + область контента.
 *
 * Высота строки шапки берётся из TITLE_BAR_HEIGHT (shared/window-chrome.ts) — та же константа,
 * что задаёт titleBarOverlay в main-процессе. Страницы сами управляют своей прокруткой.
 */

import { Grid } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { TITLE_BAR_HEIGHT } from '../../../shared/window-chrome'

interface AppShellProps {
  titleBar: ReactNode
  children: ReactNode
}

export function AppShell({ titleBar, children }: AppShellProps) {
  return (
    <Grid h="100vh" templateRows={`${TITLE_BAR_HEIGHT}px 1fr`}>
      {titleBar}
      <Grid minH="0" overflow="hidden">
        {children}
      </Grid>
    </Grid>
  )
}
