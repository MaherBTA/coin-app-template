---
to: <%= name %>/package.json
---
{
  "name": "coin-app",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "pm2": "cross-env PM2_HOME='./.pm2' pm2",
    "start": "node scripts/start.js && node index.js",
    "stop": "node scripts/stop.js",
    "clean": "node scripts/clean.js",
    "test": "echo \"Error: no test specified\" && exit 1",
    "update-template": "node scripts/update-template.js"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "deepmerge": "^4.2.2",
    "fast-stable-stringify": "^1.0.0",
    "got": "^9.6.0",
    "shardus-crypto-utils": "git+https://gitlab.com/shardus/shardus-crypto-utils.git",
    "shardus-global-server-dist": "git+https://gitlab.com/shardus/global/shardus-global-server-dist.git",
    "vorpal": "^1.12.0"
  },
  "devDependencies": {
    "cross-env": "^5.2.0",
    "execa": "^1.0.0",
    "hygen-create": "^0.2.1",
    "monitor-server": "git+https://gitlab.com/shardus/monitor-server.git",
    "pm2": "^4.1.2",
    "seed-node-server": "git+https://gitlab.com/shardus/seed-node-server.git",
    "shelljs": "^0.8.3",
    "standard": "^12.0.1",
    "yarpm": "^0.2.1"
  }
}
