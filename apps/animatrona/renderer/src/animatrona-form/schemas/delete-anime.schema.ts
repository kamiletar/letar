import { z } from 'zod/v4'

/**
 * Схема для диалога удаления аниме
 */
export const DeleteAnimeSchema = z
  .object({
    /** Удалить файлы с диска */
    deleteFiles: z.boolean().default(true),

    /** Переместить в корзину вместо полного удаления */
    moveToTrash: z.boolean().default(true),
  })
  .strip()

export type DeleteAnimeFormData = z.infer<typeof DeleteAnimeSchema>

/**
 * Дефолтные значения для удаления
 */
export const deleteAnimeDefaults: DeleteAnimeFormData = {
  deleteFiles: true,
  moveToTrash: true,
}
