'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { CartActions, CartItem, CartState } from './cart-types'

const CART_STORAGE_KEY = 'mandala-cart'

/** Контекст данных корзины — меняется при изменении items */
const CartStateContext = createContext<CartState | null>(null)

/** Контекст действий — стабильные ссылки, не вызывают ре-рендер */
const CartActionsContext = createContext<CartActions | null>(null)

function calculateTotals(items: CartItem[]): Pick<CartState, 'total' | 'itemCount'> {
  return {
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage errors
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Загрузка корзины из localStorage при монтировании
  useEffect(() => {
    const stored = loadCartFromStorage()
    setItems(stored)
    setIsLoaded(true)
  }, [])

  // Сохранение корзины в localStorage при изменениях
  useEffect(() => {
    if (isLoaded) {
      saveCartToStorage(items)
    }
  }, [items, isLoaded])

  // Стабильные действия — не меняются между рендерами
  const actions = useMemo<CartActions>(
    () => ({
      addItem: (item) => {
        setItems((prev) => {
          const existing = prev.find((i) => i.productId === item.productId)
          if (existing) {
            return prev.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i))
          }
          return [...prev, { ...item, quantity: 1 }]
        })
      },
      removeItem: (productId) => {
        setItems((prev) => prev.filter((i) => i.productId !== productId))
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          setItems((prev) => prev.filter((i) => i.productId !== productId))
        } else {
          setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)))
        }
      },
      clearCart: () => {
        setItems([])
      },
    }),
    []
  )

  // Данные корзины — меняются при изменении items
  const state = useMemo<CartState>(() => {
    const totals = calculateTotals(items)
    return { items, ...totals }
  }, [items])

  return (
    <CartActionsContext.Provider value={actions}>
      <CartStateContext.Provider value={state}>{children}</CartStateContext.Provider>
    </CartActionsContext.Provider>
  )
}

/**
 * Хук для получения данных корзины (items, total, itemCount).
 * Компонент ре-рендерится при изменении корзины.
 */
export function useCartState(): CartState {
  const context = useContext(CartStateContext)
  if (!context) {
    throw new Error('useCartState must be used within a CartProvider')
  }
  return context
}

/**
 * Хук для получения действий корзины (addItem, removeItem, updateQuantity, clearCart).
 * Компонент НЕ ре-рендерится при изменении корзины — идеально для кнопок "Добавить".
 */
export function useCartActions(): CartActions {
  const context = useContext(CartActionsContext)
  if (!context) {
    throw new Error('useCartActions must be used within a CartProvider')
  }
  return context
}

/**
 * Хук для получения полного контекста корзины.
 * @deprecated Используй useCartState() для данных и useCartActions() для действий
 */
export function useCart(): CartState & CartActions {
  const state = useCartState()
  const actions = useCartActions()
  return { ...state, ...actions }
}
