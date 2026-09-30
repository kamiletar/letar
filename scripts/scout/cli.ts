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
