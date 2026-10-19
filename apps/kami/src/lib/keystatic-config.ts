import 'server-only'

import { createKeystaticConfig } from '../../keystatic.config'

// NODE_ENV не отличает production от staging без GitHub-кредов.
export const keystaticStorageKind = process.env.KEYSTATIC_GITHUB_CLIENT_ID ? 'github' : 'local'
export const keystaticConfig = createKeystaticConfig(keystaticStorageKind)
