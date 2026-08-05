import { getSession } from '@/lib/auth'
import { createImageRecord, deleteImageByPath, deleteImageRecord, getImageById } from '@/lib/images/create-image'
import { getImageUrl } from '@/lib/images/get-image-url'
import { createImageUploadRoute } from '@letar/image-upload/server'

export const { POST, DELETE } = createImageUploadRoute({
  getSession,
  isAuthorized: (user) => user.role === 'ADMIN',
  defaultCategory: 'OTHER',
  repository: { createImageRecord, deleteImageRecord, deleteImageByPath, getImageById },
  getImageUrl,
})
