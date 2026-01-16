module.exports = {
  apps: [
    // ===========================================================================
    // PRODUCTION: Next.js Application
    // ===========================================================================
    {
      name: 'cenadi-app',
      cwd: '/opt/cenadi/app',
      script: 'node',
      args: 'server.js',
      instances: 'max',  // Use all CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/cenadi/logs/app-error.log',
      out_file: '/opt/cenadi/logs/app-out.log',
      merge_logs: true,
      // Auto-restart
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // Monitoring
      instance_var: 'INSTANCE_ID',
    },
  ],

  // ===========================================================================
  // PM2 DEPLOYMENT CONFIGURATION
  // ===========================================================================
  deploy: {
    production: {
      // SSH user
      user: 'deploy',
      
      // Remote server IP/hostname
      host: ['YOUR_SERVER_IP'],
      
      // SSH port (default 22)
      ssh_options: 'StrictHostKeyChecking=no',
      
      // Git repository
      repo: 'git@github.com:LaurentJoel/SearchWithEmbeddings.git',
      
      // Branch to deploy
      ref: 'origin/main',
      
      // Remote path
      path: '/opt/cenadi',
      
      // Pre-deployment commands (on local machine)
      'pre-deploy-local': 'echo "Preparing deployment..."',
      
      // Post-deployment commands (on remote server)
      'post-deploy': `
        cd app && npm ci --production && 
        npx prisma generate && 
        npx prisma db push &&
        npm run build &&
        pm2 reload ecosystem.production.config.js --env production
      `.replace(/\n/g, ''),
      
      // Pre-setup commands
      'pre-setup': 'echo "Setting up server..."',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
      },
    },
    
    staging: {
      user: 'deploy',
      host: ['YOUR_STAGING_IP'],
      ref: 'origin/develop',
      path: '/opt/cenadi-staging',
      'post-deploy': `
        cd app && npm ci && 
        npx prisma generate && 
        npx prisma db push &&
        npm run build &&
        pm2 reload ecosystem.production.config.js --env staging
      `.replace(/\n/g, ''),
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
