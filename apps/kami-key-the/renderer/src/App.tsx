import { useEffect, useState } from 'react'
import type { Page } from './app-page'
import { EditorPage } from './editor/editor-page'
import { SettingsPage } from './settings/settings-page'
import { AppShell } from './shell/app-shell'
import { TitleBar } from './shell/title-bar'

function getPage(): Page {
  return window.location.hash === '#settings' ? 'settings' : 'editor'
}

export function App() {
  const [page, setPage] = useState<Page>(getPage)

  useEffect(() => {
    const handler = () => setPage(getPage())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  useEffect(() => window.electronAPI.on.navigate(setPage), [])

  const navigate = (next: Page) => {
    if (next === page) {
      return
    }
    setPage(next)
    // pushState (не replaceState) — переключение Редактор/Настройки должно откатываться
    // аппаратной/браузерной кнопкой «Назад» (main/background.ts app-command), см. editor-route.ts
    if (next === 'settings') {
      window.history.pushState(null, '', '#settings')
    } else {
      window.history.pushState(null, '', window.location.pathname + window.location.search)
    }
  }

  return (
    <AppShell titleBar={<TitleBar page={page} onNavigate={navigate} />}>
      <EditorPage isActive={page === 'editor'} />
      <SettingsPage isActive={page === 'settings'} />
    </AppShell>
  )
}
