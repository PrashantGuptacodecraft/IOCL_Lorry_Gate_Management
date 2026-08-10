module.exports = {
  apps: [
    {
      name: "iocl-gate-api",
      cwd: __dirname,
      script: "apps/api/dist/server.js",
      interpreter: "node",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      max_memory_restart: "650M",
      kill_timeout: 12000,
      listen_timeout: 15000,
      env: { NODE_ENV: "production" },
    },
    {
      name: "iocl-gate-web",
      cwd: `${__dirname}/apps/web`,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      interpreter: "node",
      instances: 2,
      exec_mode: "cluster",
      autorestart: true,
      max_memory_restart: "650M",
      env: { NODE_ENV: "production", PORT: "3000" },
    },
  ],
};
