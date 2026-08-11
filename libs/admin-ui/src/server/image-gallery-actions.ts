/**
 * Фабрика Server Actions для галереи фото модели с полями `id`/`order`/`alt` и одним
 * внешним ключом (`houseId`/`materialId`/`projectId` и т.п.), отсортированной по `order`
 * (обложка — фото с наименьшим `order`).
 *
 * Библиотека не знает конкретный ZenStack/Prisma клиент приложения — вызывающая сторона
 * передаёт `getContext(user)`, который возвращает уже готовую делегат-модель и `transaction`
 * для конкретного enhanced-клиента. Это даёт вызывающему файлу точную типизацию (делегат
 * выводится из реального сгенерированного клиента), а этой фабрике — минимальную структурную
 * границу без завязки на Prisma-типы.
 */

/** Минимальный набор полей строки галереи, нужный самой фабрике. */
export interface GalleryImageRow {
  id: string
  order: number
}

/**
 * Структурная граница делегата модели — методы, которые реально вызывает фабрика.
 *
 * `data` у `create`/`update` типизирован как `any` намеренно: реальные ZenStack-делегаты
 * объявляют его через дженерик-перегрузку (`CheckedCreateInput<...>`), и любой конкретный
 * структурный тип (`Record<string, unknown>` и т.п.) там, где TypeScript сверяет generic
 * function types строго (не бивариантно), с ней не совпадёт. Публичный API фабрики
 * (`GalleryImageActions`) типизирован полностью — граница `any` замкнута внутри модуля.
 */
export interface GalleryImageDelegate<TRow extends GalleryImageRow> {
  findFirst: (args: { where: Record<string, unknown>; orderBy: { order: 'desc' | 'asc' } }) => Promise<TRow | null>
  findMany: (args: { where: Record<string, unknown>; orderBy: { order: 'asc' | 'desc' } }) => Promise<TRow[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- см. комментарий к интерфейсу
  create: (args: { data: any }) => Promise<TRow>
  delete: (args: { where: { id: string } }) => Promise<TRow>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- см. комментарий к интерфейсу
  update: (args: { where: { id: string }; data: any }) => PromiseLike<TRow>
}

/**
 * Результат `getContext` — делегат модели плюс `$transaction` того же enhanced-клиента.
 *
 * `ops` типизирован как `any[]`: реальный `$transaction` ZenStack-клиента требует
 * `ZenStackPromise<any>[]` — фирменный promise-подкласс его query-билдера, а не произвольный
 * `PromiseLike`. Оборачивающая `(ops) => db.$transaction(ops)` у вызывающей стороны передаёт
 * туда именно такие значения (результаты `model.update(...)`), так что граница безопасна.
 */
export interface GalleryImageContext<TRow extends GalleryImageRow> {
  model: GalleryImageDelegate<TRow>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- см. комментарий к интерфейсу
  transaction: (ops: any[]) => Promise<unknown>
}

export interface GalleryImageActionsConfig<TRow extends GalleryImageRow, TUser, TRoles> {
  /** Имя FK-поля строки галереи (`houseId`, `materialId`, `projectId`, ...). */
  fkField: string
  /** `requireRole(...ROLES)` приложения — отдаёт `{ user }` или бросает при отказе. */
  requireRole: (roles: TRoles) => Promise<{ user: TUser }>
  /** Роли, допущенные к галерее (например `HOUSE_ADMIN_ROLES`). */
  roles: TRoles
  /** Строит делегат модели + `transaction` для enhanced-клиента, авторизованного под `user`. */
  getContext: (user: TUser) => GalleryImageContext<TRow>
  /** Путь для `revalidatePath` по значению FK. */
  revalidatePathFor: (fkValue: string) => string
  /** `revalidatePath` приложения (обычно `next/cache`). */
  revalidatePath: (path: string) => void
}

export interface GalleryImageActions {
  addImageAction: (fkValue: string, url: string) => Promise<{ error?: string }>
  deleteImageAction: (fkValue: string, imageId: string) => Promise<{ error?: string }>
  reorderImagesAction: (fkValue: string, orderedIds: string[]) => Promise<{ error?: string }>
  setCoverImageAction: (fkValue: string, imageId: string) => Promise<{ error?: string }>
  updateImageAltAction: (fkValue: string, imageId: string, alt: string) => Promise<{ error?: string }>
}

/** Создаёт 5 Server Actions галереи фото (добавить/удалить/переставить/обложка/alt). */
export function createImageGalleryActions<TRow extends GalleryImageRow, TUser, TRoles>(
  config: GalleryImageActionsConfig<TRow, TUser, TRoles>,
): GalleryImageActions {
  const { fkField, requireRole, roles, getContext, revalidatePathFor, revalidatePath } = config

  async function authorize() {
    const { user } = await requireRole(roles)
    return getContext(user)
  }

  async function addImageAction(fkValue: string, url: string): Promise<{ error?: string }> {
    const { model } = await authorize()

    const last = await model.findFirst({ where: { [fkField]: fkValue }, orderBy: { order: 'desc' } })
    await model.create({ data: { [fkField]: fkValue, url, order: (last?.order ?? -1) + 1 } })

    revalidatePath(revalidatePathFor(fkValue))
    return {}
  }

  async function deleteImageAction(fkValue: string, imageId: string): Promise<{ error?: string }> {
    const { model } = await authorize()

    await model.delete({ where: { id: imageId } })

    revalidatePath(revalidatePathFor(fkValue))
    return {}
  }

  async function reorderImagesAction(fkValue: string, orderedIds: string[]): Promise<{ error?: string }> {
    const { model, transaction } = await authorize()

    await transaction(orderedIds.map((id, index) => model.update({ where: { id }, data: { order: index } })))

    revalidatePath(revalidatePathFor(fkValue))
    return {}
  }

  async function setCoverImageAction(fkValue: string, imageId: string): Promise<{ error?: string }> {
    const { model, transaction } = await authorize()

    const images = await model.findMany({ where: { [fkField]: fkValue }, orderBy: { order: 'asc' } })
    const reordered = [imageId, ...images.map((image) => image.id).filter((id) => id !== imageId)]

    await transaction(reordered.map((id, index) => model.update({ where: { id }, data: { order: index } })))

    revalidatePath(revalidatePathFor(fkValue))
    return {}
  }

  async function updateImageAltAction(fkValue: string, imageId: string, alt: string): Promise<{ error?: string }> {
    const { model } = await authorize()

    await model.update({ where: { id: imageId }, data: { alt: alt.trim() || null } })

    revalidatePath(revalidatePathFor(fkValue))
    return {}
  }

  return { addImageAction, deleteImageAction, reorderImagesAction, setCoverImageAction, updateImageAltAction }
}
