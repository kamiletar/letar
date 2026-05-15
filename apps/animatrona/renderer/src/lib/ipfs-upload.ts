/**
 * Утилиты для загрузки файлов в IPFS
 */

/** Результат загрузки файла в IPFS */
export interface IpfsUploadResult {
  /** CID файла в IPFS */
  cid: string
  /** Размер файла в байтах (DAG cumulative size) */
  size: number
}

/**
 * Загрузить файл в IPFS и вернуть CID + size
 * @param filePath - Путь к файлу
 * @returns CID и размер файла или null при ошибке
 */
export async function uploadToIpfs(filePath: string): Promise<IpfsUploadResult | null> {
  const api = window.electronAPI
  if (!api?.ipfs?.addFile) {
    console.warn('[uploadToIpfs] IPFS API not available')
    return null
  }

  try {
    const result = await api.ipfs.addFile(filePath)
    if (result.success && result.data?.cid) {
      return { cid: result.data.cid, size: result.data.size ?? 0 }
    }
    console.warn(`[uploadToIpfs] Failed to upload ${filePath}:`, result.error)
    return null
  } catch (error) {
    console.error(`[uploadToIpfs] Error uploading ${filePath}:`, error)
    return null
  }
}

/**
 * Загрузить несколько файлов в IPFS параллельно
 * @param filePaths - Массив путей к файлам
 * @returns Массив результатов (null для неудачных загрузок)
 */
export async function uploadManyToIpfs(filePaths: string[]): Promise<(IpfsUploadResult | null)[]> {
  return Promise.all(filePaths.map(uploadToIpfs))
}

/**
 * Загрузить файл в IPFS, игнорируя ошибки
 * Удобно для опциональной загрузки (шрифты, субтитры)
 * @param filePath - Путь к файлу (может быть null/undefined)
 * @returns Результат загрузки или undefined
 */
export async function tryUploadToIpfs(filePath: string | null | undefined): Promise<IpfsUploadResult | undefined> {
  if (!filePath) {
    return undefined
  }
  const result = await uploadToIpfs(filePath)
  return result ?? undefined
}
