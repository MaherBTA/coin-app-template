---
to: <%= name %>/scripts/clean.js
---
const execa = require('execa')
const { rm } = require('shelljs')

async function main () {
  try {
    await execa('yarpm', 'run pm2 kill'.split(' '), { stdio: [0, 1, 2] })
    rm('-rf', './.pm2 ./db ./logs ./statistics.tsv'.split(' '))
  } catch (e) {
    console.log(e)
  }
}
main()
