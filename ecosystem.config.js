module.exports = {
  apps: [
    {
      name: 'start-premium',
      script: 'nx',
      args: 'start premium-rosstil',
      env: {
        NODE_OPTIONS: '--max-old-space-size=768',
        NX_PARALLEL: '1',
      },
    },
  ],
}
