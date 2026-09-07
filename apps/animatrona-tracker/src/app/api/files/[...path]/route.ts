import { createUploadsRoute } from '@letar/image-upload/server'

/** Раздача файлов из uploads/ (аватары и т.п.) — не через public/, см. createUploadsRoute */
export const GET = createUploadsRoute()
