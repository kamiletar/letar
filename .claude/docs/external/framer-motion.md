# Framer Motion (Motion for React) — Документация

> Пакет: `motion` (v12+) или `framer-motion`
> Docs: https://motion.dev/docs/react-quick-start

## Установка / Базовое использование

```tsx
import { motion } from 'motion/react'
// или: import { motion } from 'framer-motion'

// Любой HTML-элемент становится анимируемым
function AnimatedBox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      Контент
    </motion.div>
  )
}
```

---

## animate — управление анимацией

```tsx
// Простая анимация при монтировании
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
/>

// Hover и tap
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Нажми меня
</motion.button>

// Бесконечная анимация
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
/>
```

---

## Variants — сложные анимации

```tsx
import { motion } from 'motion/react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // дочерние с задержкой
      delayChildren: 0.2,
    },
  },
  exit: { opacity: 0 },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

function AnimatedList({ items }) {
  return (
    <motion.ul variants={containerVariants} initial="hidden" animate="visible" exit="exit">
      {items.map((item) => (
        <motion.li key={item.id} variants={itemVariants}>
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  )
}
```

---

## AnimatePresence — анимация при удалении

```tsx
import { AnimatePresence, motion } from 'motion/react'

function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// mode="popLayout" — плавная смена элементов
function Tabs({ activeTab, tabs }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        {tabs[activeTab]}
      </motion.div>
    </AnimatePresence>
  )
}
```

---

## useMotionValue + useTransform

```tsx
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

function ParallaxCard() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Трансформации на основе позиции мыши
  const rotateX = useTransform(y, [-100, 100], [10, -10])
  const rotateY = useTransform(x, [-100, 100], [-10, 10])

  // Добавляем spring для плавности
  const springConfig = { stiffness: 300, damping: 30 }
  const rotateXSpring = useSpring(rotateX, springConfig)
  const rotateYSpring = useSpring(rotateY, springConfig)

  function handleMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(event.clientX - centerX)
    y.set(event.clientY - centerY)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      style={{ rotateX: rotateXSpring, rotateY: rotateYSpring, perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      Карточка с 3D эффектом
    </motion.div>
  )
}
```

---

## useScroll — анимации при прокрутке

```tsx
import { motion, useScroll, useTransform } from 'motion/react'

function ScrollAnimation() {
  const { scrollYProgress } = useScroll()

  // Opacity от 1 до 0 при прокрутке первых 50% страницы
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8])

  return <motion.section style={{ opacity, scale }}>Исчезает при прокрутке</motion.section>
}

// Прогресс-бар прокрутки
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      style={{
        scaleX: scrollYProgress,
        transformOrigin: 'left',
        height: 4,
        background: 'blue',
      }}
    />
  )
}
```

---

## Drag — перетаскивание

```tsx
import { motion } from 'motion/react'
import { useRef } from 'react'

function DraggableCard() {
  const constraintsRef = useRef(null)

  return (
    <div ref={constraintsRef} style={{ width: 400, height: 300, overflow: 'hidden' }}>
      <motion.div
        drag
        dragConstraints={constraintsRef} // ограничение зоной
        dragElastic={0.2} // упругость (0-1)
        dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
        whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
        style={{ cursor: 'grab' }}
      >
        Перетащи меня
      </motion.div>
    </div>
  )
}

// Только по одной оси
;<motion.div drag="x" dragConstraints={{ left: -100, right: 100 }} />
```

---

## useAnimate — программные анимации

```tsx
import { stagger, useAnimate } from 'motion/react'
import { useEffect } from 'react'

function AnimatedMenu() {
  const [scope, animate] = useAnimate()

  const openMenu = async () => {
    // Последовательные анимации
    await animate(scope.current, { opacity: 1 }, { duration: 0.2 })
    await animate('li', { opacity: 1, y: 0 }, { delay: stagger(0.05), duration: 0.3 })
  }

  const closeMenu = async () => {
    await animate('li', { opacity: 0, y: -10 }, { duration: 0.2 })
    await animate(scope.current, { opacity: 0 }, { duration: 0.1 })
  }

  return (
    <ul ref={scope}>
      <li>Пункт 1</li>
      <li>Пункт 2</li>
      <li>Пункт 3</li>
    </ul>
  )
}
```

---

## layout — анимации раскладки (FLIP)

```tsx
import { AnimatePresence, motion } from 'motion/react'

function SortableList({ items }) {
  return (
    <ul>
      <AnimatePresence>
        {items.map((item) => (
          <motion.li
            key={item.id}
            layout // автоматически анимирует позицию
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {item.name}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}

// layoutId — общая анимация между компонентами (magic motion)
function SharedLayoutAnimation({ selectedId }) {
  return (
    <>
      {items.map((item) => (
        <motion.div key={item.id} layoutId={`card-${item.id}`}>
          {item.name}
        </motion.div>
      ))}
    </>
  )
}
```

---

## Типы переходов

```tsx
// Spring (пружина) — физичная анимация
<motion.div
  animate={{ x: 100 }}
  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
/>

// Tween (линейная/bezier)
<motion.div
  animate={{ opacity: 1 }}
  transition={{ type: 'tween', duration: 0.5, ease: [0.43, 0.13, 0.23, 0.96] }}
/>

// Inertia (инерция, для drag)
<motion.div
  animate={{ x: 0 }}
  transition={{ type: 'inertia', velocity: 500 }}
/>
```

---

## Паттерны в letar

```tsx
// Появление карточки
export function FadeInCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// Анимированный список с stagger
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export function AnimatedList({ items }: { items: React.ReactNode[] }) {
  return (
    <motion.div variants={listVariants} initial="hidden" animate="show">
      {items.map((item, i) => (
        <motion.div key={i} variants={itemVariants}>
          {item}
        </motion.div>
      ))}
    </motion.div>
  )
}

// Кнопка с tap-эффектом
export function TapButton({ onClick, children }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}
```

---

## Ссылки

- Docs: https://motion.dev/docs/react-quick-start
- GitHub: https://github.com/motiondivision/motion
