/**
 * Общее хранилище матриц эмбеддингов: `<name>.json` (meta) + `<name>.f32` (матрица float32).
 * Им пользуются векторы карточек (`vectors`) и векторы формулировок (`phrase-vectors`).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Модель эмбеддера: векторы другой модели несовместимы, хранилище с чужой моделью не читается */
export const EMBED_MODEL = 'Qwen3-Embedding-0.6B-Q8_0'

export interface MatrixMeta {
  model: string
  dims: number
  ids: string[]
  hashes: string[]
}

/** undefined — файла нет или любая проверка не прошла */
export function readMatrixStore(
  home: string,
  name: string,
): { meta: MatrixMeta; matrix: Float32Array } | undefined {
  const metaPath = join(home, `${name}.json`)
  const binPath = join(home, `${name}.f32`)
  if (!existsSync(metaPath) || !existsSync(binPath)) {
    return undefined
  }
  try {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as MatrixMeta
    if (
      meta.model !== EMBED_MODEL
      || !(meta.dims > 0)
      || !Array.isArray(meta.ids)
      || !Array.isArray(meta.hashes)
      || meta.hashes.length !== meta.ids.length
    ) {
      return undefined
    }
    const bytes = readFileSync(binPath)
    const matrix = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
    if (matrix.length !== meta.ids.length * meta.dims) {
      return undefined
    }
    return { meta, matrix }
  } catch {
    return undefined
  }
}

/** Атомарная запись: сначала `.tmp`, потом `rename` */
export function writeMatrixStore(home: string, name: string, meta: MatrixMeta, matrix: Float32Array): void {
  mkdirSync(home, { recursive: true })
  const bin = join(home, `${name}.f32`)
  const json = join(home, `${name}.json`)
  writeFileSync(`${bin}.tmp`, Buffer.from(matrix.buffer, matrix.byteOffset, matrix.byteLength))
  writeFileSync(`${json}.tmp`, JSON.stringify(meta))
  renameSync(`${bin}.tmp`, bin)
  renameSync(`${json}.tmp`, json)
}
