// D:/Echo/backend/ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'backend', // Имя процесса в PM2
      // "Грязный" запуск через Nest CLI без dist
      script: 'node_modules/@nestjs/cli/bin/nest.js',
      args: 'start',
      cwd: __dirname,
      watch: false, // без pm2-watch, при необходимости можно использовать start:dev отдельно
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};