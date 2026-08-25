declare module 'snowball-stemmers' {
  export interface Stemmer {
    /**
     * Стеммирует слово
     * @param word - Слово для стемминга
     * @returns Стеммированное слово
     */
    stem(word: string): string
  }

  /**
   * Создаёт стеммер для указанного языка
   * @param language - Код языка (russian, english, german, etc.)
   */
  export function newStemmer(language: string): Stemmer
  export function algorithms(): string[]
}
