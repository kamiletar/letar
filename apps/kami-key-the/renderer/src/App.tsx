import { useEffect, useState } from 'react'
import { EditorPage } from './editor/editor-page'
import { SettingsPage } from './settings/settings-page'

type Page = 'editor' | 'settings'

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

  return page === 'editor' ? <EditorPage /> : <SettingsPage />
}
