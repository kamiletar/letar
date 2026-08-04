// === Типы ===
export type {
  ImageCategory,
  ImageUrlResolver,
  KnownImageCategory,
  UploadedImage,
  UploadingFile,
  UploadResponseResolver,
  UploadStatus,
} from './lib/types'

// === Резолверы URL ===
export {
  createDirectUrlResolver,
  createEndpointUrlResolver,
  createMetadataUrlResolver,
  createUploadResponseResolver,
  DEFAULT_IMAGE_ENDPOINT,
  isImageUrl,
  type MetadataUrlResolverOptions,
  type UploadResponseResolverOptions,
} from './lib/image-url'

// === Хуки ===
export { useImageUpload, type UseImageUploadOptions } from './lib/use-image-upload'

export { useFileDragDrop, type UseFileDragDropOptions, type UseFileDragDropReturn } from './lib/use-file-drag-drop'

export {
  useImagePreviewUrl,
  type UseImagePreviewUrlOptions,
  type UseImagePreviewUrlReturn,
} from './lib/use-image-preview-url'

// === Компоненты ===
export { Dropzone, type DropzoneProps } from './lib/dropzone'

export {
  ImagePreview,
  ImagePreviewGrid,
  type ImagePreviewGridProps,
  type ImagePreviewProps,
  type RenderImageArgs,
} from './lib/image-preview'

export { ImageUploadField, type ImageUploadFieldProps } from './lib/image-upload-field'

export { BulkImageUpload, type BulkImageUploadProps } from './lib/bulk-image-upload'
