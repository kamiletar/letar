export interface CartItem {
  productId: string
  productSlug: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

export interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
}

/** Действия корзины — стабильные ссылки, не меняются между рендерами */
export interface CartActions {
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

/** Полный контекст корзины — для обратной совместимости */
export interface CartContextType extends CartState, CartActions {}
