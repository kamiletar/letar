const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
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
    alias: {
      '@letar/label-printer-core': path.resolve(__dirname, '../../../libs/label-printer-core/src'),
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
    // Копируем статические файлы
    new CopyPlugin({
      patterns: [{ from: 'main/splash.html', to: 'splash.html' }],
    }),
  ],
  externals: {
    // Electron и Node.js модули не бандлятся
    electron: 'commonjs electron',
    // TypeScript — НЕ нужен в runtime (экономия ~15 MB)
    typescript: 'commonjs typescript',
    // Нативные модули (содержат .node бинарные файлы)
    '@resvg/resvg-js': 'commonjs @resvg/resvg-js',
    canvas: 'commonjs canvas',
    // Platform-specific бинарники resvg-js
    '@resvg/resvg-js-win32-x64-msvc': 'commonjs @resvg/resvg-js-win32-x64-msvc',
    '@resvg/resvg-js-darwin-x64': 'commonjs @resvg/resvg-js-darwin-x64',
    '@resvg/resvg-js-darwin-arm64': 'commonjs @resvg/resvg-js-darwin-arm64',
    '@resvg/resvg-js-linux-x64-gnu': 'commonjs @resvg/resvg-js-linux-x64-gnu',
    '@resvg/resvg-js-linux-x64-musl': 'commonjs @resvg/resvg-js-linux-x64-musl',
    // pdfjs-dist worker
    'pdfjs-dist': 'commonjs pdfjs-dist',
    // Serialport — нативный модуль для COM-портов (содержит .node бинарные файлы)
    serialport: 'commonjs serialport',
    '@serialport/bindings-cpp': 'commonjs @serialport/bindings-cpp',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
}
