import baseConfig from '../../eslint.config.mjs'

export default [...baseConfig, { ignores: ['dist/**/*', '.next/**/*', '**/out-tsc'] }]
