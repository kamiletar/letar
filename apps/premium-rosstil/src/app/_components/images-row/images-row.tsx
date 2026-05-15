'use client'
import { Box, Image as ChakraImage, SimpleGrid } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import img_13_1 from '../../[locale]/catalog/_components/_images/13_1.jpg'
import img_5_1 from '../../[locale]/catalog/_components/_images/1_1.jpg'
import img_2_2 from '../../[locale]/catalog/_components/_images/2_2.jpg'
import img_4_1 from '../../[locale]/catalog/_components/_images/4_1.jpg'
import img_8_1 from '../../[locale]/catalog/_components/_images/8_1.jpg'
import img_1_2 from './images/1_2.jpg'
import img_2_1_alt from './images/2_1.jpg'
import img_2_2_alt from './images/2_2.jpg'
import img_3_1_alt from './images/3_1.jpg'
import img_3_2_alt from './images/3_2.jpg'
import img_7_1_alt from './images/7_1.jpg'
import img_7_2 from './images/7_2.jpg'

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max)
}

const images = [
  [img_4_1, img_2_2, img_8_1, img_5_1],
  [img_2_2_alt, img_7_1_alt, img_2_1_alt, img_3_2_alt],
  [img_13_1, img_3_1_alt, img_1_2, img_7_2],
]
const time = 3000
const MotionBox = motion.create(Box)

const getRandomNumbers = () => {
  return Array(images.length)
    .fill(0)
    .map(() => {
      return getRandomInt(images[0].length)
    })
}

export const ImagesRow = () => {
  // Use fixed initial state to avoid hydration mismatch
  const initialNumbers = useMemo(() => [0, 0, 0], [])
  const [numbers, setNumbers] = useState(initialNumbers)
  const timerRef = useRef<NodeJS.Timeout>(undefined)

  useEffect(() => {
    // Set random initial numbers after hydration using setTimeout
    // to avoid calling setState directly in effect
    const initTimer = setTimeout(() => {
      setNumbers(getRandomNumbers())
    }, 0)

    timerRef.current = setInterval(() => {
      setNumbers(getRandomNumbers())
    }, time)

    return () => {
      clearTimeout(initTimer)
      clearInterval(timerRef.current)
    }
  }, [])

  return (
    <Box background={'#ddc9c0'} borderYWidth={'4px'} borderStyle={'solid'} borderColor={'#d7bdb1'}>
      <SimpleGrid columns={images.length} gap={2} m={3}>
        {images.map((img, i) => {
          const n = numbers[i]
          return (
            <MotionBox
              position={'relative'}
              borderRadius={'md'}
              key={`${n}_${i}`}
              overflow={'hidden'}
              justifyContent={'stretch'}
              alignItems={'stretch'}
              aspectRatio={3751 / 5627}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <ChakraImage asChild>
                <Image
                  fill
                  priority={numbers[i] === initialNumbers[i]}
                  alt={i.toString()}
                  src={img[n]}
                  sizes={'33vw'}
                  quality={90}
                  style={{
                    objectFit: 'cover', // cover, contain, none
                  }}
                />
              </ChakraImage>
            </MotionBox>
          )
        })}
      </SimpleGrid>
    </Box>
  )
}
