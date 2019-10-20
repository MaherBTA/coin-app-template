const execa = require('execa')
const { rm } = require('shelljs')
const { existsSync } = require('fs')

async function main () {
  try {
    await execa('hygen-create', ['generate'], { stdio: [0, 1, 2] })
    if (existsSync('./_templates/shardus/new.1')) {
      rm('-rf', ['./_templates/shardus/new.1'])
      console.log('Deleted ./_templates/shardus/new.1')
    }
  } catch (e) {
    console.log(e)
  }
}
main()
