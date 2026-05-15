import { z } from 'zod/v4'

/** Схема создания отзыва */
export const CreateReviewSchema = z
  .object({
    productId: z.string().min(1, 'Выберите товар'),
    rating: z.number().int().min(1, 'Минимум 1 звезда').max(5, 'Максимум 5 звёзд'),
    text: z.string().max(2000, 'Максимум 2000 символов').optional(),
    images: z.array(z.string()).max(3, 'Максимум 3 фотографии').default([]),
  })
  .strip()

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>

/** Схема ответа продавца на отзыв */
export const ReviewResponseSchema = z
  .object({
    reviewId: z.string().min(1),
    response: z.string().min(1, 'Введите ответ').max(1000, 'Максимум 1000 символов'),
  })
  .strip()

export type ReviewResponseInput = z.infer<typeof ReviewResponseSchema>
