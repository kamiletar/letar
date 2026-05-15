const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')

// Корень монорепо
const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

/**
 * Metro configuration for animatrona-tv
 * https://reactnative.dev/docs/metro
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
    // Пути к node_modules для резолва зависимостей из libs/
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules'), path.resolve(monorepoRoot, 'node_modules')],
    // Блокируем дубликаты react-native из вложенных node_modules
    blockList: [/node_modules\/.*\/node_modules\/react-native\/.*/],
    // Принудительно использовать локальные версии singleton пакетов
    extraNodeModules: singletonPackages,
    // Расширения файлов
    sourceExts: ['ts', 'tsx', 'js', 'jsx', 'json', 'cjs', 'mjs'],
    // Перехватываем импорты singleton пакетов из библиотек
    resolveRequest: (context, moduleName, platform) => {
      if (
        moduleName === 'react' ||
        moduleName === 'react-native' ||
        moduleName.startsWith('react-native/') ||
        moduleName.startsWith('react/')
      ) {
        return {
          filePath: require.resolve(moduleName, { paths: [projectRoot] }),
          type: 'sourceFile',
        }
      }
      return context.resolveRequest(context, moduleName, platform)
    },
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
