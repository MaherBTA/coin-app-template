const execa = require('execa')

async function main () {
  try {
    await execa('yarpm', 'run pm2 start ./node_modules/seed-node-server/bin/seed-node-server'.split(' '), { stdio: [0, 1, 2] })
    await execa('yarpm', 'run pm2 start ./node_modules/monitor-server/bin/monitor-server'.split(' '), { stdio: [0, 1, 2] })
  } catch (e) {
    console.log(e)
  }
}
main()
