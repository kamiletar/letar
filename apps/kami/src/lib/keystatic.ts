import { createReader } from '@keystatic/core/reader'
import { createGitHubReader } from '@keystatic/core/reader/github'
import keystaticConfig from '../../keystatic.config'

// Тот же баг, что был в keystatic.config.ts (PLAN-INFRA.md §18.7 M2): NODE_ENV === 'production'
// не отличает стейдж от прода — на стейдже GITHUB_PAT/KEYSTATIC_GITHUB_CLIENT_ID сознательно не
// заведены, поэтому решаем по наличию GITHUB_PAT, а не по NODE_ENV.
const isProd = Boolean(process.env.GITHUB_PAT)

/** Reader для чтения статей — GitHub на проде, локальный в dev */
export const reader = isProd
  ? createGitHubReader(keystaticConfig, {
    repo: 'kamiletar/kami-blog',
    ref: 'main',
    token: process.env.GITHUB_PAT,
  })
  : createReader(process.cwd(), keystaticConfig)
