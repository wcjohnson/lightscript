const { run, lernaScopedCommand, lernaScopedCapture } = require('./run')
const path = require('path')

// check that we're not running through `yarn`,
// which breaks because `npm whoami` returns nil
try {
  run(`npm whoami`, { useExec: true })
} catch (err) {
  console.warn('Cannot run as `yarn release`, must run as `npm run release`.')
  process.exit()
}

const packages = process.argv.slice(2)

const packageDirs = packages.map(package => {
  abs = lernaScopedCapture([package], 'exec -- pwd').trim()
  return path.relative(path.join(__dirname, '..'), abs)
})
console.log(packageDirs)

// health check
lernaScopedCommand(packages, `exec -- git pull`)
lernaScopedCommand(packages, `run preversion`)

// allow user intervention on version numbers for each package
lernaScopedCommand(packages, `publish --skip-npm --skip-git --exact`)

// read version numbers and push git tags
const versionedPackages = packages.map(package => ({
  version: lernaScopedCapture([package], 'exec -- cat package.json | sed -nE "s/.*\\"version\\": ?\\"(.*)\\".*/\\1/p"').trim(),
  package: package
}))
console.log(versionedPackages)

versionedPackages.forEach(info => {
  lernaScopedCommand([info.package], `exec -- git commit -am v${info.version}`)
  lernaScopedCommand([info.package], `exec -- git tag v${info.version} -m v${info.version}`)
})

lernaScopedCommand(packages, `exec -- npm publish`)

lernaScopedCommand(packages, `exec -- git push && git push --tags`)

// commit & push version bump at monorepo level
run(`git add ${packageDirs.join(' ')}`)
run(`git commit -m Publish`)
run(`git push`)
