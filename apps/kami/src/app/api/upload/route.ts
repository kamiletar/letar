import { getSession } from '@/lib/auth'
import { createImageRecord, deleteImageByPath, deleteImageRecord, getImageById } from '@/lib/images'
import { getImageUrl } from '@/lib/images/get-image-url'
import { createImageUploadRoute } from '@letar/image-upload/server'

/** POST/DELETE /api/upload — загрузка/удаление изображения, только для администраторов. */
export const { POST, DELETE } = createImageUploadRoute({
  getSession,
  isAuthorized: (user) => user.roles.includes('ADMIN'),
  defaultCategory: 'OTHER',
  repository: { createImageRecord, deleteImageRecord, deleteImageByPath, getImageById },
  getImageUrl,
})
