module.exports = {
  apps: [
    {
      name: 'carnetunamad',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
        DATABASE_URL: 'postgresql://postgres:954040025@localhost:5432/fotcheckunamad?schema=public',
        JWT_SECRET: 'unamad-fotocheck-secret-2026-oti',
      },
    },
  ],
};
