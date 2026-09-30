import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/** Значение флага командной строки: `--flag значение`; нет флага — `undefined` */
export function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i === -1 ? undefined : process.argv[i + 1]
}

/** Файл JSON Lines в массив; пустые строки пропускаются */
export function readJsonl<T>(path: string): T[] {
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as T)
}

/** Детерминированное разбиение случаев: около 20% уходит в `test`, остальное — `dev` */
export function splitOf(id: string): 'dev' | 'test' {
  return createHash('sha1').update(id).digest()[0] % 5 === 0 ? 'test' : 'dev'
}
