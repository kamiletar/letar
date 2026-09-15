import { ChakraProvider } from '@chakra-ui/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { syncColorModeWithSystem } from './lib/color-mode'
import { Toaster } from './lib/toaster'
import { system } from './theme'

/** Открывает окно вне Electron (браузер, Browser pane dev-проверка) — ставит заглушку electronAPI */
async function installDevMockIfNeeded(): Promise<void> {
  if (import.meta.env.DEV && !window.electronAPI) {
    const { installDevElectronMock } = await import('./lib/dev-electron-mock')
    installDevElectronMock()
  }
}

// Класс dark/light на <html> — синхронно, до первого рендера, чтобы не мигало неверной темой
syncColorModeWithSystem()

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
