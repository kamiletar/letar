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
  node: {
    __dirname: false,
    __filename: false,
  },
}
