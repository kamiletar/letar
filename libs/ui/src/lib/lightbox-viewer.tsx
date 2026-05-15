'use client'

import YARLightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

/**
 * Слайд для лайтбокса
 */
export interface LightboxSlide {
  /** URL изображения */
  src: string
  /** Alt текст (опционально) */
  alt?: string
  /** Ширина изображения (опционально) */
  width?: number
  /** Высота изображения (опционально) */
  height?: number
}

/**
 * Props для LightboxViewer
 */
export interface LightboxViewerProps {
  /** Открыт ли лайтбокс */
  open: boolean
  /** Индекс текущего изображения */
  index: number
  /** Колбэк для закрытия */
  close: () => void
  /** Массив слайдов */
  slides: LightboxSlide[]
  /** Максимальный зум (по умолчанию 2x) */
  maxZoom?: number
  /** Зум при скролле (по умолчанию true) */
  scrollToZoom?: boolean
  /** Цвет фона (по умолчанию rgba(0, 0, 0, 0.9)) */
  backgroundColor?: string
}

/**
 * Универсальный компонент лайтбокса для просмотра изображений
 *
 * @example
 * ```tsx
 * <LightboxViewer
 *   open={isOpen}
 *   index={currentIndex}
 *   close={() => setIsOpen(false)}
 *   slides={[
 *     { src: '/image1.jpg', alt: 'Изображение 1' },
 *     { src: '/image2.jpg', alt: 'Изображение 2' },
 *   ]}
 * />
 * ```
 */
export function LightboxViewer({
  open,
  index,
  close,
  slides,
  maxZoom = 2,
  scrollToZoom = true,
  backgroundColor = 'rgba(0, 0, 0, 0.9)',
}: LightboxViewerProps) {
  return (
    <YARLightbox
      open={open}
      index={index}
      close={close}
      slides={slides}
      plugins={[Zoom, Fullscreen]}
      zoom={{
        maxZoomPixelRatio: maxZoom,
        scrollToZoom,
      }}
      styles={{
        container: { backgroundColor },
      }}
    />
  )
}
