const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')

// Корень монорепо
const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

/**
 * Metro configuration
 * https://metrobundler.dev/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
// Пакеты которые должны быть единственными (без дубликатов)
const singletonPackages = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  zustand: path.resolve(projectRoot, 'node_modules/zustand'),
  // Shared библиотеки из libs/
  '@letar/exoplayer-ass': path.resolve(monorepoRoot, 'libs/exoplayer-ass/src'),
  '@letar/exoplayer-sync': path.resolve(monorepoRoot, 'libs/exoplayer-sync/src'),
  '@letar/animatrona-shared': path.resolve(monorepoRoot, 'libs/animatrona-shared/src'),
}

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    // Подключаем shared библиотеки из libs/
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules'), path.resolve(monorepoRoot, 'node_modules')],
    // Дополнительные расширения для Tamagui
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs', 'mjs'],
    // Принудительно использовать локальные версии singleton пакетов
    extraNodeModules: singletonPackages,
    // Перехватываем все импорты react и react-native из библиотек
    // ВАЖНО: перехватывать и deep imports (react-native/Libraries/...), иначе
    // bun создаёт отдельные копии react-native для каждого workspace пакета,
    // что приводит к дублированию ReactNativeViewConfigRegistry и ошибкам Fabric
    resolveRequest: (context, moduleName, platform) => {
      // Для singleton пакетов и их deep imports всегда используем версию из app
      // ВАЖНО: в bun monorepo нативные модули могут дублироваться через .bun/ cache,
      // что приводит к "Tried to register two views with the same name"
      if (
        moduleName === 'react'
        || moduleName === 'react-native'
        || moduleName.startsWith('react-native/')
        || moduleName.startsWith('react/')
        || moduleName === 'react-native-safe-area-context'
        || moduleName.startsWith('react-native-safe-area-context/')
        || moduleName === 'react-native-gesture-handler'
        || moduleName.startsWith('react-native-gesture-handler/')
        || moduleName === 'react-native-screens'
        || moduleName.startsWith('react-native-screens/')
        || moduleName === 'react-native-svg'
        || moduleName.startsWith('react-native-svg/')
        || moduleName === 'react-native-reanimated'
        || moduleName.startsWith('react-native-reanimated/')
        || moduleName === 'react-native-video'
        || moduleName.startsWith('react-native-video/')
        || moduleName === '@react-native-async-storage/async-storage'
        || moduleName.startsWith('@react-native-async-storage/async-storage/')
      ) {
        return {
          filePath: require.resolve(moduleName, { paths: [projectRoot] }),
          type: 'sourceFile',
        }
      }
      // Остальные модули резолвим стандартно
      return context.resolveRequest(context, moduleName, platform)
    },
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
