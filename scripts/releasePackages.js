const { run, runArgs, scoped, scopedExec, scopedRun } = require('./run')
const path = require('path')
const inquirer = require('inquirer')
const semver = require('semver')

// check that we're not running through `yarn`,
// which breaks because `npm whoami` returns nil
try {
  run(`npm whoami`, { useExec: true })
} catch (err) {
  console.warn('Cannot run as `yarn release`, must run as `npm run release`.')
  process.exit()
}

const packageList = process.argv.slice(2)
if (packageList[0] === "all") {
  const pkgsRaw = JSON.parse(capture("yarn run -s lerna ls --json").trim())
  packageList = []
  pkgsRaw.forEach((entry) => packageList.push(entry.name))
}
console.log("Releasing:", packageList)

const packages = packageList.map(packageName => {
  // Absolute path
  const abs = scopedExec([packageName], 'pwd').trim()
  // Prior version
  const priorVersion = scopedExec([packageName], 'cat package.json | sed -nE "s/.*\\"version\\": ?\\"(.*)\\".*/\\1/p"').trim()
  // git status
  const gitStatus = scopedExec([packageName], 'git status --porcelain').trim()
  // git branch
  const gitBranch = scopedExec([packageName], 'git rev-parse --abbrev-ref HEAD').trim()
  return {
    name: packageName,
    absolutePath: abs,
    priorVersion: priorVersion,
    gitStatus: gitStatus,
    gitBranch: gitBranch,
    path: path.relative(path.join(__dirname, '..'), abs)
  }
})

/////////////////// Health check
console.log("Preflight check:")
packages.forEach(package => {
  console.log("----------------------------------")
  console.log("Package: ", package.name)
  console.log("Path: ", package.path)
  console.log("Current version: ", package.priorVersion)
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

  scoped(packageList, `run --parallel clean`)
  scoped(packageList, `run --parallel build`)
  scoped(packageList, `run --parallel test:only`)

  //////////////////////// Version bump
  // allow user intervention on version numbers for each package
  scopedRun(packageList, `publish --skip-npm --skip-git --exact`)

  // read version numbers and push git tags
  packages.forEach(package => {
    package.version = scopedExec([package.name], 'cat package.json | sed -nE "s/.*\\"version\\": ?\\"(.*)\\".*/\\1/p"').trim()
  })

  const updatedPackages = packages.filter((pkg) => pkg.version !== pkg.priorVersion)

  //////////////////////// Tag, Publish and push submodules
  updatedPackages.forEach(package => {
    scopedExec([package.name], `git commit -am "chore(publish): publish ${package.name}@${package.version}"`)
    scopedExec([package.name], `git tag ${package.name}@${package.version} -m ${package.name}@${package.version}`)
  })
  const updatedPackageList = updatedPackages.map(x => x.name)

  updatedPackages.forEach(package => {
    if (semver.prerelease(package.version)) {
      // Must run npm in the cwd of the package
      run(`npm publish --tag next`, { cwd: package.absolutePath })
    } else {
      run(`npm publish --tag latest`, { cwd: package.absolutePath })
    }
  })
  scopedExec(updatedPackageList, `git push && git push --tags`)

  //////////////////////// Push monorepo updates
  const updatedPackageDirs = updatedPackages.map(x => x.path)
  run(`git add ${updatedPackageDirs.join(' ')}`)

  commitArgs = ['commit', '-m', 'chore(publish): publish packages', '-m', 'Publish to NPM:']
  updatedPackages.forEach(info => {
    commitArgs.push('-m', `* ${info.name} v${info.version}`)
  })
  runArgs('git', commitArgs)

  run(`git push`)
} )
.catch(err => {
  console.error(err)
  process.exit(1)
})
