/**
 * Конфигурация React Native
 *
 * Нативные зависимости объявлены в корневом package.json монорепо,
 * здесь указываем их явно для autolinking.
 */
module.exports = {
  dependencies: {
    '@react-native-async-storage/async-storage': {},
    'react-native-safe-area-context': {},
  },
}
