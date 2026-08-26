import { runEagerJsxCheckCli } from '@letar/eager-jsx-check'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')

await runEagerJsxCheckCli({ projectRoot })
