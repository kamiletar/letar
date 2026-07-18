export interface ElectronAPI {
  getVersion: () => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
