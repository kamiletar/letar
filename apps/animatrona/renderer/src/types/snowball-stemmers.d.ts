declare module 'snowball-stemmers' {
  export interface Stemmer {
    /**
     * Стеммирует слово
     * @param word - Слово для стемминга
     * @returns Стеммированное слово
     */
    stem(word: string): string
  }

  export interface SnowballFactory {
    /**
     * Создаёт стеммер для указанного языка
     * @param language - Код языка (russian, english, german, etc.)
     */
    newStemmer(language: string): Stemmer
  }

  const factory: SnowballFactory
  export default factory
}
