import { existsSync } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { resolveUploadPath } from './serve-uploads'

export interface ImageUploadRouteImage {
  id: string
  path: string
  width: number | null
  height: number | null
}

export interface ImageUploadRouteRepository<TImage extends ImageUploadRouteImage, TCategory extends string> {
  createImageRecord(params: {
    filename: string
    path: string
    mimeType: string
    size: number
    category: TCategory
    uploadedById?: string
    buffer?: Buffer
  }): Promise<TImage>
  deleteImageRecord(id: string): Promise<void>
  deleteImageByPath(path: string): Promise<void>
  getImageById(id: string): Promise<TImage | null>
}

export interface CreateImageUploadRouteOptions<
  TUser extends { id: string },
  TCategory extends string,
  TImage extends ImageUploadRouteImage,
> {
  /** Текущая сессия (или `null`/`undefined`, если не авторизован). */
  getSession: () => Promise<{ user: TUser } | null | undefined>
  /** Разрешена ли загрузка/удаление этому пользователю. */
  isAuthorized: (user: TUser) => boolean
  /** Категория по умолчанию, если клиент её не передал. */
  defaultCategory: TCategory
  /** Максимальный размер файла в байтах. По умолчанию 32 МБ. */
  maxSizeBytes?: number
  repository: ImageUploadRouteRepository<TImage, TCategory>
  /** Строит публичную ссылку на файл из относительного пути (`categoryFolder/filename`). */
  getImageUrl: (relPath: string) => string
  /** Корень `uploads/`. По умолчанию `<cwd>/uploads`. */
  uploadsRoot?: string
}

/**
 * `POST`/`DELETE` для схемы «Image в БД, файл сохраняется на диск как есть» — было
 * продублировано байт-в-байт в `mandala` и `kami` (различался только способ проверки
 * прав и импорт репозитория). Файл сохраняется без sharp-обработки: если приложению
 * нужен ресайз/WebP, применяй `processUploadImage()` до вызова `repository.createImageRecord`
 * через собственный маршрут — эта фабрика для готового «как есть» случая.
 */
export function createImageUploadRoute<
  TUser extends { id: string },
  TCategory extends string,
  TImage extends ImageUploadRouteImage,
>(
  options: CreateImageUploadRouteOptions<TUser, TCategory, TImage>,
) {
  const {
    getSession,
    isAuthorized,
    defaultCategory,
    maxSizeBytes = 32 * 1024 * 1024,
    repository,
    getImageUrl,
    uploadsRoot = path.join(process.cwd(), 'uploads'),
  } = options

  async function POST(request: Request): Promise<Response> {
    try {
      const session = await getSession()
      if (!session?.user || !isAuthorized(session.user)) {
        return Response.json({ error: 'Недостаточно прав для загрузки файлов' }, { status: 403 })
      }

      const formData = await request.formData()
      const file = formData.get('file')
      const category = ((formData.get('category') as string | null) || defaultCategory) as TCategory

      if (!(file instanceof File)) {
        return Response.json({ error: 'Файл не предоставлен' }, { status: 400 })
      }

      if (!file.type.startsWith('image/')) {
        return Response.json({ error: `Файл должен быть изображением (получен: ${file.type})` }, { status: 400 })
      }

      if (file.size > maxSizeBytes) {
        const maxMb = (maxSizeBytes / 1024 / 1024).toFixed(0)
        const fileMb = (file.size / 1024 / 1024).toFixed(2)
        return Response.json(
          { error: `Размер файла не должен превышать ${maxMb}MB (файл: ${fileMb} MB)` },
          { status: 400 },
        )
      }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const extension = file.name.split('.').pop()
      const filename = `${timestamp}-${randomString}.${extension}`
      const categoryFolder = category.toLowerCase()

      const uploadsDir = path.join(uploadsRoot, categoryFolder)
      await mkdir(uploadsDir, { recursive: true })

      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(path.join(uploadsDir, filename), buffer)

      const relPath = `${categoryFolder}/${filename}`

      const image = await repository.createImageRecord({
        filename,
        path: relPath,
        mimeType: file.type,
        size: file.size,
        category,
        uploadedById: session.user.id,
        buffer,
      })

      return Response.json({
        success: true,
        id: image.id,
        url: getImageUrl(relPath),
        filename,
        width: image.width,
        height: image.height,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      console.error('[image-upload] Ошибка загрузки:', errorMessage)
      return Response.json({ error: `Ошибка при загрузке файла: ${errorMessage}` }, { status: 500 })
    }
  }

  async function DELETE(request: Request): Promise<Response> {
    try {
      const session = await getSession()
      if (!session?.user || !isAuthorized(session.user)) {
        return Response.json({ error: 'Недостаточно прав для удаления файлов' }, { status: 403 })
      }

      const { searchParams } = new URL(request.url)
      const url = searchParams.get('url')
      const imageId = searchParams.get('id')

      // Удаление по ID (рекомендуемый способ)
      if (imageId) {
        const image = await repository.getImageById(imageId)
        if (!image) {
          return Response.json({ error: 'Изображение не найдено' }, { status: 404 })
        }

        const resolved = resolveUploadPath(uploadsRoot, image.path.split('/'))
        if (resolved.ok && existsSync(resolved.absPath)) {
          await unlink(resolved.absPath)
        }

        await repository.deleteImageRecord(imageId)
        return Response.json({ success: true })
      }

      // Удаление по URL (обратная совместимость)
      if (!url || !url.startsWith('/api/files/')) {
        return Response.json({ error: 'Некорректный URL или ID' }, { status: 400 })
      }

      const relPath = url.replace(/^\/api\/files\//, '')
      const resolved = resolveUploadPath(uploadsRoot, relPath.split('/'))
      if (!resolved.ok) {
        return Response.json({ error: 'Некорректный URL' }, { status: 400 })
      }

      if (existsSync(resolved.absPath)) {
        await unlink(resolved.absPath)
      }

      try {
        await repository.deleteImageByPath(relPath)
      } catch {
        // Игнорируем ошибку если записи нет (для обратной совместимости)
      }

      return Response.json({ success: true })
    } catch (error) {
      console.error('[image-upload] Ошибка удаления:', error)
      return Response.json({ error: 'Ошибка при удалении файла' }, { status: 500 })
    }
  }

  return { POST, DELETE }
}
