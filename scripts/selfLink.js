#!/usr/bin/env node

const run = require('./run')

run(`mkdir -p lightscript-eslint/node_modules/@lightscript`)
run(`touch lightscript-eslint/node_modules/@lightscript/eslint-plugin`)
run(`rm lightscript-eslint/node_modules/@lightscript/eslint-plugin`)
run(`ln -s ../.. lightscript-eslint/node_modules/@lightscript/eslint-plugin`)

// run(`mkdir -p lightscript-eslint/node_modules/@lightscript`)
// run(`touch lightscript-eslint/node_modules/@lightscript/babel-preset`)
// run(`rm lightscript-eslint/node_modules/@lightscript/babel-preset`)
// run(`ln -s ../../../lightscript-preset lightscript-eslint/node_modules/@lightscript/babel-preset`)
