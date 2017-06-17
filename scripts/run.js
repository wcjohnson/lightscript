const chalk = require('chalk')
const { spawnSync, execFileSync } = require('child_process')

const run = (str, opts = {}) => {
  console.log(chalk.white.bgBlack(str))
  const [ cmd, ...args ] = str.split(' ')
  if (opts.useExec) {
    execFileSync(cmd, args, opts)
  } else {
    const { status } = spawnSync(cmd, args, Object.assign({}, opts, { stdio: 'inherit' }))
    if (status !== 0) process.exit()
  }
}
module.exports = run;
module.exports.run = run;

const runArgs = (cmd, args, opts = {}) => {
  joined = cmd + (args || []).join(' ')
  console.log(chalk.white.bgBlack(joined))
  const { status } = spawnSync(cmd, args, Object.assign({}, opts, { stdio: 'inherit' }))
  if (status !== 0) process.exit()
}
module.exports.runArgs = runArgs

const capture = (str) => {
  console.log(chalk.white.bgBlack(str))
  const [cmd, ...args] = str.split(' ')
  const { status, stdout } = spawnSync(cmd, args, { encoding: 'utf8' })
  if (status !== 0) process.exit()
  return stdout
}

module.exports.capture = capture

const lernaExec = (cmd, opts) => run(`lerna exec -- ${cmd}`, opts)
const lernaScopedCommand = (packages, cmd, opts) => {
  const scopes = packages.reduce( (ps, p) => ps + `--scope ${p} `, '' )
  run(`lerna ${scopes}${cmd}`, opts)
}
const lernaScopedCapture = (packages, cmd, opts) => {
  const scopes = packages.reduce((ps, p) => ps + `--scope ${p} `, '')
  return capture(`lerna ${scopes}${cmd}`)
}

module.exports.lernaExec = lernaExec;
module.exports.lernaScopedCommand = lernaScopedCommand;
module.exports.lernaScopedCapture = lernaScopedCapture;
