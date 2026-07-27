const path = require('path')
const webpack = require('webpack')

// Пути к mock-файлам
const nodeDatchannelMock = path.resolve(__dirname, 'mocks/node-datachannel.ts')
const libp2pWebrtcMock = path.resolve(__dirname, 'mocks/libp2p-webrtc.ts')

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'electron-main',
  entry: {
    background: './main/main.ts',
    preload: './main/preload/index.ts',
  },
  output: {
    path: path.resolve(__dirname, '../app'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      // Заменяем WebRTC на mock — libp2p требует модуль, но мы не используем WebRTC
      '@libp2p/webrtc': libp2pWebrtcMock,
      // Native модули WebRTC заменяем на mock
      'node-datachannel': nodeDatchannelMock,
      'node-datachannel/polyfill': nodeDatchannelMock,
      // Монорепо shared-библиотеки
      '@letar/animatrona-utils': path.resolve(__dirname, '../../../libs/animatrona-utils/src/index.ts'),
      '@letar/animatrona-types': path.resolve(__dirname, '../../../libs/animatrona-types/src/index.ts'),
      '@letar/electron-storage': path.resolve(__dirname, '../../../libs/electron-storage/src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            configFile: path.resolve(__dirname, '../tsconfig.json'),
          },
        },
      },
    ],
  },
  plugins: [
    // NormalModuleReplacementPlugin заменяет модули на этапе резолва
    // Работает для вложенных зависимостей в node_modules
    new webpack.NormalModuleReplacementPlugin(/^node-datachannel(\/polyfill)?$/, nodeDatchannelMock),
    new webpack.NormalModuleReplacementPlugin(/^@libp2p\/webrtc$/, libp2pWebrtcMock),
  ],
  externals: {
    // Electron и Node.js модули не бандлятся
    electron: 'commonjs electron',
    // Native модули экстернализируются (будут в extraResources)
    ntsuspend: 'commonjs ntsuspend',
    // libsql — native SQLite driver для Prisma 7 (N-API pre-built binding)
    libsql: 'commonjs libsql',
    // classic-level и его зависимости (legacy, может потребоваться для IndexedDB)
    'classic-level': 'commonjs classic-level',
    'abstract-level': 'commonjs abstract-level',
    'level-supports': 'commonjs level-supports',
    'level-transcoder': 'commonjs level-transcoder',
    'module-error': 'commonjs module-error',
    'maybe-combine-errors': 'commonjs maybe-combine-errors',
    'is-buffer': 'commonjs is-buffer',
    'node-gyp-build': 'commonjs node-gyp-build',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
}
