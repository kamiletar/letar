'use client'

import { useEffect, useState } from 'react'

/**
 * Хук для ротации изображений с заданным интервалом.
 *
 * - Использует первое изображение как начальное для SSR
 * - После mount выбирает случайное изображение
 * - Запускает ротацию с заданным интервалом
 *
 * @param images - Массив URL изображений
 * @param rotationInterval - Интервал ротации в миллисекундах (по умолчанию 10800)
 * @returns Текущее изображение для отображения
 *
 * @example
 * const currentImage = useImageRotation(images, 5000)
 * return <img src={currentImage} />
 */
export function useImageRotation(images: string[], rotationInterval = 10800): string {
  // Начальное значение детерминированное для избежания hydration mismatch
  const [currentImage, setCurrentImage] = useState(() => {
    if (images.length === 0) {
      return ''
    }
    // Первая картинка для консистентности SSR/CSR
    return images[0]
  })

  // После mount выбираем случайную картинку и запускаем ротацию
  useEffect(() => {
    if (images.length === 0) {
      return
    }

    // После mount выбираем случайную картинку
    setCurrentImage(images[Math.floor(Math.random() * images.length)])

    const timer = setInterval(() => {
      setCurrentImage(images[Math.floor(Math.random() * images.length)])
    }, rotationInterval)

    return () => {
      clearInterval(timer)
    }
  }, [images, rotationInterval])

  return currentImage
}
