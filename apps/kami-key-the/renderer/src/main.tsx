import { ChakraProvider } from '@chakra-ui/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Toaster } from './lib/toaster'
import { system } from './theme'

/** Открывает окно вне Electron (браузер, Browser pane dev-проверка) — ставит заглушку electronAPI */
async function installDevMockIfNeeded(): Promise<void> {
  if (import.meta.env.DEV && !window.electronAPI) {
    const { installDevElectronMock } = await import('./lib/dev-electron-mock')
    installDevElectronMock()
  }
}

installDevMockIfNeeded().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ChakraProvider value={system}>
        <App />
        <Toaster />
      </ChakraProvider>
    </StrictMode>,
  )
})
