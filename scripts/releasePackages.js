const { run, runArgs, lernaScopedCommand, lernaScopedCapture } = require('./run')
const path = require('path')
const inquirer = require('inquirer')

// check that we're not running through `yarn`,
// which breaks because `npm whoami` returns nil
try {
  run(`npm whoami`, { useExec: true })
} catch (err) {
  console.warn('Cannot run as `yarn release`, must run as `npm run release`.')
  process.exit()
}

const packageList = process.argv.slice(2)
const packages = packageList.map(packageName => {
  // Absolute path
  const abs = lernaScopedCapture([packageName], 'exec -- pwd').trim()
  // git status
  const gitStatus = lernaScopedCapture([packageName], 'exec -- git status --porcelain').trim()
  // git branch
  const gitBranch = lernaScopedCapture([packageName], 'exec -- git rev-parse --abbrev-ref HEAD').trim()
  return {
    name: packageName,
    path: path.relative(path.join(__dirname, '..'), abs),
    gitStatus: gitStatus,
    gitBranch: gitBranch
  }
})

const packageDirs = packages.map(package => package.path)

/////////////////// Health check
console.log("Preflight check:")
packages.forEach(package => {
  console.log("----------------------------------")
  console.log("Package: ", package.name)
  console.log("Path: ", package.path)
  console.log("Branch: ", package.gitBranch)
  console.log("----------------------------------")
  if (package.gitStatus.length > 0) {
    throw new Error(`Package ${package.name} has a dirty repository.`)
  }
  if (package.gitBranch === "HEAD") {
    throw new Error(`Package ${package.name} has a detached HEAD.`)
  }
});

inquirer.prompt([{type: 'confirm', default: false, name: 'go', message: 'Proceed?'}])
.then( answers => {
  if (!answers.go) throw new Error("User aborted release")

  lernaScopedCommand(packageList, `run preversion`)

  //////////////////////// Version bump
  // allow user intervention on version numbers for each package
  lernaScopedCommand(packageList, `publish --skip-npm --skip-git --exact`)

  // read version numbers and push git tags
  packages.forEach(package => {
    package.version = lernaScopedCapture([package.name], 'exec -- cat package.json | sed -nE "s/.*\\"version\\": ?\\"(.*)\\".*/\\1/p"').trim()
    lernaScopedCommand([package.name], `exec -- git commit -am v${package.version}`)
    lernaScopedCommand([package.name], `exec -- git tag v${package.version} -m v${package.version}`)
  })

  //////////////////////// Publish and push tags
  lernaScopedCommand(packageList, `exec -- npm publish`)
  lernaScopedCommand(packageList, `exec -- git push && git push --tags`)

  //////////////////////// Push monorepo updates
  run(`git add ${packageDirs.join(' ')}`)

  commitArgs = ['commit', '-m', 'Publish', '-m', 'Publish to NPM:']
  packages.forEach(info => {
    commitArgs.push('-m', `* ${info.name} v${info.version}`)
  })
  runArgs('git', commitArgs)

  run(`git push`)
} )
.catch(err => {
  console.error(err)
  process.exit(1)
})
