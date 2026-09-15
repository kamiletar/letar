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
    setPage(next)
    if (next === 'settings') {
      window.history.replaceState(null, '', '#settings')
    } else {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  return (
    <AppShell titleBar={<TitleBar page={page} onNavigate={navigate} />}>
      <EditorPage isActive={page === 'editor'} />
      <SettingsPage isActive={page === 'settings'} />
    </AppShell>
  )
}
