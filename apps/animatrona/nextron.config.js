const path = require('path')
const webpack = require('webpack')

// Пути к mock-файлам
const nodeDatchannelMock = path.resolve(__dirname, 'main/mocks/node-datachannel.ts')
const libp2pWebrtcMock = path.resolve(__dirname, 'main/mocks/libp2p-webrtc.ts')

module.exports = {
  // Путь к Next.js приложению
  rendererSrcDir: 'renderer',

  // Путь к Electron main process
  mainSrcDir: 'main',

  // Расширение webpack конфигурации для main process
  webpack: (config, env) => {
    // Добавляем alias'ы для замены WebRTC модулей на mock'и
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@libp2p/webrtc': libp2pWebrtcMock,
      'node-datachannel': nodeDatchannelMock,
      'node-datachannel/polyfill': nodeDatchannelMock,
    }

    // NormalModuleReplacementPlugin для вложенных зависимостей
    config.plugins = config.plugins || []
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node-datachannel(\/polyfill)?$/, nodeDatchannelMock),
      new webpack.NormalModuleReplacementPlugin(/^@libp2p\/webrtc$/, libp2pWebrtcMock),
    )

    return config
  },
}
