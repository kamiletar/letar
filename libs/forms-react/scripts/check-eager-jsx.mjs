import { resolve } from 'node:path'
import { runEagerJsxCheckCli } from '@letar/eager-jsx-check'

const projectRoot = resolve(import.meta.dirname, '..')

await runEagerJsxCheckCli({ projectRoot })
