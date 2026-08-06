import { createReader } from '@keystatic/core/reader'
import { createGitHubReader } from '@keystatic/core/reader/github'
import keystaticConfig from '../../keystatic.config'

const isProd = process.env.NODE_ENV === 'production'

/** Reader для чтения статей — GitHub на проде, локальный в dev */
export const reader = isProd
  ? createGitHubReader(keystaticConfig, {
    repo: 'kamiletar/kami-blog',
    ref: 'main',
    token: process.env.GITHUB_PAT,
  })
  : createReader(process.cwd(), keystaticConfig)
