/**
 * Уменьшает фото перед сохранением на телефоне и отправкой на сайт.
 *
 * Снимок с камеры весит 5–10 МБ: хранить его в памяти телефона и гнать по мобильной сети
 * незачем, на сайте всё равно ресайз до 1920 px. Если браузер не умеет (нет canvas /
 * createImageBitmap) или результат не меньше исходника — возвращаем файл как есть.
 */
export async function shrinkImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    return result && result.size < file.size ? result : file
  } catch {
    return file
  }
}
