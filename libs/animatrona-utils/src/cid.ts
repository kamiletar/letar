/**
 * Валидация IPFS CID
 */

/**
 * Проверяет валидность IPFS CID.
 * Поддерживает CIDv0 (Qm...) и CIDv1 (bafy...)
 */
export function isValidCid(cid: string): boolean {
  // CIDv0: начинается с Qm, длина 46 символов
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)) {
    return true
  }

  // CIDv1: начинается с bafy, различная длина
  if (/^bafy[a-z2-7]{50,}$/.test(cid)) {
    return true
  }

  return false
}
