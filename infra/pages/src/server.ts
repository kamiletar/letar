import { createApp } from './app'
import { loadConfig } from './config'
import { createOidcClient } from './oidc'
import { PageStorage } from './storage'

const config = loadConfig()
const storage = new PageStorage(config.dataPath, { maxVersionBytes: config.maxVersionBytes, maxFiles: config.maxFiles })
const handle = createApp(config, storage, createOidcClient(config))

// Тело публикации ограничено с запасом: base64 увеличивает размер примерно на треть
Bun.serve({ port: config.port, maxRequestBodySize: Math.ceil(config.maxVersionBytes * 1.5), fetch: handle })
console.log(`[pages] слушаю :${config.port}, данные в ${config.dataPath}`)
