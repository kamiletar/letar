'use client'

import { Box } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface BackgroundRotationProps {
  images: string[]
  interval?: number // в миллисекундах
}

export function BackgroundRotation({ images, interval = 10800 }: BackgroundRotationProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length === 0) {
      return
    }

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, interval)

    return () => {
      clearInterval(timer)
    }
  }, [images.length, interval])

  if (images.length === 0) {
    return null
  }

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={-1}
      backgroundImage={`url(${images[currentIndex]})`}
      backgroundSize="cover"
      backgroundPosition="center"
      backgroundRepeat="no-repeat"
      transition="background-image 1s ease-in-out"
    />
  )
}
