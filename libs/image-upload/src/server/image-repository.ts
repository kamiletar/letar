import { processUploadImage } from './process-upload-image'

export interface CreateImageRecordInput<TCategory> {
  filename: string
  path: string
  mimeType: string
  size: number
  category: TCategory
  uploadedById?: string
  /** Буфер для получения width/height/blurDataURL за один проход sharp. */
  buffer?: Buffer
}

/**
 * Минимальная форма ORM-делегата модели `Image`, которой достаточно репозиторию.
 * Аргументы намеренно `any` — реальный делегат (Prisma/ZenStack) типизирован строже,
 * а метод-синтаксис даёт TypeScript проверять его бивариантно, не требуя точного совпадения.
 */
export interface ImageRepositoryDelegate<TImage> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- см. doc-комментарий выше про бивариантность
  create(args: any): Promise<TImage>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(args: any): Promise<TImage>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(args: any): Promise<TImage>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findUnique(args: any): Promise<TImage | null>
}

/**
 * CRUD-обёртка над моделью `Image` в БД — идентична у приложений со схемой
 * «Image в БД, свой ORM-клиент» (было продублировано в `mandala`/`kami`).
 * width/height/blurDataURL определяются через `processUploadImage()` за один проход sharp;
 * ошибка обработки не роняет создание/обновление записи — поля остаются `null`.
 */
export function createImageRepository<TImage, TCategory>(delegate: ImageRepositoryDelegate<TImage>) {
  async function resolveImageMeta(buffer: Buffer) {
    try {
      const { width, height, blurDataURL } = await processUploadImage(buffer, { blurDataURL: true })
      return { width, height, blurDataURL }
    } catch {
      return { width: null, height: null, blurDataURL: null }
    }
  }

  async function createImageRecord(params: CreateImageRecordInput<TCategory>): Promise<TImage> {
    const { filename, path, mimeType, size, category, uploadedById, buffer } = params
    const meta = buffer ? await resolveImageMeta(buffer) : { width: null, height: null, blurDataURL: null }

    return delegate.create({
      data: { filename, path, mimeType, size, category, uploadedById, ...meta },
    })
  }

  async function updateImageMetadata(id: string, buffer: Buffer): Promise<TImage> {
    const meta = await resolveImageMeta(buffer)
    return delegate.update({ where: { id }, data: meta })
  }

  async function deleteImageRecord(id: string): Promise<void> {
    await delegate.delete({ where: { id } })
  }

  async function deleteImageByPath(path: string): Promise<void> {
    await delegate.delete({ where: { path } })
  }

  async function getImageById(id: string): Promise<TImage | null> {
    return delegate.findUnique({ where: { id } })
  }

  async function getImageByPath(path: string): Promise<TImage | null> {
    return delegate.findUnique({ where: { path } })
  }

  return {
    createImageRecord,
    updateImageMetadata,
    deleteImageRecord,
    deleteImageByPath,
    getImageById,
    getImageByPath,
  }
}
