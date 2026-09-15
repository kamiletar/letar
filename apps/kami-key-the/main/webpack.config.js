const path = require('path')

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  // source-map вместо дефолтного devtool — preload не поддерживает динамическое выполнение в sandboxed Electron
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
  target: 'electron-main',
  entry: {
    background: './main/background.ts',
    preload: './main/preload.ts',
  },
  output: {
    path: path.resolve(__dirname, '../app'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    // src/ файлы импортируют друг друга с .js (ESM конвенция) — резолвим в .ts
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
    alias: {
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
  externals: {
    // Electron — не бандлить
    electron: 'commonjs electron',
    // Koffi — нативный модуль с .node файлами
    koffi: 'commonjs koffi',
  },
  optimization: {
    // Scope hoisting (ModuleConcatenationPlugin) ломает циклическую загрузку CJS внутри
    // js-yaml (транзитивная зависимость electron-updater, main/updater.ts) — конструктор
    // Type() вызывается без `new`, this === undefined, падает на `this.options = t`.
    // Воспроизводится только в production-сборке (`--mode production`), где concatenateModules
    // включён по умолчанию; в dev-режиме webpack его не включает, поэтому баг не был виден
    // до установки собранного .exe. Разбор — TypeError при запуске KamiKeyThe после установки.
    concatenateModules: false,
  },
  node: {
    __dirname: false,
    __filename: false,
  },
}
