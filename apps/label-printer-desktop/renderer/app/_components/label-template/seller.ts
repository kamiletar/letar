/**
 * Реквизиты продавца, которые печатаются на каждой этикетке.
 *
 * Значения не хранятся в репозитории: он публичный, а реквизиты (ИП, ИНН, номер декларации)
 * относятся к конкретному продавцу. Они берутся из `renderer/.env.local` (в .gitignore) и
 * подставляются Next.js при сборке. Образец — `renderer/env.seller.example`.
 *
 * ⚠️ Обращения к `process.env.NEXT_PUBLIC_*` ниже записаны литералами намеренно: Next.js
 * подставляет значения статической заменой и не видит динамический доступ `process.env[name]`.
 */

export interface LabelSeller {
  /** Сайт продавца, крупная строка на этикетке */
  site: string
  /** Название ИП, например «ИП Иванов И.И.» */
  entrepreneur: string
  /** ИНН продавца */
  inn: string
  /** Номер декларации о соответствии */
  declaration: string
}

/**
 * Возвращает реквизиты продавца.
 *
 * Бросает ошибку, если хоть одно поле не задано: этикетка без обязательных реквизитов
 * не должна уходить в печать молча.
 */
export function getLabelSeller(): LabelSeller {
  const seller: Record<keyof LabelSeller, string | undefined> = {
    site: process.env.NEXT_PUBLIC_LABEL_SELLER_SITE,
    entrepreneur: process.env.NEXT_PUBLIC_LABEL_SELLER_NAME,
    inn: process.env.NEXT_PUBLIC_LABEL_SELLER_INN,
    declaration: process.env.NEXT_PUBLIC_LABEL_SELLER_DECLARATION,
  }

  const missing = Object.entries(seller)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(
      `Не заданы реквизиты продавца для этикетки: ${missing.join(', ')}. `
        + 'Скопируйте renderer/env.seller.example в renderer/.env.local, заполните и пересоберите приложение.',
    )
  }

  return seller as LabelSeller
}
